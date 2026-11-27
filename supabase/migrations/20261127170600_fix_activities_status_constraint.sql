-- GATEOPS: perbaikan forward-only constraint status activities.
-- Constraint AKTIF dan SELESAI sebelumnya dipisah sehingga saling eksklusif dan
-- menolak semua baris. Digabung menjadi satu CHECK dengan OR (PRD 6.4).
-- Expand-contract: migrasi lama tidak diubah (AGENTS 7.5).

alter table public.activities drop constraint if exists activities_aktif_fields;
alter table public.activities drop constraint if exists activities_selesai_fields;

alter table public.activities
  add constraint activities_status_fields check (
    (
      status = 'AKTIF'
      and return_at is null
      and return_gate_id is null
      and duration_seconds is null
    )
    or
    (
      status = 'SELESAI'
      and return_at is not null
      and return_gate_id is not null
      and duration_seconds is not null
      and return_at >= exit_at
    )
  );