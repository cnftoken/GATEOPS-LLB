-- GATEOPS: RPC gates & persit. Transaksional, search_path, grant service_role.
-- Rujukan: PRD 9.2-9.4, 15.1, 15.3, 15.4, 17. Audit in-transaction.

-- create_gate (PRD 9.2, FR-16, FR-19).
create function public.create_gate(
  p_actor_account_id uuid,
  p_name text,
  p_location text,
  p_status public.gate_status,
  p_qr_token_hash text
) returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_id uuid;
begin
  insert into public.gates (name, location, status, qr_token_hash)
  values (btrim(p_name), btrim(p_location), p_status, p_qr_token_hash)
  returning id into v_id;

  insert into public.audit_logs (actor_account_id, actor_role, actor_username, action, object_type, object_id)
  select a.id, a.role::text, a.username, 'GATE_CREATED', 'gate', v_id::text
  from public.accounts a where a.id = p_actor_account_id;

  return v_id;
end;
$$;

-- update_gate (PRD 9.4, FR-16).
create function public.update_gate(
  p_actor_account_id uuid,
  p_gate_id uuid,
  p_name text,
  p_location text,
  p_status public.gate_status
) returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not exists (select 1 from public.gates where id = p_gate_id for update) then
    raise exception 'GATE_NOT_FOUND';
  end if;

  update public.gates set
    name = btrim(p_name),
    location = btrim(p_location),
    status = p_status,
    updated_at = now()
  where id = p_gate_id;

  insert into public.audit_logs (actor_account_id, actor_role, actor_username, action, object_type, object_id, metadata)
  select a.id, a.role::text, a.username, 'GATE_UPDATED', 'gate', p_gate_id::text,
         jsonb_build_object('fields', array['name', 'location', 'status'])
  from public.accounts a where a.id = p_actor_account_id;
end;
$$;

-- regenerate_gate_qr (PRD 9.3, FR-20). Token mentah tidak disimpan.
create function public.regenerate_gate_qr(
  p_actor_account_id uuid,
  p_gate_id uuid,
  p_qr_token_hash text
) returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not exists (select 1 from public.gates where id = p_gate_id for update) then
    raise exception 'GATE_NOT_FOUND';
  end if;

  update public.gates set
    qr_token_hash = p_qr_token_hash,
    qr_regenerated_at = now(),
    updated_at = now()
  where id = p_gate_id;

  insert into public.audit_logs (actor_account_id, actor_role, actor_username, action, object_type, object_id)
  select a.id, a.role::text, a.username, 'GATE_QR_REGENERATED', 'gate', p_gate_id::text
  from public.accounts a where a.id = p_actor_account_id;
end;
$$;

-- register_persit (PRD 15.1, FR-48). Publik; NRP wajib terdaftar.
create function public.register_persit(
  p_nrp text,
  p_nama text,
  p_username text,
  p_password_hash text
) returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_username text := lower(p_username);
  v_nrp text := btrim(p_nrp);
  v_id uuid;
begin
  if not exists (select 1 from public.accounts where role = 'PERSONEL' and nrp = v_nrp) then
    raise exception 'NRP_NOT_REGISTERED';
  end if;
  if exists (select 1 from public.accounts where username = v_username) then
    raise exception 'USERNAME_ALREADY_USED';
  end if;

  insert into public.accounts (role, username, password_hash, nama)
  values ('PERSIT', v_username, p_password_hash, btrim(p_nama))
  returning id into v_id;

  insert into public.persit_links (persit_account_id, requested_nrp, status)
  values (v_id, v_nrp, 'MENUNGGU');

  insert into public.audit_logs (actor_account_id, actor_role, actor_username, action, object_type, object_id)
  values (v_id, 'PERSIT', v_username, 'PERSIT_REGISTERED', 'persit_link', v_id::text);

  return v_id;
end;
$$;

-- approve_persit (PRD 15.3, FR-49).
create function public.approve_persit(
  p_actor_account_id uuid,
  p_persit_account_id uuid
) returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_status public.persit_link_status;
  v_nrp text;
  v_personnel_id uuid;
