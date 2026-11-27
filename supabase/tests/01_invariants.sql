-- GATEOPS pgTAP: RLS/grant, audit append-only, invariant, RPC behavior.
-- Rujukan: PRD 6.7, 6.8, 10.9, 27.2 S-08/S-18, AGENTS 7.2/10.2.
begin;
select plan(17);

-- 1.8/1.9 RLS aktif pada seluruh tabel, tanpa policy anon/authenticated.
select ok(
  (select relrowsecurity from pg_class where oid = 'public.accounts'::regclass),
  'accounts RLS aktif'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.gates'::regclass),
  'gates RLS aktif'
);
select is(
  (select count(*)::integer from pg_policies where schemaname = 'public'),
  0,
  'tidak ada policy anon/authenticated'
);

-- 1.31/1.8 Grant RPC hanya service_role.
select is(
  (select count(*)::integer from information_schema.routine_privileges
   where routine_schema = 'public' and routine_name = 'record_attendance' and grantee = 'anon'),
  0,
  'anon tidak dapat eksekusi record_attendance'
);
select is(
  (select count(*)::integer from information_schema.routine_privileges
   where routine_schema = 'public' and routine_name = 'record_attendance' and grantee = 'authenticated'),
  0,
  'authenticated tidak dapat eksekusi record_attendance'
);
select ok(
  (select count(*)::integer > 0 from information_schema.routine_privileges
   where routine_schema = 'public' and routine_name = 'record_attendance' and grantee = 'service_role'),
  'service_role dapat eksekusi record_attendance'
);

-- 1.35 Audit append-only (UPDATE/DELETE ditolak).
insert into public.audit_logs (action, object_type) values ('TEST_APPEND', 'test');
select throws_ok(
  $$ update public.audit_logs set action = 'X' where action = 'TEST_APPEND' $$,
  'P0001',
  'AUDIT_APPEND_ONLY',
  'audit UPDATE ditolak'
);
select throws_ok(
  $$ delete from public.audit_logs where action = 'TEST_APPEND' $$,
  'P0001',
  'AUDIT_APPEND_ONLY',
  'audit DELETE ditolak'
);

-- Data uji: tiga personel terpisah + satu gate.
insert into public.accounts (role, username, password_hash, nama, nrp, pangkat, jabatan) values
  ('PERSONEL', 'pgtap_p1', 'x', 'Personel Satu', '111111', 'Brigadir', 'Anggota'),
  ('PERSONEL', 'pgtap_p2', 'x', 'Personel Dua', '222222', 'Brigadir', 'Anggota'),
  ('PERSONEL', 'pgtap_p3', 'x', 'Personel Tiga', '333333', 'Brigadir', 'Anggota');
insert into public.gates (name, location, qr_token_hash) values ('Gate Uji pgTAP', 'Lokasi Uji', 'hashgateuji');

-- 1.30 report_gps menolak bila tidak DI LUAR (NOT_OUT) — P1 belum punya aktivitas.
select throws_ok(
  $$ select public.report_gps(
       (select id from public.accounts where username = 'pgtap_p1'),
       'GRANTED', null, null) $$,
  'P0001',
  'NOT_OUT',
  'report_gps tanpa aktivitas AKTIF ditolak'
);

-- 1.29 record_attendance FORM_INCOMPLETE bila tujuan/keperluan kosong — P1.
select throws_ok(
  $$ select public.record_attendance(
       (select id from public.accounts where username = 'pgtap_p1'),
       (select id from public.gates where name = 'Gate Uji pgTAP'), '', '') $$,
  'P0001',
  'FORM_INCOMPLETE',
  'form tidak lengkap ditolak'
);

-- 1.36 Invariant: satu aktivitas AKTIF per Personel — P2.
insert into public.activities (personnel_account_id, exit_gate_id, exit_at, tujuan, keperluan, status)
select id, (select id from public.gates where name = 'Gate Uji pgTAP'), now(), 'Tujuan', 'Keperluan', 'AKTIF'
from public.accounts where username = 'pgtap_p2';
select throws_ok(
  $$ insert into public.activities (personnel_account_id, exit_gate_id, exit_at, tujuan, keperluan, status)
     select id, (select id from public.gates where name = 'Gate Uji pgTAP'), now(), 'Tujuan2', 'Keperluan2', 'AKTIF'
     from public.accounts where username = 'pgtap_p2' $$,
  '23505',
  null,
  'dua aktivitas AKTIF ditolak'
);

-- 1.29/1.37 record_attendance KELUAR lalu KEMBALI atomik — P3.
select lives_ok(
  $$ select public.record_attendance(
       (select id from public.accounts where username = 'pgtap_p3'),
       (select id from public.gates where name = 'Gate Uji pgTAP'), 'Tujuan', 'Keperluan') $$,
  'record_attendance KELUAR berhasil'
);
select is(
  (select status::text from public.activities
   where personnel_account_id = (select id from public.accounts where username = 'pgtap_p3')),
  'AKTIF',
  'status aktivitas AKTIF setelah keluar'
);
select isnt_empty(
  $$ select 1 from public.gps_locations
     where personnel_account_id = (select id from public.accounts where username = 'pgtap_p3') $$,
  'baris gps dibuat saat keluar'
);
select lives_ok(
  $$ select public.record_attendance(
       (select id from public.accounts where username = 'pgtap_p3'),
       (select id from public.gates where name = 'Gate Uji pgTAP'), '', '') $$,
  'record_attendance KEMBALI berhasil'
);
select is(
  (select status::text from public.activities
   where personnel_account_id = (select id from public.accounts where username = 'pgtap_p3')),
  'SELESAI',
  'status aktivitas SELESAI setelah kembali'
);
select is(
  (select count(*)::integer from public.gps_locations
   where personnel_account_id = (select id from public.accounts where username = 'pgtap_p3')),
  0,
  'baris gps dihapus setelah kembali'
);

select finish();
rollback;