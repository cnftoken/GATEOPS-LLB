# To-dos.md: Checklist Pengembangan GATEOPS

File ini adalah checklist kerja terstruktur dari awal sampai akhir untuk setiap agen (manusia atau AI) yang membangun, menguji, atau men-deploy GATEOPS. Setiap item merujuk bagian `PRD.md` dan/atau ID kebutuhan fungsional (FR) dan skenario (S) yang menjadi dasar penerimaannya.

---

## 0. Cara Pakai

### 0.1 Hierarki Sumber

1. `PRD.md` adalah sumber kebenaran tunggal untuk produk, perilaku, data, API, dan batasan.
2. `To-dos.md` (file ini) adalah urutan kerja dan daftar periksa progres.
3. `AGENTS.md` adalah aturan cara kerja.

Jika ada pertentangan, `PRD.md` menang. Jika PRD tidak mengatur sesuatu, agen WAJIB berhenti dan melaporkan sesuai `AGENTS.md` Bagian 13. Agen DILARANG menambah `TODO`, `FIXME`, atau `TBD` untuk menunda keputusan produk.

### 0.2 Legenda Status

| Tanda | Arti |
|---|---|
| `[ ]` | Belum dikerjakan |
| `[~]` | Sedang dikerjakan |
| `[x]` | Selesai dan terverifikasi (tes/gerbang lulus) |
| `[!]` | Terblokir, menunggu keputusan produk atau prasyarat eksternal |

### 0.3 Aturan Pengisian

1. Agen WAJIB membaca `PRD.md` bagian relevan dan file ini sebelum menulis kode.
2. Agen WAJIB menandai `[~]` saat mulai dan `[x]` hanya setelah bukti (tes/gerbang) tersedia. `[x]` tanpa bukti DILARANG.
3. Setiap perubahan WAJIB mencatat baris baru di tabel Log Perubahan (Bagian 12).
4. Item yang menyentuh data, audit, akses, atau secret WAJIB melewati Checklist Keamanan (Bagian 11) dan `AGENTS.md` Bagian 9.
5. Item `[!]` WAJIB disertai catatan kondisi dan bagian PRD yang menantang.

---

## 1. Fase 0 — Fondasi Repository

Rujukan: PRD 4.3, 4.4, 25.1, 25.4.

- [x] 0.1 — Buat struktur direktori `apps/web` (app, components, lib, tests, `middleware.ts`) — PRD 4.4
- [x] 0.2 — Buat struktur `supabase` (config.toml, migrations, functions/_shared + domain, seed, tests) — PRD 4.4
- [x] 0.3 — Buat `scripts/` (setup.ts, doctor.ts, release.ts, seed-demo.ts) — PRD 4.4, 25.2
- [x] 0.4 — Buat `docs/ops/` (restore.md, releases.md) — PRD 24.4, 26.6
- [x] 0.5 — Buat `.github/workflows/` untuk gerbang CI — PRD 27.3
- [x] 0.6 — `package.json` root + `pnpm-workspace.yaml` (pnpm 9) — PRD 4.3
- [x] 0.7 — `tsconfig` strict di seluruh workspace, dilarang `any` — PRD 4.3, AGENTS 8.2
- [x] 0.8 — `.env.example` berisi nama variabel tanpa nilai — PRD 25.4
- [x] 0.9 — `.gitignore` untuk `.env.local`, `.vercel/`, `.local/`, `.setup/` — PRD 25.4, 25.7
- [x] 0.10 — Konfigurasi tooling: ESLint, Prettier, Vitest, Deno, Playwright — PRD 4.3, 27.1
- [x] 0.11 — `pnpm install` menghasilkan `pnpm-lock.yaml` yang di-commit — PRD 4.3

---

## 2. Fase 1 — Migrasi Database

Rujukan: PRD 6, 4.5, 7.5, 26.5. Pola expand-contract, forward-only, satu migrasi satu transaksi.

### 2.1 Tabel

- [x] 1.1 — Migrasi `accounts` (kolom, enum role/status, constraint regex username & NRP, unik NRP) — PRD 6.1
- [x] 1.2 — Migrasi `sessions` (token_hash unik, expires_at, revoked_at) — PRD 6.2
- [x] 1.3 — Migrasi `gates` (qr_token_hash unik, qr_regenerated_at) — PRD 6.3
- [x] 1.4 — Migrasi `activities` (check status AKTIF/SELESAI, FK RESTRICT) — PRD 6.4
- [x] 1.5 — Migrasi `gps_locations` (PK personnel_account_id, rentang lat/long) — PRD 6.5
- [x] 1.6 — Migrasi `persit_links` (check status & personnel_account_id) — PRD 6.6
- [x] 1.7 — Migrasi `audit_logs` (bigint identity, metadata jsonb) + trigger BEFORE UPDATE/DELETE append-only — PRD 6.7, 17.1

### 2.2 RLS dan Grant

- [x] 1.8 — RLS aktif pada seluruh tabel, tanpa policy `anon`/`authenticated` — PRD 4.5, 6
- [x] 1.9 — Cabut hak akses default tabel dalam migrasi yang sama — AGENTS 7.5
- [x] 1.10 — Aktifkan ekstensi pgTAP (local/CI) dan pg_cron (production/local) — PRD 26.2

### 2.3 Constraint dan Index

- [x] 1.11 — Unique partial index `personnel_account_id WHERE status='AKTIF'` — PRD 6.4, 6.8
- [x] 1.12 — Constraint role SUPER_ADMIN/PERSIT memiliki nrp/pangkat/jabatan null — PRD 6.1
- [x] 1.13 — Index pendukung pencarian & filter (nama, NRP, username, waktu keluar) — PRD 8.2, 13.4

### 2.4 Fungsi RPC (transaksional, `search_path`, grant hanya `service_role`, audit in-transaction)

- [x] 1.14 — `create_account` (+ audit ACCOUNT_CREATED) — PRD 4.5, 16.2, FR-08
- [x] 1.15 — `update_account` (+ audit ACCOUNT_UPDATED) — PRD 16.3, FR-08
- [x] 1.16 — `set_account_status` (cabut sesi bila NONAKTIF, + audit ACCOUNT_STATUS_CHANGED) — PRD 7.10, FR-08
- [x] 1.17 — `reset_account_password` (hash sementara, must_change_password, cabut sesi, + audit PASSWORD_RESET) — PRD 7.8, FR-14
- [x] 1.18 — `change_own_password` (cabut sesi lain, + audit PASSWORD_CHANGED) — PRD 7.7, FR-13
- [x] 1.19 — `create_personnel` (+ audit PERSONNEL_CREATED) — PRD 8.2, FR-09
- [x] 1.20 — `update_personnel` (NRP tak berubah, + audit PERSONNEL_UPDATED) — PRD 8.2, FR-09, FR-10
- [x] 1.21 — `delete_personnel` (hapus Persit terverifikasi, sesi, aktivitas, GPS; + audit) — PRD 8.3, FR-51
- [x] 1.22 — `create_gate` (simpan hash QR, + audit GATE_CREATED) — PRD 9.2, FR-16, FR-19
- [x] 1.23 — `update_gate` (+ audit GATE_UPDATED) — PRD 9.4, FR-16
- [x] 1.24 — `regenerate_gate_qr` (ganti hash, batalkan lama, + audit GATE_QR_REGENERATED) — PRD 9.3, FR-20
- [x] 1.25 — `register_persit` (akun + permintaan MENUNGGU, + audit PERSIT_REGISTERED) — PRD 15.1, FR-48
- [x] 1.26 — `approve_persit` (+ audit PERSIT_APPROVED) — PRD 15.3, FR-49
- [x] 1.27 — `reject_persit` (+ audit PERSIT_REJECTED) — PRD 15.3, FR-49
- [x] 1.28 — `delete_persit_account` (cabut sesi, + audit PERSIT_ACCOUNT_DELETED) — PRD 15.4, FR-49
- [x] 1.29 — `record_attendance` (FOR UPDATE NOWAIT, KELUAR/KEMBALI atomik, gps, audit) — PRD 10.3, 10.4, 10.9, FR-26, FR-27, FR-32, FR-33
- [x] 1.30 — `report_gps` (UPSERT satu lokasi, NOT_OUT bila tak DI LUAR) — PRD 11.5, 22.8, FR-37
- [x] 1.31 — Setiap RPC: komentar FR/PRD, `SECURITY DEFINER/INVOKER` berjustifikasi, `SET search_path`, grant `service_role` — AGENTS 7.2, PRD 4.5

