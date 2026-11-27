-- GATEOPS: increment atomik counter login gagal (PRD 7.3.4, FR-05).
-- Mencegah lost update pada lockout 5 kegagalan / 15 menit saat request paralel.
-- SECURITY DEFINER: hanya dipanggil service_role; search_path dipasang eksplisit.

create or replace function public.register_failed_login(p_account_id uuid)
returns table (failed_login_count integer, locked_until timestamptz)
language sql
security definer
set search_path = public, pg_temp
as $$
  update public.accounts
     set failed_login_count = accounts.failed_login_count + 1,
         locked_until = case
           when accounts.failed_login_count + 1 >= 5 then now() + interval '15 minutes'
           else accounts.locked_until
         end,
         updated_at = now()
   where accounts.id = p_account_id
  returning accounts.failed_login_count, accounts.locked_until;
$$;

revoke all on function public.register_failed_login(uuid) from public, anon, authenticated;
grant execute on function public.register_failed_login(uuid) to service_role;