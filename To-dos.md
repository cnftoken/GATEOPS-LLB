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

- [ ] 0.1 — Buat struktur direktori `apps/web` (app, components, lib, tests, `middleware.ts`) — PRD 4.4
- [ ] 0.2 — Buat struktur `supabase` (config.toml, migrations, functions/_shared + domain, seed, tests) — PRD 4.4
- [ ] 0.3 — Buat `scripts/` (setup.ts, doctor.ts, release.ts, seed-demo.ts) — PRD 4.4, 25.2
- [ ] 0.4 — Buat `docs/ops/` (restore.md, releases.md) — PRD 24.4, 26.6
- [ ] 0.5 — Buat `.github/workflows/` untuk gerbang CI — PRD 27.3
- [ ] 0.6 — `package.json` root + `pnpm-workspace.yaml` (pnpm 9) — PRD 4.3
- [ ] 0.7 — `tsconfig` strict di seluruh workspace, dilarang `any` — PRD 4.3, AGENTS 8.2
- [ ] 0.8 — `.env.example` berisi nama variabel tanpa nilai — PRD 25.4
- [ ] 0.9 — `.gitignore` untuk `.env.local`, `.vercel/`, `.local/`, `.setup/` — PRD 25.4, 25.7
- [ ] 0.10 — Konfigurasi tooling: ESLint, Prettier, Vitest, Deno, Playwright — PRD 4.3, 27.1
- [ ] 0.11 — `pnpm install` menghasilkan `pnpm-lock.yaml` yang di-commit — PRD 4.3

---

## 2. Fase 1 — Migrasi Database

Rujukan: PRD 6, 4.5, 7.5, 26.5. Pola expand-contract, forward-only, satu migrasi satu transaksi.

### 2.1 Tabel

- [ ] 1.1 — Migrasi `accounts` (kolom, enum role/status, constraint regex username & NRP, unik NRP) — PRD 6.1
- [ ] 1.2 — Migrasi `sessions` (token_hash unik, expires_at, revoked_at) — PRD 6.2
- [ ] 1.3 — Migrasi `gates` (qr_token_hash unik, qr_regenerated_at) — PRD 6.3
- [ ] 1.4 — Migrasi `activities` (check status AKTIF/SELESAI, FK RESTRICT) — PRD 6.4
- [ ] 1.5 — Migrasi `gps_locations` (PK personnel_account_id, rentang lat/long) — PRD 6.5
- [ ] 1.6 — Migrasi `persit_links` (check status & personnel_account_id) — PRD 6.6
- [ ] 1.7 — Migrasi `audit_logs` (bigint identity, metadata jsonb) + trigger BEFORE UPDATE/DELETE append-only — PRD 6.7, 17.1

### 2.2 RLS dan Grant

- [ ] 1.8 — RLS aktif pada seluruh tabel, tanpa policy `anon`/`authenticated` — PRD 4.5, 6
- [ ] 1.9 — Cabut hak akses default tabel dalam migrasi yang sama — AGENTS 7.5
- [ ] 1.10 — Aktifkan ekstensi pgTAP (local/CI) dan pg_cron (production/local) — PRD 26.2

### 2.3 Constraint dan Index

- [ ] 1.11 — Unique partial index `personnel_account_id WHERE status='AKTIF'` — PRD 6.4, 6.8
- [ ] 1.12 — Constraint role SUPER_ADMIN/PERSIT memiliki nrp/pangkat/jabatan null — PRD 6.1
- [ ] 1.13 — Index pendukung pencarian & filter (nama, NRP, username, waktu keluar) — PRD 8.2, 13.4

### 2.4 Fungsi RPC (transaksional, `search_path`, grant hanya `service_role`, audit in-transaction)