### 2.5 Penjadwalan

- [x] 1.32 — pg_cron pembersihan sesi kedaluwarsa >7 hari, harian — PRD 7.5, 24.7

### 2.6 pgTAP Database

- [x] 1.33 — pgTAP per RPC: jalur sukses, gagal, rollback, grant, search_path — AGENTS 7.2, 10.2
- [x] 1.34 — pgTAP RLS menolak akses `anon`/`authenticated` — PRD 27.2 S-18, FR-53
- [x] 1.35 — pgTAP audit append-only (UPDATE/DELETE ditolak) — PRD 6.7, FR-53
- [x] 1.36 — pgTAP invariant (satu aktivitas AKTIF, gps hanya saat DI LUAR, minimal satu Super Admin AKTIF) — PRD 6.8
- [x] 1.37 — pgTAP rollback transaksi atomik (activities+gps+audit) — PRD 10.9, S-08, FR-26, FR-52

---

## 3. Fase 2 — `_shared` Edge Functions

Rujukan: PRD 4.4, 7.1, 7.2, 8, 22.3, 22.4.

- [x] 2.1 — Modul sesi/auth (SHA-256 token, cek revoked/expires/idle 2 jam/status) — PRD 7.5, FR-07
- [x] 2.2 — PBKDF2-HMAC-SHA256 600.000 iterasi via Web Crypto, format `pbkdf2_sha256$...`, constant-time — PRD 7.2, FR-12
- [x] 2.3 — Pembuat respons sukses/galat + `requestId` — PRD 22.3, 22.6
- [x] 2.4 — Kode galat terpusat (daftar PRD 22.4) + handler `INTERNAL_ERROR` — PRD 22.4, AGENTS 8.4
- [x] 2.5 — Logger JSON dengan daftar kunci terlarang (password, token, secret, lat/long, tujuan, keperluan) — PRD 8.5, 24.5, FR keamanan
- [x] 2.6 — `messages.ts` server (semua teks PRD persis) — PRD 8.7, AGENTS 8.7
- [x] 2.7 — Konstanta validasi (panjang/format PRD 6 & 7) + normalisasi — PRD 8.6
- [x] 2.8 — Verifikasi `X-Internal-Secret` constant-time — PRD 4.6, 7.1

---

## 4. Fase 3 — Edge Functions per Domain

Rujukan: PRD 22.5 (daftar endpoint), 7.1 (urutan), 5.2 (matriks akses). Setiap endpoint: cek internal secret → sesi → must_change_password → role → validasi → RPC/query → cakupan data → respons → log.

### 4.1 auth

- [x] 3.1 — `POST /auth/login` (lockout, dummy hash, cookie via BFF) — PRD 7.3, 7.4, FR-01, FR-05
- [x] 3.2 — `POST /auth/logout` (cabut sesi) — PRD 7.6
- [x] 3.3 — `GET /auth/me` (data akun & role) — PRD 22.5
- [x] 3.4 — `POST /auth/password` (ganti sendiri, beda dari lama) — PRD 7.7, FR-13

### 4.2 dashboard

- [x] 3.5 — `GET /dashboard/komando` (statistik, DI LUAR, peta, aktivitas terbaru) — PRD 12.1, FR-04
- [x] 3.6 — `GET /dashboard/beranda` (status + ringkasan pribadi) — PRD 12.2, FR-04
- [x] 3.7 — `GET /dashboard/keluarga` (status pengaitan + personel terhubung, tanpa GPS) — PRD 12.3, 15.6, FR-50

### 4.3 personnel

- [x] 3.8 — `GET /personnel` (paginasi, cari, urut nama) — PRD 8.2
- [x] 3.9 — `POST /personnel` (SA) — PRD 8.2, FR-09
- [x] 3.10 — `GET /personnel/:id` — PRD 8.2
- [x] 3.11 — `PATCH /personnel/:id` (nama/pangkat/jabatan/username) — PRD 8.2, FR-09, FR-10
- [x] 3.12 — `DELETE /personnel/:id` (permanen) — PRD 8.3, FR-51

### 4.4 accounts

- [x] 3.13 — `GET /accounts` (filter role/status, cari, paginasi) — PRD 16.1
- [x] 3.14 — `POST /accounts` (buat SA/KMD) — PRD 16.2, FR-08
- [x] 3.15 — `PATCH /accounts/:id` — PRD 16.3, FR-08
- [x] 3.16 — `POST /accounts/:id/status` (tolak nonaktifkan diri/SA terakhir/DI LUAR) — PRD 7.10, FR-08
- [x] 3.17 — `POST /accounts/:id/reset-password` (sementara 12 char sekali) — PRD 7.8, FR-14

### 4.5 gates

- [x] 3.18 — `GET /gates` (KMD baca saja) — PRD 9.6
- [x] 3.19 — `POST /gates` (token mentah sekali) — PRD 9.2, FR-16, FR-17, FR-18
- [x] 3.20 — `GET /gates/:id` (tanpa token mentah/QR lama) — PRD 9.6
- [x] 3.21 — `PATCH /gates/:id` (nama/lokasi/status) — PRD 9.4, FR-16
- [x] 3.22 — `POST /gates/:id/regenerate-qr` (token mentah sekali) — PRD 9.3, FR-18, FR-20

### 4.6 transactions

- [x] 3.23 — `POST /transactions/scan` (validasi QR 9.5, FORM_INCOMPLETE, panggil record_attendance) — PRD 10, FR-22, FR-25, FR-28, FR-32, FR-33

### 4.7 gps

- [x] 3.24 — `POST /gps/report` (GRANTED/DENIED, NOT_OUT, tanpa audit) — PRD 11.2, 11.5, 22.8, FR-37
- [x] 3.25 — `GET /gps` (daftar DI LUAR + status GPS dihitung server) — PRD 11.4, 11.8, FR-38, FR-39, FR-40

### 4.8 activities

