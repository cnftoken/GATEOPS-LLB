# AGENTS.md: Panduan Kerja Agen Pengembang GATEOPS

File ini adalah aturan kerja untuk setiap agen (manusia atau AI) yang menulis, mengubah, menguji, atau men-deploy kode di repository ini.

---

## 0. Hierarki Sumber

1. `PRD.md` adalah sumber kebenaran tunggal untuk produk, perilaku, data, API, dan batasan.
2. `To-dos.md` adalah urutan kerja dan daftar periksa progres pengembangan.
3. `AGENTS.md` (file ini) adalah aturan cara kerja.
4. Kode mengikuti ketiganya.

Agen WAJIB membaca `PRD.md` bagian relevan dan `To-dos.md` sebelum menulis kode, lalu WAJIB memperbarui status item terkait di `To-dos.md` (mengubah `[ ]` menjadi `[~]` saat mulai dan `[x]` setelah selesai dengan bukti) serta mengisi tabel Log Perubahan di `To-dos.md` setiap menyelesaikan pekerjaan. Item dilarang ditandai `[x]` tanpa bukti tes atau gerbang yang lulus.

Jika permintaan bertentangan dengan PRD, atau PRD tidak mengatur sesuatu yang dibutuhkan untuk menyelesaikan tugas, agen WAJIB berhenti dan melaporkan kondisi tersebut. Agen DILARANG menebak perilaku, membuat keputusan produk, atau menambahkan `TODO`, `FIXME`, atau `TBD` untuk menunda keputusan.

---

## 1. Ringkasan Proyek

GATEOPS adalah aplikasi web untuk memantau kehadiran personel, transaksi keluar dan kembali melalui QR Code gate, GPS tracking saat personel DI LUAR, riwayat, dan laporan PDF.

- Empat role: Super Admin, Komandan, Personel, Persit.
- Status kehadiran hanya DI DALAM dan DI LUAR. Status diturunkan dari tabel `activities`, tidak disimpan sebagai kolom.
- Deployment: Vercel (UI dan BFF Next.js) dan Supabase (PostgreSQL dan Edge Functions).
- Bahasa antarmuka: Bahasa Indonesia. Identifier kode: Bahasa Inggris.

---

## 2. Aturan Mutlak

Pelanggaran terhadap aturan ini membuat perubahan ditolak, sekalipun tes lulus.