- [ ] 1.14 — `create_account` (+ audit ACCOUNT_CREATED) — PRD 4.5, 16.2, FR-08
- [ ] 1.15 — `update_account` (+ audit ACCOUNT_UPDATED) — PRD 16.3, FR-08
- [ ] 1.16 — `set_account_status` (cabut sesi bila NONAKTIF, + audit ACCOUNT_STATUS_CHANGED) — PRD 7.10, FR-08
- [ ] 1.17 — `reset_account_password` (hash sementara, must_change_password, cabut sesi, + audit PASSWORD_RESET) — PRD 7.8, FR-14
- [ ] 1.18 — `change_own_password` (cabut sesi lain, + audit PASSWORD_CHANGED) — PRD 7.7, FR-13
- [ ] 1.19 — `create_personnel` (+ audit PERSONNEL_CREATED) — PRD 8.2, FR-09
- [ ] 1.20 — `update_personnel` (NRP tak berubah, + audit PERSONNEL_UPDATED) — PRD 8.2, FR-09, FR-10
- [ ] 1.21 — `delete_personnel` (hapus Persit terverifikasi, sesi, aktivitas, GPS; + audit) — PRD 8.3, FR-51
- [ ] 1.22 — `create_gate` (simpan hash QR, + audit GATE_CREATED) — PRD 9.2, FR-16, FR-19
- [ ] 1.23 — `update_gate` (+ audit GATE_UPDATED) — PRD 9.4, FR-16
- [ ] 1.24 — `regenerate_gate_qr` (ganti hash, batalkan lama, + audit GATE_QR_REGENERATED) — PRD 9.3, FR-20
- [ ] 1.25 — `register_persit` (akun + permintaan MENUNGGU, + audit PERSIT_REGISTERED) — PRD 15.1, FR-48
- [ ] 1.26 — `approve_persit` (+ audit PERSIT_APPROVED) — PRD 15.3, FR-49
- [ ] 1.27 — `reject_persit` (+ audit PERSIT_REJECTED) — PRD 15.3, FR-49
- [ ] 1.28 — `delete_persit_account` (cabut sesi, + audit PERSIT_ACCOUNT_DELETED) — PRD 15.4, FR-49
- [ ] 1.29 — `record_attendance` (FOR UPDATE NOWAIT, KELUAR/KEMBALI atomik, gps, audit) — PRD 10.3, 10.4, 10.9, FR-26, FR-27, FR-32, FR-33
- [ ] 1.30 — `report_gps` (UPSERT satu lokasi, NOT_OUT bila tak DI LUAR) — PRD 11.5, 22.8, FR-37
- [ ] 1.31 — Setiap RPC: komentar FR/PRD, `SECURITY DEFINER/INVOKER` berjustifikasi, `SET search_path`, grant `service_role` — AGENTS 7.2, PRD 4.5

### 2.5 Penjadwalan

- [ ] 1.32 — pg_cron pembersihan sesi kedaluwarsa >7 hari, harian — PRD 7.5, 24.7

### 2.6 pgTAP Database

- [ ] 1.33 — pgTAP per RPC: jalur sukses, gagal, rollback, grant, search_path — AGENTS 7.2, 10.2
- [ ] 1.34 — pgTAP RLS menolak akses `anon`/`authenticated` — PRD 27.2 S-18, FR-53
- [ ] 1.35 — pgTAP audit append-only (UPDATE/DELETE ditolak) — PRD 6.7, FR-53
- [ ] 1.36 — pgTAP invariant (satu aktivitas AKTIF, gps hanya saat DI LUAR, minimal satu Super Admin AKTIF) — PRD 6.8
- [ ] 1.37 — pgTAP rollback transaksi atomik (activities+gps+audit) — PRD 10.9, S-08, FR-26, FR-52

---

## 3. Fase 2 — `_shared` Edge Functions

Rujukan: PRD 4.4, 7.1, 7.2, 8, 22.3, 22.4.