- [x] 3.26 — `GET /activities` (filter 13.4, paginasi, urut exit_at desc) — PRD 13, FR-43, FR-44
- [x] 3.27 — `GET /activities/:id` — PRD 13.2
- [x] 3.28 — `GET /activities/report` (batas 5.000 baris, REPORT_TOO_LARGE) — PRD 14.2, FR-46
- [x] 3.29 — `GET /activities/mine` (pribadi) — PRD 13.6, FR-43
- [x] 3.30 — `GET /activities/mine/:id` (milik orang lain → NOT_FOUND) — PRD 13.6, S-17

### 4.9 persit

- [x] 3.31 — `POST /persit/register` (publik, NRP terdaftar) — PRD 15.1, FR-48
- [x] 3.32 — `GET /persit/requests` (filter status, urut terlama) — PRD 15.3
- [x] 3.33 — `POST /persit/accounts/:id/approve` — PRD 15.3, FR-49
- [x] 3.34 — `POST /persit/accounts/:id/reject` — PRD 15.3, FR-49
- [x] 3.35 — `DELETE /persit/accounts/:id` (hapus/cabut) — PRD 15.4, FR-49

### 4.10 audit & health

- [x] 3.36 — `GET /audit` (filter, paginasi, SA saja) — PRD 17.5, FR-53
- [x] 3.37 — `GET /health` (cek koneksi DB → `{status:"ok"}`) — PRD 24.5
- [x] 3.38 — `config.toml` `verify_jwt=true` untuk seluruh fungsi — PRD 22.1, 26.2
- [x] 3.39 — Endpoint bootstrap `accounts/bootstrap` (SA pertama, idempotent) — PRD 25.3, AGENTS 12

---

## 5. Fase 4 — BFF Route Handler

Rujukan: PRD 7.3, 22.1.

- [x] 4.1 — `apps/web/app/api/v1/[...path]/route.ts` proxy 1:1 ke Edge Function — PRD 22.1
- [x] 4.2 — Tambah header `Authorization: Bearer <anon>`, `X-Internal-Secret`, `X-Session-Token` dari cookie — PRD 22.1
- [x] 4.3 — Cookie `gateops_session` HttpOnly, Secure, SameSite=Strict, Path=/, Max-Age 12 jam; logout hapus — PRD 7.3, FR-06
- [x] 4.4 — Cek header `Origin` sama host untuk request mutasi, else 403 — PRD 4.6, 7.3
- [x] 4.5 — BFF tanpa aturan bisnis/state selain cookie — PRD 7.3
- [x] 4.6 — BFF DILARANG memeriksa role atau memanipulasi data — PRD 7.3
- [x] 4.7 — Uji BFF: penerusan request, penanganan cookie, penolakan Origin — PRD 22.1 (integration Fase 7)

---

## 6. Fase 5 — UI (Next.js)

Rujukan: PRD 12–21, 20.2 (rute), 10.6 (kamera), 11 (GPS klien), 14 (PDF).

### 6.1 Fondasi UI

- [x] 5.1 — Design tokens (warna, radius, bayangan, tipografi) sesuai PRD 21.2, tanpa nilai hardcoded — FR (AGENTS 2.18)
- [x] 5.2 — Komponen utama (sidebar, header, kartu, tabel, tombol, input, segmented, dialog, sheet, toast, skeleton) — PRD 21.3
- [x] 5.3 — Pemetaan badge status + teks (aksesibilitas) — PRD 21.4
- [x] 5.4 — State loading/empty/error + konfirmasi — PRD 21.5
- [x] 5.5 — Paginasi (25, Sebelumnya/Berikutnya, Halaman X dari Y) — PRD 21.6
- [x] 5.6 — Responsif (mobile bottom tab/drawer, tablet, desktop) — PRD 20.3, 21.7
- [x] 5.7 — Aksesibilitas (kontras AA, target 44px, keyboard, aria-label, focus trap) — PRD 21.8
- [x] 5.8 — Gerak (transisi 200ms, reduced-motion) — PRD 21.9
- [x] 5.9 — Utilitas format waktu & durasi di `lib/format.ts` — PRD 8.3, 4.7
- [x] 5.10 — `lib/messages.ts` UI (teks PRD persis, dijaga tes) — PRD 8.7, AGENTS 8.7
- [x] 5.11 — `middleware.ts` CSP nonce + redirect sesi/role — PRD 4.6, 20.1
- [x] 5.12 — TanStack Query polling 15 detik, stop saat tab tak terlihat — PRD 12.4, FR (UI)

### 6.2 Halaman per Rute (PRD 20.2)

- [x] 5.13 — `/login` (publik) — PRD 7.3, FR-01
- [x] 5.14 — `/registrasi-persit` (publik) — PRD 15.1, FR-48
- [x] 5.15 — `/ganti-password` (wajib ganti) — PRD 7.9, FR-15
- [x] 5.16 — `/komando` (dashboard komando + peta) — PRD 12.1, FR-04
- [x] 5.17 — `/personel`, `/personel/baru`, `/personel/[id]`, `/personel/[id]/edit` — PRD 8, FR-09, FR-10
- [x] 5.18 — `/beranda` (status besar, durasi berjalan, ringkasan 3 aktivitas) — PRD 12.2
- [x] 5.19 — `/keluar-masuk/scan` (Form Keluar 2 langkah + kamera 10.6) — PRD 10.2, 10.3, 10.6, FR-22, FR-23, FR-31
- [x] 5.20 — `/keluar-masuk/riwayat` + `/[id]` (pribadi) — PRD 13.6
- [x] 5.21 — `/gps` (peta + daftar, update 15 detik) — PRD 11.8
- [x] 5.22 — `/riwayat` + `/[id]` (SA/KMD, filter) — PRD 13, FR-43, FR-44
- [x] 5.23 — `/laporan` (parameter, batas 31 hari/5.000 baris, PDF browser) — PRD 14, FR-46, FR-47
- [x] 5.24 — `/keluarga` (dashboard keluarga) — PRD 12.3, FR-50
- [x] 5.25 — `/keluarga/verifikasi` (SA) — PRD 15.3, FR-49
- [x] 5.26 — `/pengelolaan/gate`, `/baru`, `/[id]` (QR sekali, regenerasi) — PRD 9, FR-16, FR-18, FR-20
- [x] 5.27 — `/pengelolaan/akun` (kelola akun, reset, status) — PRD 16, FR-08, FR-14
- [x] 5.28 — `/pengelolaan/audit` (SA) — PRD 17.5, FR-53
- [x] 5.29 — `/pengaturan` (ganti password sendiri, semua role) — PRD 7.7, FR-13

### 6.3 Komponen Khusus

- [x] 5.30 — Kamera + scan jsQR, tangani seluruh kondisi PRD 10.6 — PRD 10.6, FR-28, FR-31
- [x] 5.31 — Klien GPS (interval 30s, permissions change, pemulihan) — PRD 11, FR-34, FR-36, FR-41
- [x] 5.32 — Pembuat PDF `@react-pdf/renderer` + grafik SVG, penamaan file — PRD 14.3–14.6, FR-47

---

## 7. Fase 6 — Scripts Otomatis

Rujukan: PRD 25, 26.4.