1. Jangan menambah fitur di luar lingkup PRD Bagian 3.2. Fitur seperti izin keluar, notifikasi, antrean offline, ekspor Excel atau CSV, GPS route history, dan mode gelap DILARANG.
2. Jangan menambah endpoint, tabel, kolom, role, status, atau field yang tidak ada di PRD.
3. Browser DILARANG memanggil Supabase atau Edge Functions secara langsung. Seluruh panggilan dari browser melewati `/api/v1/*` di Next.js.
4. Aturan bisnis hanya boleh ada di Edge Functions dan fungsi RPC PostgreSQL. BFF dan UI hanya menampilkan dan meneruskan. Validasi di UI hanya umpan balik cepat, sedangkan validasi autoritatif tetap di server.
5. Service role key DILARANG berada di Vercel, browser, repository, log, atau berkas apa pun selain environment Edge Functions yang disediakan Supabase.
6. Token sesi mentah, token QR mentah, password, password hash, cookie, secret, latitude, longitude, tujuan, dan keperluan DILARANG masuk ke log, audit, atau respons galat.
7. Token QR mentah hanya boleh muncul pada respons pembuatan dan regenerasi gate, dan hanya satu kali. Database hanya menyimpan SHA-256 hex.
8. Mutasi yang menyentuh lebih dari satu tabel, atau menulis audit, WAJIB dilakukan melalui fungsi RPC. Satu RPC berjalan dalam satu transaksi. Audit ditulis di dalam RPC yang sama dengan perubahan bisnisnya.
9. RLS WAJIB aktif pada setiap tabel. DILARANG membuat policy untuk role `anon` atau `authenticated`.
10. Fungsi RPC DILARANG dieksekusi oleh `public`, `anon`, atau `authenticated`. Grant hanya kepada `service_role`. Setiap RPC WAJIB menetapkan `search_path`.
11. Migrasi bersifat forward-only dan expand-contract. DILARANG mengedit migrasi yang sudah pernah diterapkan. DILARANG membuat file down migration.
12. DILARANG memakai Supabase Auth, Supabase Realtime, atau Supabase Storage untuk fitur aplikasi.
13. Transaksi QR dan pengiriman GPS DILARANG memakai antrean, retry otomatis, atau pemrosesan tertunda.
14. Toast hanya untuk umpan balik aksi pengguna di layar. Toast DILARANG dikembangkan menjadi notifikasi kepada pengguna lain.
15. Pesan teks yang ditetapkan PRD WAJIB persis sama, termasuk ejaan yang tampak keliru. Contoh: pesan `INVALID_QR` memakai `silahkan`, dan kata itu tidak boleh diperbaiki tanpa keputusan produk.
16. Status kehadiran tidak boleh diubah langsung oleh endpoint apa pun. Status hanya berubah melalui RPC `record_attendance`.
17. Hanya satu aktivitas AKTIF per Personel. Invariant ini dijaga oleh unique partial index dan tidak boleh dilemahkan.
18. Desain hanya light mode. Warna dan tipografi wajib memakai design tokens di PRD Bagian 21.2. Nilai hardcoded di komponen DILARANG.
19. Super Admin dan Komandan tidak dapat dihapus. Akun Personel yang sedang DI LUAR tidak dapat dinonaktifkan.
20. Environment staging DILARANG dibuat. Preview deployment Vercel tidak boleh terhubung ke Supabase production.
21. Deployment production web dilakukan melalui integrasi Git Vercel (auto deployment boleh aktif/nonaktif). Migrasi dan Edge Functions production dilakukan melalui workflow GitHub Actions `Deploy Supabase Production` yang hanya berjalan manual (`workflow_dispatch`) pada branch `main`. Untuk perubahan backend, auto deployment Vercel dinonaktifkan sebelum merge; jalankan workflow Supabase lebih dahulu, lalu deploy web manual. `pnpm release` dan `pnpm setup` tetap tersedia sebagai jalur CLI opsional. DILARANG menjalankan perintah deploy production secara ad-hoc di luar workflow atau jalur CLI tersebut.
22. `To-dos.md` WAJIB dijaga tetap sinkron dengan pekerjaan. DILARANG menandai item selesai tanpa bukti, dan DILARANG menyelesaikan pekerjaan tanpa memperbarui `To-dos.md`.

---

## 3. Alur Kerja Sebelum Menulis Kode

Setiap tugas WAJIB mengikuti langkah berikut:

1. Baca bagian PRD yang relevan. Cari ID FR di Bagian 23 dan skenario di Bagian 27.2.
2. Identifikasi komponen yang terdampak: UI, BFF, Edge Function, RPC, migrasi, atau script.
3. Periksa apakah perubahan menyentuh data, audit, akses, atau secret. Jika ya, ikuti Bagian 9 dengan lebih ketat.
4. Jika PRD tidak mengatur kasus yang ditemui, berhenti dan laporkan (lihat Bagian 13).
5. Tandai item terkait di `To-dos.md` sebagai `[~]` sebelum mulai, dan rujuk ID item tersebut.
6. Tulis tes terlebih dahulu untuk perilaku yang diubah, minimal tes yang merujuk ID FR atau skenario.
7. Implementasikan perubahan dengan perubahan sekecil mungkin.
8. Jalankan gerbang lokal: lint, typecheck, unit, dan integration yang relevan. Jalankan pgTAP jika menyentuh migrasi atau RPC.
   - Sebelum lint, format seluruh file yang diubah menggunakan formatter repository: `pnpm exec prettier --write <path-file-yang-diubah>`. DILARANG menebak format secara manual atau mengubah konfigurasi Prettier untuk meloloskan CI. Setelah itu WAJIB jalankan `pnpm lint` dan pastikan `prettier --check` lulus.