- [ ] 2.1 — Modul sesi/auth (SHA-256 token, cek revoked/expires/idle 2 jam/status) — PRD 7.5, FR-07
- [ ] 2.2 — PBKDF2-HMAC-SHA256 600.000 iterasi via Web Crypto, format `pbkdf2_sha256$...`, constant-time — PRD 7.2, FR-12
- [ ] 2.3 — Pembuat respons sukses/galat + `requestId` — PRD 22.3, 22.6
- [ ] 2.4 — Kode galat terpusat (daftar PRD 22.4) + handler `INTERNAL_ERROR` — PRD 22.4, AGENTS 8.4
- [ ] 2.5 — Logger JSON dengan daftar kunci terlarang (password, token, secret, lat/long, tujuan, keperluan) — PRD 8.5, 24.5, FR keamanan
- [ ] 2.6 — `messages.ts` server (semua teks PRD persis) — PRD 8.7, AGENTS 8.7
- [ ] 2.7 — Konstanta validasi (panjang/format PRD 6 & 7) + normalisasi — PRD 8.6
- [ ] 2.8 — Verifikasi `X-Internal-Secret` constant-time — PRD 4.6, 7.1

---

## 4. Fase 3 — Edge Functions per Domain

Rujukan: PRD 22.5 (daftar endpoint), 7.1 (urutan), 5.2 (matriks akses). Setiap endpoint: cek internal secret → sesi → must_change_password → role → validasi → RPC/query → cakupan data → respons → log.

### 4.1 auth

- [ ] 3.1 — `POST /auth/login` (lockout, dummy hash, cookie via BFF) — PRD 7.3, 7.4, FR-01, FR-05
- [ ] 3.2 — `POST /auth/logout` (cabut sesi) — PRD 7.6
- [ ] 3.3 — `GET /auth/me` (data akun & role) — PRD 22.5
- [ ] 3.4 — `POST /auth/password` (ganti sendiri, beda dari lama) — PRD 7.7, FR-13

### 4.2 dashboard

- [ ] 3.5 — `GET /dashboard/komando` (statistik, DI LUAR, peta, aktivitas terbaru) — PRD 12.1, FR-04
- [ ] 3.6 — `GET /dashboard/beranda` (status + ringkasan pribadi) — PRD 12.2, FR-04
- [ ] 3.7 — `GET /dashboard/keluarga` (status pengaitan + personel terhubung, tanpa GPS) — PRD 12.3, 15.6, FR-50

### 4.3 personnel

- [ ] 3.8 — `GET /personnel` (paginasi, cari, urut nama) — PRD 8.2
- [ ] 3.9 — `POST /personnel` (SA) — PRD 8.2, FR-09
- [ ] 3.10 — `GET /personnel/:id` — PRD 8.2
- [ ] 3.11 — `PATCH /personnel/:id` (nama/pangkat/jabatan/username) — PRD 8.2, FR-09, FR-10
- [ ] 3.12 — `DELETE /personnel/:id` (permanen) — PRD 8.3, FR-51

### 4.4 accounts

- [ ] 3.13 — `GET /accounts` (filter role/status, cari, paginasi) — PRD 16.1
- [ ] 3.14 — `POST /accounts` (buat SA/KMD) — PRD 16.2, FR-08
- [ ] 3.15 — `PATCH /accounts/:id` — PRD 16.3, FR-08
- [ ] 3.16 — `POST /accounts/:id/status` (tolak nonaktifkan diri/SA terakhir/DI LUAR) — PRD 7.10, FR-08
- [ ] 3.17 — `POST /accounts/:id/reset-password` (sementara 12 char sekali) — PRD 7.8, FR-14

### 4.5 gates

- [ ] 3.18 — `GET /gates` (KMD baca saja) — PRD 9.6
- [ ] 3.19 — `POST /gates` (token mentah sekali) — PRD 9.2, FR-16, FR-17, FR-18
- [ ] 3.20 — `GET /gates/:id` (tanpa token mentah/QR lama) — PRD 9.6
- [ ] 3.21 — `PATCH /gates/:id` (nama/lokasi/status) — PRD 9.4, FR-16
- [ ] 3.22 — `POST /gates/:id/regenerate-qr` (token mentah sekali) — PRD 9.3, FR-18, FR-20

### 4.6 transactions

- [ ] 3.23 — `POST /transactions/scan` (validasi QR 9.5, FORM_INCOMPLETE, panggil record_attendance) — PRD 10, FR-22, FR-25, FR-28, FR-32, FR-33

### 4.7 gps