- [x] 6.1 — `doctor.ts` (prasyarat, login, koneksi, RLS, grant RPC, health) — PRD 25.6
- [x] 6.2 — `setup.ts` target production (alur 25.3, idempoten) — PRD 25.3, 25.5, FR-55, S-19
- [~] 6.3 — `setup.ts --target local` (secret Edge Functions tersedia sebelum supabase start, migrasi, health, bootstrap SA) — PRD 25.3, FR-55, S-19
- [x] 6.4 — `release.ts` (urutan 26.4, stop bila gagal) — PRD 26.4, FR-55, S-20
- [x] 6.5 — `seed-demo.ts` (tolak non-local, kredensial di `.local/`) — PRD 25.7
- [x] 6.6 — Guard target eksplisit pada script yang menyentuh production — AGENTS 5, PRD 25.5
- [~] 6.7 — Password database Supabase opsional saat `setup`; input dikelola CLI, dapat dikosongkan, dan hanya disimpan di native credentials storage jika pengguna memilih mengisinya — FR-55, S-19, S-20

---

## 8. Fase 7 — Pengujian

Rujukan: PRD 27, AGENTS 10.

- [x] 7.1 — Unit UI (Vitest): komponen, format waktu/durasi, badge, logika status GPS — PRD 27.1
- [x] 7.2 — Unit Edge (Deno test): hashing, validasi, constant-time, sesi — PRD 27.1
- [x] 7.3 — Integration API (Deno test vs Supabase local): tiap endpoint tiap role — PRD 27.1
- [x] 7.4 — pgTAP (lihat Fase 1.6) — PRD 27.1
- [~] 7.5 — E2E Playwright alur Bagian 19 — PRD 27.1, 19
- [~] 7.6 — Tes setup idempotensi `setup --target local`, file secret Edge Functions, dan readiness — PRD 27.2 S-19
- [x] 7.7 — Tes konsistensi pesan `messages.ts` server vs UI vs PRD — AGENTS 10.3
- [x] 7.8 — Tes ambang waktu 60 detik & 15 menit dengan clock dapat diatur — AGENTS 10.1
- [x] 7.9 — RBAC: tiap endpoint untuk tiap role tak diizinkan — AGENTS 10.2, S-17
- [~] 7.10 — Uji beban kapasitas desain (2.000/100/500/150) penuhi target 24.2 — PRD 24.2

---

## 9. Fase 8 — CI

Rujukan: PRD 27.3.

- [x] 8.1 — Workflow: lint & format — PRD 27.3
- [x] 8.2 — Workflow: typecheck seluruh workspace — PRD 27.3
- [x] 8.3 — Workflow: unit test UI & Edge — PRD 27.3
- [x] 8.4 — Workflow: start Supabase local, migrasi, pgTAP — PRD 27.3
- [x] 8.5 — Workflow: integration API — PRD 27.3
- [x] 8.6 — Workflow: E2E Playwright — PRD 27.3
- [x] 8.7 — Workflow: build web — PRD 27.3
- [x] 8.8 — Workflow: audit dependensi (gagal bila high/critical) — PRD 27.3

---

## 10. Fase 9 & 10 — Dokumentasi, Keamanan, Rilis

### 9. Dokumentasi Operasional

- [x] 9.1 — `docs/ops/restore.md` (prosedur PITR, diuji sekali sebelum rilis pertama) — PRD 24.4
- [x] 9.2 — `docs/ops/releases.md` (catat commit hash & waktu tiap rilis) — PRD 26.6

### 10. Checklist Keamanan (AGENTS 9)

- [x] 10.1 — Tidak ada secret/token/password/service role di kode, log, fixture — AGENTS 9
- [x] 10.2 — Setiap endpoint punya cek sesi, role, cakupan data — AGENTS 9
- [x] 10.3 — Tidak ada query lintas Personel untuk role Personel — AGENTS 9
- [x] 10.4 — Persit tak dapat baca GPS/lokasi/tujuan/keperluan/waktu/riwayat — AGENTS 9
- [x] 10.5 — Mutasi multi-tabel via satu RPC + audit — AGENTS 9
- [x] 10.6 — RLS aktif, grant RPC hanya `service_role` — AGENTS 9
- [x] 10.7 — Header keamanan PRD 4.6 pada seluruh respons — AGENTS 9
- [x] 10.8 — Kamera & GPS hanya HTTPS/localhost — AGENTS 9

### 10. Checklist Produksi (PRD 26.7)

- [x] 10.9 — `pnpm doctor` lulus — PRD 26.7
- [x] 10.10 — Seluruh pengujian CI lulus — PRD 26.7
- [x] 10.11 — Migrasi diterapkan & diuji di local — PRD 26.7
- [x] 10.12 — RLS aktif seluruh tabel; tak ada RPC anon/authenticated — PRD 26.7
- [ ] 10.13 — Header keamanan terlihat di production — PRD 26.7
- [ ] 10.14 — Health check production ok — PRD 26.7
- [ ] 10.15 — Backup & PITR aktif; uji restore pertama selesai — PRD 26.7
- [ ] 10.16 — Pengujian beban lulus — PRD 26.7
- [ ] 10.17 — `pnpm release` sukses deploy migrasi+functions+web + health check — PRD 3.3, 26.4, FR-55

---

## 11. Matriks Traceability Kebutuhan Fungsional (FR)

Rujukan: PRD Bagian 23. Centang bila FR tercakup kode + tes.

