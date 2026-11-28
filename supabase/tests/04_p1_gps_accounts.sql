-- GATEOPS pgTAP P1: GPS DENIED mempertahankan koordinat (FR-39), SA terakhir.
begin;
select plan(6);

insert into public.accounts (role, username, password_hash, nama)
values ('SUPER_ADMIN', 'p1_sa', 'x', 'Admin P1');
insert into public.accounts (role, username, password_hash, nama, nrp, pangkat, jabatan)
values ('KOMANDAN', 'p1_kmd', 'x', 'Komandan P1', '555555', 'Letkol', 'Kepala');
insert into public.accounts (role, username, password_hash, nama, nrp, pangkat, jabatan)
values ('PERSONEL', 'p1_person', 'x', 'Personel P1', '666666', 'Brigadir', 'Anggota');
insert into public.gates (name, location, qr_token_hash)
values ('Gate P1', 'Lokasi', 'hashp1');
insert into public.activities (personnel_account_id, exit_gate_id, exit_at, tujuan, keperluan, status)
select id, (select id from public.gates where name = 'Gate P1'), now(), 'Tujuan', 'Keperluan', 'AKTIF'
from public.accounts where username = 'p1_person';
insert into public.gps_locations (personnel_account_id, latitude, longitude, permission_state)
select id, -6.2, 106.8, 'GRANTED' from public.accounts where username = 'p1_person';

select public.report_gps(
  (select id from public.accounts where username = 'p1_person'),
  'DENIED', null, null
);

select is(
  (select latitude from public.gps_locations where personnel_account_id = (select id from public.accounts where username = 'p1_person')),
  -6.2,
  'DENIED tidak menghapus latitude'
);
select is(
  (select longitude from public.gps_locations where personnel_account_id = (select id from public.accounts where username = 'p1_person')),
  106.8,
  'DENIED tidak menghapus longitude'
);
select is(
  (select permission_state from public.gps_locations where personnel_account_id = (select id from public.accounts where username = 'p1_person')),
  'DENIED',
  'permission_state menjadi DENIED'
);
select throws_ok(
  $$ select public.set_account_status(
       (select id from public.accounts where username = 'p1_kmd'),
       (select id from public.accounts where username = 'p1_sa'),
       'NONAKTIF') $$,
  'P0001',
  'LAST_SUPER_ADMIN',
  'SA aktif terakhir tidak dapat dinonaktifkan'
);

select is(
  (select count(*)::integer from public.audit_logs
   where action = 'ACCOUNT_UPDATED'
     and object_id = (select id::text from public.accounts where username = 'p1_sa')),
  0,
  'update tanpa perubahan tidak menulis audit'
);
select public.update_account(
  (select id from public.accounts where username = 'p1_kmd'),
  (select id from public.accounts where username = 'p1_sa'),
  'Admin P1 Baru', null, null, 'p1_sa'
);
select is(
  (select metadata->'fields' from public.audit_logs
   where action = 'ACCOUNT_UPDATED'
     and object_id = (select id::text from public.accounts where username = 'p1_sa')),
  '["nama"]'::jsonb,
  'audit hanya mencatat field yang berubah'
);

select finish();
rollback;