- [ ] 3.24 — `POST /gps/report` (GRANTED/DENIED, NOT_OUT, tanpa audit) — PRD 11.2, 11.5, 22.8, FR-37
- [ ] 3.25 — `GET /gps` (daftar DI LUAR + status GPS dihitung server) — PRD 11.4, 11.8, FR-38, FR-39, FR-40

### 4.8 activities

- [ ] 3.26 — `GET /activities` (filter 13.4, paginasi, urut exit_at desc) — PRD 13, FR-43, FR-44
- [ ] 3.27 — `GET /activities/:id` — PRD 13.2
- [ ] 3.28 — `GET /activities/report` (batas 5.000 baris, REPORT_TOO_LARGE) — PRD 14.2, FR-46
- [ ] 3.29 — `GET /activities/mine` (pribadi) — PRD 13.6, FR-43
- [ ] 3.30 — `GET /activities/mine/:id` (milik orang lain → NOT_FOUND) — PRD 13.6, S-17

### 4.9 persit

- [ ] 3.31 — `POST /persit/register` (publik, NRP terdaftar) — PRD 15.1, FR-48
- [ ] 3.32 — `GET /persit/requests` (filter status, urut terlama) — PRD 15.3
- [ ] 3.33 — `POST /persit/accounts/:id/approve` — PRD 15.3, FR-49
- [ ] 3.34 — `POST /persit/accounts/:id/reject` — PRD 15.3, FR-49
- [ ] 3.35 — `DELETE /persit/accounts/:id` (hapus/cabut) — PRD 15.4, FR-49

### 4.10 audit & health

- [ ] 3.36 — `GET /audit` (filter, paginasi, SA saja) — PRD 17.5, FR-53
- [ ] 3.37 — `GET /health` (cek koneksi DB → `{status:"ok"}`) — PRD 24.5
- [ ] 3.38 — `config.toml` `verify_jwt=true` untuk seluruh fungsi — PRD 22.1, 26.2
- [ ] 3.39 — Endpoint bootstrap `accounts/bootstrap` (SA pertama, idempotent) — PRD 25.3, AGENTS 12

---

## 5. Fase 4 — BFF Route Handler

Rujukan: PRD 7.3, 22.1.

- [ ] 4.1 — `apps/web/app/api/v1/[...path]/route.ts` proxy 1:1 ke Edge Function — PRD 22.1
- [ ] 4.2 — Tambah header `Authorization: Bearer <anon>`, `X-Internal-Secret`, `X-Session-Token` dari cookie — PRD 22.1
- [ ] 4.3 — Cookie `gateops_session` HttpOnly, Secure, SameSite=Strict, Path=/, Max-Age 12 jam; logout hapus — PRD 7.3, FR-06
- [ ] 4.4 — Cek header `Origin` sama host untuk request mutasi, else 403 — PRD 4.6, 7.3
- [ ] 4.5 — BFF tanpa aturan bisnis/state selain cookie — PRD 7.3

---

## 6. Fase 5 — UI (Next.js)

Rujukan: PRD 12–21, 20.2 (rute), 10.6 (kamera), 11 (GPS klien), 14 (PDF).

### 6.1 Fondasi UI

- [ ] 5.1 — Design tokens (warna, radius, bayangan, tipografi) sesuai PRD 21.2, tanpa nilai hardcoded — FR (AGENTS 2.18)
- [ ] 5.2 — Komponen utama (sidebar, header, kartu, tabel, tombol, input, segmented, dialog, sheet, toast, skeleton) — PRD 21.3
- [ ] 5.3 — Pemetaan badge status + teks (aksesibilitas) — PRD 21.4
- [ ] 5.4 — State loading/empty/error + konfirmasi — PRD 21.5
- [ ] 5.5 — Paginasi (25, Sebelumnya/Berikutnya, Halaman X dari Y) — PRD 21.6
- [ ] 5.6 — Responsif (mobile bottom tab/drawer, tablet, desktop) — PRD 20.3, 21.7
- [ ] 5.7 — Aksesibilitas (kontras AA, target 44px, keyboard, aria-label, focus trap) — PRD 21.8
- [ ] 5.8 — Gerak (transisi 200ms, reduced-motion) — PRD 21.9
- [ ] 5.9 — Utilitas format waktu & durasi di `lib/format.ts` — PRD 8.3, 4.7
- [ ] 5.10 — `lib/messages.ts` UI (teks PRD persis, dijaga tes) — PRD 8.7, AGENTS 8.7
- [ ] 5.11 — `middleware.ts` CSP nonce + redirect sesi/role — PRD 4.6, 20.1
- [ ] 5.12 — TanStack Query polling 15 detik, stop saat tab tak terlihat — PRD 12.4, FR (UI)