9. Perbarui dokumentasi operasional di `docs/` jika perilaku setup, deployment, atau restore berubah.
10. Tandai item di `To-dos.md` sebagai `[x]` dengan bukti, dan isi tabel Log Perubahan di `To-dos.md`.
11. Laporkan hasil dengan daftar FR atau skenario yang tercakup dan perintah tes yang dijalankan.

---

## 4. Stack dan Versi

| Lapisan | Teknologi |
|---|---|
| Runtime lokal | Node.js 22 LTS |
| Package manager | pnpm 9. Lockfile WAJIB ikut di-commit |
| Frontend | Next.js 16 App Router, React 19, TypeScript strict |
| Styling | Tailwind CSS v4, Radix UI primitives, lucide-react |
| Data fetching UI | TanStack Query v5, polling 15 detik |
| Validasi UI | Zod (umpan balik saja) |
| Peta | Leaflet dan react-leaflet, tile OpenStreetMap |
| Scan QR | getUserMedia dan jsQR |
| QR PNG | library qrcode |
| PDF | @react-pdf/renderer, grafik dengan primitif SVG |
| Font | Inter melalui next/font |
| Edge Functions | Deno, TypeScript, supabase-js v2 |
| Database | PostgreSQL dari Supabase (minimal 15), pgTAP, pg_cron |
| Tes | Vitest, Deno test, pgTAP, Playwright |

Dilarang menambah dependensi baru tanpa alasan tertulis di deskripsi PR. Dependensi baru harus mendukung Edge Runtime Deno jika dipakai di `functions/`. Hashing password hanya memakai Web Crypto API.

---

## 5. Struktur Repository

```
gateops/
├── apps/web/                     # Next.js 16 (UI + BFF), deploy ke Vercel
│   ├── app/                      # halaman dan route handlers /api/v1/*
│   ├── components/
│   ├── lib/                      # client API, format waktu dan durasi, messages
│   ├── middleware.ts             # CSP nonce, redirect sesi dan role
│   └── tests/
├── supabase/
│   ├── config.toml               # verify_jwt per function
│   ├── migrations/               # SQL, nama berurutan timestamp
│   ├── functions/
│   │   ├── _shared/              # auth sesi, PBKDF2, respons, logger, messages, errors
│   │   ├── auth/ dashboard/ personnel/ accounts/ gates/
│   │   ├── transactions/ gps/ activities/ persit/ audit/ health/
│   └── tests/                    # pgTAP
├── scripts/                      # setup.ts, doctor.ts, release.ts, seed-demo.ts
├── docs/ops/                     # restore.md, releases.md
├── .github/workflows/
├── .env.example
├── AGENTS.md
├── PRD.md
└── To-dos.md
```

Aturan lokasi:

- Logika autentikasi, hashing, dan pembuatan respons hanya di `functions/_shared/`.
- Pesan teks yang ditetapkan PRD hanya didefinisikan di satu tempat per lapisan: `functions/_shared/messages.ts` untuk server dan `apps/web/lib/messages.ts` untuk UI. Keduanya dijaga konsistensinya oleh tes.
- Kode kamera dan scan QR hanya di komponen klien.
- Script yang berjalan terhadap production WAJIB memeriksa target eksplisit dan menolak jika target tidak sesuai.

---

## 6. Perintah

| Perintah | Kegunaan |
|---|---|
| `pnpm install` | Pasang dependensi |
| `pnpm setup` | Wizard bootstrap production opsional; tidak wajib untuk deployment rutin |
| `pnpm setup -- --target local` | Instalasi lokal |
| `pnpm doctor` | Periksa prasyarat dan konfigurasi (opsional) |
| `pnpm dev` | Web dan Edge Functions lokal |
| `pnpm seed:demo` | Data demo. Menolak dijalankan jika target bukan local |
| `pnpm lint` | Lint dan format check |
| `pnpm typecheck` | Typecheck seluruh workspace |
| `pnpm test` | Unit dan integration |
| `pnpm test:db` | pgTAP terhadap Supabase local |
| `pnpm test:e2e` | Playwright |
| `pnpm release` | Jalur deployment CLI terorkestrasi opsional sesuai PRD 26.4 |

