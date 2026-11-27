-- GATEOPS P1: GPS DENIED mempertahankan koordinat (FR-39), race akun SA terakhir,
-- unique violation -> CONFLICT, dan pgTAP hanya local/CI (PRD 26.2).
-- SECURITY DEFINER: logika multi-tabel/invariant, grant hanya service_role.

create or replace function public.report_gps(
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
    latitude = case when excluded.permission_state = 'DENIED' then gps_locations.latitude else excluded.latitude end,
    longitude = case when excluded.permission_state = 'DENIED' then gps_locations.longitude else excluded.longitude end,
    permission_state = excluded.permission_state,
    gps_updated_at = now();
end;
$$;

create or replace function public.set_account_status(
  p_actor_account_id uuid,
  p_account_id uuid,
  p_status public.account_status
) returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_role public.account_role;
  v_prev public.account_status;
  v_active_sa integer;
  v_has_active_activity boolean;
begin
  -- Kunci advisory agar pengecekan SA aktif terakhir tidak balapan (PRD 6.8.4).
  perform pg_advisory_xact_lock(4243);

  select role, status into v_role, v_prev from public.accounts where id = p_account_id for update;
  if v_role is null then
    raise exception 'ACCOUNT_NOT_FOUND';
  end if;

  if p_status = 'NONAKTIF' then
    if p_account_id = p_actor_account_id then
      raise exception 'CANNOT_DEACTIVATE_SELF';
    end if;
    if v_role = 'SUPER_ADMIN' then
      select count(*) into v_active_sa from public.accounts
        where role = 'SUPER_ADMIN' and status = 'AKTIF';
      if v_active_sa <= 1 then
        raise exception 'LAST_SUPER_ADMIN';
      end if;
    end if;
    if v_role = 'PERSONEL' then
      select exists(select 1 from public.activities
        where personnel_account_id = p_account_id and status = 'AKTIF') into v_has_active_activity;
      if v_has_active_activity then
        raise exception 'PERSONEL_OUTSIDE';
      end if;
    end if;
  end if;

  if p_status = 'NONAKTIF' and v_prev = 'AKTIF' then
    update public.sessions set revoked_at = now()
      where account_id = p_account_id and revoked_at is null;
  end if;

  update public.accounts set status = p_status, updated_at = now() where id = p_account_id;

  insert into public.audit_logs (actor_account_id, actor_role, actor_username, action, object_type, object_id, metadata)
  select a.id, a.role::text, a.username, 'ACCOUNT_STATUS_CHANGED', 'account', p_account_id::text,
         jsonb_build_object('before', v_prev::text, 'after', p_status::text)
  from public.accounts a where a.id = p_actor_account_id;
end;
$$;

create or replace function public.create_account(
  p_actor_account_id uuid,
  p_role public.account_role,
  p_username text,
  p_password_hash text,
  p_nama text,
  p_nrp text,
  p_pangkat text,
  p_jabatan text
) returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_username text := lower(p_username);
  v_id uuid;
begin
  if p_role not in ('SUPER_ADMIN', 'KOMANDAN') then
    raise exception 'INVALID_ROLE';
  end if;
  if exists (select 1 from public.accounts where username = v_username) then
    raise exception 'USERNAME_ALREADY_USED';
  end if;

  insert into public.accounts (role, username, password_hash, nama, nrp, pangkat, jabatan)
  values (p_role, v_username, p_password_hash, btrim(p_nama), p_nrp, nullif(btrim(p_pangkat), ''), nullif(btrim(p_jabatan), ''))
  returning id into v_id;

  insert into public.audit_logs (actor_account_id, actor_role, actor_username, action, object_type, object_id)
  select a.id, a.role::text, a.username, 'ACCOUNT_CREATED', 'account', v_id::text
  from public.accounts a where a.id = p_actor_account_id;

  return v_id;
exception
  when unique_violation then
    raise exception 'CONFLICT';
end;
$$;

create or replace function public.update_account(
  p_actor_account_id uuid,
  p_account_id uuid,
  p_nama text,
  p_pangkat text,
  p_jabatan text,
  p_username text
) returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_role public.account_role;
  v_username text := lower(p_username);
  v_changed text[];
begin
  select role into v_role from public.accounts where id = p_account_id for update;
  if v_role is null then
    raise exception 'ACCOUNT_NOT_FOUND';
  end if;
  if v_role not in ('SUPER_ADMIN', 'KOMANDAN') then
    raise exception 'INVALID_ROLE';
  end if;
  if exists (select 1 from public.accounts where username = v_username and id <> p_account_id) then
    raise exception 'USERNAME_ALREADY_USED';
  end if;

  update public.accounts set
    nama = btrim(p_nama),
    pangkat = case when v_role = 'KOMANDAN' then nullif(btrim(p_pangkat), '') else null end,
    jabatan = case when v_role = 'KOMANDAN' then nullif(btrim(p_jabatan), '') else null end,
    username = v_username,
    updated_at = now()
  where id = p_account_id;

  v_changed := array['nama', 'pangkat', 'jabatan', 'username'];
  insert into public.audit_logs (actor_account_id, actor_role, actor_username, action, object_type, object_id, metadata)
  select a.id, a.role::text, a.username, 'ACCOUNT_UPDATED', 'account', p_account_id::text,
         jsonb_build_object('fields', v_changed)
  from public.accounts a where a.id = p_actor_account_id;
exception
  when unique_violation then
    raise exception 'CONFLICT';
end;
$$;

-- pgTAP hanya local/CI (PRD 26.2). Skrip test:db memasangnya kembali di local.
drop extension if exists pgtap;