### 6.2 Halaman per Rute (PRD 20.2)

- [ ] 5.13 — `/login` (publik) — PRD 7.3, FR-01
- [ ] 5.14 — `/registrasi-persit` (publik) — PRD 15.1, FR-48
- [ ] 5.15 — `/ganti-password` (wajib ganti) — PRD 7.9, FR-15
- [ ] 5.16 — `/komando` (dashboard komando + peta) — PRD 12.1, FR-04
- [ ] 5.17 — `/personel`, `/personel/baru`, `/personel/[id]`, `/personel/[id]/edit` — PRD 8, FR-09, FR-10
- [ ] 5.18 — `/beranda` (status besar, durasi berjalan, ringkasan 3 aktivitas) — PRD 12.2
- [ ] 5.19 — `/keluar-masuk/scan` (Form Keluar 2 langkah + kamera 10.6) — PRD 10.2, 10.3, 10.6, FR-22, FR-23, FR-31
- [ ] 5.20 — `/keluar-masuk/riwayat` + `/[id]` (pribadi) — PRD 13.6
- [ ] 5.21 — `/gps` (peta + daftar, update 15 detik) — PRD 11.8
- [ ] 5.22 — `/riwayat` + `/[id]` (SA/KMD, filter) — PRD 13, FR-43, FR-44
- [ ] 5.23 — `/laporan` (parameter, batas 31 hari/5.000 baris, PDF browser) — PRD 14, FR-46, FR-47
- [ ] 5.24 — `/keluarga` (dashboard keluarga) — PRD 12.3, FR-50
- [ ] 5.25 — `/keluarga/verifikasi` (SA) — PRD 15.3, FR-49
- [ ] 5.26 — `/pengelolaan/gate`, `/baru`, `/[id]` (QR sekali, regenerasi) — PRD 9, FR-16, FR-18, FR-20
- [ ] 5.27 — `/pengelolaan/akun` (kelola akun, reset, status) — PRD 16, FR-08, FR-14
- [ ] 5.28 — `/pengelolaan/audit` (SA) — PRD 17.5, FR-53
- [ ] 5.29 — `/pengaturan` (ganti password sendiri, semua role) — PRD 7.7, FR-13

### 6.3 Komponen Khusus

- [ ] 5.30 — Kamera + scan jsQR, tangani seluruh kondisi PRD 10.6 — PRD 10.6, FR-28, FR-31
- [ ] 5.31 — Klien GPS (interval 30s, permissions change, pemulihan) — PRD 11, FR-34, FR-36, FR-41
- [ ] 5.32 — Pembuat PDF `@react-pdf/renderer` + grafik SVG, penamaan file — PRD 14.3–14.6, FR-47

---

## 7. Fase 6 — Scripts Otomatis

Rujukan: PRD 25, 26.4.

- [ ] 6.1 — `doctor.ts` (prasyarat, login, koneksi, RLS, grant RPC, health) — PRD 25.6
- [ ] 6.2 — `setup.ts` target production (alur 25.3, idempoten) — PRD 25.3, 25.5, FR-55, S-19
- [ ] 6.3 — `setup.ts --target local` (supabase start/reset, functions serve, bootstrap SA) — PRD 25.3, S-19
- [ ] 6.4 — `release.ts` (urutan 26.4, stop bila gagal) — PRD 26.4, FR-55, S-20
- [ ] 6.5 — `seed-demo.ts` (tolak non-local, kredensial di `.local/`) — PRD 25.7
- [ ] 6.6 — Guard target eksplisit pada script yang menyentuh production — AGENTS 5, PRD 25.5