Jangan menjalankan `pnpm release` atau `pnpm setup` tanpa instruksi eksplisit dari Owner. Deployment rutin mengikuti PRD 26.4: Vercel Git integration untuk web dan workflow Supabase manual opsional untuk migrasi/Edge Functions.

---

## 7. Pola Implementasi

### 7.1 Edge Function

Setiap endpoint mengikuti urutan ini tanpa pengecualian:

1. Periksa header `X-Internal-Secret` dengan perbandingan constant-time.
2. Baca `X-Session-Token`, hitung SHA-256, dan cari sesi.
3. Periksa `revoked_at`, `expires_at`, idle timeout 2 jam, dan status akun AKTIF.
4. Periksa `must_change_password`. Jika true, hanya endpoint auth tertentu yang diizinkan.
5. Periksa role dan hak akses endpoint sesuai Bagian 22.5.
6. Validasi input dengan skema server. Batas panjang dan format mengikuti PRD.
7. Panggil RPC untuk mutasi, atau query baca dengan service role untuk pembacaan.
8. Pastikan cakupan data sesuai role (misalnya Personel hanya membaca aktivitas miliknya).
9. Kembalikan respons sesuai format PRD 22.3 dengan `requestId`.
10. Tulis log terstruktur tanpa data sensitif.

Otorisasi berdasarkan data (ownership) WAJIB diperiksa di server. Jika Personel meminta aktivitas milik orang lain, responsnya `NOT_FOUND`, bukan `FORBIDDEN`.

### 7.2 Fungsi RPC

1. Kunci baris akun dengan `FOR UPDATE NOWAIT` jika operasi berhubungan dengan transaksi Personel.
2. Baca status terkini di dalam transaksi. Jangan mengandalkan data yang dibaca di luar RPC.
3. Lakukan validasi bisnis, lalu mutasi, lalu tulis audit, semua dalam satu fungsi.
4. Gunakan exception untuk pembatalan. Jangan menelan error.
5. Setiap RPC WAJIB memiliki `SECURITY INVOKER` atau `SECURITY DEFINER` yang dijustifikasi di komentar, `SET search_path`, dan grant hanya ke `service_role`.
6. Setiap RPC memiliki pgTAP untuk jalur sukses, jalur gagal, dan rollback.

Contoh urutan `record_attendance`:

1. `SELECT ... FROM accounts WHERE id = $1 FOR UPDATE NOWAIT`. Jika gagal, lempar `TRANSACTION_IN_PROGRESS`.
2. `SELECT ... FROM gates WHERE id = $2 FOR SHARE`. Jika NONAKTIF, lempar `GATE_INACTIVE`.
3. Cek aktivitas AKTIF Personel. Jika ada, proses KEMBALI. Jika tidak, proses KELUAR.
4. Ubah `activities`, `gps_locations`, lalu tulis audit.

### 7.3 Route Handler BFF

1. Setiap route di `apps/web/app/api/v1/[...path]/route.ts` hanya meneruskan request ke Edge Function yang sesuai.
2. Cookie `gateops_session` dibaca di server dan diteruskan sebagai `X-Session-Token`. Nilainya tidak pernah dikembalikan ke browser.
3. Request mutasi WAJIB diperiksa header `Origin`-nya sama dengan host aplikasi. Jika tidak, respons 403.
4. Login menulis cookie dengan atribut HttpOnly, Secure, SameSite=Strict, Path=/, dan Max-Age 12 jam. Logout menghapus cookie.
5. BFF DILARANG memeriksa role, memanipulasi data, atau menyimpan state selain cookie.

### 7.4 UI

