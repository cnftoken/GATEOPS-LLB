-- GATEOPS pgTAP: lockout login atomik (PRD 7.3.4, FR-05).
begin;
select plan(4);

insert into public.accounts (role, username, password_hash, nama, nrp, pangkat, jabatan)
values ('PERSONEL', 'pgtap_lock', 'x', 'Lock Test', '999999', 'Brigadir', 'Anggota');

select is(
  (select count(*)::integer from information_schema.routine_privileges
   where routine_schema = 'public' and routine_name = 'register_failed_login' and grantee in ('anon', 'authenticated')),
  0,
  'register_failed_login hanya untuk service_role'
);

select is(
  (select failed_login_count from public.register_failed_login(
     (select id from public.accounts where username = 'pgtap_lock'))),
  1,
  'counter bertambah satu'
);

select is(
  (select failed_login_count from public.register_failed_login(
     (select id from public.accounts where username = 'pgtap_lock'))),
  2,
  'counter bertambah dua'
);

select public.register_failed_login((select id from public.accounts where username = 'pgtap_lock'));
select public.register_failed_login((select id from public.accounts where username = 'pgtap_lock'));
select public.register_failed_login((select id from public.accounts where username = 'pgtap_lock'));

select isnt_empty(
  $$ select 1 from public.accounts
     where username = 'pgtap_lock' and locked_until is not null
       and locked_until > now() $$,
  'lockout 15 menit aktif pada kegagalan kelima'
);

select finish();
rollback;