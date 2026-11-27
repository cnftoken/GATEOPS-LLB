-- GATEOPS: bootstrap Super Admin pertama secara atomik & idempotent.
-- Rujukan: PRD 25.3.10. Advisory lock mencegah dua SA saat konkuren.

create function public.bootstrap_admin(
  p_username text,
  p_password_hash text,
  p_nama text
) returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_id uuid;
  v_count integer;
begin
  perform pg_advisory_xact_lock(4242);
  select count(*) into v_count from public.accounts
    where role = 'SUPER_ADMIN' and status = 'AKTIF';
  if v_count > 0 then
    return null;
  end if;

  insert into public.accounts (role, username, password_hash, nama)
  values ('SUPER_ADMIN', lower(p_username), p_password_hash, btrim(p_nama))
  returning id into v_id;
  return v_id;
end;
$$;

revoke all on function public.bootstrap_admin(text, text, text) from public, anon, authenticated;
grant execute on function public.bootstrap_admin(text, text, text) to service_role;