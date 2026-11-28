-- GATEOPS: audit update_account hanya mencatat field yang benar-benar berubah (PRD 16.3).
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
  v_old public.accounts;
  v_changed text[] := array[]::text[];
begin
  select * into v_old from public.accounts where id = p_account_id for update;
  if v_old.id is null then
    raise exception 'ACCOUNT_NOT_FOUND';
  end if;
  v_role := v_old.role;
  if v_role not in ('SUPER_ADMIN', 'KOMANDAN') then
    raise exception 'INVALID_ROLE';
  end if;
  if exists (select 1 from public.accounts where username = v_username and id <> p_account_id) then
    raise exception 'USERNAME_ALREADY_USED';
  end if;

  if v_old.nama is distinct from btrim(p_nama) then v_changed := v_changed || 'nama'; end if;
  if v_old.username is distinct from v_username then v_changed := v_changed || 'username'; end if;
  if v_role = 'KOMANDAN' then
    if v_old.pangkat is distinct from nullif(btrim(p_pangkat), '') then v_changed := v_changed || 'pangkat'; end if;
    if v_old.jabatan is distinct from nullif(btrim(p_jabatan), '') then v_changed := v_changed || 'jabatan'; end if;
  end if;

  update public.accounts set
    nama = btrim(p_nama),
    pangkat = case when v_role = 'KOMANDAN' then nullif(btrim(p_pangkat), '') else null end,
    jabatan = case when v_role = 'KOMANDAN' then nullif(btrim(p_jabatan), '') else null end,
    username = v_username,
    updated_at = now()
  where id = p_account_id;

  if array_length(v_changed, 1) is not null then
    insert into public.audit_logs (actor_account_id, actor_role, actor_username, action, object_type, object_id, metadata)
    select a.id, a.role::text, a.username, 'ACCOUNT_UPDATED', 'account', p_account_id::text,
           jsonb_build_object('fields', v_changed)
    from public.accounts a where a.id = p_actor_account_id;
  end if;
exception
  when unique_violation then
    raise exception 'CONFLICT';
end;
$$;