begin
  select status, requested_nrp into v_status, v_nrp
  from public.persit_links where persit_account_id = p_persit_account_id for update;
  if v_status is null then
    raise exception 'PERSIT_LINK_NOT_FOUND';
  end if;
  if v_status <> 'MENUNGGU' then
    raise exception 'PERSIT_NOT_PENDING';
  end if;

  select id into v_personnel_id from public.accounts
    where role = 'PERSONEL' and nrp = v_nrp;
  if v_personnel_id is null then
    raise exception 'NRP_NOT_FOUND';
  end if;

  update public.persit_links set
    status = 'DISETUJUI',
    personnel_account_id = v_personnel_id,
    reviewed_by = p_actor_account_id,
    reviewed_at = now()
  where persit_account_id = p_persit_account_id;

  insert into public.audit_logs (actor_account_id, actor_role, actor_username, action, object_type, object_id)
  select a.id, a.role::text, a.username, 'PERSIT_APPROVED', 'persit_link', p_persit_account_id::text
  from public.accounts a where a.id = p_actor_account_id;
end;
$$;

-- reject_persit (PRD 15.3, FR-49).
create function public.reject_persit(
  p_actor_account_id uuid,
  p_persit_account_id uuid
) returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_status public.persit_link_status;
begin
  select status into v_status from public.persit_links
  where persit_account_id = p_persit_account_id for update;
  if v_status is null then
    raise exception 'PERSIT_LINK_NOT_FOUND';
  end if;
  if v_status <> 'MENUNGGU' then
    raise exception 'PERSIT_NOT_PENDING';
  end if;

  update public.persit_links set
    status = 'DITOLAK',
    reviewed_by = p_actor_account_id,
    reviewed_at = now()
  where persit_account_id = p_persit_account_id;

  insert into public.audit_logs (actor_account_id, actor_role, actor_username, action, object_type, object_id)
  select a.id, a.role::text, a.username, 'PERSIT_REJECTED', 'persit_link', p_persit_account_id::text
  from public.accounts a where a.id = p_actor_account_id;
end;
$$;

-- delete_persit_account (PRD 15.4, FR-49).
create function public.delete_persit_account(
  p_actor_account_id uuid,
  p_persit_account_id uuid
) returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_role public.account_role;
  v_prev public.persit_link_status;
begin
  select role into v_role from public.accounts where id = p_persit_account_id for update;
  if v_role is null then
    raise exception 'ACCOUNT_NOT_FOUND';
  end if;
  if v_role <> 'PERSIT' then
    raise exception 'INVALID_ROLE';
  end if;

  select status into v_prev from public.persit_links where persit_account_id = p_persit_account_id;

  delete from public.accounts where id = p_persit_account_id;

  insert into public.audit_logs (actor_account_id, actor_role, actor_username, action, object_type, object_id, metadata)
  select a.id, a.role::text, a.username, 'PERSIT_ACCOUNT_DELETED', 'persit_link', p_persit_account_id::text,
         jsonb_build_object('previous_status', coalesce(v_prev::text, 'NONE'))
  from public.accounts a where a.id = p_actor_account_id;
end;
$$;

revoke all on function public.create_gate(uuid, text, text, public.gate_status, text) from public, anon, authenticated;
revoke all on function public.update_gate(uuid, uuid, text, text, public.gate_status) from public, anon, authenticated;
revoke all on function public.regenerate_gate_qr(uuid, uuid, text) from public, anon, authenticated;
revoke all on function public.register_persit(text, text, text, text) from public, anon, authenticated;
revoke all on function public.approve_persit(uuid, uuid) from public, anon, authenticated;
revoke all on function public.reject_persit(uuid, uuid) from public, anon, authenticated;
revoke all on function public.delete_persit_account(uuid, uuid) from public, anon, authenticated;

grant execute on function public.create_gate(uuid, text, text, public.gate_status, text) to service_role;
grant execute on function public.update_gate(uuid, uuid, text, text, public.gate_status) to service_role;
grant execute on function public.regenerate_gate_qr(uuid, uuid, text) to service_role;
grant execute on function public.register_persit(text, text, text, text) to service_role;
grant execute on function public.approve_persit(uuid, uuid) to service_role;
grant execute on function public.reject_persit(uuid, uuid) to service_role;
grant execute on function public.delete_persit_account(uuid, uuid) to service_role;