---

## 8. Fase 7 — Pengujian

Rujukan: PRD 27, AGENTS 10.

- [ ] 7.1 — Unit UI (Vitest): komponen, format waktu/durasi, badge, logika status GPS — PRD 27.1
- [ ] 7.2 — Unit Edge (Deno test): hashing, validasi, constant-time, sesi — PRD 27.1
- [ ] 7.3 — Integration API (Deno test vs Supabase local): tiap endpoint tiap role — PRD 27.1
- [ ] 7.4 — pgTAP (lihat Fase 1.6) — PRD 27.1
- [ ] 7.5 — E2E Playwright alur Bagian 19 — PRD 27.1, 19
- [ ] 7.6 — Tes setup idempotensi `setup --target local` — PRD 27.2 S-19
- [ ] 7.7 — Tes konsistensi pesan `messages.ts` server vs UI vs PRD — AGENTS 10.3
- [ ] 7.8 — Tes ambang waktu 60 detik & 15 menit dengan clock dapat diatur — AGENTS 10.1
- [ ] 7.9 — RBAC: tiap endpoint untuk tiap role tak diizinkan — AGENTS 10.2, S-17
- [ ] 7.10 — Uji beban kapasitas desain (2.000/100/500/150) penuhi target 24.2 — PRD 24.2

---

## 9. Fase 8 — CI

Rujukan: PRD 27.3.

- [ ] 8.1 — Workflow: lint & format — PRD 27.3
- [ ] 8.2 — Workflow: typecheck seluruh workspace — PRD 27.3
- [ ] 8.3 — Workflow: unit test UI & Edge — PRD 27.3
- [ ] 8.4 — Workflow: start Supabase local, migrasi, pgTAP — PRD 27.3
- [ ] 8.5 — Workflow: integration API — PRD 27.3
- [ ] 8.6 — Workflow: E2E Playwright — PRD 27.3
- [ ] 8.7 — Workflow: build web — PRD 27.3
- [ ] 8.8 — Workflow: audit dependensi (gagal bila high/critical) — PRD 27.3

---

## 10. Fase 9 & 10 — Dokumentasi, Keamanan, Rilis

### 9. Dokumentasi Operasional

- [ ] 9.1 — `docs/ops/restore.md` (prosedur PITR, diuji sekali sebelum rilis pertama) — PRD 24.4
- [ ] 9.2 — `docs/ops/releases.md` (catat commit hash & waktu tiap rilis) — PRD 26.6

### 10. Checklist Keamanan (AGENTS 9)

- [ ] 10.1 — Tidak ada secret/token/password/service role di kode, log, fixture — AGENTS 9
- [ ] 10.2 — Setiap endpoint punya cek sesi, role, cakupan data — AGENTS 9
- [ ] 10.3 — Tidak ada query lintas Personel untuk role Personel — AGENTS 9
- [ ] 10.4 — Persit tak dapat baca GPS/lokasi/tujuan/keperluan/waktu/riwayat — AGENTS 9
- [ ] 10.5 — Mutasi multi-tabel via satu RPC + audit — AGENTS 9
- [ ] 10.6 — RLS aktif, grant RPC hanya `service_role` — AGENTS 9
- [ ] 10.7 — Header keamanan PRD 4.6 pada seluruh respons — AGENTS 9
- [ ] 10.8 — Kamera & GPS hanya HTTPS/localhost — AGENTS 9

### 10. Checklist Produksi (PRD 26.7)

- [ ] 10.9 — `pnpm doctor` lulus — PRD 26.7
- [ ] 10.10 — Seluruh pengujian CI lulus — PRD 26.7
- [ ] 10.11 — Migrasi diterapkan & diuji di local — PRD 26.7
- [ ] 10.12 — RLS aktif seluruh tabel; tak ada RPC anon/authenticated — PRD 26.7
- [ ] 10.13 — Header keamanan terlihat di production — PRD 26.7
- [ ] 10.14 — Health check production ok — PRD 26.7
- [ ] 10.15 — Backup & PITR aktif; uji restore pertama selesai — PRD 26.7
- [ ] 10.16 — Pengujian beban lulus — PRD 26.7
- [ ] 10.17 — `pnpm release` sukses deploy migrasi+functions+web + health check — PRD 3.3, 26.4, FR-55

