-- GATEOPS: gates, activities, gps_locations, persit_links, audit_logs.
-- Rujukan: PRD 6.3-6.7, 6.8, 17.1. Satu migrasi satu transaksi (AGENTS 7.5).

create type public.gate_status as enum ('AKTIF', 'NONAKTIF');
create type public.activity_status as enum ('AKTIF', 'SELESAI');
create type public.location_permission as enum ('GRANTED', 'DENIED');
create type public.persit_link_status as enum ('MENUNGGU', 'DISETUJUI', 'DITOLAK');

-- Tabel gates (PRD 6.3).
create table public.gates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  location text not null,
  status public.gate_status not null default 'AKTIF',
  qr_token_hash text not null unique,
  qr_regenerated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint gates_name_len check (char_length(btrim(name)) between 3 and 100),
  constraint gates_location_len check (char_length(btrim(location)) between 1 and 200)
);

-- Tabel activities (PRD 6.4).
create table public.activities (
  id uuid primary key default gen_random_uuid(),
  personnel_account_id uuid not null references public.accounts (id) on delete cascade,
  exit_gate_id uuid not null references public.gates (id) on delete restrict,
  return_gate_id uuid references public.gates (id) on delete restrict,
  exit_at timestamptz not null,
  return_at timestamptz,
  tujuan text not null,
  keperluan text not null,
  status public.activity_status not null,
  duration_seconds integer,
  created_at timestamptz not null default now(),
  constraint activities_tujuan_len check (char_length(btrim(tujuan)) between 1 and 150),
  constraint activities_keperluan_len check (char_length(btrim(keperluan)) between 1 and 255),
  constraint activities_duration_nonneg check (duration_seconds is null or duration_seconds >= 0),
  constraint activities_aktif_fields check (
    status = 'AKTIF'
    and return_at is null and return_gate_id is null and duration_seconds is null
  ),
  constraint activities_selesai_fields check (
    status = 'SELESAI'
    and return_at is not null
    and return_gate_id is not null
    and duration_seconds is not null
    and return_at >= exit_at
  )
);

-- Satu aktivitas AKTIF per Personel (PRD 6.4, 6.8.1).
create unique index activities_one_active_idx
  on public.activities (personnel_account_id)
  where status = 'AKTIF';

create index activities_personnel_exit_idx on public.activities (personnel_account_id, exit_at desc);
create index activities_status_idx on public.activities (status);

-- Tabel gps_locations (PRD 6.5).
create table public.gps_locations (
  personnel_account_id uuid primary key references public.accounts (id) on delete cascade,
  latitude numeric(9, 6),
  longitude numeric(9, 6),
  permission_state public.location_permission not null,
  gps_updated_at timestamptz not null default now(),
  constraint gps_latitude_range check (latitude is null or (latitude between -90 and 90)),
  constraint gps_longitude_range check (longitude is null or (longitude between -180 and 180))
);

-- Tabel persit_links (PRD 6.6).
create table public.persit_links (
  persit_account_id uuid primary key references public.accounts (id) on delete cascade,
  requested_nrp text not null,
  personnel_account_id uuid references public.accounts (id) on delete restrict,
  status public.persit_link_status not null default 'MENUNGGU',
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint persit_links_requested_nrp_fmt check (requested_nrp ~ '^[0-9]{6,12}$'),
  constraint persit_links_status_fields check (
    (status = 'DISETUJUI' and personnel_account_id is not null)
    or
    (status in ('MENUNGGU', 'DITOLAK') and personnel_account_id is null)
  )
);

create index persit_links_personnel_idx on public.persit_links (personnel_account_id);
create index persit_links_status_idx on public.persit_links (status);

-- Tabel audit_logs (PRD 6.7). Append-only.
create table public.audit_logs (
  id bigint generated always as identity primary key,
  occurred_at timestamptz not null default now(),
  actor_account_id uuid,
  actor_role text,
  actor_username text,
  action text not null,
  object_type text not null,
  object_id text,
  metadata jsonb not null default '{}'::jsonb
);

create index audit_logs_occurred_at_idx on public.audit_logs (occurred_at desc);
create index audit_logs_action_idx on public.audit_logs (action);

-- Trigger append-only: tolak UPDATE dan DELETE (PRD 6.7, FR-53).
create function public.audit_logs_append_only()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  raise exception 'AUDIT_APPEND_ONLY';
end;
$$;

create trigger audit_logs_no_update
  before update on public.audit_logs
  for each row execute function public.audit_logs_append_only();

create trigger audit_logs_no_delete
  before delete on public.audit_logs
  for each row execute function public.audit_logs_append_only();

-- RLS aktif tanpa policy (PRD 4.5.1).
alter table public.gates enable row level security;
alter table public.activities enable row level security;
alter table public.gps_locations enable row level security;
alter table public.persit_links enable row level security;
alter table public.audit_logs enable row level security;

-- Cabut hak akses default (AGENTS 7.5).
revoke all on public.gates from public, anon, authenticated;
revoke all on public.activities from public, anon, authenticated;
revoke all on public.gps_locations from public, anon, authenticated;
revoke all on public.persit_links from public, anon, authenticated;
revoke all on public.audit_logs from public, anon, authenticated;
grant all on public.gates to service_role;
grant all on public.activities to service_role;
grant all on public.gps_locations to service_role;
grant all on public.persit_links to service_role;
grant all on public.audit_logs to service_role;