1. Data dari server diambil melalui TanStack Query. Interval polling 15 detik untuk dashboard, GPS, dan daftar yang menampilkan status.
2. Setiap halaman WAJIB memiliki state loading (skeleton), empty, dan error sesuai PRD 21.5.
3. Aksi destruktif dan aksi yang tercantum di PRD 21.5 WAJIB memakai dialog konfirmasi.
4. Kontrol menu dan tombol disembunyikan sesuai role. Namun pemeriksaan hak akses tetap dilakukan di server.
5. Semua badge status memakai pemetaan di PRD 21.4 dan selalu menampilkan teks.
6. Komponen kamera harus menangani seluruh kondisi di PRD 10.6.
7. Komponen tidak memakai `localStorage`, `sessionStorage`, atau IndexedDB untuk data bisnis.
8. Perubahan visual wajib mengikuti design tokens. Dilarang memakai warna, radius, atau bayangan hardcoded.

### 7.5 Migrasi

1. Nama file: `YYYYMMDDHHMMSS_deskripsi_singkat.sql`.
2. Setiap migrasi berjalan dalam transaksi.
3. Ubah skema dengan expand-contract. Kolom baru ditambahkan dulu sebagai nullable atau dengan default aman. Penghapusan kolom atau fungsi lama dilakukan pada rilis berikutnya.
4. Setiap perubahan constraint atau RPC disertai pgTAP.
5. Migrasi tidak boleh mengubah atau menghapus data production tanpa rencana tertulis di deskripsi PR dan persetujuan Owner.
6. Migrasi yang menambahkan tabel WAJIB mengaktifkan RLS dan mencabut hak akses default dalam migrasi yang sama.

---

## 8. Konvensi Kode

### 8.1 Penamaan

| Konteks | Konvensi | Contoh |
|---|---|---|
| Tabel dan kolom database | snake_case | `personnel_account_id`, `gps_updated_at` |
| Variabel dan fungsi TypeScript | camelCase | `permissionState`, `recordAttendance` |
| Tipe dan komponen React | PascalCase | `ScanPanel`, `GpsStatusBadge` |
| Nilai enum | UPPER_SNAKE_CASE | `DI_LUAR`, `TIDAK_AKTIF` |
| Field JSON API | camelCase | `durationSeconds`, `permissionState` |
| Kode error | UPPER_SNAKE_CASE | `TRANSACTION_IN_PROGRESS` |
| Action audit | UPPER_SNAKE_CASE | `ATTENDANCE_EXIT` |

Pemetaan snake_case ke camelCase dilakukan di Edge Function, bukan di UI.

Catatan: label tampilan (misalnya `DI LUAR`, `TIDAK AKTIF`) ditulis dengan spasi dan mengikuti PRD. Nilai enum di kode memakai underscore.

### 8.2 TypeScript

1. `strict: true`. Dilarang `any`. Gunakan `unknown` dan narrowing.
2. Dilarang `@ts-ignore`. `@ts-expect-error` hanya dengan alasan di baris yang sama dan disetujui di review.
3. Tipe enum dan kode error diturunkan dari satu sumber per lapisan (`messages.ts` atau modul konstanta), tidak diketik ulang.

### 8.3 Waktu dan Format

1. Timestamp disimpan dan dikirim sebagai ISO 8601 UTC.
2. Tampilan waktu menggunakan utilitas tunggal di `apps/web/lib/format.ts` dengan format `25 November 2026, 17:40`.
3. Durasi menggunakan utilitas tunggal dengan format `X jam Y menit` atau `Y menit`, dibulatkan ke bawah ke menit.
4. Angka ditampilkan dengan pemisah ribuan titik.
5. Dilarang memformat tanggal dengan string manual di komponen.

### 8.4 Galat

1. Galat dari server selalu memiliki `code`, `message`, dan `requestId`.
2. UI memetakan `code` ke pesan di `messages.ts`. UI tidak menampilkan stack trace atau pesan internal.
3. Setiap `throw` di Edge Function dibungkus oleh handler galat terpusat. Galat tidak terduga menjadi `INTERNAL_ERROR` dengan detail hanya di log.

### 8.5 Logging