---

## 11. Matriks Traceability Kebutuhan Fungsional (FR)

Rujukan: PRD Bagian 23. Centang bila FR tercakup kode + tes.

- [ ] FR-01 — Login username & password (S-01)
- [ ] FR-02 — Empat role (S-01)
- [ ] FR-03 — Batasi akses API & halaman per role tiap request (S-17)
- [ ] FR-04 — Dashboard sesuai role (S-17)
- [ ] FR-05 — Lockout 15 menit setelah 5 kegagalan (S-15)
- [ ] FR-06 — Cookie HttpOnly, Secure, SameSite=Strict (S-01)
- [ ] FR-07 — Sesi kedaluwarsa 12 jam / idle 2 jam (S-01)
- [ ] FR-08 — SA buat/ubah/nonaktifkan akun SA & KMD (S-02)
- [ ] FR-09 — SA tambah/ubah/hapus personel (S-02, S-13)
- [ ] FR-10 — NRP personel tak dapat diubah (S-02)
- [ ] FR-11 — Username unik lintas role, tak peka huruf besar-kecil (S-02)
- [ ] FR-12 — Password tanpa aturan komposisi & panjang minimum (S-02)
- [ ] FR-13 — Semua role ganti password sendiri (S-14)
- [ ] FR-14 — SA reset password, sementara ditampilkan sekali (S-14)
- [ ] FR-15 — Password sementara wajib ganti sebelum akses lain (S-14)
- [ ] FR-16 — SA buat gate nama/lokasi/status (S-03)
- [ ] FR-17 — Tiap gate QR token 256-bit (S-03)
- [ ] FR-18 — Token QR mentah sekali saat buat/regenerasi (S-03)
- [ ] FR-19 — DB hanya simpan hash SHA-256 token QR (S-03)
- [ ] FR-20 — Regenerasi QR batalkan QR lama (S-03)
- [ ] FR-21 — Gate NONAKTIF tolak keluar & kembali (S-05)
- [ ] FR-22 — Keluar hanya setelah tujuan & keperluan terisi (S-04)
- [ ] FR-23 — Kamera tak dibuka sebelum Form Keluar valid (S-04)
- [ ] FR-24 — Kembali tanpa form (S-06)
- [ ] FR-25 — Jenis transaksi otomatis dari status (S-03, S-06)
- [ ] FR-26 — Transaksi keluar/kembali atomik (S-08)
- [ ] FR-27 — Request kedua saat transaksi berjalan ditolak (S-07)
- [ ] FR-28 — QR invalid tak ubah status, kamera tetap aktif (S-05)
- [ ] FR-29 — Sesi berakhir saat scan menolak transaksi & hentikan kamera (S-09)
- [ ] FR-30 — Koneksi putus saat scan tanpa antrean/retry (S-10)
- [ ] FR-31 — Kegagalan kamera pesan + coba lagi (S-04)
- [ ] FR-32 — Keluar catat waktu/tujuan/keperluan/gate/AKTIF (S-03)
- [ ] FR-33 — Kembali catat waktu/gate/durasi/SELESAI (S-06)
- [ ] FR-34 — GPS aktif otomatis setelah keluar (S-11)
- [ ] FR-35 — GPS berhenti & lokasi dihapus setelah kembali (S-06)
- [ ] FR-36 — Klien kirim lokasi tiap 30 detik (S-11)
- [ ] FR-37 — Simpan satu lokasi terbaru per Personel (S-11)
- [ ] FR-38 — GPS AKTIF bila diterima ≤60 detik (termasuk tepat 60) (S-12)
- [ ] FR-39 — GPS OFFLINE bila >60 detik / izin dicabut (S-12)
- [ ] FR-40 — GPS TIDAK AKTIF bila belum pernah diterima (S-12)
- [ ] FR-41 — Tracking pulih otomatis saat koneksi/izin kembali (S-12)
- [ ] FR-42 — Status GPS tak memengaruhi status kehadiran (S-12)
- [ ] FR-43 — Riwayat tampilkan field Bagian 13.2 (S-16)
- [ ] FR-44 — Riwayat dapat difilter & urut waktu keluar terbaru (S-16)
- [ ] FR-45 — Riwayat tak dihapus otomatis (S-16)
- [ ] FR-46 — SA & KMD buat/unduh PDF periode maks 31 hari (S-16)
- [ ] FR-47 — PDF berisi data aktivitas, statistik, grafik (S-16)
- [ ] FR-48 — Persit registrasi mandiri NRP terdaftar (S-12)
- [ ] FR-49 — SA setujui/tolak/hapus akun Persit (S-12)
- [ ] FR-50 — Persit hanya lihat identitas & status personel terhubung (S-12)
- [ ] FR-51 — Hapus personel hapus Persit, sesi, riwayat atomik (S-13)
- [ ] FR-52 — Audit dalam transaksi sama dgn perubahan bisnis (S-08)
- [ ] FR-53 — Audit append-only (S-18)
- [ ] FR-54 — Tanpa notifikasi transaksi keluar/kembali (S-03, S-06)
- [ ] FR-55 — Instalasi/konfigurasi/migrasi/deployment via perintah otomatis (S-19, S-20)