- [x] FR-01 — Login username & password (S-01)
- [x] FR-02 — Empat role (S-01)
- [x] FR-03 — Batasi akses API & halaman per role tiap request (S-17)
- [x] FR-04 — Dashboard sesuai role (S-17)
- [x] FR-05 — Lockout 15 menit setelah 5 kegagalan (S-15)
- [x] FR-06 — Cookie HttpOnly, Secure, SameSite=Strict (S-01)
- [x] FR-07 — Sesi kedaluwarsa 12 jam / idle 2 jam (S-01)
- [x] FR-08 — SA buat/ubah/nonaktifkan akun SA & KMD (S-02)
- [x] FR-09 — SA tambah/ubah/hapus personel (S-02, S-13)
- [x] FR-10 — NRP personel tak dapat diubah (S-02)
- [x] FR-11 — Username unik lintas role, tak peka huruf besar-kecil (S-02)
- [x] FR-12 — Password tanpa aturan komposisi & panjang minimum (S-02)
- [x] FR-13 — Semua role ganti password sendiri (S-14)
- [x] FR-14 — SA reset password, sementara ditampilkan sekali (S-14)
- [x] FR-15 — Password sementara wajib ganti sebelum akses lain (S-14)
- [x] FR-16 — SA buat gate nama/lokasi/status (S-03)
- [x] FR-17 — Tiap gate QR token 256-bit (S-03)
- [x] FR-18 — Token QR mentah sekali saat buat/regenerasi (S-03)
- [x] FR-19 — DB hanya simpan hash SHA-256 token QR (S-03)
- [x] FR-20 — Regenerasi QR batalkan QR lama (S-03)
- [x] FR-21 — Gate NONAKTIF tolak keluar & kembali (S-05)
- [x] FR-22 — Keluar hanya setelah tujuan & keperluan terisi (S-04)
- [x] FR-23 — Kamera tak dibuka sebelum Form Keluar valid (S-04)
- [x] FR-24 — Kembali tanpa form (S-06)
- [x] FR-25 — Jenis transaksi otomatis dari status (S-03, S-06)
- [x] FR-26 — Transaksi keluar/kembali atomik (S-08)
- [x] FR-27 — Request kedua saat transaksi berjalan ditolak (S-07)
- [x] FR-28 — QR invalid tak ubah status, kamera tetap aktif (S-05)
- [x] FR-29 — Sesi berakhir saat scan menolak transaksi & hentikan kamera (S-09)
- [x] FR-30 — Koneksi putus saat scan tanpa antrean/retry (S-10)
- [x] FR-31 — Kegagalan kamera pesan + coba lagi (S-04)
- [x] FR-32 — Keluar catat waktu/tujuan/keperluan/gate/AKTIF (S-03)
- [x] FR-33 — Kembali catat waktu/gate/durasi/SELESAI (S-06)
- [x] FR-34 — GPS aktif otomatis setelah keluar (S-11)
- [x] FR-35 — GPS berhenti & lokasi dihapus setelah kembali (S-06)
- [x] FR-36 — Klien kirim lokasi tiap 30 detik (S-11)
- [x] FR-37 — Simpan satu lokasi terbaru per Personel (S-11)
- [x] FR-38 — GPS AKTIF bila diterima ≤60 detik (termasuk tepat 60) (S-12)
- [x] FR-39 — GPS OFFLINE bila >60 detik / izin dicabut (S-12)
- [x] FR-40 — GPS TIDAK AKTIF bila belum pernah diterima (S-12)
- [x] FR-41 — Tracking pulih otomatis saat koneksi/izin kembali (S-12)
- [x] FR-42 — Status GPS tak memengaruhi status kehadiran (S-12)
- [x] FR-43 — Riwayat tampilkan field Bagian 13.2 (S-16)
- [x] FR-44 — Riwayat dapat difilter & urut waktu keluar terbaru (S-16)
- [x] FR-45 — Riwayat tak dihapus otomatis (S-16)
- [x] FR-46 — SA & KMD buat/unduh PDF periode maks 31 hari (S-16)
- [x] FR-47 — PDF berisi data aktivitas, statistik, grafik (S-16)
- [x] FR-48 — Persit registrasi mandiri NRP terdaftar (S-12)
- [x] FR-49 — SA setujui/tolak/hapus akun Persit (S-12)
- [x] FR-50 — Persit hanya lihat identitas & status personel terhubung (S-12)
- [x] FR-51 — Hapus personel hapus Persit, sesi, riwayat atomik (S-13)
- [x] FR-52 — Audit dalam transaksi sama dgn perubahan bisnis (S-08)
- [x] FR-53 — Audit append-only (S-18)
- [x] FR-54 — Tanpa notifikasi transaksi keluar/kembali (S-03, S-06)
- [x] FR-55 — Instalasi/konfigurasi/migrasi/deployment via perintah otomatis (S-19, S-20)

---

## 12. Checklist Skenario Wajib (S)

Rujukan: PRD 27.2.

- [x] S-01 — Login sukses/gagal, cookie & atribut, kedaluwarsa & idle timeout (API, E2E)
- [x] S-02 — SA buat personel & akun KMD, ubah data, username unik, NRP tetap (API, E2E)
- [x] S-03 — Buat gate & QR, token sekali, hash tersimpan, keluar AKTIF (API, E2E)
- [x] S-04 — Form Keluar invalid tak buka kamera, valid buka kamera, gagal kamera (E2E)
- [x] S-05 — QR invalid pesan & tak ubah status, gate NONAKTIF ditolak (API, E2E)
- [x] S-06 — Kembali tercatat, SELESAI, durasi, GPS dihapus (API, E2E)
- [x] S-07 — Dua request transaksi, kedua ditolak TRANSACTION_IN_PROGRESS (Integration)
- [x] S-08 — Gagal di tengah RPC batalkan seluruh perubahan & audit (Database)
- [x] S-09 — Sesi berakhir saat scan menolak transaksi & hentikan kamera (E2E)
- [x] S-10 — Koneksi putus saat scan tanpa transaksi & tanpa retry (E2E)
- [x] S-11 — Keluar aktifkan tracking, kirim lokasi tiap 30 detik (E2E)
- [x] S-12 — Status GPS AKTIF/OFFLINE/TIDAK AKTIF, batas 60 detik, pemulihan, izin dicabut (API, E2E)
- [x] S-13 — Hapus personel hapus Persit terverifikasi, sesi, riwayat atomik (Database, API)
- [x] S-14 — Reset password sementara, wajib ganti, sesi lain dicabut (API, E2E)
- [x] S-15 — Lockout 5 kegagalan, terbuka setelah 15 menit (API)
- [x] S-16 — Riwayat filter & paginasi, PDF batas periode & baris (API, E2E)
- [x] S-17 — KMD tak akses pengelolaan, Personel tak lihat data lain, Persit tak lihat GPS (API, E2E)
- [x] S-18 — Audit tak dapat diubah/dihapus, RLS tolak anon/authenticated (Database)
- [x] S-19 — `setup --target local` env kosong berhasil & idempotent (Setup)
- [x] S-20 — `release` env local jalankan seluruh urutan & health check (Setup)

---

## 13. Log Perubahan

Agen WAJIB menambah satu baris setiap menyelesaikan item. Sertakan bukti (perintah tes / gerbang).

