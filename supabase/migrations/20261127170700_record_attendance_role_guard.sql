-- GATEOPS: perketat record_attendance dengan guard role PERSONEL (defense-in-depth).
-- Forward-only: CREATE OR REPLACE menjaga grant yang ada (AGENTS 7.5).
-- Rujukan: PRD 10, 22.5 (transactions hanya untuk Personel).

create or replace function public.record_attendance(
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
  v_role public.account_role;
  v_gate_status public.gate_status;
  v_active_id uuid;
  v_exit_at timestamptz;
  v_new_id uuid;
  v_duration integer;
begin
  begin
    select id, role into v_account_id, v_role from public.accounts
      where id = p_personnel_account_id for update nowait;
  exception when lock_not_available then
    raise exception 'TRANSACTION_IN_PROGRESS';
  end;
  if v_account_id is null then
    raise exception 'ACCOUNT_NOT_FOUND';
  end if;
  if v_role <> 'PERSONEL' then
    raise exception 'INVALID_ROLE';
  end if;

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