---

## 12. Checklist Skenario Wajib (S)

Rujukan: PRD 27.2.

- [ ] S-01 — Login sukses/gagal, cookie & atribut, kedaluwarsa & idle timeout (API, E2E)
- [ ] S-02 — SA buat personel & akun KMD, ubah data, username unik, NRP tetap (API, E2E)
- [ ] S-03 — Buat gate & QR, token sekali, hash tersimpan, keluar AKTIF (API, E2E)
- [ ] S-04 — Form Keluar invalid tak buka kamera, valid buka kamera, gagal kamera (E2E)
- [ ] S-05 — QR invalid pesan & tak ubah status, gate NONAKTIF ditolak (API, E2E)
- [ ] S-06 — Kembali tercatat, SELESAI, durasi, GPS dihapus (API, E2E)
- [ ] S-07 — Dua request transaksi, kedua ditolak TRANSACTION_IN_PROGRESS (Integration)
- [ ] S-08 — Gagal di tengah RPC batalkan seluruh perubahan & audit (Database)
- [ ] S-09 — Sesi berakhir saat scan menolak transaksi & hentikan kamera (E2E)
- [ ] S-10 — Koneksi putus saat scan tanpa transaksi & tanpa retry (E2E)
- [ ] S-11 — Keluar aktifkan tracking, kirim lokasi tiap 30 detik (E2E)
- [ ] S-12 — Status GPS AKTIF/OFFLINE/TIDAK AKTIF, batas 60 detik, pemulihan, izin dicabut (API, E2E)
- [ ] S-13 — Hapus personel hapus Persit terverifikasi, sesi, riwayat atomik (Database, API)
- [ ] S-14 — Reset password sementara, wajib ganti, sesi lain dicabut (API, E2E)
- [ ] S-15 — Lockout 5 kegagalan, terbuka setelah 15 menit (API)
- [ ] S-16 — Riwayat filter & paginasi, PDF batas periode & baris (API, E2E)
- [ ] S-17 — KMD tak akses pengelolaan, Personel tak lihat data lain, Persit tak lihat GPS (API, E2E)
- [ ] S-18 — Audit tak dapat diubah/dihapus, RLS tolak anon/authenticated (Database)
- [ ] S-19 — `setup --target local` env kosong berhasil & idempotent (Setup)
- [ ] S-20 — `release` env local jalankan seluruh urutan & health check (Setup)

---

## 13. Log Perubahan

Agen WAJIB menambah satu baris setiap menyelesaikan item. Sertakan bukti (perintah tes / gerbang).

| Tanggal | ID Item | FR / Skenario | PR / Commit | Bukti Tes | Catatan |
|---|---|---|---|---|---|
| | | | | | |