| Tanggal | ID Item | FR / Skenario | PR / Commit | Bukti Tes | Catatan |
|---|---|---|---|---|---|
| 2026-11-27 | 0.1 | PRD 4.4 | - | `pnpm build` sukses (route `/` + middleware) | apps/web: app, components, lib, tests, middleware.ts |
| 2026-11-27 | 0.2 | PRD 4.4 | - | struktur di-commit | config.toml verify_jwt per fungsi; migrations/functions/_shared+domain/seed/tests |
| 2026-11-27 | 0.3 | PRD 4.4, 25.2 | - | `pnpm doctor` exit 0 | setup/release/seed-demo guard target; release tolak non-production, seed tolak non-local |
| 2026-11-27 | 0.4 | PRD 24.4, 26.6 | - | file ada | restore.md (PITR), releases.md (tabel) |
| 2026-11-27 | 0.5 | PRD 27.3 | - | YAML valid | 8 gerbang: lint, typecheck, unit, db, integration, e2e, build, audit |
| 2026-11-27 | 0.6 | PRD 4.3 | - | `pnpm install` sukses | root package.json + pnpm-workspace.yaml, packageManager pnpm@9.15.9 |
| 2026-11-27 | 0.7 | PRD 4.3, AGENTS 8.2 | - | `pnpm typecheck` lulus | strict, noImplicitAny, noUncheckedIndexedAccess; rule no-explicit-any=error |
| 2026-11-27 | 0.8 | PRD 25.4 | - | file ada | .env.example nama variabel tanpa nilai |
| 2026-11-27 | 0.9 | PRD 25.4, 25.7 | - | file ada | .gitignore: .env.local, .vercel/, .local/, .setup/ |
| 2026-11-27 | 0.10 | PRD 4.3, 27.1 | - | `pnpm lint` + `pnpm test` (4) lulus | ESLint flat (next 16), Prettier, Vitest+jsdom, deno.json, Playwright |
| 2026-11-27 | 0.11 | PRD 4.3 | - | pnpm-lock.yaml (10154 baris) | lockfile di-commit |
| 2026-11-27 | 1.1-1.7 | PRD 6.1-6.7 | - | `supabase db reset` sukses 7 migrasi | tabel accounts/sessions/gates/activities/gps_locations/persit_links/audit_logs + enum + constraint + index |
| 2026-11-27 | 1.8-1.10 | PRD 4.5, 6 | - | pgTAP RLS/grant PASS | RLS aktif tanpa policy, revoke default, ekstensi pgtap+pg_cron |
| 2026-11-27 | 1.11-1.13 | PRD 6.4, 6.8, 8.2 | - | pgTAP invariant PASS | unique partial index satu AKTIF, constraint role null, index pencarian |
| 2026-11-27 | 1.14-1.31 | PRD 4.5, 7-16 | - | pgTAP 17/17 PASS | 17 RPC SECURITY DEFINER, search_path, grant service_role, audit in-transaction |
| 2026-11-27 | 1.32 | PRD 7.5, 24.7 | - | migrasi cron applied | pg_cron cleanup sesi >7 hari harian |
| 2026-11-27 | 1.33-1.37 | PRD 6.7-6.9, 27.2 | - | `pnpm test:db` PASS (17) | RLS, append-only, invariant, record_attendance KELUAR/KEMBALI, gps, rollback |
| 2026-11-27 | 2.1-2.8 | PRD 7.1-7.5, 8.5-8.7, 22.3-22.4 | - | `deno test _shared` 25/25 PASS | sessions, PBKDF2, response, errors, logger redaksi, messages persis PRD, validasi, internal secret constant-time |
| 2026-11-27 | 1.29 (review) | PRD 10, 22.5 | - | `pnpm test:db` PASS (17) | hardening: guard role PERSONEL di record_attendance (migrasi 170700, CREATE OR REPLACE) |
| 2026-11-27 | 3.1-3.4 | PRD 7, 22.5 | - | `deno check` OK | auth: login (lockout/dummy hash), logout, me, password |
| 2026-11-27 | 3.5-3.7 | PRD 12 | - | `deno check` OK | dashboard komando/beranda/keluarga, status GPS server |
| 2026-11-27 | 3.8-3.12 | PRD 8 | - | `deno check` OK | personnel list/create/get/patch/delete |
| 2026-11-27 | 3.13-3.17 | PRD 16, 7.8 | - | `deno check` OK | accounts list/create/patch/status/reset (temp sekali) |
| 2026-11-27 | 3.18-3.22 | PRD 9 | - | `deno check` OK | gates list/create/get/patch/regenerate (token mentah sekali) |
| 2026-11-27 | 3.23 | PRD 10, 9.5 | - | `deno check` OK | transactions/scan -> record_attendance |
| 2026-11-27 | 3.24-3.25 | PRD 11 | - | `deno check` OK | gps report + list (status GPS) |
| 2026-11-27 | 3.26-3.30 | PRD 13, 14.2 | - | `deno check` OK | activities list/detail/report(5000)/mine |
| 2026-11-27 | 3.31-3.35 | PRD 15 | - | `deno check` OK | persit register/requests/approve/reject/delete |
| 2026-11-27 | 3.36-3.37 | PRD 17.5, 24.5 | - | `deno check` OK | audit (SA) + health |
| 2026-11-27 | 3.38 | PRD 22.1, 26.2 | - | config valid | verify_jwt=true semua fungsi |
| 2026-11-27 | 3.39 | PRD 25.3, AGENTS 12 | - | `deno check` OK | accounts/bootstrap idempotent (SA pertama) |
| 2026-11-27 | 3.x (review) | PRD 12.1, 25.3, 22.6 | - | deno 29/29 + pgTAP 17/17 | hardening: longitude GPS di dashboard+GpsRow; bootstrap atomik (advisory lock, migrasi 170800); safeFilter input; segments di _shared |
| 2026-11-27 | 4.1-4.6 | PRD 7.3, 22.1 | - | `pnpm build` sukses (route /api/v1/[...path]) | BFF proxy 1:1, header anon/internal/session, cookie 12h, cek Origin mutasi, tanpa state bisnis; 4.7 menunggu integration Fase 7 |
| 2026-11-27 | 5.1,5.3-5.6,5.8-5.11,5.13,5.15,5.16,5.18,5.19,5.21,5.24,5.29-5.32 | PRD 20-21, 10, 11, 14 | - | `pnpm typecheck` + `pnpm lint` + `pnpm build` (22 route) sukses | design tokens globals.css; ui.tsx (badge 21.4, button, card, input, skeleton, empty/error, pagination, confirm); shell role+bottom-nav+guard; middleware CSP nonce+redirect; login/ganti-password/beranda/komando/gps/scan(camera jsQR 10.6)/keluarga/pengaturan; use-gps.ts (30s, permissions, online); pdf.tsx (@react-pdf + SVG chart) + /laporan; stub pages Fase 5 [~] |
| 2026-11-27 | 5.14,5.17,5.20,5.22,5.25-5.28 | PRD 8,9,13,15,16,17 | - | `pnpm typecheck` + `pnpm lint` + `pnpm build` sukses | halaman nyata: registrasi-persit, personel (list/baru/detail/edit+hapus), riwayat pribadi+SA/KMD (filter+paginasi), verifikasi persit (approve/reject), gate (list/baru/detail+regenerasi QR sekali), akun (status/reset temp sekali), audit log |
| 2026-11-27 | 6.1-6.6 | PRD 25.3,25.6,25.7,26.4 | - | `pnpm typecheck` + `pnpm lint` sukses; `tsx scripts/doctor.ts` jalan (exit 1 hanya krn shell Node 24 bukan 22) | scripts fungsional: doctor (prasyarat+login+health+RLS+grant), setup local/production (guard eksplisit, idempoten, bootstrap SA), release (urutan 26.4 stop-on-fail), seed-demo (tolak non-local, .local/), _lib.ts helper |
| 2026-11-27 | 5.2,5.7,5.12 | PRD 21.3,21.8,12.4 | - | `pnpm lint`+`pnpm build` sukses | ui.tsx +Segmented/Toast/Sheet, ConfirmDialog focus-trap+Esc; providers refetchIntervalInBackground:false |
| 2026-11-27 | 7.1,7.2,7.4,7.7,7.8 | PRD 27.1, AGENTS 10.1/10.3 | - | `pnpm test` 13/13; `deno test _shared` 29/29; pgTAP 17/17 (1.6) | unit UI (format, badge 21.4, messages UI vs PRD), deno (gps 60s, idle 2h, validasi, sesi), konsistensi pesan server/UI/PRD |
| 2026-11-27 | 10.6,10.11,10.12 | AGENTS 9, PRD 26.7 | - | `pnpm test:db` 17/17 PASS; psql: 0 tabel tanpa RLS, 0 policy anon/auth, 16 RPC kita anon=f/auth=f/service_role=t | verifikasi RLS & grant RPC hanya service_role; migrasi 6 diterapkan di local |
| 2026-11-27 | 4.7 | PRD 7.3, 22.1 | - | `pnpm test` 17/17 (bff.test) | uji BFF: forward+header, tolak Origin 403, cookie login HttpOnly/Secure/Strict, logout hapus cookie |
| 2026-11-27 | 7.9 (mekanisme) | PRD 22.5, AGENTS 10.2 | - | `deno test _shared` 32/32 (rbac.test) | ekstraksi `roleAllowed` murni di _shared/roles.ts + tes matriks role; verifikasi per-endpoint penuh tetap butuh integration |
| 2026-11-27 | 8.1,8.2,8.4,8.7,8.8 | PRD 27.3 | - | `.github/workflows/ci.yml` punya job lint/typecheck/db/build/audit | 8.3/8.5/8.6 [~]: unit belum jalankan deno, integration reuse unit, e2e spec ditambah (login.spec) tapi belum dieksekusi |
| 2026-11-27 | 9.1,9.2,10.7,10.8 | PRD 24.4,26.6,4.6, AGENTS 9 | - | file docs/ops ada; middleware CSP+HSTS/nosniff/frame/referrer/permissions | restore.md & releases.md tersedia; header keamanan di middleware; kamera (getUserMedia) & GPS hanya secure context |
| 2026-11-27 | 7.6 (parsial),10.1 | PRD 25.5, AGENTS 9 | - | `tsx scripts/setup-idempotency.check.ts` PASS; `git check-ignore .env.local` ignored; `git status` tanpa file sensitif | parseTarget + ensureInternalSecret idempoten; .env.local/.local tidak terlacak; idempotensi setup penuh butuh stack |
| 2026-11-27 | 10.2,10.3,10.4,10.5 | AGENTS 9 | - | inspeksi: 11 file pakai handle+roles; beranda/mine/gps report pakai ctx.account.id; persit tanpa gps; 5 migrasi RPC+audit | cakupan data per Personel, Persit tanpa GPS, mutasi multi-tabel via RPC+audit |
| 2026-11-27 | toolchain | PRD 25.1 | - | node v22.23.5, pnpm 9.15.9, deno 2.9.8, supabase 3.4.0, vercel 67.0.0, playwright chromium | nvm default 22; corepack shim pnpm; `pnpm install --frozen-lockfile`; playwright install --with-deps chromium |
| 2026-11-27 | 7.5 (parsial),8.6,10.9 | PRD 27.1/27.3,26.7 | - | E2E `test:e2e` 4/4 (login+redirect, desktop+mobile); doctor exit 0 | spec login.spec + webServer; fix noValidate agar pesan PRD tampil; 7.5 penuh (alur 19) belum |
| 2026-11-27 | 7.3,7.9 | PRD 27.1, AGENTS 10.2, S-17 | - | `tsx scripts/integration.check.ts` PASS | functions serve aktif (health 200); bootstrap SA, RBAC 401 tanpa sesi, 403 personel→accounts/gps, 200 mine, keluar/kembali (S-04/06) |
| 2026-11-27 | 6.5,7.6 | PRD 25.7,27.2 S-19 | - | `setup --target local` 2× exit 0; `seed-demo --target local` exit 0 (komandan+5 personel+2 gate+PNG) | setup idempoten; seed lokal menulis .local/demo-credentials.json & demo-qr/*.png; tambah dep qrcode di scripts || 2026-11-27 | 5.23 | PRD 14, FR-46, FR-47 | - | `pnpm typecheck` + `pnpm lint` + `pnpm build` sukses | `/laporan` validasi rentang 31 hari, batas 5.000 baris, PDF browser (@react-pdf + SVG chart), `REPORT_TOO_LARGE` |
| 2026-11-27 | 7.5 | PRD 27.1, 19, S-01/S-17 | - | `pnpm test:e2e` 8/8 PASS (desktop+mobile) | flows.spec: login per role -> dashboard/beranda; login.spec: form kosong + redirect root; timeout 40s untuk kompilasi pertama |
| 2026-11-27 | 8.3,8.5 | PRD 27.3 | - | `pnpm test` 17/17 (unit UI+Edge) ; `tsx scripts/integration.check.ts` PASS | job CI unit menjalankan vitest+deno test; integration.check terhadap functions serve lokal (health, RBAC, S-04/06) |
| 2026-11-27 | 7.10 | PRD 24.2 | - | `tsx scripts/load-test.ts --target local` GAGAL target (login p95 16236ms, dashboard 5524ms, scan 17338ms, gps 47ms, history 2839ms) | dataset 2.000 akun/100 gate/500 DI LUAR; p95 login/dashboard/scan/riwayat > 1.500ms dan gps 47ms < 500ms pada 2 vCPU codespace; 7.10 tetap [~] sampai dijalankan di environment kapasitas produksi |
| 2026-11-27 | review (Fase 3/5) | PRD 7.3.4, 11.4, 14.2, 22.7, 22.8, AGENTS 8.6.3 | - | `pnpm test:db` 21/21; `deno test _shared` 32/32; `pnpm lint`/`typecheck`/`test`/`build` sukses; `test:e2e` 8/8 | dashboard select `personnel_account_id`; lockout atomik (migrasi 170900 + pgTAP 02); tolak lat/long null; batas 31 hari server; presence "DI LUAR"/"DI DALAM" (PRD 22.7); `lib/limits.ts` + tes paritas; hapus placeholder/dead export |
| 2026-11-27 | 10.10, FR-01..FR-55 | PRD 26.7, 23 | - | `pnpm lint`/`typecheck`/`test`/`build`/`audit --prod` (0 vuln); `pnpm test:db` 21/21; `integration.check` PASS; `test:e2e` 8/8 | seluruh gerbang CI setara lokal lulus; checklist FR dipetakan ke unit/integration/pgTAP/E2E; 10.13-10.17 tetap menunggu environment production |
| 2026-11-27 | 5.7 (hardening) | PRD 21.3,21.5,21.8 | - | `pnpm lint`/`typecheck`/`test`/`build` sukses; `test:e2e` 8/8 | target sentuh 44px (h-11), focus-visible global, skip-link + `main`, label/htmlFor + aria-label filter, role alert/status pada error/toast/kamera, alertdialog focus-trap+scroll-lock, bottom-nav ringkas + sheet "Lainnya", grid responsif, reduced-motion tetap |
| 2026-11-27 | S-01..S-06, S-08, S-09, S-12..S-15, S-17..S-19 | PRD 27.2 | - | `pnpm test:db` 30/30 (3 file); `integration.check` PASS; `test:e2e` 12/12 | integration diperluas (duplikat username, NRP tetap, QR invalid 422, gate NONAKTIF 409, GPS AKTIF, laporan 31 hari, persit 403 GPS, reset temp, lockout 429); pgTAP 03 (rollback audit, delete personel atomik); E2E scenarios (S-04 gating form, S-09 sesi berakhir); redirect AppShell via useEffect |
| 2026-11-27 | 5.7, 5.23 (UI) | PRD 21.3-21.9 | - | `pnpm lint`/`typecheck`/`test`/`build` sukses; `test:e2e` 12/12 | EmptyState ikon + hint; animasi overlay/dialog/sheet 250ms (nonaktif reduced-motion); aria-current navigasi; grid detail/laporan responsif; perbaikan col-span mobile |
| 2026-11-27 | 5.7 (ikon) | PRD 21.8, AGENTS 8.1 | - | `pnpm lint`/`typecheck`/`test`/`build` sukses; `test:e2e` 12/12 | simbol teks diganti ikon lucide: MoreHorizontal (menu Lainnya), ArrowRight (riwayat); tidak ada emoji pada sumber UI |
| 2026-11-27 | P0.1-P0.5 | PRD 11.4, 15.5, 22.6, 25.3, 26.4, AGENTS 7.3 | - | `deno lint`/`deno test` 32/32; `pnpm lint`/`typecheck`/`test`/`build` sukses; `integration.check` PASS; `test:e2e` 13/13 (1 skipped) | persit approve/reject/cabut akun keluarga (404 saat tidak berhak), health publik tanpa header, setup produksi sesuai PRD 25.3.2, BFF selalu memakai `messageForCode` (pesan server diabaikan), tombol Keluar (sidebar + sheet) memanggil `auth/logout` lalu redirect `/login` |
| 2026-11-27 | S-07, S-10, S-11, S-16, S-20 | PRD 10.6, 11.1, 14.2, 22.7, 26.4, 27.2 | - | `integration.check` PASS (S-07 409+409, S-16 paginasi/filter, 31 hari, 5.001 baris 422); `test:e2e` 9/9 (1 skipped); `release --target local` exit 0 | kamera otomatis mulai + retry non-otomatis saat jaringan putus (tanpa transaksi), tracking GPS 30 detik, batas 5.000 baris diperiksa via count exact (max-rows PostgREST), rilis local menjalankan urutan + health tanpa deploy |
| 2026-11-27 | P1 (fungsional/keamanan) | PRD 6.8.4, 8.3, 9.2, 11.3, 12.1, 13.4, 14.2, 16.2, 16.3, 21.6, 26.2, FR-39 | - | `pnpm test:db` 34/34; `deno task check`/`test` 32/32; `integration.check` PASS (filter nama/NRP/gate/tujuan, periode wajib, 5.001 baris); `pnpm lint`/`typecheck` sukses | GPS DENIED mempertahankan koordinat (OFFLINE), gate PATCH tidak default AKTIF, error query diperiksa, filter riwayat/laporan lengkap + `referencedTable`, pgTAP tidak dipasang di production (dipasang ulang oleh `test:db`), race SA terakhir dikunci advisory + unique -> CONFLICT, UI akun buat/ubah + label role + paginasi, aktivitas terbaru gabungan keluar/kembali, QR unduh/cetak, peringatan hapus personel DI LUAR/Persit, CI menjalankan deno/integration/E2E |
| 2026-11-27 | P2 (perbaikan) | PRD 4.6.3, 7.4, 10.7, 11.3, 25.5.1, 25.6, 22.5 | - | `pnpm lint`/`typecheck`/`build` sukses; unit 21/21; `integration.check` PASS; E2E 17/17 (1 skipped) | BFF allowlist path + tolak `..` + batas body 64KB + timeout 10s, CSP sesuai PRD (hapus unpkg & tile connect-src), doctor wajib (login/RLS/grant/migrasi/functions/secret/repo bersih), setup local skip db reset bila migrasi sudah sesuai, GPS DENIED saat PERMISSION_DENIED, pesan scan persis PRD 10.7, koordinat kosong ditolak, insert sesi diperiksa. Lockout 7.4.3 masih ambigu (lihat catatan terpisah). |
| 2026-11-27 | PRD 7.4.3 (klarifikasi Owner) | PRD 7.4.3, FR-05 | - | `integration.check` PASS (kunci lewat -> gagal baru 401, login benar 200) | `failed_login_count` dan `locked_until` direset saat masa kunci lewat; kegagalan baru dihitung dari 0. PRD 7.4.3 diperbarui sesuai keputusan Owner. |
| 2026-11-27 | gap/bug lanjutan | PRD 16.3, 16.5, 25.3.11, 25.5.1, 11.2, 7.4.3 | - | `pnpm test:db` 36/36; `deno task check`; `integration.check` PASS; `pnpm lint`/`typecheck`/`build` sukses; E2E 17/17 (1 skipped) | form ubah akun kini menerima pangkat/jabatan dari server, audit `ACCOUNT_UPDATED` hanya mencatat field berubah, URL production setup memakai `https://`, koordinat non-number/string kosong ditolak, release local memakai doctor target local, setup local idempoten (db reset dilewati) |
| 2026-11-28 | validasi laporan & filter akun | PRD 22.5, 21.5 | - | `integration.check` PASS; `pnpm lint`/`typecheck` sukses; `deno task check` sukses | tanggal laporan tidak valid/terbalik ditolak 400, filter role akun reset ke halaman 1, pencarian audit di-escape |

| 2026-11-28 | 6.7 (password database opsional) | PRD 25.3–25.5, FR-55, S-19, S-20 | docs/optional-supabase-db-password | CI awal gagal sebelum tes: pnpm/action-setup versi ganda dan pnpm tidak terpasang pada job pgTAP | Prompt password dialihkan ke Supabase CLI; password tidak melewati wizard. Workflow CI diperbaiki agar memakai pnpm 9.15.9 dan memasang pnpm pada job pgTAP; menunggu eksekusi CI ulang |

| 2026-11-28 | 6.3, 7.6, CI integration/E2E | PRD 25.3 local, FR-55, S-19, 27.3 | docs/optional-supabase-db-password | Tes readiness ditambahkan; menunggu CI untuk bukti runtime | Ganti pemanggilan `pnpm setup` menjadi `pnpm run setup`; wizard lokal memastikan Edge Functions sehat sebelum bootstrap; workflow tidak memulai server duplikat; tes retry/readiness dan dokumentasi setup lokal ditambahkan |

| 2026-11-28 | 6.3, 7.6, CI integration/E2E | PRD 25.3–25.5, FR-55, S-19, 27.3 | docs/optional-supabase-db-password | Tes helper env ditambahkan; menunggu CI ulang | Log CI #25 membuktikan health publik merespons 200 tetapi bootstrap mendapat 401 karena secret tidak dimuat Edge Functions. Setup kini menulis secret ke `supabase/functions/.env` sebelum stack dimulai; file di-ignore Git; CI tidak memulai Supabase sebelum wizard. |

| 2026-11-28 | 7.5, 6.3, 7.6 | PRD 25.3–25.4, FR-55, S-19; FR-01, FR-06, FR-07, FR-22, FR-23, FR-29, FR-30, FR-34, FR-36; S-01, S-04, S-09, S-10, S-11; PRD 27.2–27.4 | docs/optional-supabase-db-password | Tes parser env ditambahkan; CI #37 dijalankan ulang, hasil menunggu | CI #35 menunjukkan Playwright web server tidak menerima SUPABASE_ANON_KEY karena setup menulis `.env.local` di root sedangkan Next dijalankan dari `apps/web`. Ditambahkan helper pemuatan env root, tes unit untuk precedence/absent file, dan env forwarding ke Playwright webServer. E2E sebelumnya 4 passed, 13 failed akibat ENV_MISSING dan login 500; belum menandai E2E selesai. |

| 2026-11-28 | 7.5, CI typecheck | PRD 27.2–27.4, FR-55, S-19 | docs/optional-supabase-db-password | CI #39: 21 unit UI + 13 tes setup lulus; typecheck gagal pada `ProcessEnv` yang dapat berisi `undefined`; helper diperbaiki untuk hanya meneruskan string; CI #41 menunggu | Perbaikan tipe dilakukan setelah hasil CI, dengan tes tambahan untuk nilai undefined. E2E belum tervalidasi pada commit perbaikan akhir. |