1. Gunakan logger di `_shared/logger.ts`. Dilarang `console.log` untuk data request.
2. Log berformat JSON dengan `requestId`, `endpoint`, `role`, `durationMs`, dan `level`.
3. Logger memiliki daftar kunci terlarang (password, token, secret, latitude, longitude, tujuan, keperluan) dan membuang nilainya secara otomatis.

### 8.6 Validasi

1. Aturan panjang dan format berasal dari PRD Bagian 6 dan 7. Konstanta batas disimpan di satu modul per lapisan.
2. Normalisasi: username ke lowercase, string di-trim untuk nama, tujuan, keperluan, pangkat, dan jabatan. Password tidak di-trim.
3. Validasi UI dan server menggunakan batas yang sama. Tes memastikan kesamaannya.

### 8.7 Komentar

1. Komentar menjelaskan alasan (why), bukan apa yang dilakukan kode.
2. Komentar dilarang berisi keputusan produk yang belum final.
3. Setiap RPC dan fungsi keamanan memiliki komentar yang menyebut ID FR atau bagian PRD yang relevan.

---

## 9. Checklist Keamanan untuk Setiap Perubahan

Sebelum mengirim PR, agen WAJIB memastikan:

- [ ] Tidak ada secret, token, password, atau service role di kode, log, atau fixture tes.
- [ ] Setiap endpoint baru atau yang berubah memiliki pemeriksaan sesi, role, dan cakupan data.
- [ ] Tidak ada query yang membaca data lintas Personel untuk role Personel.
- [ ] Persit tidak dapat membaca GPS, lokasi, tujuan, keperluan, waktu, atau riwayat.
- [ ] Mutasi multi-tabel berjalan dalam satu RPC dengan audit.
- [ ] RLS aktif pada tabel baru atau yang berubah. Tidak ada policy anon atau authenticated.
- [ ] Grant RPC hanya ke `service_role`.
- [ ] Respons galat tidak membocorkan informasi internal atau membedakan username yang tidak ada dengan password salah.
- [ ] Header keamanan dari PRD 4.6 tetap ada.
- [ ] Kamera dan GPS hanya diakses dari komponen yang berjalan di HTTPS atau localhost.

---

## 10. Pengujian

### 10.1 Aturan Umum

1. Setiap FR di PRD Bagian 23 yang diubah wajib memiliki tes yang merujuk ID-nya di nama tes.
2. Setiap skenario S-xx di PRD Bagian 27.2 yang menyentuh area perubahan wajib dijalankan.
3. Tes dilarang di-skip atau dihapus untuk membuat CI hijau. Jika tes tidak relevan, alasannya dicantumkan di PR dan disetujui.
4. Tes tidak boleh bergantung pada urutan eksekusi atau waktu nyata. Gunakan clock yang dapat diatur untuk pengujian ambang 60 detik dan 15 menit.
5. Data uji tidak memakai data production dan tidak memakai password lemah yang tersimpan di repository.

### 10.2 Tes Wajib per Area

| Area | Tes minimum |
|---|---|
| Login dan sesi | Sukses, gagal, lockout, idle timeout, cookie |
| Transaksi | KELUAR, KEMBALI, QR invalid, gate NONAKTIF, form tidak lengkap, concurrency, rollback |
| GPS | Tiga status, batas tepat 60 detik, izin dicabut, pemulihan |
| RPC | Sukses, gagal, rollback, grant, search_path |
| RBAC | Setiap endpoint untuk setiap role yang tidak diizinkan |
| Audit | Append-only, tercatat dalam transaksi yang sama |
| Setup | Idempotensi `pnpm setup -- --target local` |

### 10.3 Tes Pesan

Tes memastikan setiap pesan di `messages.ts` (server) dan `messages.ts` (UI) sama persis dengan teks di PRD. Tes ini gagal jika ada perbedaan satu karakter pun.

---

## 11. Git dan Pull Request

### 11.1 Cabang dan Commit

