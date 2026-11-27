-- GATEOPS: extensions, enums, accounts, sessions.
-- Rujukan: PRD 6.1, 6.2, 6.8. Satu migrasi satu transaksi (AGENTS 7.5).
-- SECURITY: RLS aktif tanpa policy (PRD 4.5). Hak akses default dicabut di migrasi ini.

create extension if not exists pgcrypto;

-- Enums (nilai UPPER_SNAKE_CASE, AGENTS 8.1).
create type public.account_role as enum ('SUPER_ADMIN', 'KOMANDAN', 'PERSONEL', 'PERSIT');
create type public.account_status as enum ('AKTIF', 'NONAKTIF');

-- Tabel accounts (PRD 6.1).
create table public.accounts (
  id uuid primary key default gen_random_uuid(),
  role public.account_role not null,
  username text not null,
  password_hash text not null,
  nama text not null,
  nrp text,
  pangkat text,
  jabatan text,
  status public.account_status not null default 'AKTIF',
  must_change_password boolean not null default false,
  failed_login_count integer not null default 0,
  locked_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint accounts_username_key unique (username),
  constraint accounts_username_fmt check (username ~ '^[a-z][a-z0-9._]{2,31}$'),
  constraint accounts_nama_len check (char_length(btrim(nama)) between 3 and 100),
  constraint accounts_nrp_fmt check (nrp is null or nrp ~ '^[0-9]{6,12}$'),
  constraint accounts_failed_login_nonneg check (failed_login_count >= 0),
  constraint accounts_role_fields check (
    (
      role in ('SUPER_ADMIN', 'PERSIT')
      and nrp is null and pangkat is null and jabatan is null
    )
    or
    (
      role in ('KOMANDAN', 'PERSONEL')
      and nrp is not null
      and char_length(btrim(pangkat)) between 1 and 100
      and char_length(btrim(jabatan)) between 1 and 100
    )
  )
);

-- NRP unik di seluruh baris KOMANDAN/PERSONEL (PRD 6.1).
create unique index accounts_nrp_uniq
  on public.accounts (nrp)
  where role in ('KOMANDAN', 'PERSONEL');

-- Tabel sessions (PRD 6.2).
create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts (id) on delete cascade,
  token_hash text not null unique,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked_at timestamptz
);

create index sessions_account_id_idx on public.sessions (account_id);
create index sessions_expires_at_idx on public.sessions (expires_at);

-- RLS aktif tanpa policy (PRD 4.5.1).
alter table public.accounts enable row level security;
alter table public.sessions enable row level security;

-- Cabut hak akses default (AGENTS 7.5).
revoke all on public.accounts from public, anon, authenticated;
revoke all on public.sessions from public, anon, authenticated;
grant all on public.accounts to service_role;
grant all on public.sessions to service_role;