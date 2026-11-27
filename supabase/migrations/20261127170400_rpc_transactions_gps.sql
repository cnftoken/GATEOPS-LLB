-- GATEOPS: RPC transaksi & GPS. Transaksional, search_path, grant service_role.
-- Rujukan: PRD 10.3, 10.4, 10.5, 10.9, 11.5, 22.8, FR-26, FR-27, FR-37.

-- record_attendance (PRD 10.3/10.4/10.5/10.9). KELUAR/KEMBALI atomik.
create function public.record_attendance(
  p_personnel_account_id uuid,
  p_gate_id uuid,
  p_tujuan text,
  p_keperluan text
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_account_id uuid;
  v_gate_status public.gate_status;
  v_active_id uuid;
  v_exit_at timestamptz;
  v_new_id uuid;
  v_duration integer;
begin
  -- Kunci baris akun Personel. NOWAIT -> TRANSACTION_IN_PROGRESS bila sibuk (PRD 10.5.3).
  begin
    select id into v_account_id from public.accounts
      where id = p_personnel_account_id for update nowait;
  exception when lock_not_available then
    raise exception 'TRANSACTION_IN_PROGRESS';
  end;
  if v_account_id is null then
    raise exception 'ACCOUNT_NOT_FOUND';
  end if;

  -- Baca ulang status gate dengan kunci (PRD 9.5.5).
  select status into v_gate_status from public.gates where id = p_gate_id for share;
  if v_gate_status is null then
    raise exception 'GATE_NOT_FOUND';
  end if;
  if v_gate_status = 'NONAKTIF' then
    raise exception 'GATE_INACTIVE';
  end if;

  select id, exit_at into v_active_id, v_exit_at
  from public.activities
  where personnel_account_id = p_personnel_account_id and status = 'AKTIF';

  if v_active_id is null then
    -- KELUAR (PRD 10.3).
    if char_length(btrim(coalesce(p_tujuan, ''))) not between 1 and 150
       or char_length(btrim(coalesce(p_keperluan, ''))) not between 1 and 255 then
      raise exception 'FORM_INCOMPLETE';
    end if;

    insert into public.activities (personnel_account_id, exit_gate_id, exit_at, tujuan, keperluan, status)
    values (p_personnel_account_id, p_gate_id, now(), btrim(p_tujuan), btrim(p_keperluan), 'AKTIF')
    returning id into v_new_id;

    delete from public.gps_locations where personnel_account_id = p_personnel_account_id;
    insert into public.gps_locations (personnel_account_id, latitude, longitude, permission_state, gps_updated_at)
    values (p_personnel_account_id, null, null, 'GRANTED', now());

    insert into public.audit_logs (actor_account_id, actor_role, actor_username, action, object_type, object_id, metadata)
    select a.id, a.role::text, a.username, 'ATTENDANCE_EXIT', 'activity', v_new_id::text,
           jsonb_build_object('gate_id', p_gate_id::text, 'activity_id', v_new_id::text)
    from public.accounts a where a.id = p_personnel_account_id;

    return jsonb_build_object('result', 'EXIT', 'activity_id', v_new_id, 'exit_at', now());
  else
    -- KEMBALI (PRD 10.4).
    v_duration := greatest(0, floor(extract(epoch from (now() - v_exit_at))))::integer;

    update public.activities set
      return_at = now(),
      return_gate_id = p_gate_id,
      status = 'SELESAI',
      duration_seconds = v_duration
    where id = v_active_id;

    delete from public.gps_locations where personnel_account_id = p_personnel_account_id;

    insert into public.audit_logs (actor_account_id, actor_role, actor_username, action, object_type, object_id, metadata)
    select a.id, a.role::text, a.username, 'ATTENDANCE_RETURN', 'activity', v_active_id::text,
           jsonb_build_object('gate_id', p_gate_id::text, 'activity_id', v_active_id::text, 'duration_seconds', v_duration)
    from public.accounts a where a.id = p_personnel_account_id;

    return jsonb_build_object('result', 'RETURN', 'activity_id', v_active_id, 'return_at', now(), 'duration_seconds', v_duration);
  end if;
end;
$$;

-- report_gps (PRD 11.5, 22.8, FR-37). UPSERT satu lokasi, tanpa audit.
create function public.report_gps(
  p_personnel_account_id uuid,
  p_permission_state public.location_permission,
  p_latitude numeric,
  p_longitude numeric
) returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not exists (
    select 1 from public.activities
    where personnel_account_id = p_personnel_account_id and status = 'AKTIF'
  ) then
    raise exception 'NOT_OUT';
  end if;

  insert into public.gps_locations (personnel_account_id, latitude, longitude, permission_state, gps_updated_at)
  values (p_personnel_account_id, p_latitude, p_longitude, p_permission_state, now())
  on conflict (personnel_account_id) do update set
    latitude = excluded.latitude,
    longitude = excluded.longitude,
    permission_state = excluded.permission_state,
    gps_updated_at = now();
end;
$$;

revoke all on function public.record_attendance(uuid, uuid, text, text) from public, anon, authenticated;
revoke all on function public.report_gps(uuid, public.location_permission, numeric, numeric) from public, anon, authenticated;

grant execute on function public.record_attendance(uuid, uuid, text, text) to service_role;
grant execute on function public.report_gps(uuid, public.location_permission, numeric, numeric) to service_role;