1. Cabang kerja: `feat/<ringkasan>`, `fix/<ringkasan>`, `chore/<ringkasan>`, `docs/<ringkasan>`.
2. Commit menggunakan Conventional Commits: `feat(transactions): ...`, `fix(gps): ...`.
3. Commit kecil dan satu tujuan. Commit yang menggabungkan migrasi dan perubahan UI tanpa hubungan langsung harus dipisah.
4. Branch `main` dilindungi. Semua perubahan masuk melalui PR.

### 11.2 Isi PR

Setiap PR WAJIB memuat:

1. Daftar ID FR yang tercakup, misalnya `FR-27, FR-28`.
2. Daftar skenario S-xx yang dijalankan.
3. Bagian PRD yang dirujuk.
4. Catatan migrasi: tabel dan kolom yang berubah, dan strategi expand-contract yang dipakai.
5. Catatan keamanan: area yang menyentuh data, akses, atau secret.
6. Untuk perubahan UI: tangkapan layar desktop dan mobile, serta state loading, empty, dan error.
7. ID item `To-dos.md` yang diselesaikan dan statusnya.
8. Asumsi yang dibuat agen. Jika ada asumsi produk, PR tidak boleh di-merge sampai Owner menyetujui.

---

## 12. Larangan Eksplisit

Agen DILARANG:

1. Mengubah teks pesan yang ditetapkan PRD.
2. Membuat endpoint `/api/v1/*` baru yang tidak ada di PRD Bagian 22.5. Pengecualian: `POST /functions/v1/accounts/bootstrap` untuk setup, yang bukan bagian API publik.
3. Menghapus tes agar CI lulus.
4. Menonaktifkan RLS, mengubah grant RPC ke anon atau authenticated, atau membuat policy permisif.
5. Menyimpan token mentah, password, atau secret ke database, log, atau repository.
6. Menggunakan `dangerouslySetInnerHTML` untuk data dari server atau pengguna.
7. Mengimplementasikan aturan bisnis di komponen UI atau di BFF.
8. Mengubah migrasi yang sudah diterapkan di production.
9. Menambah environment, layanan pihak ketiga, atau dependensi berat tanpa persetujuan Owner.
10. Membuat keputusan produk: mengubah batas, status, urutan, default, atau pesan.
11. Menyimpan kredensial demo di tempat selain `.local/` yang diabaikan Git.
12. Menghapus atau memodifikasi `.gitignore` agar file sensitif ikut ter-commit.
13. Menjalankan perintah destruktif terhadap production, termasuk `supabase db reset` dan penghapusan data.

---

## 13. Saat Ada Ketidakpastian

Jika agen menemui kondisi berikut, agen berhenti dan melaporkan:

- Perilaku yang tidak dijelaskan PRD, atau dua bagian PRD yang saling bertentangan.
- Perubahan yang akan mengubah skema data production secara tidak kompatibel.
- Tes yang gagal dan penyebabnya bukan dari perubahan yang sedang dikerjakan.
- Dependensi atau versi yang tidak dapat dipasang sesuai Bagian 4.
- Permintaan yang bertentangan dengan Bagian 2.

Laporan memuat: bagian PRD yang relevan, kondisi yang ditemui, dua opsi terdekat jika ada, dan dampak masing-masing. Agen tidak memilih opsi produk sendiri.

Agen boleh melanjutkan pekerjaan yang tidak bergantung pada ketidakpastian tersebut, dan melaporkannya terpisah.

---

## 14. Definisi Selesai

Pekerjaan dianggap selesai jika seluruh butir berikut terpenuhi:

1. Perilaku sesuai PRD untuk FR dan skenario terkait.
2. Seluruh gerbang CI lulus (lint, typecheck, unit, integration, pgTAP, E2E, build, audit dependensi).
3. Checklist keamanan di Bagian 9 terpenuhi.
4. Pesan, batas, dan format sesuai Bagian 8 dan PRD.
5. Dokumentasi operasional diperbarui bila perlu.
6. PR memuat seluruh informasi di Bagian 11.2.
7. `To-dos.md` diperbarui dan tabel Log Perubahan terisi dengan bukti.
8. Tidak ada `TODO`, `FIXME`, atau `TBD` yang menyangkut perilaku produk.
