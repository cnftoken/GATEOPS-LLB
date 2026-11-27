-- GATEOPS: RPC accounts & personnel. Transaksional, search_path, grant service_role.
-- Rujukan: PRD 4.5, 7.7, 7.8, 7.10, 8.2, 8.3, 16.2, 16.3, 17. Audit in-transaction.
-- SECURITY DEFINER: logika multi-tabel + invariant harus jalan dengan hak owner,
-- hanya service_role yang boleh eksekusi (AGENTS 7.2).

-- create_account (PRD 16.2, FR-08).
create function public.create_account(
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
end;
$$;

-- update_account (PRD 16.3, FR-08).
create function public.update_account(
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
end;
$$;

-- set_account_status (PRD 7.10, FR-08).
create function public.set_account_status(
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
        raise exception 'PERSONNEL_OUTSIDE';
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

-- reset_account_password (PRD 7.8, FR-14). p_password_hash = hash sementara dari Edge.
create function public.reset_account_password(
  p_actor_account_id uuid,
  p_account_id uuid,
  p_password_hash text
) returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not exists (select 1 from public.accounts where id = p_account_id) then
    raise exception 'ACCOUNT_NOT_FOUND';
  end if;

  update public.accounts set
    password_hash = p_password_hash,
    must_change_password = true,
    failed_login_count = 0,
    locked_until = null,
    updated_at = now()
  where id = p_account_id;

  update public.sessions set revoked_at = now()
    where account_id = p_account_id and revoked_at is null;

  insert into public.audit_logs (actor_account_id, actor_role, actor_username, action, object_type, object_id)
  select a.id, a.role::text, a.username, 'PASSWORD_RESET', 'account', p_account_id::text
  from public.accounts a where a.id = p_actor_account_id;
end;
$$;

-- change_own_password (PRD 7.7, FR-13). Verifikasi password lama di Edge.
create function public.change_own_password(
  p_account_id uuid,
  p_password_hash text,
  p_keep_session_id uuid
) returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_username text;
  v_role text;
begin
  update public.accounts set
    password_hash = p_password_hash,
    must_change_password = false,
    updated_at = now()
  where id = p_account_id
  returning username, role::text into v_username, v_role;

  if v_username is null then
    raise exception 'ACCOUNT_NOT_FOUND';
  end if;

  update public.sessions set revoked_at = now()
    where account_id = p_account_id
      and id <> p_keep_session_id
      and revoked_at is null;

  insert into public.audit_logs (actor_account_id, actor_role, actor_username, action, object_type, object_id)
  values (p_account_id, v_role, v_username, 'PASSWORD_CHANGED', 'account', p_account_id::text);
end;
$$;

-- create_personnel (PRD 8.2, FR-09).
create function public.create_personnel(
  p_actor_account_id uuid,
  p_nrp text,
  p_nama text,
  p_pangkat text,
  p_jabatan text,
  p_username text,
  p_password_hash text
) returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_username text := lower(p_username);
  v_id uuid;
begin
  if exists (select 1 from public.accounts where username = v_username) then
    raise exception 'USERNAME_ALREADY_USED';
  end if;
  if exists (select 1 from public.accounts
    where role in ('KOMANDAN', 'PERSONEL') and nrp = btrim(p_nrp)) then
    raise exception 'NRP_ALREADY_USED';
  end if;

  insert into public.accounts (role, username, password_hash, nama, nrp, pangkat, jabatan)
  values ('PERSONEL', v_username, p_password_hash, btrim(p_nama), btrim(p_nrp), btrim(p_pangkat), btrim(p_jabatan))
  returning id into v_id;

  insert into public.audit_logs (actor_account_id, actor_role, actor_username, action, object_type, object_id)
  select a.id, a.role::text, a.username, 'PERSONNEL_CREATED', 'personnel', v_id::text
  from public.accounts a where a.id = p_actor_account_id;

  return v_id;
end;
$$;

-- update_personnel (PRD 8.2, FR-09, FR-10). NRP tidak berubah.
create function public.update_personnel(
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
begin
  select role into v_role from public.accounts where id = p_account_id for update;
  if v_role is null then
    raise exception 'ACCOUNT_NOT_FOUND';
  end if;
  if v_role <> 'PERSONEL' then
    raise exception 'INVALID_ROLE';
  end if;
  if exists (select 1 from public.accounts where username = v_username and id <> p_account_id) then
    raise exception 'USERNAME_ALREADY_USED';
  end if;

  update public.accounts set
    nama = btrim(p_nama),
    pangkat = btrim(p_pangkat),
    jabatan = btrim(p_jabatan),
    username = v_username,
    updated_at = now()
  where id = p_account_id;

  insert into public.audit_logs (actor_account_id, actor_role, actor_username, action, object_type, object_id, metadata)
  select a.id, a.role::text, a.username, 'PERSONNEL_UPDATED', 'personnel', p_account_id::text,
         jsonb_build_object('fields', array['nama', 'pangkat', 'jabatan', 'username'])
  from public.accounts a where a.id = p_actor_account_id;
end;
$$;

-- delete_personnel (PRD 8.3, FR-51). Hapus Persit DISETUJUI + personel atomik.
create function public.delete_personnel(
  p_actor_account_id uuid,
  p_account_id uuid
) returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_role public.account_role;
  r record;
begin
  select role into v_role from public.accounts where id = p_account_id for update;
  if v_role is null then
    raise exception 'ACCOUNT_NOT_FOUND';
  end if;
  if v_role <> 'PERSONEL' then
    raise exception 'INVALID_ROLE';
  end if;

  -- Hapus akun Persit DISETUJUI terhubung + audit per akun.
  for r in
    select pl.persit_account_id
    from public.persit_links pl
    where pl.personnel_account_id = p_account_id and pl.status = 'DISETUJUI'
  loop
    delete from public.accounts where id = r.persit_account_id;
    insert into public.audit_logs (actor_account_id, actor_role, actor_username, action, object_type, object_id, metadata)
    select a.id, a.role::text, a.username, 'PERSIT_ACCOUNT_DELETED', 'persit_link', r.persit_account_id::text,
           jsonb_build_object('reason', 'PERSONNEL_DELETED', 'previous_status', 'DISETUJUI')
    from public.accounts a where a.id = p_actor_account_id;
  end loop;

  -- Hapus akun Personel (kaskade sesi, aktivitas, gps).
  delete from public.accounts where id = p_account_id;

  insert into public.audit_logs (actor_account_id, actor_role, actor_username, action, object_type, object_id)
  select a.id, a.role::text, a.username, 'PERSONNEL_DELETED', 'personnel', p_account_id::text
  from public.accounts a where a.id = p_actor_account_id;
end;
$$;

-- Grant: hanya service_role (PRD 4.5.4).
revoke all on function public.create_account(uuid, public.account_role, text, text, text, text, text, text) from public, anon, authenticated;
revoke all on function public.update_account(uuid, uuid, text, text, text, text) from public, anon, authenticated;
revoke all on function public.set_account_status(uuid, uuid, public.account_status) from public, anon, authenticated;
revoke all on function public.reset_account_password(uuid, uuid, text) from public, anon, authenticated;
revoke all on function public.change_own_password(uuid, text, uuid) from public, anon, authenticated;
revoke all on function public.create_personnel(uuid, text, text, text, text, text, text) from public, anon, authenticated;
revoke all on function public.update_personnel(uuid, uuid, text, text, text, text) from public, anon, authenticated;
revoke all on function public.delete_personnel(uuid, uuid) from public, anon, authenticated;

grant execute on function public.create_account(uuid, public.account_role, text, text, text, text, text, text) to service_role;
grant execute on function public.update_account(uuid, uuid, text, text, text, text) to service_role;
grant execute on function public.set_account_status(uuid, uuid, public.account_status) to service_role;
grant execute on function public.reset_account_password(uuid, uuid, text) to service_role;
grant execute on function public.change_own_password(uuid, text, uuid) to service_role;
grant execute on function public.create_personnel(uuid, text, text, text, text, text, text) to service_role;
grant execute on function public.update_personnel(uuid, uuid, text, text, text, text) to service_role;
grant execute on function public.delete_personnel(uuid, uuid) to service_role;