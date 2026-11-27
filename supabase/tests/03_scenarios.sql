-- GATEOPS pgTAP: rollback audit & penghapusan personel atomik (S-08, S-13).
begin;
select plan(9);

insert into public.accounts (role, username, password_hash, nama)
values ('SUPER_ADMIN', 'pgtap_sa', 'x', 'Admin Uji');
insert into public.accounts (role, username, password_hash, nama, nrp, pangkat, jabatan)
values ('PERSONEL', 'pgtap_del', 'x', 'Personel Hapus', '888888', 'Brigadir', 'Anggota');
insert into public.accounts (role, username, password_hash, nama)
values ('PERSIT', 'pgtap_persit_del', 'x', 'Persit Hapus');
insert into public.accounts (role, username, password_hash, nama, nrp, pangkat, jabatan)
values ('PERSONEL', 'pgtap_noform', 'x', 'Tanpa Form', '777777', 'Brigadir', 'Anggota');
insert into public.gates (name, location, qr_token_hash)
values ('Gate Hapus', 'Lokasi', 'hashhapus');
insert into public.activities (personnel_account_id, exit_gate_id, exit_at, tujuan, keperluan, status)
select id, (select id from public.gates where name = 'Gate Hapus'), now(), 'Tujuan', 'Keperluan', 'AKTIF'
from public.accounts where username = 'pgtap_del';
insert into public.gps_locations (personnel_account_id, latitude, longitude, permission_state)
select id, -6.2, 106.8, 'GRANTED' from public.accounts where username = 'pgtap_del';
insert into public.sessions (account_id, token_hash, expires_at)
select id, 'rahasia-sesi', now() + interval '12 hours' from public.accounts where username = 'pgtap_del';
insert into public.persit_links (persit_account_id, requested_nrp, personnel_account_id, status)
select p.id, '888888', d.id, 'DISETUJUI'
from public.accounts p, public.accounts d
where p.username = 'pgtap_persit_del' and d.username = 'pgtap_del';

-- S-08: RPC gagal tidak menulis audit.
select is(
  (select count(*)::integer from public.audit_logs
   where action = 'ATTENDANCE_EXIT'
     and object_id = (select id::text from public.accounts where username = 'pgtap_del')),
  0,
  'belum ada audit keluar'
);
select throws_ok(
  $$ select public.record_attendance(
       (select id from public.accounts where username = 'pgtap_noform'),
       (select id from public.gates where name = 'Gate Hapus'), '', '') $$,
  'P0001',
  'FORM_INCOMPLETE',
  'form tidak lengkap ditolak'
);
select is(
  (select count(*)::integer from public.audit_logs
   where action = 'ATTENDANCE_EXIT'
     and object_id = (select id::text from public.accounts where username = 'pgtap_del')),
  0,
  'audit tidak bertambah saat RPC gagal'
);

-- S-13: hapus personel menghapus aktivitas, GPS, sesi, dan link Persit.
select lives_ok(
  $$ select public.delete_personnel(
       (select id from public.accounts where username = 'pgtap_sa'),
       (select id from public.accounts where username = 'pgtap_del')) $$,
  'delete_personnel berhasil'
);
select is(
  (select count(*)::integer from public.accounts where username = 'pgtap_del'),
  0,
  'akun personel terhapus'
);
select is(
  (select count(*)::integer from public.activities a
   where not exists (select 1 from public.accounts x where x.id = a.personnel_account_id)),
  0,
  'aktivitas personel terhapus'
);
select is(
  (select count(*)::integer from public.gps_locations g
   where not exists (select 1 from public.accounts x where x.id = g.personnel_account_id)),
  0,
  'GPS personel terhapus'
);
select is(
  (select count(*)::integer from public.sessions s
   where not exists (select 1 from public.accounts x where x.id = s.account_id)),
  0,
  'sesi personel terhapus'
);
select is(
  (select count(*)::integer from public.persit_links l
   where not exists (select 1 from public.accounts x where x.id = l.personnel_account_id)),
  0,
  'link Persit terhapus'
);

select finish();
rollback;