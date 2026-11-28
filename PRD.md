# PRODUCT REQUIREMENTS DOCUMENT (PRD)

# GATEOPS
## Personnel Presence & Movement Monitoring System

| Atribut | Nilai |
|---|---|
| Status | Final, sumber kebenaran tunggal |
| Jenis produk | Aplikasi web |
| Target deployment | Vercel (UI dan BFF Next.js) serta Supabase (PostgreSQL dan Edge Functions) |
| Gaya desain | Apple-style modern, light mode, sidebar navigation |
| Bahasa antarmuka | Bahasa Indonesia |
| Cakupan pengembangan | Sampai produk siap deployment, termasuk otomatisasi instalasi dan konfigurasi |

### Ketentuan Membaca Dokumen

1. Dokumen ini adalah satu-satunya sumber kebenaran untuk pengembangan GATEOPS. Seluruh keputusan, perilaku, dan batasan di dalamnya bersifat final.
2. Tidak ada item yang ditunda. Setiap perilaku sistem sudah ditetapkan secara eksplisit.
3. Hal yang tidak diatur secara eksplisit berada di luar lingkup dan DILARANG diimplementasikan.
4. WAJIB berarti harus dipenuhi. DILARANG berarti tidak boleh diimplementasikan.
5. Istilah teknis yang lazim tetap dalam bahasa Inggris, misalnya session, gate, dan rollback.

---

## 1. Ringkasan Produk

### 1.1 Nama Produk

GATEOPS, Personnel Presence & Movement Monitoring System.

### 1.2 Deskripsi

GATEOPS adalah aplikasi web untuk memantau kehadiran personel, mencatat transaksi keluar dan kembali melalui QR Code pada setiap gate, melacak lokasi GPS personel yang sedang berada di luar, serta menyediakan riwayat aktivitas dan laporan PDF.

Sistem memiliki empat role: Super Admin, Komandan, Personel, dan Persit.

### 1.3 Prinsip Inti

- Status kehadiran personel ditentukan otomatis oleh transaksi QR Code yang berhasil. Tidak ada pengubahan status secara manual.
- Status kehadiran hanya memiliki dua nilai: DI DALAM dan DI LUAR.
- GPS tracking aktif otomatis setelah transaksi keluar berhasil dan berhenti otomatis setelah transaksi kembali berhasil.
- Tidak ada pengajuan izin, persetujuan izin, maupun notifikasi keluar-masuk.
- Setiap perubahan bisnis dan catatan audit disimpan dalam satu transaksi database yang sama.

---

## 2. Tujuan Produk

1. Memantau status keberadaan personel secara digital dan real time pada level dashboard.
2. Mencatat aktivitas keluar dan kembali secara terstruktur dan tidak dapat diubah dari antarmuka.
3. Mengetahui personel yang sedang berada di luar beserta gate keluar, tujuan, dan keperluannya.
4. Menampilkan lokasi terakhir personel yang sedang berada di luar.
5. Mempermudah pengawasan melalui Dashboard Komando.
6. Menyediakan riwayat aktivitas yang dapat difilter dan ditelusuri.
7. Menyediakan laporan PDF untuk Super Admin dan Komandan.
8. Memungkinkan Persit memantau status kehadiran personel yang telah terhubung dan diverifikasi.
9. Mengelola data personel, akun, gate, dan QR Code dalam satu sistem.
10. Menyediakan instalasi dan konfigurasi yang berjalan otomatis melalui satu perintah.

---

## 3. Lingkup

### 3.1 Dalam Lingkup

- Autentikasi username dan password, sesi berbasis cookie HttpOnly, dan kontrol akses per role.
- Dashboard Komando, Dashboard Personel, dan Dashboard Keluarga (Persit).
- Manajemen data personel, akun Super Admin dan Komandan, akun Persit, gate, dan QR Code.
- Transaksi keluar dan kembali melalui scan QR Code gate.
- GPS tracking selama personel berstatus DI LUAR.
- Riwayat aktivitas, filter, dan laporan PDF.
- Audit log untuk perubahan penting.
- Otomatisasi instalasi, konfigurasi, migrasi, deployment, dan verifikasi.
- Pengujian otomatis dan gerbang kualitas CI.

### 3.2 Di Luar Lingkup

Fitur berikut DILARANG diimplementasikan:

- Pengajuan izin keluar, persetujuan izin keluar, atau alur izin apa pun.
- Notifikasi keluar, notifikasi kembali, atau notifikasi apa pun kepada pengguna. Toast di layar untuk umpan balik aksi pengguna tidak termasuk notifikasi.
- GPS route history, penyimpanan jalur perjalanan, atau penyimpanan banyak titik GPS historis.
- GPS untuk Persit.
- GPS sebagai fitur dashboard untuk Personel. Personel hanya mengirim lokasi, tidak melihat peta.
- Riwayat personel lain untuk Personel, dan riwayat untuk Persit.
- Ekspor Excel, ekspor CSV, dan ekspor audit log.
- Pengelompokan personel berdasarkan unit.
- Status kehadiran selain DI DALAM dan DI LUAR.
- Kewajiban tracking ketika browser ditutup.
- Antrean offline, retry otomatis, atau pemrosesan transaksi tertunda untuk transaksi QR.
- Field foto, nomor telepon, dan mata uang.
- Login menggunakan QR Code.
- Supabase Auth, Supabase Realtime, dan Supabase Storage sebagai bagian arsitektur aplikasi.
- Mode gelap (dark mode).
- Aplikasi native mobile.

### 3.3 Definisi Siap Deployment

Pengembangan dianggap selesai ketika seluruh kondisi berikut terpenuhi:

1. Seluruh fitur dalam lingkup berjalan sesuai kebutuhan fungsional di Bagian 23.
2. Seluruh skenario wajib di Bagian 27 lulus di CI.
3. Perintah `pnpm setup` pada environment kosong menghasilkan sistem yang berjalan tanpa langkah manual selain input yang diminta wizard.
4. Perintah `pnpm setup` yang dijalankan ulang tidak mengubah sistem yang sudah benar dan tidak menduplikasi data.
5. Perintah `pnpm doctor` menyatakan seluruh pemeriksaan lulus.
6. Perintah `pnpm release` berhasil men-deploy migrasi, Edge Functions, dan aplikasi web ke production, lalu health check lulus.
7. Tidak ada secret yang terekspos ke browser, repository, atau log.

---

## 4. Arsitektur Teknis

### 4.1 Diagram Komponen

```
Browser (Personel, Komandan, Super Admin, Persit)
   |  HTTPS, cookie HttpOnly gateops_session
   v
Vercel: Next.js 16 App Router
   - UI (React, Tailwind, Radix)
   - Route Handlers /api/* sebagai BFF (proxy same-origin, tanpa aturan bisnis)
   |  HTTPS, header X-Session-Token dan X-Internal-Secret
   v
Supabase Edge Functions (Deno)
   - Autentikasi sesi, otorisasi, validasi, orkestrasi
   |  supabase-js dengan service_role (hanya di Edge Functions)
   v
Supabase PostgreSQL
   - Tabel dengan RLS aktif tanpa policy untuk anon dan authenticated
   - Fungsi RPC transaksional (satu RPC = satu transaksi database)
   - pg_cron untuk pembersihan sesi kedaluwarsa
```

### 4.2 Tanggung Jawab Komponen

| Komponen | Platform | Tanggung jawab | Larangan |
|---|---|---|---|
| UI | Next.js 16 di Vercel | Render halaman, navigasi per role, polling data, scan QR di browser, pembuatan PDF di browser, pembuatan QR PNG | Menyimpan secret, menjalankan query langsung ke database |
| BFF | Route Handlers `/api/*` di Vercel | Meneruskan request ke Edge Function, membaca dan menulis cookie sesi, memeriksa header Origin untuk request mutasi | Memuat aturan bisnis, menyimpan data, membaca database |
| Business API | Supabase Edge Functions (Deno) | Autentikasi sesi, otorisasi per endpoint, validasi input, pemanggilan RPC, pembuatan token sesi dan QR | Menerima request langsung dari browser |
| Database | Supabase PostgreSQL | Penyimpanan, constraint, RPC transaksional, audit append-only, pg_cron | Diakses langsung oleh browser atau anon key |
| Migrasi | Supabase CLI | Versi skema SQL di `supabase/migrations` | Mengubah skema di luar migrasi |

### 4.3 Stack Teknologi

| Lapisan | Teknologi |
|---|---|
| Bahasa | TypeScript strict untuk UI, BFF, dan scripts. TypeScript untuk Edge Functions (Deno) |
| Frontend | Next.js 16 (App Router), React 19, Tailwind CSS v4, Radix UI primitives, lucide-react |
| Data fetching UI | TanStack Query v5, polling 15 detik |
| Validasi form di UI | Zod, hanya untuk umpan balik cepat. Validasi autoritatif tetap di Edge Functions |
| Peta | Leaflet dan react-leaflet dengan tile OpenStreetMap |
| Scan QR | getUserMedia untuk kamera, jsQR untuk membaca frame dari canvas |
| Generasi QR PNG | Library qrcode di browser |
| PDF | @react-pdf/renderer di browser |
| Font | Inter melalui next/font, dengan fallback system-ui |
| Runtime API | Supabase Edge Functions (Deno), supabase-js v2 |
| Database | PostgreSQL yang disediakan Supabase (minimal versi 15), pgTAP, pg_cron |
| Package manager | pnpm 9 |
| Runtime lokal | Node.js 22 LTS |
| Tes | Vitest (unit UI), Deno test (Edge Functions), pgTAP (database), Playwright (E2E) |
| CI/CD | GitHub Actions untuk gerbang kualitas. Vercel Git integration untuk deployment web |

Versi dependensi dikunci melalui `pnpm-lock.yaml` dan `deno.lock`. Pembaruan versi dilakukan melalui pull request yang lulus seluruh gerbang CI.

### 4.4 Struktur Repository

```
gateops/
├── apps/
│   └── web/                      # Next.js 16 (UI + BFF), deploy ke Vercel
│       ├── app/                  # App Router: halaman dan route handlers /api
│       ├── components/
│       ├── lib/                  # client API, format tanggal, format durasi
│       ├── middleware.ts         # CSP nonce, redirect berdasarkan sesi dan role
│       └── tests/
├── supabase/
│   ├── config.toml               # verify_jwt per function, pengaturan lokal
│   ├── migrations/               # SQL migrasi berurutan timestamp
│   ├── functions/
│   │   ├── _shared/              # auth sesi, hashing PBKDF2, respons, logging
│   │   ├── auth/
│   │   ├── dashboard/
│   │   ├── personnel/
│   │   ├── accounts/
│   │   ├── gates/
│   │   ├── transactions/
│   │   ├── gps/
│   │   ├── activities/
│   │   ├── persit/
│   │   ├── audit/
│   │   └── health/
│   ├── seed/demo.ts              # data demo, hanya untuk local
│   └── tests/                    # pgTAP
├── scripts/
│   ├── setup.ts                  # wizard instalasi otomatis
│   ├── doctor.ts                 # pemeriksaan prasyarat dan konfigurasi
│   ├── release.ts                # urutan deployment produksi
│   └── seed-demo.ts
├── .github/workflows/            # CI
├── .env.example
├── package.json
└── pnpm-workspace.yaml
```

### 4.5 Aturan Akses Data

1. RLS WAJIB aktif pada seluruh tabel. Tidak ada policy untuk role anon dan authenticated, sehingga kunci anon tidak dapat membaca atau menulis tabel apa pun.
2. Service role key hanya tersedia di Edge Functions melalui environment yang disediakan Supabase. Key ini DILARANG berada di Vercel, browser, repository, atau log.
3. Seluruh operasi mutasi yang menyentuh lebih dari satu tabel, atau yang menulis audit, WAJIB dilakukan melalui fungsi RPC PostgreSQL. Satu RPC berjalan dalam satu transaksi database.
4. Fungsi RPC DILARANG dapat dieksekusi oleh role public, anon, atau authenticated. Eksekusi hanya diberikan kepada service_role.
5. Fungsi RPC WAJIB menetapkan `search_path` secara eksplisit.
6. Query baca sederhana boleh dilakukan langsung melalui supabase-js dari Edge Functions dengan service_role.

Daftar RPC transaksional:

| RPC | Fungsi |
|---|---|
| `create_account` | Membuat akun Super Admin atau Komandan, serta audit |
| `update_account` | Mengubah nama, pangkat, jabatan, atau username akun, serta audit |
| `set_account_status` | Mengubah status AKTIF atau NONAKTIF, mencabut sesi bila NONAKTIF, serta audit |
| `reset_account_password` | Menyimpan hash password sementara, mewajibkan penggantian, mencabut seluruh sesi, serta audit |
| `change_own_password` | Menyimpan hash baru, mencabut sesi lain, serta audit |
| `create_personnel` | Membuat akun Personel dan data profilnya, serta audit |
| `update_personnel` | Mengubah data profil Personel, serta audit |
| `delete_personnel` | Menghapus Personel beserta akun Persit terkait dan data turunannya, serta audit |
| `create_gate` | Membuat gate dan menyimpan hash QR, serta audit |
| `update_gate` | Mengubah nama, lokasi, atau status gate, serta audit |
| `regenerate_gate_qr` | Mengganti hash QR gate, serta audit |
| `register_persit` | Membuat akun Persit dan permintaan pengaitan, serta audit |
| `approve_persit` | Menyetujui pengaitan, serta audit |
| `reject_persit` | Menolak pengaitan, serta audit |
| `delete_persit_account` | Menghapus akun Persit beserta sesinya, serta audit |
| `record_attendance` | Memproses transaksi keluar atau kembali, serta audit |
| `report_gps` | Memperbarui lokasi GPS terakhir atau status izin lokasi |

### 4.6 Keamanan Transport dan Header

1. Seluruh akses menggunakan HTTPS. Pengalihan HTTP ke HTTPS dilakukan oleh Vercel.
2. Browser hanya berkomunikasi dengan origin Vercel. Edge Functions tidak menerima request dari browser dan CORS tidak diaktifkan untuk origin apa pun.
3. Aplikasi WAJIB mengirim header berikut:
   - `Content-Security-Policy` dengan `script-src 'self'` dan nonce per request melalui middleware, `img-src 'self' data: blob: https://*.tile.openstreetmap.org`, `connect-src 'self'`, `frame-ancestors 'none'`.
   - `Strict-Transport-Security: max-age=63072000; includeSubDomains`.
   - `X-Content-Type-Options: nosniff`.
   - `X-Frame-Options: DENY`.
   - `Referrer-Policy: strict-origin-when-cross-origin`.
   - `Permissions-Policy: camera=(self), geolocation=(self)`.
4. Request mutasi (POST, PATCH, DELETE) pada BFF WAJIB memiliki header Origin yang sama dengan host aplikasi. Request dengan Origin berbeda ditolak dengan status 403.
5. Edge Functions WAJIB menolak request tanpa header `X-Internal-Secret` yang cocok dengan secret `GATEOPS_INTERNAL_SECRET`. Perbandingan secret menggunakan perbandingan constant-time.

### 4.7 Zona Waktu dan Format

1. Seluruh timestamp disimpan dalam `timestamptz` dengan nilai UTC. Waktu server menjadi sumber kebenaran untuk seluruh pencatatan.
2. Seluruh tampilan waktu menggunakan zona waktu perangkat pengguna.
3. Format tanggal dan waktu: `25 November 2026, 17:40`. Bulan ditulis dalam bahasa Indonesia. Jam menggunakan format 24 jam.
4. Format durasi: `X jam Y menit` jika durasi minimal 1 jam, dan `Y menit` jika kurang dari 1 jam. Durasi dihitung dari selisih detik, dibulatkan ke bawah ke menit penuh.
5. Format angka menggunakan pemisah ribuan titik, misalnya `1.250`.
6. Tanggal pada filter dan laporan dikirim ke server sebagai batas awal dan akhir hari dalam zona waktu perangkat, dikonversi ke UTC oleh browser.

---

## 5. Peran dan Hak Akses

### 5.1 Role

| Role | Profil data | Tujuan |
|---|---|---|
| Super Admin | Nama, username, password | Pengelolaan penuh sistem dan pengawasan |
| Komandan | NRP, nama, pangkat, jabatan, username, password | Pemantauan operasional |
| Personel | NRP, nama, pangkat, jabatan, username, password | Transaksi keluar dan kembali melalui QR |
| Persit | Nama, username, password, serta permintaan pengaitan berdasarkan NRP | Pemantauan status personel yang terhubung |

### 5.2 Matriks Akses

| Fitur | Super Admin | Komandan | Personel | Persit |
|---|---|---|---|---|
| Dashboard Komando | Ya | Ya | Tidak | Tidak |
| Dashboard Personel (Beranda) | Tidak | Tidak | Ya | Tidak |
| Dashboard Keluarga | Tidak | Tidak | Tidak | Ya |
| Lihat seluruh data personel | Ya | Ya | Tidak | Tidak |
| Tambah personel | Ya | Tidak | Tidak | Tidak |
| Ubah data personel | Ya | Tidak | Tidak | Tidak |
| Hapus personel permanen | Ya | Tidak | Tidak | Tidak |
| Scan QR dan transaksi keluar/kembali | Tidak | Tidak | Ya | Tidak |
| Lihat status kehadiran sendiri | Tidak | Tidak | Ya | Tidak |
| GPS tracking seluruh personel DI LUAR | Ya | Ya | Tidak | Tidak |
| Kirim lokasi GPS sendiri | Tidak | Tidak | Ya | Tidak |
| Riwayat seluruh personel | Ya | Ya | Tidak | Tidak |
| Riwayat pribadi | Tidak | Tidak | Ya | Tidak |
| Laporan PDF | Ya | Ya | Tidak | Tidak |
| Pengelolaan gate dan QR | Ya | Tidak | Tidak | Tidak |
| Pengelolaan akun Super Admin dan Komandan | Ya | Tidak | Tidak | Tidak |
| Reset password seluruh akun | Ya | Tidak | Tidak | Tidak |
| Nonaktifkan dan aktifkan akun | Ya | Tidak | Tidak | Tidak |
| Registrasi Persit | Tidak | Tidak | Tidak | Ya (publik, sebelum login) |
| Verifikasi pengaitan Persit | Ya | Tidak | Tidak | Tidak |
| Lihat identitas dan status personel terhubung | Tidak | Tidak | Tidak | Ya |
| Audit log | Ya | Tidak | Tidak | Tidak |
| Mengubah password sendiri | Ya | Ya | Ya | Ya |

### 5.3 Batasan Khusus

1. Komandan DILARANG mengubah data apa pun. Komandan hanya membaca.
2. Personel DILARANG melihat data, GPS, atau riwayat milik akun lain, termasuk Personel lain dan Komandan.
3. Personel DILARANG mengubah profil sendiri. Hanya password sendiri yang dapat diubah.
4. Persit DILARANG mengakses GPS, lokasi terakhir, tujuan, keperluan, waktu keluar, waktu kembali, dan riwayat aktivitas.
5. Otorisasi WAJIB diperiksa di setiap Edge Function untuk setiap request. Validasi JWT gateway tidak menggantikan pemeriksaan sesi dan role aplikasi.

---

## 6. Model Data

Seluruh tabel berada di schema `public`. Seluruh tabel memiliki primary key UUID kecuali `audit_logs`. Seluruh tabel memiliki RLS aktif tanpa policy.

### 6.1 Tabel `accounts`

Menyimpan seluruh akun untuk keempat role.

| Kolom | Tipe | Aturan |
|---|---|---|
| id | uuid | Primary key, default gen_random_uuid() |
| role | enum (SUPER_ADMIN, KOMANDAN, PERSONEL, PERSIT) | Wajib |
| username | text | Wajib, unik tanpa memperhatikan huruf besar-kecil (disimpan lowercase) |
| password_hash | text | Wajib, format PBKDF2 di Bagian 7.2 |
| nama | text | Wajib, 3 sampai 100 karakter setelah trim |
| nrp | text | Wajib untuk KOMANDAN dan PERSONEL. Null untuk SUPER_ADMIN dan PERSIT |
| pangkat | text | Wajib untuk KOMANDAN dan PERSONEL, 1 sampai 100 karakter. Null untuk lainnya |
| jabatan | text | Wajib untuk KOMANDAN dan PERSONEL, 1 sampai 100 karakter. Null untuk lainnya |
| status | enum (AKTIF, NONAKTIF) | Wajib, default AKTIF |
| must_change_password | boolean | Wajib, default false |
| failed_login_count | integer | Wajib, default 0 |
| locked_until | timestamptz | Nullable |
| created_at | timestamptz | Wajib |
| updated_at | timestamptz | Wajib |

Constraint:

- `username` cocok dengan regex `^[a-z][a-z0-9._]{2,31}$`.
- `nrp` unik pada seluruh baris dengan role KOMANDAN atau PERSONEL.
- `nrp` cocok dengan regex `^[0-9]{6,12}$`.
- Role SUPER_ADMIN dan PERSIT memiliki `nrp`, `pangkat`, dan `jabatan` bernilai null.

### 6.2 Tabel `sessions`

| Kolom | Tipe | Aturan |
|---|---|---|
| id | uuid | Primary key |
| account_id | uuid | FK ke accounts, ON DELETE CASCADE |
| token_hash | text | Unik, SHA-256 dari token sesi dalam hex |
| created_at | timestamptz | Waktu login |
| last_seen_at | timestamptz | Diperbarui paling sering sekali per menit |
| expires_at | timestamptz | created_at + 12 jam |
| revoked_at | timestamptz | Nullable. Diisi saat logout, reset password, nonaktifkan akun, atau penghapusan akun |

### 6.3 Tabel `gates`

| Kolom | Tipe | Aturan |
|---|---|---|
| id | uuid | Primary key |
| name | text | Wajib, 3 sampai 100 karakter |
| location | text | Wajib, 1 sampai 200 karakter |
| status | enum (AKTIF, NONAKTIF) | Wajib, default AKTIF |
| qr_token_hash | text | Wajib, unik, SHA-256 hex dari token QR. Token mentah tidak disimpan |
| qr_regenerated_at | timestamptz | Wajib |
| created_at | timestamptz | Wajib |
| updated_at | timestamptz | Wajib |

### 6.4 Tabel `activities`

| Kolom | Tipe | Aturan |
|---|---|---|
| id | uuid | Primary key |
| personnel_account_id | uuid | FK ke accounts, ON DELETE CASCADE |
| exit_gate_id | uuid | FK ke gates, ON DELETE RESTRICT |
| return_gate_id | uuid | Nullable, FK ke gates, ON DELETE RESTRICT |
| exit_at | timestamptz | Wajib |
| return_at | timestamptz | Nullable |
| tujuan | text | Wajib, 1 sampai 150 karakter setelah trim |
| keperluan | text | Wajib, 1 sampai 255 karakter setelah trim |
| status | enum (AKTIF, SELESAI) | Wajib |
| duration_seconds | integer | Nullable. Terisi saat SELESAI |
| created_at | timestamptz | Wajib |

Constraint:

- Status AKTIF memiliki `return_at`, `return_gate_id`, dan `duration_seconds` bernilai null.
- Status SELESAI memiliki `return_at`, `return_gate_id`, dan `duration_seconds` terisi. `return_at` lebih besar dari atau sama dengan `exit_at`.
- Unique partial index pada `personnel_account_id` WHERE `status = 'AKTIF'`. Setiap Personel hanya memiliki paling banyak satu aktivitas AKTIF.

### 6.5 Tabel `gps_locations`

| Kolom | Tipe | Aturan |
|---|---|---|
| personnel_account_id | uuid | Primary key dan FK ke accounts, ON DELETE CASCADE |
| latitude | numeric(9,6) | Nullable. Null jika lokasi belum pernah diterima untuk aktivitas aktif |
| longitude | numeric(9,6) | Nullable. Null jika lokasi belum pernah diterima untuk aktivitas aktif |
| permission_state | enum (GRANTED, DENIED) | Wajib |
| gps_updated_at | timestamptz | Wajib. Waktu server saat laporan diterima |

Satu baris per Personel. Baris dihapus saat transaksi kembali berhasil dan dibuat ulang oleh transaksi keluar berikutnya. Constraint: latitude berada di rentang -90 sampai 90, longitude di rentang -180 sampai 180.

### 6.6 Tabel `persit_links`

| Kolom | Tipe | Aturan |
|---|---|---|
| persit_account_id | uuid | Primary key dan FK ke accounts, ON DELETE CASCADE |
| requested_nrp | text | Wajib, cocok dengan `^[0-9]{6,12}$` |
| personnel_account_id | uuid | Nullable. Terisi saat status DISETUJUI. FK ke accounts, ON DELETE RESTRICT |
| status | enum (MENUNGGU, DISETUJUI, DITOLAK) | Wajib, default MENUNGGU |
| reviewed_by | uuid | Nullable, id Super Admin yang memverifikasi |
| reviewed_at | timestamptz | Nullable |
| created_at | timestamptz | Wajib |

Constraint: status DISETUJUI wajib memiliki `personnel_account_id`. Status lain wajib memiliki `personnel_account_id` bernilai null.

### 6.7 Tabel `audit_logs`

| Kolom | Tipe | Aturan |
|---|---|---|
| id | bigint | Identity, primary key |
| occurred_at | timestamptz | Waktu server, default now() |
| actor_account_id | uuid | Nullable. Tidak memiliki FK agar catatan tetap ada setelah akun dihapus |
| actor_role | text | Nullable |
| actor_username | text | Nullable, snapshot username saat kejadian |
| action | text | Wajib, dari daftar di Bagian 17.2 |
| object_type | text | Wajib |
| object_id | text | Nullable |
| metadata | jsonb | Wajib, default `{}`. Hanya berisi data aman di Bagian 17.4 |

Trigger BEFORE UPDATE dan BEFORE DELETE pada tabel ini melempar exception. Tabel bersifat append-only.

### 6.8 Invariant Data

Invariant berikut WAJIB selalu benar:

1. Status kehadiran sebuah Personel DI LUAR jika dan hanya jika terdapat tepat satu aktivitas AKTIF untuk Personel tersebut. Status kehadiran tidak disimpan sebagai kolom terpisah dan selalu diturunkan dari tabel `activities`.
2. Setiap aktivitas AKTIF berkaitan dengan satu Personel dan satu gate keluar.
3. Baris `gps_locations` hanya ada untuk Personel yang memiliki aktivitas AKTIF.
4. Setiap Super Admin AKTIF berjumlah minimal satu. Sistem menolak perubahan yang membuat jumlah ini menjadi nol.
5. Token QR mentah tidak pernah tersimpan di database, log, audit, atau respons kecuali respons pembuatan atau regenerasi QR yang ditampilkan satu kali.

---

## 7. Akun, Autentikasi, dan Sesi

### 7.1 Aturan Username

1. Username disimpan dalam huruf kecil. Input dinormalisasi ke huruf kecil sebelum validasi.
2. Format username: diawali huruf a sampai z, diikuti huruf kecil, angka, titik, atau garis bawah, dengan panjang 3 sampai 32 karakter.
3. Username WAJIB unik lintas seluruh role.
4. Jika username sudah digunakan, sistem menolak dengan pesan: `Username sudah digunakan.`

### 7.2 Aturan Password dan Hashing

1. Password tidak memiliki aturan minimum panjang maupun komposisi karakter.
2. Password WAJIB berisi minimal 1 karakter dan maksimal 256 karakter. Spasi di awal dan akhir tidak dihapus.
3. Password di-hash menggunakan PBKDF2-HMAC-SHA256 dengan 600.000 iterasi, salt acak 16 byte, dan hash output 32 byte melalui Web Crypto API.
4. Format tersimpan: `pbkdf2_sha256$600000$<salt base64>$<hash base64>`.
5. Perbandingan hash menggunakan perbandingan constant-time.
6. Password DILARANG dicatat dalam log, audit, atau respons.

### 7.3 Login

Alur login:

1. Pengguna membuka `/login`, mengisi username dan password, lalu mengirim form.
2. BFF meneruskan request ke `auth` Edge Function.
3. Edge Function menormalisasi username dan mencari akun.
4. Jika akun terkunci (`locked_until` lebih besar dari waktu sekarang), Edge Function menolak dengan pesan kunci.
5. Edge Function memverifikasi password. Jika username tidak ditemukan, sistem tetap menjalankan verifikasi hash dummy agar waktu respons seragam.
6. Jika password salah, `failed_login_count` bertambah satu.
7. Jika password benar tetapi status NONAKTIF, sistem menolak dengan pesan akun tidak aktif. Verifikasi password dilakukan sebelum pemeriksaan status.
8. Jika login berhasil, `failed_login_count` direset ke nol, sesi baru dibuat, dan token sesi mentah dikembalikan ke BFF.
9. BFF menyimpan token pada cookie `gateops_session` dengan atribut HttpOnly, Secure, SameSite=Strict, Path=/, dan Max-Age 12 jam.
10. Jika `must_change_password` bernilai true, pengguna diarahkan ke `/ganti-password`. Jika tidak, pengguna diarahkan ke beranda sesuai role.

Pesan login:

| Kondisi | Pesan |
|---|---|
| Username atau password salah, atau username tidak ditemukan | `Username atau password salah.` |
| Akun terkunci | `Terlalu banyak percobaan gagal. Coba lagi dalam 15 menit.` |
| Akun NONAKTIF | `Akun tidak aktif. Hubungi Super Admin.` |
| Field kosong | `Username dan password wajib diisi.` |

### 7.4 Lockout Login

1. Lima kegagalan berturut-turut untuk satu username mengunci akun selama 15 menit. `locked_until` diisi waktu sekarang ditambah 15 menit.
2. Selama terkunci, login ditolak tanpa memverifikasi password.
3. Setelah `locked_until` lewat, percobaan login diizinkan kembali. `failed_login_count` dan `locked_until` direset pada percobaan berikutnya, lalu kegagalan baru dihitung dari nol. Reset yang sama terjadi saat login berhasil.
4. Lockout tidak menghasilkan audit log.

### 7.5 Sesi

1. Token sesi berupa 32 byte acak dari `crypto.getRandomValues`, dikodekan base64url.
2. Database hanya menyimpan SHA-256 dari token.
3. Sesi berlaku hingga 12 jam sejak login (`expires_at`).
4. Sesi kedaluwarsa jika tidak ada aktivitas selama 2 jam. `last_seen_at` diperbarui paling sering sekali per menit.
5. Sesi dicabut (`revoked_at` diisi) saat logout, reset password, perubahan password sendiri (untuk sesi lain), nonaktifkan akun, atau penghapusan akun.
6. Setiap request ke Edge Function yang memerlukan login memeriksa token, `revoked_at`, `expires_at`, idle timeout, dan status akun AKTIF.
7. Pembersihan sesi kedaluwarsa lebih dari 7 hari dilakukan setiap hari oleh pg_cron.

### 7.6 Logout

1. Pengguna menekan tombol Keluar pada menu akun.
2. BFF meneruskan request ke `auth` Edge Function, yang mencabut sesi.
3. BFF menghapus cookie `gateops_session`.
4. Pengguna diarahkan ke `/login`.

### 7.7 Ganti Password Sendiri

1. Semua role dapat mengganti password sendiri di `/pengaturan`.
2. Form berisi password lama, password baru, dan konfirmasi password baru.
3. Password lama WAJIB benar.
4. Password baru WAJIB berbeda dari password lama.
5. Setelah berhasil, seluruh sesi lain milik akun tersebut dicabut. Sesi aktif saat ini tetap berlaku.
6. Perubahan dicatat dalam audit sebagai `PASSWORD_CHANGED`.

### 7.8 Reset Password oleh Super Admin

1. Super Admin memilih akun di `/pengelolaan/akun` atau detail Personel.
2. Setelah konfirmasi, sistem membuat password sementara 12 karakter dari huruf A sampai Z, huruf a sampai z, dan angka 0 sampai 9, menggunakan generator acak kriptografis.
3. Hash password sementara disimpan, `must_change_password` diset true, dan seluruh sesi akun dicabut.
4. Password sementara ditampilkan satu kali kepada Super Admin dengan tombol salin.
5. Super Admin menyerahkan password sementara kepada pengguna di luar sistem.
6. Reset dicatat dalam audit sebagai `PASSWORD_RESET`. Password tidak dicatat.

### 7.9 Paksa Ganti Password

1. Jika `must_change_password` bernilai true, seluruh endpoint selain `GET /api/auth/me`, `POST /api/auth/password`, dan `POST /api/auth/logout` menolak request dengan kode `MUST_CHANGE_PASSWORD`.
2. UI mengarahkan pengguna ke `/ganti-password`. Pengguna tidak dapat mengakses halaman lain.
3. Form ganti password pada halaman ini tidak memerlukan password lama karena pengguna baru saja login dengan password sementara.
4. Setelah berhasil, `must_change_password` menjadi false, sesi lain dicabut, dan pengguna diarahkan ke beranda.
5. Password awal yang ditetapkan Super Admin saat pembuatan akun tidak memaksa penggantian. Penggantian wajib hanya berlaku setelah reset.

### 7.10 Nonaktifkan dan Aktifkan Akun

1. Super Admin dapat mengubah status akun Super Admin, Komandan, Personel, dan Persit menjadi NONAKTIF atau AKTIF.
2. Akun NONAKTIF tidak dapat login. Seluruh sesinya dicabut seketika.
3. Data akun NONAKTIF tidak dihapus dan tetap tampil pada daftar dengan label NONAKTIF.
4. Super Admin DILARANG menonaktifkan akunnya sendiri.
5. Sistem DILARANG menonaktifkan Super Admin AKTIF terakhir.
6. Akun Personel yang sedang berstatus DI LUAR DILARANG dinonaktifkan. Personel WAJIB kembali melalui scan QR terlebih dahulu.
7. Akun Personel NONAKTIF tetap dapat dihapus melalui penghapusan personel.
8. Perubahan status dicatat dalam audit sebagai `ACCOUNT_STATUS_CHANGED` dengan metadata status sebelum dan sesudah.

### 7.11 Penghapusan Akun

1. Akun Super Admin dan Komandan DILARANG dihapus. Keduanya hanya dapat dinonaktifkan.
2. Akun Personel dihapus hanya melalui penghapusan personel di Bagian 8.3.
3. Akun Persit dihapus melalui Bagian 15.4.

---

## 8. Data Personel

### 8.1 Field Data Personel

Data personel adalah daftar akun berperan PERSONEL. Komandan memiliki data profil yang sama tetapi tidak termasuk daftar personel.

| Field | Keterangan | Aturan |
|---|---|---|
| NRP | Nomor Registrasi Pokok | Wajib, 6 sampai 12 digit angka, unik. Tidak dapat diubah setelah dibuat |
| Nama | Nama lengkap | Wajib, 3 sampai 100 karakter |
| Pangkat | Pangkat personel | Wajib, 1 sampai 100 karakter, input teks bebas |
| Jabatan | Jabatan personel | Wajib, 1 sampai 100 karakter, input teks bebas |
| Username | Username akun | Sesuai Bagian 7.1 |
| Password | Password awal akun | Wajib saat pembuatan, sesuai Bagian 7.2 |

Tidak terdapat field foto, nomor telepon, unit, atau mata uang.

### 8.2 CRUD Personel

| Aksi | Super Admin | Komandan | Personel | Persit |
|---|---|---|---|---|
| Lihat daftar | Ya | Ya | Tidak | Tidak |
| Lihat detail | Ya | Ya | Tidak | Tidak |
| Tambah | Ya | Tidak | Tidak | Tidak |
| Ubah nama, pangkat, jabatan, username | Ya | Tidak | Tidak | Tidak |
| Hapus permanen | Ya | Tidak | Tidak | Tidak |

Aturan:

1. Daftar personel memuat paginasi, pencarian berdasarkan nama, NRP, dan username, serta pengurutan berdasarkan nama secara naik.
2. Pengubahan username mengikuti aturan unik Bagian 7.1.
3. NRP tidak dapat diubah. Perubahan NRP DILARANG.
4. Password tidak diubah melalui form edit. Password diubah melalui reset oleh Super Admin.
5. Personel DILARANG mengubah profil sendiri.
6. Setiap pembuatan, perubahan, dan penghapusan dicatat dalam audit.

### 8.3 Penghapusan Personel

Penghapusan personel bersifat permanen dan dilakukan melalui RPC `delete_personnel` dalam satu transaksi database. Urutan operasi:

1. Mengambil seluruh akun Persit dengan status DISETUJUI yang terhubung ke Personel tersebut.
2. Menghapus setiap akun Persit tersebut beserta sesinya. Setiap penghapusan dicatat dalam audit sebagai `PERSIT_ACCOUNT_DELETED` dengan alasan `PERSONNEL_DELETED`.
3. Menghapus akun Personel. Penghapusan ini secara kaskade menghapus sesi Personel, seluruh aktivitas Personel (termasuk riwayat), dan baris `gps_locations` Personel.
4. Mencatat audit `PERSONNEL_DELETED` dengan ID objek. Audit tidak menyimpan nama atau NRP.

Jika salah satu langkah gagal, seluruh transaksi dibatalkan dan tidak ada data yang berubah.

Akun Persit dengan status MENUNGGU atau DITOLAK yang memiliki `requested_nrp` sama TIDAK ikut dihapus. Akun tersebut tetap ada dan Super Admin dapat menolak atau menghapusnya kemudian. Pengajuan MENUNGGU yang Personel-nya sudah tidak ada tidak dapat disetujui. Pengajuan tersebut hanya dapat ditolak atau dihapus.

Konfirmasi penghapusan menampilkan peringatan jika Personel sedang DI LUAR: `Personel sedang DI LUAR. Aktivitas aktif dan lokasi GPS terakhir akan ikut dihapus.` Jika Personel memiliki Persit terhubung, konfirmasi juga menyebutkan jumlah akun Persit yang akan ikut dihapus.

---

## 9. Gate dan QR Code

### 9.1 Field Gate

| Field | Keterangan | Aturan |
|---|---|---|
| Nama gate | Nama gate | Wajib, 3 sampai 100 karakter |
| Lokasi gate | Lokasi fisik gate | Wajib, 1 sampai 200 karakter |
| Status gate | AKTIF atau NONAKTIF | Wajib |
| QR Code | Kode QR gate | Dibuat oleh sistem, lihat 9.2 |

### 9.2 Pembuatan Gate dan QR

1. Super Admin membuat gate melalui `/pengelolaan/gate/baru` dengan nama, lokasi, dan status awal AKTIF.
2. Sistem menghasilkan token QR 32 byte acak kriptografis, dikodekan base64url menjadi 43 karakter. Token unik.
3. Sistem menyimpan SHA-256 hex dari token. Token mentah tidak disimpan.
4. Token mentah ditampilkan satu kali pada halaman hasil pembuatan dalam bentuk QR Code. Halaman menyediakan tombol Unduh PNG dan Cetak.
5. Setelah Super Admin meninggalkan halaman tersebut, token mentah tidak dapat diambil kembali. Untuk mendapatkan QR baru, Super Admin melakukan regenerasi.
6. QR Code diisi dengan token mentah saja. Payload tidak berisi URL, ID gate, atau metadata lain.
7. QR Code di-render di browser menggunakan library qrcode dengan tingkat koreksi error M dan ukuran minimal 512 piksel untuk unduhan PNG.

### 9.3 Regenerasi QR

1. Super Admin dapat meregenerasi QR gate dari halaman detail gate.
2. Regenerasi membuat token baru, menyimpan hash baru, dan langsung membatalkan QR lama.
3. Token baru ditampilkan satu kali dengan mekanisme yang sama seperti 9.2.
4. Regenerasi memerlukan konfirmasi dialog dengan teks: `QR lama akan langsung tidak berlaku. Cetak ulang QR baru sebelum melanjutkan.`
5. Regenerasi dicatat dalam audit sebagai `GATE_QR_REGENERATED` dengan ID gate. Token tidak dicatat.

### 9.4 Status Gate dan Penghapusan

1. Gate berstatus AKTIF atau NONAKTIF.
2. Super Admin dapat mengubah status gate. Perubahan memerlukan konfirmasi.
3. Gate NONAKTIF menolak seluruh transaksi keluar dan kembali.
4. Gate DILARANG dihapus. Gate yang sudah pernah dipakai dalam aktivitas harus tetap tersedia untuk riwayat. Gate yang tidak lagi digunakan dinonaktifkan.
5. Perubahan nama, lokasi, dan status dicatat dalam audit.

### 9.5 Validasi QR Saat Transaksi

Urutan validasi di Edge Function `transactions`:

1. Hitung SHA-256 hex dari token yang dipindai.
2. Cari gate dengan `qr_token_hash` yang sama.
3. Jika tidak ditemukan, kembalikan `INVALID_QR`.
4. Bandingkan hash yang ditemukan dengan hash hasil perhitungan menggunakan perbandingan constant-time. Jika tidak cocok, kembalikan `INVALID_QR`.
5. Panggil RPC `record_attendance` dengan `gate_id`. RPC membaca ulang status gate dengan kunci baris dan menolak jika NONAKTIF.

Pesan kesalahan:

| Kode | Kondisi | Pesan |
|---|---|---|
| `INVALID_QR` | Token tidak ditemukan atau tidak cocok | QR Gate tidak valid atau tidak dikenal. silahkan pindai lagi |
| `GATE_INACTIVE` | Gate NONAKTIF | Gate sedang NONAKTIF. Transaksi tidak dapat diproses. |

### 9.6 Halaman Pengelolaan QR

Halaman `/pengelolaan/gate` menampilkan daftar gate dengan nama, lokasi, status, dan tanggal regenerasi QR terakhir. Halaman detail gate menampilkan data gate, tombol ubah, tombol ubah status, dan tombol regenerasi QR. Halaman detail tidak pernah menampilkan token mentah maupun QR Code dari QR yang sudah ada.

---

## 10. Keluar-Masuk (Transaksi QR)

Modul ini digunakan oleh Personel untuk transaksi keluar dan kembali melalui scan QR gate. Tidak terdapat pengajuan izin.

### 10.1 Prinsip Transaksi Otomatis

Jenis transaksi ditentukan otomatis dari status kehadiran saat ini. Personel DILARANG memilih jenis transaksi secara manual.

| Status sebelum scan | Proses | Status setelah scan |
|---|---|---|
| DI DALAM | KELUAR | DI LUAR |
| DI LUAR | KEMBALI | DI DALAM |

### 10.2 Form Keluar

Form Keluar ditampilkan hanya jika status DI DALAM.

| Field | Validasi |
|---|---|
| Tujuan | Wajib, 1 sampai 150 karakter setelah trim |
| Keperluan | Wajib, 1 sampai 255 karakter setelah trim |

1. Kamera DILARANG dibuka sebelum kedua field valid.
2. Tombol Lanjut ke kamera nonaktif selama salah satu field belum valid.
3. Isi form disimpan di state halaman. Form dikosongkan setelah transaksi keluar berhasil.
4. Jika transaksi gagal, isi form dipertahankan.
5. Edge Function juga memvalidasi kedua field. Jika tidak valid, kembalikan `FORM_INCOMPLETE` dengan pesan `Tujuan dan keperluan wajib diisi.`

### 10.3 Alur Keluar

1. Personel login dan membuka `/beranda`. Status tampil DI DALAM.
2. Personel menekan tombol Scan QR untuk Keluar.
3. Sistem menampilkan Form Keluar pada langkah 1 dari 2.
4. Personel mengisi tujuan dan keperluan, lalu menekan Lanjut.
5. Sistem membuka kamera pada langkah 2 dari 2.
6. Personel memindai QR gate.
7. Browser mengirim token dan isi form ke `POST /api/transactions/scan`.
8. Server memvalidasi sesi, role, status akun, token QR, status gate, dan form.
9. Jika valid, RPC `record_attendance` menjalankan langkah berikut dalam satu transaksi:
   - Mengunci baris akun Personel.
   - Memastikan tidak ada aktivitas AKTIF untuk Personel.
   - Memastikan gate AKTIF.
   - Menyisipkan aktivitas baru dengan status AKTIF, `exit_at` berisi waktu server, `exit_gate_id`, tujuan, dan keperluan.
   - Menghapus baris `gps_locations` Personel jika ada, lalu menyisipkan baris baru dengan `permission_state` sesuai kondisi izin pada langkah berikutnya.
   - Menyisipkan audit `ATTENDANCE_EXIT`.
10. Browser menerima respons sukses dan menutup kamera.
11. Dashboard Personel menampilkan status DI LUAR, tujuan, keperluan, dan waktu keluar.
12. Klien GPS memulai tracking sesuai Bagian 11.

Catatan: langkah 9 melakukan penyisipan baris `gps_locations` dengan `latitude` dan `longitude` null dan `permission_state` GRANTED. Status awal adalah TIDAK AKTIF hingga lokasi pertama diterima.

### 10.4 Alur Kembali

Kamera dibuka langsung tanpa form.

1. Personel login dan membuka `/beranda`. Status tampil DI LUAR.
2. Personel menekan tombol Scan QR untuk Kembali.
3. Kamera langsung terbuka.
4. Personel memindai QR gate.
5. Browser mengirim token ke `POST /api/transactions/scan` tanpa form.
6. Server memvalidasi seperti Alur Keluar.
7. RPC `record_attendance` dalam satu transaksi:
   - Mengunci baris akun Personel.
   - Mengambil aktivitas AKTIF Personel.
   - Memastikan gate AKTIF.
   - Mengisi `return_at` dengan waktu server, `return_gate_id`, status SELESAI, dan `duration_seconds`.
   - Menghapus baris `gps_locations` Personel.
   - Menyisipkan audit `ATTENDANCE_RETURN`.
8. Browser menerima respons sukses, menutup kamera, dan menghentikan klien GPS.
9. Dashboard Personel menampilkan status DI DALAM dan ringkasan aktivitas yang baru selesai beserta durasinya.

### 10.5 Aturan Pemrosesan Transaksi

1. Scan berurutan diproses berdasarkan status terbaru. Jika Personel memindai lagi setelah transaksi berhasil, transaksi berikutnya mengikuti status yang berlaku saat itu.
2. Satu request transaksi untuk satu Personel diproses dalam satu waktu. Request lain untuk Personel yang sama selama transaksi pertama masih berjalan ditolak langsung dengan kode `TRANSACTION_IN_PROGRESS`. Request tersebut tidak diantrekan, tidak diulang otomatis, dan tidak mengubah status atau aktivitas.
3. Penguncian dilakukan dengan `SELECT ... FOR UPDATE NOWAIT` pada baris akun Personel di dalam RPC. Jika kunci tidak dapat diperoleh, RPC mengembalikan `TRANSACTION_IN_PROGRESS`.
4. Jika penyimpanan transaksi gagal di tengah jalan, seluruh perubahan dibatalkan secara atomik. Status kehadiran dan aktivitas tetap seperti sebelum request. Tidak ada data transaksi parsial. Kode kesalahan `TRANSACTION_FAILED` dikembalikan.
5. Jika sesi berakhir saat pemindaian berlangsung, transaksi ditolak tanpa mengubah status atau aktivitas. Kamera dihentikan. Personel wajib login kembali sebelum memindai ulang. Kode: `SESSION_EXPIRED`.
6. Jika koneksi terputus saat pemindaian, transaksi tidak diproses. Tidak ada antrean dan tidak ada retry otomatis. Setelah koneksi pulih, Personel harus memindai ulang secara manual. Sebelum memindai ulang, Personel melihat status terbaru di beranda untuk memastikan kondisinya. Kode di sisi klien: `NETWORK_ERROR`.
7. Pemindaian QR WAJIB online. Tidak ada mode offline untuk transaksi.

### 10.6 Kondisi Kamera

| Kondisi | Perilaku sistem |
|---|---|
| Kamera gagal dibuka | Tidak ada transaksi dan tidak ada perubahan status. Tampil pesan kesalahan dan tombol Coba buka kamera lagi |
| Izin kamera ditolak | Tidak ada transaksi dan tidak ada perubahan status. Tampil pesan `Izin kamera ditolak. Aktifkan izin kamera di pengaturan browser, lalu coba lagi.` dan tombol Coba buka kamera lagi |
| QR tidak terbaca selama 30 detik | Kamera tetap aktif. Tampil pesan `QR Code tidak terbaca. Pastikan QR berada di dalam bingkai, lalu coba lagi.` |
| QR terbaca tetapi tidak valid | Tidak ada perubahan status dan aktivitas. Tampil pesan INVALID_QR. Kamera tetap aktif untuk pemindaian ulang langsung |
| QR valid, transaksi sedang diproses | Kamera dijeda selama request berjalan |
| Transaksi berhasil | Kamera ditutup dan tampil ringkasan transaksi |
| Sesi berakhir | Kamera ditutup. Personel diarahkan ke login |
| Koneksi terputus atau error server | Kamera ditutup. Tampil pesan NETWORK_ERROR atau TRANSACTION_FAILED dan tombol Scan ulang |

Kamera menggunakan kamera belakang (`facingMode: environment`). Jika tidak tersedia, sistem menggunakan kamera yang tersedia.

### 10.7 Pesan Transaksi Sukses

| Transaksi | Pesan |
|---|---|
| Keluar | `Keluar tercatat pada 25 November 2026, 17:40 melalui {nama gate}.` |
| Kembali | `Kembali tercatat pada 25 November 2026, 17:40 melalui {nama gate}. Durasi di luar: {durasi}.` |

### 10.8 Gate NONAKTIF

1. Transaksi keluar dan kembali melalui gate NONAKTIF ditolak dengan kode `GATE_INACTIVE`.
2. Status kehadiran tidak berubah.
3. Tidak ada aktivitas atau audit yang dicatat.

### 10.9 Ringkasan Perubahan Atomik

Transaksi keluar dan kembali WAJIB atomik. Perubahan berikut terjadi seluruhnya atau tidak sama sekali:

- Perubahan tabel `activities`.
- Perubahan tabel `gps_locations`.
- Penyisipan audit `ATTENDANCE_EXIT` atau `ATTENDANCE_RETURN`.

Penolakan transaksi (INVALID_QR, GATE_INACTIVE, FORM_INCOMPLETE, SESSION_EXPIRED, TRANSACTION_IN_PROGRESS) tidak mencatat audit karena tidak ada perubahan data.

---

## 11. GPS Tracking

### 11.1 Aktivasi dan Penghentian

1. Tracking aktif otomatis setelah transaksi keluar berhasil.
2. Tracking berhenti otomatis setelah transaksi kembali berhasil.
3. Tracking hanya berjalan selama status DI LUAR, sesi web aktif, dan halaman aplikasi terbuka di browser Personel.
4. Tracking tidak diwajibkan ketika browser ditutup.
5. Tracking tidak memerlukan aktivasi manual.
6. Jika transaksi kembali gagal, tracking tetap berjalan karena status masih DI LUAR.

### 11.2 Interval Pengiriman

1. Interval pengiriman lokasi adalah 30 detik.
2. Pengiriman pertama dilakukan segera setelah tracking dimulai atau setelah izin lokasi diberikan.
3. Pengiriman tidak diantrekan. Jika satu pengiriman gagal, pengiriman berikutnya dilakukan pada interval berikutnya tanpa retry.
4. Setiap pengiriman berisi `permission_state` dan, jika GRANTED, `latitude` dan `longitude`.
5. Browser menggunakan `navigator.geolocation.getCurrentPosition` dengan opsi `enableHighAccuracy: true`, `timeout: 20000`, dan `maximumAge: 0`.

### 11.3 Izin Lokasi

| Kondisi di browser | `permission_state` yang dikirim |
|---|---|
| Izin diberikan dan posisi diperoleh | GRANTED, dengan latitude dan longitude |
| Izin ditolak oleh pengguna | DENIED |
| Izin dicabut setelah sebelumnya diberikan | DENIED |
| API geolocation tidak tersedia di browser | DENIED |
| Izin diberikan, tetapi posisi tidak tersedia atau timeout | Tidak ada pengiriman pada interval tersebut. Status lokasi mengikuti umur `gps_updated_at` |
| Izin diberikan kembali setelah DENIED | GRANTED dengan posisi baru |

Browser mendeteksi perubahan izin melalui `navigator.permissions.query({ name: 'geolocation' })` dan event `change`. Event ini memicu pengiriman segera.

### 11.4 Status GPS

Status GPS dihitung di server pada saat setiap request, menggunakan waktu server sekarang. Status tidak disimpan sebagai kolom.

Urutan evaluasi untuk Personel DI LUAR:

| Urutan | Kondisi | Status GPS |
|---|---|---|
| 1 | Baris `gps_locations` tidak ada, atau `latitude` bernilai null | TIDAK AKTIF |
| 2 | `permission_state` bernilai DENIED | OFFLINE |
| 3 | Selisih waktu server sekarang dan `gps_updated_at` kurang dari atau sama dengan 60 detik | AKTIF |
| 4 | Selain kondisi di atas | OFFLINE |

Penjelasan:

- AKTIF: lokasi diterima dengan izin GRANTED dalam 60 detik terakhir, termasuk tepat 60 detik.
- OFFLINE: lokasi pernah diterima tetapi sudah lebih dari 60 detik tidak diperbarui, atau izin lokasi dicabut setelah lokasi pernah diterima.
- TIDAK AKTIF: lokasi belum pernah diterima untuk aktivitas aktif saat ini. Termasuk kondisi izin ditolak sejak keluar dan API geolocation tidak tersedia sejak awal.

Status GPS tidak memengaruhi status kehadiran. Personel tetap DI LUAR walaupun status GPS OFFLINE atau TIDAK AKTIF.

Status yang tampil di UI:

| Status | Warna badge | Keterangan singkat |
|---|---|---|
| AKTIF | Biru | Lokasi diterima dalam 60 detik terakhir |
| OFFLINE | Oranye | Lokasi terakhir tampil beserta waktu update terakhir |
| TIDAK AKTIF | Abu-abu | Lokasi belum tersedia |

### 11.5 Data dan Retensi Lokasi

1. Sistem hanya menyimpan satu lokasi terbaru per Personel.
2. Setiap pembaruan menggantikan lokasi sebelumnya dengan `UPSERT`.
3. Data yang disimpan: latitude, longitude, `permission_state`, dan `gps_updated_at`.
4. Lokasi dihapus saat transaksi kembali berhasil.
5. Tidak ada riwayat lokasi, route history, atau titik GPS historis.
6. Pembaruan lokasi tidak dicatat dalam audit.

### 11.6 Pemulihan Koneksi

1. Ketika koneksi pulih, klien GPS langsung mengirim lokasi dan melanjutkan interval 30 detik.
2. Tidak diperlukan scan QR ulang.
3. Tidak diperlukan aktivasi manual.
4. Dashboard menampilkan status AKTIF setelah lokasi baru diterima.

### 11.7 Perilaku Saat Sesi atau Browser Terbatas

1. Jika sesi berakhir, klien GPS berhenti mengirim. Lokasi terakhir tetap tersimpan dan status berubah menjadi OFFLINE setelah 60 detik.
2. Jika tab berpindah ke latar belakang dan browser membatasi eksekusi JavaScript, pengiriman dapat tertunda. Status menyesuaikan sesuai umur `gps_updated_at`. Tidak ada mekanisme untuk memaksa tracking di latar belakang.
3. Tracking tidak mengirim lokasi ketika status DI DALAM.

### 11.8 Akses GPS

1. Data GPS hanya dapat dibaca oleh Super Admin dan Komandan.
2. Dashboard GPS menampilkan peta dan daftar Personel DI LUAR.
3. Setiap item menampilkan: nama, NRP, pangkat, jabatan, status GPS, lokasi terakhir (latitude dan longitude dengan enam angka di belakang koma), dan waktu update terakhir.
4. Personel dan Persit tidak memiliki akses baca ke data GPS.
5. Halaman GPS memperbarui data setiap 15 detik.

---

## 12. Dashboard

### 12.1 Dashboard Komando (Super Admin dan Komandan)

Bagian statistik menampilkan:

- Total personel: jumlah seluruh akun Personel.
- Total personel DI DALAM.
- Total personel DI LUAR.

Status kehadiran hanya terdiri dari DI DALAM dan DI LUAR.

Bagian daftar personel DI LUAR menampilkan:

- Nama, NRP, pangkat, jabatan.
- Gate keluar.
- Tujuan dan keperluan.
- Waktu keluar.
- Status GPS.

Bagian peta menampilkan Personel DI LUAR yang memiliki lokasi. Setiap marker menampilkan nama, NRP, pangkat, jabatan, lokasi terakhir, waktu update terakhir, dan status GPS. Jika tidak ada Personel DI LUAR yang memiliki lokasi, peta menampilkan empty state.

Bagian aktivitas terbaru menampilkan sepuluh peristiwa terbaru, gabungan dari transaksi keluar dan kembali, diurutkan dari waktu terbaru. Setiap baris menampilkan nama, NRP, gate, waktu transaksi, jenis transaksi (KELUAR atau KEMBALI), dan status aktivitas (AKTIF atau SELESAI).

Dashboard Super Admin memiliki seluruh informasi Dashboard Komandan dan menu pengelolaan di sidebar.

### 12.2 Dashboard Personel (Beranda)

Menampilkan:

- Status kehadiran besar: DI DALAM atau DI LUAR.
- Jika DI LUAR: gate keluar, tujuan, keperluan, waktu keluar, durasi berjalan, dan status GPS dengan penjelasan singkat.
- Tombol utama: Scan QR untuk Keluar (jika DI DALAM) atau Scan QR untuk Kembali (jika DI LUAR).
- Ringkasan tiga aktivitas terakhir milik sendiri.

Durasi berjalan untuk DI LUAR dihitung di klien sebagai selisih waktu sekarang dan `exit_at`, dan diperbarui setiap menit.

### 12.3 Dashboard Keluarga (Persit)

Persit melihat:

- Status pengaitan: MENUNGGU, DISETUJUI, atau DITOLAK.
- Jika MENUNGGU: pesan `Pengajuan pengaitan menunggu verifikasi Super Admin.`
- Jika DITOLAK: pesan `Pengajuan pengaitan ditolak. Hubungi Super Admin.`
- Jika DISETUJUI: identitas personel terhubung (NRP, nama, pangkat, jabatan) dan status kehadiran DI DALAM atau DI LUAR.

Persit DILARANG melihat GPS, lokasi, tujuan, keperluan, waktu keluar, waktu kembali, atau riwayat.

### 12.4 Pembaruan Data

Seluruh dashboard dan daftar yang menampilkan status memperbarui data setiap 15 detik melalui polling TanStack Query. Polling dihentikan saat tab tidak terlihat dan dilanjutkan saat tab kembali terlihat.

---

## 13. Riwayat Aktivitas

### 13.1 Akses

- Super Admin dan Komandan: seluruh riwayat.
- Personel: hanya riwayat pribadi di `/keluar-masuk/riwayat`.
- Persit: tidak memiliki akses riwayat.

### 13.2 Field Riwayat

| Field | Keterangan |
|---|---|
| Nama | Nama personel |
| NRP | NRP personel |
| Gate keluar | Nama gate saat keluar |
| Gate kembali | Nama gate saat kembali. Kosong jika AKTIF |
| Waktu keluar | Waktu transaksi keluar |
| Waktu kembali | Waktu transaksi kembali. Kosong jika AKTIF |
| Tujuan | Tujuan aktivitas |
| Keperluan | Keperluan aktivitas |
| Total durasi | Durasi di luar. Kosong jika AKTIF |
| Status aktivitas | AKTIF atau SELESAI |

GPS tidak termasuk dalam riwayat.

### 13.3 Status Aktivitas

| Status | Keterangan | Kondisi data |
|---|---|---|
| AKTIF | Personel telah keluar dan belum kembali | Waktu kembali kosong, durasi kosong |
| SELESAI | Personel telah kembali | Waktu kembali dan durasi terisi |

Durasi aktivitas AKTIF tidak dihitung dan tidak ditampilkan sebagai angka pada riwayat. Pada dashboard, durasi berjalan ditampilkan sesuai Bagian 12.2.

### 13.4 Filter Riwayat

| Filter | Perilaku |
|---|---|
| Rentang tanggal | Dari dan sampai, inklusif. Mengacu pada waktu keluar. Opsional |
| Nama personel | Mengandung teks, tidak peka huruf besar-kecil |
| NRP | Mengandung teks |
| Gate | Pilihan gate. Opsional |
| Tujuan | Mengandung teks, tidak peka huruf besar-kecil |
| Status aktivitas | Semua, AKTIF, atau SELESAI. Default Semua |

Seluruh filter digabungkan dengan operator AND. Filter dapat direset dengan satu tombol.

### 13.5 Pengurutan dan Paginasi

1. Default pengurutan: waktu keluar, descending. Aktivitas terbaru berada di paling atas.
2. Paginasi menggunakan ukuran halaman 25. Kontrol menampilkan Sebelumnya, Berikutnya, dan teks Halaman X dari Y.
3. Ukuran halaman maksimal dari API adalah 100. Nilai default adalah 25.

### 13.6 Riwayat Pribadi Personel

1. Personel melihat daftar aktivitas miliknya di `/keluar-masuk/riwayat`, dengan kolom gate keluar, waktu keluar, waktu kembali, tujuan, keperluan, durasi, dan status.
2. Detail aktivitas di `/keluar-masuk/riwayat/[id]` menampilkan seluruh field di Bagian 13.2.
3. Personel yang mencoba membuka aktivitas milik orang lain menerima respons NOT_FOUND.

### 13.7 Penyimpanan Riwayat

1. Riwayat tidak dihapus otomatis.
2. Riwayat disimpan tanpa batas waktu selama sistem berjalan.
3. Penghapusan personel secara permanen juga menghapus seluruh aktivitas Personel tersebut sesuai Bagian 8.3.

---

## 14. Laporan PDF

### 14.1 Akses

Laporan PDF hanya dapat dibuat dan diunduh oleh Super Admin dan Komandan. Pembuatan dilakukan melalui halaman `/laporan`.

### 14.2 Parameter Laporan

| Parameter | Aturan |
|---|---|
| Periode | Tanggal mulai dan tanggal akhir, keduanya wajib, inklusif, dalam zona waktu perangkat |
| Maksimum periode | 31 hari |
| Filter tambahan | Nama personel, NRP, gate, tujuan, dan status aktivitas. Sama dengan filter riwayat di Bagian 13.4 |
| Maksimum baris | 5.000 baris aktivitas |

Aturan:

1. Periode diterapkan pada waktu keluar.
2. Jika periode melebihi 31 hari, tombol Buat Laporan nonaktif dan tampil pesan `Periode maksimal 31 hari.`
3. Jika hasil melebihi 5.000 baris, server mengembalikan `REPORT_TOO_LARGE` dengan pesan `Data melebihi 5.000 baris. Persempit filter.` Tidak ada PDF yang dibuat.
4. Laporan berisi aktivitas dengan waktu keluar dalam periode, termasuk yang masih AKTIF.

### 14.3 Isi dan Urutan Laporan

Laporan PDF disusun dalam urutan berikut:

1. Header laporan.
2. Ringkasan periode: jumlah transaksi, jumlah keluar, jumlah kembali, dan jumlah aktivitas AKTIF pada periode tersebut.
3. Data Aktivitas: tabel dengan nama, NRP, gate keluar, gate kembali, waktu keluar, waktu kembali, tujuan, keperluan, total durasi, dan status aktivitas.
4. Statistik: jumlah personel DI DALAM dan jumlah personel DI LUAR pada saat laporan dibuat. Nilai ini merupakan snapshot dan diberi keterangan waktu snapshot.
5. Grafik: jumlah transaksi keluar dan kembali per hari dalam periode.

### 14.4 Layout PDF

| Aspek | Ketentuan |
|---|---|
| Ukuran halaman | A4 landscape |
| Margin | 36 pt pada seluruh sisi |
| Font | Inter yang disematkan dalam PDF |
| Header | Judul `Laporan Aktivitas GATEOPS`, periode, dibuat oleh (nama dan role pembuat), waktu pembuatan |
| Footer | Teks `Dokumen dihasilkan oleh GATEOPS` di kiri dan `Halaman X dari Y` di kanan |
| Tabel | Baris bergaris tipis, header tebal, baris berselang warna abu-abu sangat muda |
| Warna | Mengikuti palet netral Bagian 21 |
| Halaman baru | Tabel berlanjut ke halaman baru dengan header kolom diulang |

### 14.5 Grafik

1. Grafik berupa diagram batang vertikal dengan dua seri: keluar dan kembali.
2. Sumbu X berisi tanggal setiap hari dalam periode.
3. Sumbu Y berisi jumlah transaksi dengan garis bantu bilangan bulat.
4. Legenda ditampilkan di bagian atas grafik.
5. Grafik digambar menggunakan primitif SVG di dalam @react-pdf/renderer, bukan gambar raster.

### 14.6 Pembuatan dan Penamaan File

1. PDF dibuat di browser dari data yang diterima dari endpoint `GET /api/activities/report`.
2. Waktu pada PDF menggunakan zona waktu perangkat pembuat laporan.
3. Nama file: `GATEOPS_Laporan_<tanggal-mulai>_<tanggal-akhir>.pdf` dengan format `YYYY-MM-DD`.
4. Selama pembuatan, tombol menampilkan status loading dan dinonaktifkan.
5. Jika pembuatan gagal, tampil pesan `Laporan gagal dibuat. Coba lagi.` dengan tombol coba lagi.

---

## 15. Mode Keluarga/Persit

### 15.1 Registrasi Persit

Registrasi bersifat publik dan dilakukan di `/registrasi-persit`. Tautan registrasi tersedia di halaman login.

| Field | Keterangan | Aturan |
|---|---|---|
| NRP | NRP personel yang akan dikaitkan | Wajib, 6 sampai 12 digit angka |
| Nama | Nama Persit | Wajib, 3 sampai 100 karakter |
| Username | Username login | Sesuai Bagian 7.1 |
| Password | Password login | Sesuai Bagian 7.2 |

Aturan registrasi:

1. Sistem menolak registrasi jika NRP tidak terdaftar sebagai akun Personel. Pesan: `NRP tidak terdaftar pada data personel.`
2. Satu personel dapat memiliki lebih dari satu akun Persit. Registrasi dengan NRP yang sudah terhubung tetap diproses sebagai permintaan baru.
3. Satu akun Persit hanya memiliki satu permintaan pengaitan.
4. Jika username sudah digunakan, sistem menolak dengan pesan sesuai Bagian 7.1.
5. Registrasi berhasil membuat akun Persit dan permintaan pengaitan berstatus MENUNGGU dalam satu RPC `register_persit`, serta mencatat audit `PERSIT_REGISTERED`.
6. Setelah registrasi berhasil, pengguna diarahkan ke halaman login dengan pesan `Registrasi berhasil. Tunggu verifikasi Super Admin sebelum login untuk melihat status personel.`

### 15.2 Status Pengaitan

| Status | Arti | Akses data personel |
|---|---|---|
| MENUNGGU | Menunggu verifikasi Super Admin | Tidak ada |
| DISETUJUI | Pengaitan disetujui | Identitas dan status kehadiran personel terhubung |
| DITOLAK | Pengaitan ditolak | Tidak ada |

Akun Persit dengan status apa pun tetap dapat login sepanjang akunnya AKTIF.

### 15.3 Verifikasi oleh Super Admin

Halaman `/keluarga/verifikasi` menampilkan daftar permintaan pengaitan dengan filter status. Default menampilkan status MENUNGGU, diurutkan dari pengajuan terlama.

Setiap permintaan menampilkan: nama Persit, username, NRP yang diajukan, waktu pengajuan, dan status.

Aksi:

1. Setujui: hanya dapat dilakukan untuk status MENUNGGU jika personel dengan NRP tersebut ada. Tidak memerlukan konfirmasi. Mengubah status menjadi DISETUJUI, mengisi `personnel_account_id`, `reviewed_by`, dan `reviewed_at`, serta mencatat audit `PERSIT_APPROVED`.
2. Tolak: hanya dapat dilakukan untuk status MENUNGGU. Memerlukan konfirmasi. Mengubah status menjadi DITOLAK, serta mencatat audit `PERSIT_REJECTED`.
3. Jika personel dengan NRP tersebut sudah tidak ada, tombol Setujui nonaktif dengan keterangan `NRP personel tidak ditemukan. Tolak atau hapus pengajuan ini.`

Perubahan status tidak dapat dibalik dari antarmuka. Jika Super Admin salah menolak, akun Persit dihapus dan Persit mendaftar ulang.

### 15.4 Pencabutan dan Penghapusan Akun Persit

1. Super Admin dapat menghapus akun Persit dengan status apa pun melalui RPC `delete_persit_account`.
2. Penghapusan bersifat permanen, mencabut seluruh sesi akun, dan menghapus baris `persit_links` melalui kaskade.
3. Untuk akun DISETUJUI, aksi ini diberi label `Cabut pengaitan dan hapus akun`. Untuk akun MENUNGGU atau DITOLAK, aksi ini diberi label `Hapus akun`.
4. Setiap penghapusan memerlukan konfirmasi dan dicatat dalam audit sebagai `PERSIT_ACCOUNT_DELETED` dengan status sebelumnya di metadata.
5. Perubahan pengaitan tidak didukung. Untuk mengganti personel, Super Admin menghapus akun Persit, lalu Persit mendaftar ulang dengan akun baru.

### 15.5 Dashboard Keluarga

Sesuai Bagian 12.3.

### 15.6 Pembatasan Data Persit

Persit hanya dapat membaca identitas personel terhubung (NRP, nama, pangkat, jabatan) dan status kehadiran DI DALAM atau DI LUAR. Persit tidak dapat membaca data lain dari personel maupun sistem. Pembatasan ini diterapkan di Edge Function `persit` dan `dashboard`, bukan di UI.

---

## 16. Pengelolaan Akun (Super Admin)

Area ini hanya tersedia untuk Super Admin di `/pengelolaan/akun`.

### 16.1 Daftar Akun

1. Daftar menampilkan seluruh akun dari keempat role.
2. Filter: role dan status (AKTIF atau NONAKTIF).
3. Pencarian berdasarkan nama, username, dan NRP.
4. Paginasi 25 baris per halaman.
5. Setiap baris menampilkan nama, username, role, NRP (jika ada), status, dan waktu dibuat.

### 16.2 Membuat Akun Super Admin atau Komandan

| Field | Aturan |
|---|---|
| Role | Super Admin atau Komandan |
| NRP | Wajib untuk Komandan. Tidak diisi untuk Super Admin |
| Nama | Wajib, 3 sampai 100 karakter |
| Pangkat | Wajib untuk Komandan. Tidak diisi untuk Super Admin |
| Jabatan | Wajib untuk Komandan. Tidak diisi untuk Super Admin |
| Username | Sesuai Bagian 7.1 |
| Password | Wajib, sesuai Bagian 7.2 |

Akun dibuat melalui RPC `create_account` dan dicatat sebagai `ACCOUNT_CREATED`.

### 16.3 Mengubah Akun Super Admin atau Komandan

- Super Admin dapat mengubah nama, pangkat, jabatan (khusus Komandan), dan username.
- NRP tidak dapat diubah.
- Password tidak diubah dari form edit. Password diubah melalui reset atau oleh pemilik akun.
- Perubahan dicatat sebagai `ACCOUNT_UPDATED` dengan nama field yang berubah di metadata.

### 16.4 Status Akun

Super Admin dapat mengubah status akun sesuai Bagian 7.10. Perubahan memerlukan konfirmasi.

### 16.5 Reset Password

Super Admin dapat mereset password seluruh role sesuai Bagian 7.8.

---

## 17. Audit Log

### 17.1 Prinsip

1. Setiap perubahan penting dicatat dalam audit log.
2. Pencatatan audit dan perubahan bisnis berada dalam satu transaksi database. Jika salah satu gagal, keduanya dibatalkan.
3. Audit bersifat append-only melalui aplikasi dan database. Tidak ada endpoint untuk mengubah atau menghapus audit.
4. Pembacaan data tidak dicatat dalam audit.
5. Pembaruan GPS tidak dicatat dalam audit.

### 17.2 Daftar Event Audit

| Action | Pemicu |
|---|---|
| ACCOUNT_CREATED | Pembuatan akun Super Admin atau Komandan |
| ACCOUNT_UPDATED | Perubahan data akun Super Admin atau Komandan |
| ACCOUNT_STATUS_CHANGED | Perubahan status akun |
| PASSWORD_CHANGED | Perubahan password oleh pemilik akun |
| PASSWORD_RESET | Reset password oleh Super Admin |
| PERSONNEL_CREATED | Pembuatan personel |
| PERSONNEL_UPDATED | Perubahan data personel |
| PERSONNEL_DELETED | Penghapusan personel |
| GATE_CREATED | Pembuatan gate |
| GATE_UPDATED | Perubahan nama, lokasi, atau status gate |
| GATE_QR_REGENERATED | Regenerasi QR gate |
| PERSIT_REGISTERED | Registrasi Persit |
| PERSIT_APPROVED | Persetujuan pengaitan |
| PERSIT_REJECTED | Penolakan pengaitan |
| PERSIT_ACCOUNT_DELETED | Penghapusan akun Persit, termasuk akibat penghapusan personel |
| ATTENDANCE_EXIT | Transaksi keluar berhasil |
| ATTENDANCE_RETURN | Transaksi kembali berhasil |

### 17.3 Field Audit

Setiap catatan memuat: waktu server, ID dan username pelaku, role pelaku, action, jenis objek (`account`, `personnel`, `gate`, `persit_link`, `activity`), ID objek, dan metadata aman.

### 17.4 Metadata Aman

Metadata DILARANG berisi password, password hash, token sesi, cookie, token QR mentah, secret, latitude, longitude, tujuan, atau keperluan.

Metadata yang diizinkan:

- Nama field yang berubah (untuk perubahan data).
- Status sebelum dan sesudah (untuk perubahan status).
- ID gate dan ID aktivitas (untuk transaksi).
- Alasan penghapusan (`PERSONNEL_DELETED` untuk Persit).
- Status sebelumnya (untuk penghapusan akun Persit).

### 17.5 Akses dan Filter Audit

1. Hanya Super Admin yang dapat membuka halaman `/pengelolaan/audit`.
2. Filter: rentang tanggal, username pelaku, dan jenis action.
3. Pengurutan: waktu terbaru di atas.
4. Paginasi 25 baris per halaman.
5. Audit tidak dapat diekspor.

### 17.6 Retensi Audit

Audit disimpan tanpa batas waktu. Audit tidak terpengaruh oleh penghapusan akun, personel, atau gate.

---

## 18. Notifikasi

Tidak ada notifikasi untuk transaksi keluar maupun kembali. Transaksi hanya memperbarui data pada sistem dan dashboard. Tidak ada notifikasi yang dikirim kepada pengguna manapun melalui email, SMS, push, atau kanal lain.

Toast di layar hanya memberikan umpan balik atas aksi pengguna yang sedang dilakukan, misalnya `Password berhasil diubah.`. Toast tidak menjadi notifikasi bagi pengguna lain.

---

## 19. Alur End-to-End

### 19.1 Personel Keluar

Login → Beranda (DI DALAM) → Scan QR untuk Keluar → Form Keluar (tujuan dan keperluan) → Kamera → Pindai QR gate → Validasi QR dan gate → RPC transaksi berhasil → Status DI LUAR → Aktivitas AKTIF → GPS tracking aktif → Dashboard komando diperbarui.

### 19.2 Personel Kembali

Login → Beranda (DI LUAR) → Scan QR untuk Kembali → Kamera → Pindai QR gate → Validasi QR dan gate → RPC transaksi berhasil → Status DI DALAM → Aktivitas SELESAI → Lokasi GPS dihapus dan tracking berhenti → Durasi dihitung → Dashboard komando diperbarui.

### 19.3 Registrasi Persit

Registrasi (NRP, nama, username, password) → Permintaan MENUNGGU → Verifikasi Super Admin → Setujui → Status DISETUJUI → Dashboard Keluarga menampilkan identitas dan status personel.

### 19.4 Reset Password

Super Admin memilih akun → Reset password → Password sementara 12 karakter ditampilkan sekali → Pengguna login dengan password sementara → Wajib mengganti password → Sesi lain dicabut → Beranda sesuai role.

### 19.5 Pemulihan Setelah Gangguan

Koneksi terputus saat scan → Transaksi tidak diproses → Personel melihat status di beranda → Koneksi pulih → Personel scan ulang secara manual jika masih diperlukan.

---

## 20. Struktur Halaman dan Navigasi

### 20.1 Menu Sidebar per Role

Sistem memiliki enam modul utama. Modul Pengelolaan dan Pengaturan berada di luar enam modul tersebut.

| Menu | Super Admin | Komandan | Personel | Persit |
|---|---|---|---|---|
| 1. Dashboard Komando | Ya | Ya | Tidak | Tidak |
| 2. Data Personel | Ya | Ya | Tidak | Tidak |
| 3. Keluar-Masuk | Tidak | Tidak | Ya | Tidak |
| 4. GPS Tracking | Ya | Ya | Tidak | Tidak |
| 5. Riwayat & Laporan | Ya | Ya | Tidak | Tidak |
| 6. Mode Keluarga/Persit | Ya (verifikasi) | Tidak | Tidak | Ya (dashboard) |
| Pengelolaan (Gate & QR, Akun, Audit Log) | Ya | Tidak | Tidak | Tidak |
| Pengaturan | Ya | Ya | Ya | Ya |

Pengguna hanya melihat menu sesuai hak aksesnya. Menu yang tidak diizinkan tidak ditampilkan. Akses langsung ke rute yang tidak diizinkan dialihkan ke beranda role tersebut.

### 20.2 Daftar Rute

| Rute | Role | Halaman |
|---|---|---|
| `/login` | Publik | Login |
| `/registrasi-persit` | Publik | Registrasi Persit |
| `/ganti-password` | Semua role setelah login | Wajib ganti password |
| `/komando` | Super Admin, Komandan | Dashboard Komando |
| `/personel` | Super Admin, Komandan | Daftar personel |
| `/personel/baru` | Super Admin | Tambah personel |
| `/personel/[id]` | Super Admin, Komandan | Detail personel |
| `/personel/[id]/edit` | Super Admin | Ubah personel |
| `/beranda` | Personel | Dashboard Personel |
| `/keluar-masuk/scan` | Personel | Form Keluar dan scan QR |
| `/keluar-masuk/riwayat` | Personel | Riwayat pribadi |
| `/keluar-masuk/riwayat/[id]` | Personel | Detail aktivitas pribadi |
| `/gps` | Super Admin, Komandan | GPS Tracking |
| `/riwayat` | Super Admin, Komandan | Riwayat aktivitas |
| `/riwayat/[id]` | Super Admin, Komandan | Detail aktivitas |
| `/laporan` | Super Admin, Komandan | Laporan PDF |
| `/keluarga` | Persit | Dashboard Keluarga |
| `/keluarga/verifikasi` | Super Admin | Verifikasi Persit |
| `/pengelolaan/gate` | Super Admin | Daftar gate |
| `/pengelolaan/gate/baru` | Super Admin | Tambah gate |
| `/pengelolaan/gate/[id]` | Super Admin | Detail dan ubah gate, regenerasi QR |
| `/pengelolaan/akun` | Super Admin | Pengelolaan akun |
| `/pengelolaan/audit` | Super Admin | Audit log |
| `/pengaturan` | Semua role | Ganti password sendiri |

### 20.3 Navigasi Mobile

1. Pada lebar layar di bawah 768 px, sidebar berubah menjadi bottom tab bar untuk Personel dan Persit.
2. Bottom tab bar Personel berisi: Beranda, Scan QR, Riwayat, Pengaturan.
3. Bottom tab bar Persit berisi: Keluarga, Pengaturan.
4. Super Admin dan Komandan menggunakan drawer dari tombol menu di bagian atas pada layar di bawah 768 px.

---

## 21. Desain UI (Apple-Style Modern)

### 21.1 Prinsip Desain

1. Minimalis, bersih, dan lapang. Konten utama selalu menjadi pusat perhatian.
2. Hierarki jelas melalui ukuran font, berat font, dan jarak, bukan melalui garis tebal atau warna mencolok.
3. Permukaan berlapis dengan latar abu-abu sangat terang, kartu putih, dan bayangan tipis.
4. Sudut membulat dan transisi halus.
5. Light mode saja. Mode gelap tidak diimplementasikan.

### 21.2 Design Tokens

| Token | Nilai |
|---|---|
| Latar aplikasi | `#F5F5F7` |
| Permukaan kartu | `#FFFFFF` |
| Teks utama | `#1D1D1F` |
| Teks sekunder | `#6E6E73` |
| Teks tersier | `#86868B` |
| Garis pemisah | `rgba(0, 0, 0, 0.08)` |
| Aksen primer | `#0071E3` |
| Hover aksen | `#0077ED` |
| Sukses | `#248A3D` |
| Peringatan | `#C93400` |
| Bahaya | `#D70015` |
| Netral badge | `#E8E8ED` |
| Radius kartu | 16 px |
| Radius input dan tombol | 10 px |
| Radius badge | 999 px (pill) |
| Bayangan kartu | `0 1px 2px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.06)` |
| Font | Inter, fallback `-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", sans-serif` |
| Skala judul halaman | 28 px, berat 600, letter-spacing -0.02em |
| Skala judul kartu | 17 px, berat 600 |
| Skala isi | 15 px, berat 400 |
| Skala label kecil | 13 px, berat 500 |
| Spasi dasar | Kelipatan 4 px |
| Lebar konten maksimal | 1200 px |

### 21.3 Komponen Utama

1. Sidebar: lebar 260 px pada desktop, 72 px (ikon saja) pada tablet. Latar putih transparan dengan `backdrop-filter: blur(20px)`. Item aktif memiliki latar abu-abu muda dan teks aksen.
2. Header halaman: judul besar, deskripsi singkat di bawahnya, dan area aksi di kanan.
3. Kartu: latar putih, radius 16 px, bayangan sesuai token, padding 20 px.
4. Tabel: header teks kecil berwarna sekunder, baris dipisah garis tipis, hover menampilkan latar abu-abu sangat muda. Pada layar di bawah 768 px, tabel berubah menjadi daftar kartu.
5. Tombol primer: latar aksen, teks putih, pill atau radius 10 px, tinggi 40 px.
6. Tombol sekunder: latar abu-abu netral, teks utama.
7. Tombol bahaya: teks merah tanpa latar pada aksi biasa, latar merah pada konfirmasi.
8. Input: latar putih, border 1 px dengan warna garis pemisah, fokus menampilkan ring aksen 3 px dengan opasitas 25%.
9. Segmented control: untuk filter status pada riwayat dan verifikasi.
10. Dialog konfirmasi: kartu tengah dengan latar blur di belakang, judul, deskripsi, dan dua tombol. Tombol aksi berada di kanan.
11. Sheet: panel dari bawah pada mobile untuk Form Keluar dan detail singkat.
12. Toast: di bagian bawah tengah, otomatis tutup dalam 4 detik, hanya untuk umpan balik aksi.
13. Skeleton: digunakan untuk loading pada kartu dan tabel.

### 21.4 Pemetaan Badge Status

| Konteks | Nilai | Warna |
|---|---|---|
| Kehadiran | DI DALAM | Sukses (hijau) |
| Kehadiran | DI LUAR | Peringatan (oranye) |
| Status GPS | AKTIF | Aksen (biru) |
| Status GPS | OFFLINE | Peringatan (oranye) |
| Status GPS | TIDAK AKTIF | Netral (abu-abu) |
| Status aktivitas | AKTIF | Peringatan (oranye) |
| Status aktivitas | SELESAI | Netral (abu-abu) |
| Status akun | AKTIF | Sukses (hijau) |
| Status akun | NONAKTIF | Netral (abu-abu) |
| Status gate | AKTIF | Sukses (hijau) |
| Status gate | NONAKTIF | Netral (abu-abu) |
| Status pengaitan | MENUNGGU | Peringatan (oranye) |
| Status pengaitan | DISETUJUI | Sukses (hijau) |
| Status pengaitan | DITOLAK | Bahaya (merah) |

Setiap badge memiliki teks, tidak hanya warna, untuk memenuhi aksesibilitas.

### 21.5 State Tampilan

| State | Ketentuan |
|---|---|
| Loading awal | Skeleton sesuai bentuk konten. Tidak menggunakan spinner layar penuh |
| Loading aksi | Tombol menampilkan spinner kecil dan nonaktif |
| Empty state | Ikon, judul singkat, dan satu kalimat penjelasan. Contoh: `Belum ada personel DI LUAR.` |
| Error state | Judul `Terjadi kesalahan`, pesan dari server jika aman untuk ditampilkan, dan tombol Coba lagi |
| Error jaringan | `Koneksi terputus. Periksa jaringan Anda, lalu coba lagi.` |
| Konfirmasi | Wajib untuk: nonaktifkan atau aktifkan akun, reset password, hapus personel, tolak pengaitan, cabut pengaitan dan hapus akun Persit, hapus akun Persit, regenerasi QR, ubah status gate |
| Konfirmasi tidak wajib | Setujui pengaitan, simpan form, ubah profil, buat data |

### 21.6 Paginasi

1. Ukuran halaman 25 untuk daftar personel, riwayat, akun, audit, dan permintaan Persit.
2. Kontrol berisi tombol Sebelumnya, Berikutnya, dan teks `Halaman X dari Y` di bawah tabel.
3. Tombol nonaktif pada halaman pertama dan terakhir.
4. Perubahan filter mengembalikan paginasi ke halaman 1.

### 21.7 Responsif

| Breakpoint | Lebar | Perilaku |
|---|---|---|
| Mobile | Di bawah 768 px | Bottom tab bar untuk Personel dan Persit, drawer untuk role lain, tabel menjadi kartu |
| Tablet | 768 px sampai 1199 px | Sidebar ikon saja, tabel tetap tampil dengan kolom penting |
| Desktop | 1200 px ke atas | Sidebar penuh, tabel dengan seluruh kolom |

Peta pada layar di bawah 768 px tampil penuh lebar dengan daftar di bawahnya.

### 21.8 Aksesibilitas

1. Kontras teks minimal memenuhi WCAG 2.1 AA.
2. Target sentuh minimal 44 x 44 px.
3. Seluruh elemen interaktif dapat dioperasikan dengan keyboard. Fokus terlihat dengan ring aksen.
4. Setiap ikon tanpa teks memiliki atribut aria-label.
5. Badge status selalu memiliki teks.
6. Dialog memerangkap fokus dan kembali ke pemicu saat ditutup.
7. Kamera dan scan QR memiliki teks petunjuk, tidak hanya visual.

### 21.9 Gerak

1. Transisi standar 200 ms dengan easing `cubic-bezier(0.25, 0.1, 0.25, 1)`.
2. Animasi masuk dialog dan sheet 250 ms.
3. Jika pengguna mengaktifkan `prefers-reduced-motion`, seluruh animasi dinonaktifkan dan transisi menjadi instan.

---

## 22. Kontrak API

### 22.1 Prinsip

1. Browser hanya memanggil `/api/*` pada origin aplikasi.
2. Route Handler `/api/<domain>/<sisa path>` di Next.js meneruskan request 1:1 ke `${SUPABASE_FUNCTIONS_URL}/<domain>/<sisa path>`.
3. BFF menambahkan header `Authorization: Bearer <SUPABASE_ANON_KEY>`, `X-Internal-Secret`, dan `X-Session-Token` dari cookie. Header `X-Session-Token` tidak pernah dikirim ke browser.
4. BFF tidak memuat aturan bisnis. BFF hanya menangani cookie, header Origin, dan penerusan request.
5. Seluruh Edge Functions dideploy dengan `verify_jwt = true`, sehingga request tanpa JWT Supabase yang valid ditolak oleh gateway.

### 22.2 Versi

Seluruh path menggunakan prefix `/api/v1/`. Versi baru dibuat hanya jika kontrak lama berubah secara tidak kompatibel. Pada rilis ini, seluruh endpoint berada di `/api/v1`.

### 22.3 Format Respons

Sukses:

```json
{ "data": { } }
```

Daftar dengan paginasi:

```json
{ "data": [ ], "page": 1, "pageSize": 25, "total": 120 }
```

Galat:

```json
{ "error": { "code": "INVALID_QR", "message": "QR Gate tidak valid atau tidak dikenal. silahkan pindai lagi", "requestId": "..." } }
```

### 22.4 Kode Galat

| Kode | HTTP | Keterangan |
|---|---|---|
| VALIDATION_FAILED | 400 | Input tidak valid. Field dan pesan dikembalikan di `details` |
| FORM_INCOMPLETE | 400 | Tujuan atau keperluan kosong |
| UNAUTHENTICATED | 401 | Tidak ada sesi atau sesi tidak valid |
| SESSION_EXPIRED | 401 | Sesi kedaluwarsa atau dicabut |
| FORBIDDEN | 403 | Role tidak memiliki izin |
| MUST_CHANGE_PASSWORD | 403 | Wajib ganti password sementara |
| ACCOUNT_INACTIVE | 403 | Akun NONAKTIF |
| NOT_FOUND | 404 | Data tidak ditemukan atau tidak boleh diakses |
| CONFLICT | 409 | Konflik data, misalnya username sudah digunakan |
| NOT_OUT | 409 | Gerak lokasi untuk Personel yang tidak DI LUAR |
| TRANSACTION_IN_PROGRESS | 409 | Transaksi lain untuk Personel yang sama sedang berjalan |
| INVALID_QR | 422 | QR tidak valid atau tidak dikenal |
| GATE_INACTIVE | 409 | Gate NONAKTIF |
| PERSONNEL_NOT_FOUND | 409 | NRP personel tidak ditemukan saat verifikasi |
| REPORT_TOO_LARGE | 422 | Hasil laporan melebihi 5.000 baris |
| RATE_LIMITED | 429 | Akun terkunci karena percobaan login gagal |
| TRANSACTION_FAILED | 500 | Transaksi gagal dan dibatalkan seluruhnya |
| INTERNAL_ERROR | 500 | Galat tidak terduga. Detail hanya di log server |

### 22.5 Daftar Endpoint

Hak akses: SA = Super Admin, KMD = Komandan, PRS = Personel, PST = Persit, PUB = publik.

| Metode | Path | Hak akses | Fungsi |
|---|---|---|---|
| GET | /api/v1/health | PUB | Health check |
| POST | /api/v1/auth/login | PUB | Login |
| POST | /api/v1/auth/logout | Semua login | Logout |
| GET | /api/v1/auth/me | Semua login | Data akun dan role |
| POST | /api/v1/auth/password | Semua login | Ganti password sendiri |
| GET | /api/v1/dashboard/komando | SA, KMD | Statistik, DI LUAR, peta data, aktivitas terbaru |
| GET | /api/v1/dashboard/beranda | PRS | Status dan ringkasan pribadi |
| GET | /api/v1/dashboard/keluarga | PST | Status pengaitan dan status personel terhubung |
| GET | /api/v1/personnel | SA, KMD | Daftar personel |
| POST | /api/v1/personnel | SA | Tambah personel |
| GET | /api/v1/personnel/:id | SA, KMD | Detail personel |
| PATCH | /api/v1/personnel/:id | SA | Ubah nama, pangkat, jabatan, username |
| DELETE | /api/v1/personnel/:id | SA | Hapus personel permanen |
| GET | /api/v1/accounts | SA | Daftar seluruh akun |
| POST | /api/v1/accounts | SA | Buat Super Admin atau Komandan |
| PATCH | /api/v1/accounts/:id | SA | Ubah akun Super Admin atau Komandan |
| POST | /api/v1/accounts/:id/status | SA | Ubah status AKTIF atau NONAKTIF |
| POST | /api/v1/accounts/:id/reset-password | SA | Reset password sementara |
| GET | /api/v1/gates | SA, KMD | Daftar gate (KMD hanya baca) |
| POST | /api/v1/gates | SA | Buat gate dan QR, mengembalikan token mentah satu kali |
| GET | /api/v1/gates/:id | SA | Detail gate |
| PATCH | /api/v1/gates/:id | SA | Ubah nama, lokasi, atau status gate |
| POST | /api/v1/gates/:id/regenerate-qr | SA | Regenerasi QR, mengembalikan token mentah satu kali |
| POST | /api/v1/transactions/scan | PRS | Transaksi keluar atau kembali |
| POST | /api/v1/gps/report | PRS | Kirim lokasi atau status izin lokasi |
| GET | /api/v1/gps | SA, KMD | Daftar Personel DI LUAR dengan status GPS |
| GET | /api/v1/activities | SA, KMD | Riwayat seluruh personel dengan filter dan paginasi |
| GET | /api/v1/activities/:id | SA, KMD | Detail aktivitas |
| GET | /api/v1/activities/report | SA, KMD | Data laporan PDF dengan batas 5.000 baris |
| GET | /api/v1/activities/mine | PRS | Riwayat pribadi |
| GET | /api/v1/activities/mine/:id | PRS | Detail aktivitas pribadi |
| POST | /api/v1/persit/register | PUB | Registrasi Persit |
| GET | /api/v1/persit/requests | SA | Daftar permintaan pengaitan |
| POST | /api/v1/persit/accounts/:id/approve | SA | Setujui pengaitan |
| POST | /api/v1/persit/accounts/:id/reject | SA | Tolak pengaitan |
| DELETE | /api/v1/persit/accounts/:id | SA | Hapus akun Persit atau cabut pengaitan |
| GET | /api/v1/audit | SA | Audit log dengan filter dan paginasi |

### 22.6 Aturan Request

1. Setiap request menghasilkan `requestId` unik yang disertakan di respons dan log.
2. Request body berformat JSON. Content-Type WAJIB `application/json` untuk request dengan body.
3. Setiap request mutasi melalui BFF WAJIB memiliki Origin yang sesuai.
4. Parameter paginasi: `page` dimulai dari 1, `pageSize` antara 1 dan 100, default 25.
5. Tanggal dalam query dikirim sebagai ISO 8601 UTC.

### 22.7 Body Transaksi

`POST /api/v1/transactions/scan`

```json
{
  "token": "string base64url 43 karakter",
  "tujuan": "string, wajib hanya saat DI DALAM",
  "keperluan": "string, wajib hanya saat DI DALAM"
}
```

Respons sukses:

```json
{
  "data": {
    "type": "KELUAR",
    "activityId": "uuid",
    "gateName": "Gate Utama",
    "occurredAt": "2026-11-25T10:40:00Z",
    "presence": "DI LUAR",
    "durationSeconds": null
  }
}
```

`type` bernilai `KELUAR` atau `KEMBALI`. Untuk KEMBALI, `durationSeconds` terisi.

### 22.8 Body Laporan GPS

`POST /api/v1/gps/report`

```json
{ "permissionState": "GRANTED", "latitude": -6.9667, "longitude": 110.4167 }
```

atau

```json
{ "permissionState": "DENIED" }
```

Jika `permissionState` bernilai GRANTED, latitude dan longitude WAJIB ada dan berada dalam rentang valid. Jika Personel tidak memiliki aktivitas AKTIF, respons NOT_OUT dikembalikan dan data tidak berubah.

---

## 23. Kebutuhan Fungsional dan Kriteria Penerimaan

Kolom Verifikasi menunjuk skenario di Bagian 27.2.

| ID | Kebutuhan | Verifikasi |
|---|---|---|
| FR-01 | Sistem menyediakan login username dan password | S-01 |
| FR-02 | Sistem memiliki empat role: Super Admin, Komandan, Personel, Persit | S-01 |
| FR-03 | Sistem membatasi akses API dan halaman berdasarkan role pada setiap request | S-17 |
| FR-04 | Dashboard ditampilkan sesuai role | S-17 |
| FR-05 | Login dikunci selama 15 menit setelah lima kegagalan berturut-turut | S-15 |
| FR-06 | Cookie sesi bersifat HttpOnly, Secure, dan SameSite=Strict | S-01 |
| FR-07 | Sesi kedaluwarsa setelah 12 jam atau 2 jam tidak aktif | S-01 |
| FR-08 | Super Admin dapat membuat, mengubah, dan menonaktifkan akun Super Admin dan Komandan | S-02 |
| FR-09 | Super Admin dapat menambah, mengubah, dan menghapus personel | S-02, S-13 |
| FR-10 | NRP personel tidak dapat diubah | S-02 |
| FR-11 | Username bersifat unik lintas role dan tidak peka huruf besar-kecil | S-02 |
| FR-12 | Password tidak memiliki aturan komposisi dan panjang minimum | S-02 |
| FR-13 | Semua role dapat mengganti password sendiri | S-14 |
| FR-14 | Super Admin dapat mereset password dan password sementara ditampilkan satu kali | S-14 |
| FR-15 | Pengguna dengan password sementara wajib mengganti password sebelum mengakses halaman lain | S-14 |
| FR-16 | Super Admin dapat membuat gate dengan nama, lokasi, dan status | S-03 |
| FR-17 | Setiap gate memiliki QR Code sendiri dengan token 256-bit | S-03 |
| FR-18 | Token QR mentah hanya ditampilkan satu kali saat pembuatan atau regenerasi | S-03 |
| FR-19 | Database hanya menyimpan hash SHA-256 token QR | S-03 |
| FR-20 | Regenerasi QR langsung membatalkan QR lama | S-03 |
| FR-21 | Gate NONAKTIF menolak transaksi keluar dan kembali | S-05 |
| FR-22 | Transaksi keluar hanya dapat diproses setelah tujuan dan keperluan terisi | S-04 |
| FR-23 | Kamera tidak dapat dibuka sebelum Form Keluar valid | S-04 |
| FR-24 | Transaksi kembali tidak memerlukan form | S-06 |
| FR-25 | Jenis transaksi ditentukan otomatis dari status kehadiran | S-03, S-06 |
| FR-26 | Transaksi keluar dan kembali bersifat atomik | S-08 |
| FR-27 | Request transaksi kedua untuk Personel yang sama saat transaksi berjalan ditolak | S-07 |
| FR-28 | QR tidak valid tidak mengubah status dan kamera tetap aktif | S-05 |
| FR-29 | Sesi berakhir saat scan menolak transaksi dan menghentikan kamera | S-09 |
| FR-30 | Kegagalan koneksi saat scan tidak menghasilkan antrean atau retry otomatis | S-10 |
| FR-31 | Kegagalan kamera ditampilkan dengan pesan dan opsi coba lagi | S-04 |
| FR-32 | Transaksi keluar mencatat waktu keluar, tujuan, keperluan, gate, dan status AKTIF | S-03 |
| FR-33 | Transaksi kembali mencatat waktu kembali, gate, durasi, dan status SELESAI | S-06 |
| FR-34 | Tracking GPS aktif otomatis setelah keluar berhasil | S-11 |
| FR-35 | Tracking GPS berhenti dan lokasi dihapus setelah kembali berhasil | S-06 |
| FR-36 | Klien mengirim lokasi setiap 30 detik | S-11 |
| FR-37 | Sistem menyimpan satu lokasi terbaru per Personel | S-11 |
| FR-38 | Status GPS AKTIF jika lokasi diterima dalam 60 detik terakhir, termasuk tepat 60 detik | S-12 |
| FR-39 | Status GPS OFFLINE jika lokasi lebih dari 60 detik lama atau izin dicabut setelah lokasi pernah diterima | S-12 |
| FR-40 | Status GPS TIDAK AKTIF jika lokasi belum pernah diterima untuk aktivitas aktif | S-12 |
| FR-41 | Tracking pulih otomatis saat koneksi atau izin lokasi kembali | S-12 |
| FR-42 | Status GPS tidak memengaruhi status kehadiran | S-12 |
| FR-43 | Riwayat menampilkan seluruh field di Bagian 13.2 | S-16 |
| FR-44 | Riwayat dapat difilter dan diurutkan dari waktu keluar terbaru | S-16 |
| FR-45 | Riwayat tidak dihapus otomatis | S-16 |
| FR-46 | Super Admin dan Komandan dapat membuat dan mengunduh laporan PDF dengan periode maksimal 31 hari | S-16 |
| FR-47 | Laporan PDF berisi data aktivitas, statistik, dan grafik | S-16 |
| FR-48 | Persit dapat registrasi mandiri dengan NRP personel terdaftar | S-12 |
| FR-49 | Super Admin dapat menyetujui, menolak, atau menghapus akun Persit | S-12 |
| FR-50 | Persit hanya melihat identitas dan status kehadiran personel terhubung | S-12 |
| FR-51 | Penghapusan personel menghapus akun Persit terverifikasi, sesi, dan riwayat secara atomik | S-13 |
| FR-52 | Audit dicatat dalam transaksi yang sama dengan perubahan bisnis | S-08 |
| FR-53 | Audit bersifat append-only | S-18 |
| FR-54 | Tidak ada notifikasi transaksi keluar dan kembali | S-03, S-06 |
| FR-55 | Instalasi, konfigurasi, migrasi, dan deployment berjalan melalui perintah otomatis | S-19, S-20 |

---

## 24. Kebutuhan Non-Fungsional

### 24.1 Keamanan

1. Autentikasi menggunakan username dan password dengan hashing PBKDF2-HMAC-SHA256 600.000 iterasi.
2. Token sesi dan token QR hanya disimpan dalam bentuk hash.
3. Otorisasi dilakukan di setiap Edge Function untuk setiap request.
4. Role-based access control diterapkan di API dan UI. UI hanya kenyamanan, bukan batas keamanan.
5. Seluruh tabel memiliki RLS aktif tanpa policy untuk anon dan authenticated.
6. Service role key hanya berada di Edge Functions.
7. Tidak ada secret di browser, repository, atau log.
8. Input divalidasi di server. Query menggunakan parameter binding.
9. Pesan login tidak membedakan username tidak ditemukan dan password salah.
10. Header keamanan sesuai Bagian 4.6 diterapkan pada seluruh respons.
11. Log tidak memuat password, token, lokasi, tujuan, atau keperluan.
12. Login menggunakan kontrol lockout sesuai Bagian 7.4.

### 24.2 Performa dan Kapasitas

Kapasitas desain:

| Parameter | Nilai |
|---|---|
| Akun personel | 2.000 |
| Gate | 100 |
| Personel DI LUAR bersamaan | 500 |
| Pengguna dashboard bersamaan | 150 |
| Frekuensi GPS maksimum | Sekitar 17 request per detik pada 500 Personel DI LUAR |

Target waktu respons (persentil ke-95, diukur di sisi server):

| Operasi | Target |
|---|---|
| Login | Kurang dari atau sama dengan 1,5 detik |
| Muat dashboard | Kurang dari atau sama dengan 1,5 detik |
| Transaksi scan | Kurang dari atau sama dengan 1,5 detik |
| Laporan GPS | Kurang dari atau sama dengan 500 ms |
| Muat riwayat dengan filter | Kurang dari atau sama dengan 1,5 detik |
| Pembuatan PDF di browser untuk 5.000 baris | Kurang dari atau sama dengan 10 detik |

Pengujian beban WAJIB dijalankan sebelum rilis produksi dengan kapasitas desain di atas, dan hasilnya wajib memenuhi target.

### 24.3 Reliabilitas dan Konsistensi

1. Transaksi keluar dan kembali bersifat atomik sesuai Bagian 10.9.
2. Audit dan perubahan bisnis berada dalam satu transaksi.
3. Sistem mempertahankan status kehadiran walaupun GPS gagal atau offline.
4. Sistem mempertahankan seluruh transaksi yang sudah berhasil.
5. Tidak ada retry otomatis untuk transaksi QR dan pengiriman GPS.
6. Status kehadiran selalu konsisten dengan tabel aktivitas sesuai invariant Bagian 6.8.

### 24.4 Ketersediaan dan Backup

1. Target ketersediaan bulanan adalah 99,5%, dengan ketergantungan pada SLA Vercel dan Supabase.
2. Production WAJIB menggunakan paket Supabase dengan backup harian otomatis dan Point-in-Time Recovery minimal 7 hari.
3. Restore dilakukan melalui fitur PITR Supabase. Prosedur restore didokumentasikan di repository dalam `docs/ops/restore.md` dan diuji minimal sekali sebelum rilis pertama.
4. Tidak ada data yang dihapus otomatis selain sesi kedaluwarsa lebih dari 7 hari dan baris GPS yang dihapus saat kembali.

### 24.5 Observabilitas

1. Setiap Edge Function menulis log terstruktur berformat JSON dengan `requestId`, endpoint, role, dan durasi.
2. Log tidak memuat data sensitif sesuai Bagian 24.1.
3. Log diakses melalui Supabase Logs untuk Edge Functions dan Vercel Logs untuk aplikasi web.
4. Endpoint `GET /api/v1/health` memeriksa koneksi database dan mengembalikan `{ "status": "ok" }` jika sehat.
5. Tidak ada layanan pihak ketiga untuk error tracking pada rilis ini. Galat dicatat dalam log terstruktur.

### 24.6 Kompatibilitas

| Platform | Dukungan |
|---|---|
| Chrome dan Edge (dua versi terakhir) | Didukung penuh |
| Firefox (dua versi terakhir) | Didukung penuh |
| Safari di macOS (dua versi terakhir) | Didukung penuh |
| Safari di iOS dan iPadOS 16.4 ke atas | Didukung penuh |
| Chrome di Android 10 ke atas | Didukung penuh |
| Internet Explorer | Tidak didukung |

Akses kamera dan GPS hanya tersedia melalui HTTPS atau localhost. Vercel menyediakan HTTPS untuk production.

### 24.7 Privasi dan Retensi Data

| Data | Retensi | Akses |
|---|---|---|
| Lokasi GPS terakhir | Dihapus saat personel kembali | Super Admin dan Komandan |
| Riwayat aktivitas | Tanpa batas | Super Admin dan Komandan. Personel untuk datanya sendiri |
| Audit log | Tanpa batas | Super Admin |
| Sesi kedaluwarsa | Dihapus setelah 7 hari dari `expires_at` | Sistem |
| Token mentah QR | Tidak disimpan | Tidak ada |
| Password | Hanya hash | Tidak ada yang dapat melihat password |

---

## 25. Instalasi dan Setup Otomatis

Tujuan bagian ini adalah instalasi dan konfigurasi yang berjalan otomatis melalui satu perintah, dengan input manusia seminimal mungkin.

### 25.1 Prasyarat

| Prasyarat | Versi | Catatan |
|---|---|---|
| Node.js | 22 LTS | Diperiksa oleh `doctor` |
| pnpm | 9 | Diperiksa oleh `doctor`, dapat dipasang melalui corepack |
| Git | Versi terbaru | Repository harus berupa Git repository |
| Akun Supabase | Aktif | Project Supabase production dibuat sekali secara manual oleh Owner |
| Akun Vercel | Aktif | Project Vercel dibuat oleh wizard atau sudah ada |
| Docker | Versi terbaru | Hanya untuk target local |
| Supabase CLI | Versi di devDependency | Dipasang melalui pnpm |
| Vercel CLI | Versi di devDependency | Dipasang melalui pnpm |

Pembuatan project Supabase production dilakukan sekali oleh Owner di dashboard Supabase. Setup menerima project ref dari project tersebut. Seluruh langkah lain berjalan otomatis.

### 25.2 Perintah Utama

| Perintah | Fungsi |
|---|---|
| `pnpm install` | Memasang dependensi sesuai lockfile |
| `pnpm setup` | Wizard instalasi untuk target production |
| `pnpm setup -- --target local` | Instalasi untuk environment lokal dengan Supabase CLI |
| `pnpm doctor` | Memeriksa prasyarat, login, koneksi, dan konfigurasi |
| `pnpm dev` | Menjalankan web dan Edge Functions lokal |
| `pnpm seed:demo` | Mengisi data demo. Hanya berjalan pada target local |
| `pnpm test` | Unit test dan integration test |
| `pnpm test:db` | pgTAP |
| `pnpm test:e2e` | Playwright |
| `pnpm release` | Deployment produksi: migrasi, Edge Functions, web, health check |

### 25.3 Alur `pnpm setup` (Target Production)

Wizard menjalankan langkah berikut secara berurutan. Setiap langkah memeriksa kondisi saat ini dan melewatinya jika sudah sesuai.

1. Preflight: menjalankan `doctor`. Jika Supabase CLI atau Vercel CLI belum login, wizard menjalankan login interaktif.
2. Input: wizard meminta project ref Supabase, nama project Vercel, username Super Admin awal, dan password Super Admin awal yang diisi dua kali. Password database tidak diminta atau disimpan oleh wizard; Supabase CLI menawarkannya secara interaktif pada langkah koneksi dan pengguna boleh mengosongkannya.
3. Secret: wizard membuat `GATEOPS_INTERNAL_SECRET` acak 32 byte base64url jika belum ada di `.env.local`.
4. Dependensi: `pnpm install --frozen-lockfile`.
5. Koneksi: `supabase link --project-ref <ref>`. Supabase CLI menampilkan prompt password database opsional. Jika pengguna memasukkan password, CLI dapat menyimpannya di native credentials storage yang tersedia. Jika pengguna mengosongkannya, proses link tetap berjalan tanpa validasi password database; perintah database berikutnya dapat meminta kredensial saat diperlukan. Wizard tidak mengirim password sebagai argumen, environment variable, atau input yang disimpan.
6. Migrasi: `supabase db push` untuk seluruh migrasi yang belum diterapkan.
7. Ekstensi: migrasi pertama mengaktifkan pgTAP dan pg_cron. Jika belum aktif, migrasi mengaktifkannya.
8. Edge Functions: `supabase functions deploy` untuk seluruh fungsi sesuai `config.toml`.
9. Secret Edge Functions: `supabase secrets set GATEOPS_INTERNAL_SECRET=...`.
10. Super Admin: wizard memanggil `POST /functions/v1/accounts/bootstrap` dengan header internal secret. Endpoint ini hanya berhasil jika belum ada Super Admin AKTIF. Jika sudah ada, wizard mencatat bahwa langkah ini dilewati.
11. Vercel: wizard menjalankan `vercel link`, lalu `vercel env add` untuk `SUPABASE_FUNCTIONS_URL`, `SUPABASE_ANON_KEY`, dan `GATEOPS_INTERNAL_SECRET` pada environment production. Nilai yang sudah ada diperbarui.
12. Deployment awal: `vercel deploy --prod`.
13. Smoke test: `GET /api/v1/health`, login Super Admin, `GET /api/v1/auth/me`, dan logout. Setiap langkah wajib lulus.
14. Ringkasan: wizard menampilkan URL production dan status setiap langkah. Wizard tidak menampilkan secret.

Untuk target local, langkah 5 sampai 12 diganti dengan: membuat `supabase/functions/.env` berisi `GATEOPS_INTERNAL_SECRET` lokal sebelum stack dimulai, `supabase start`, `supabase db reset` (menerapkan migrasi dan seed kosong), memastikan Edge Functions sehat, dan pembuatan `.env.local` untuk web yang mengarah ke localhost. File `supabase/functions/.env` diperlukan karena itulah sumber secret lokal yang dibaca Edge Functions saat `supabase start`; file ini tidak boleh masuk Git. Langkah 10 tetap dijalankan agar Super Admin lokal tersedia.

### 25.4 Variabel Konfigurasi

| Nama | Lokasi | Keterangan |
|---|---|---|
| SUPABASE_PROJECT_REF | Lokal (wizard) | Project ref production |
| Password database Supabase | Opsional; hanya native credentials storage milik Supabase CLI jika pengguna memasukkannya | Ditawarkan langsung oleh prompt `supabase link`; boleh dikosongkan. Wizard tidak menyimpan atau meneruskan password. Jika dimasukkan, penyimpanan mengikuti perilaku Supabase CLI dan ketersediaan native credentials storage. |
| SUPABASE_FUNCTIONS_URL | Vercel env, `.env.local` | URL `https://<ref>.supabase.co/functions/v1` atau localhost untuk local |
| SUPABASE_ANON_KEY | Vercel env, `.env.local` | Hanya untuk header Authorization BFF. Bukan secret, tetapi tidak dikirim ke browser |
| GATEOPS_INTERNAL_SECRET | Vercel env, Supabase secret, `.env.local`, `supabase/functions/.env` (local saja) | Secret antara BFF dan Edge Functions. Untuk local, nilai pada `supabase/functions/.env` dibaca saat `supabase start`; file ini diabaikan Git. |
| SUPABASE_SERVICE_ROLE_KEY | Otomatis di Edge Functions | Disediakan oleh Supabase. DILARANG di Vercel |
| VERCEL_PROJECT_ID | `.vercel/project.json` | Dibuat oleh `vercel link` |

Berkas `.env.example` berisi nama variabel tanpa nilai. Berkas `.env.local`, `supabase/functions/.env`, dan `.vercel/` masuk `.gitignore`.

### 25.5 Prinsip Setup

1. Idempotensi: setiap langkah dapat dijalankan ulang tanpa menduplikasi data atau mengubah konfigurasi yang sudah benar.
2. Tidak ada secret yang dicetak ke terminal kecuali password Super Admin yang diisi pengguna sendiri, dan tidak pernah ditulis ke log.
3. Setup gagal dengan pesan jelas dan kode keluar tidak nol jika langkah mana pun gagal. Langkah berikutnya tidak dijalankan.
4. Setiap langkah dicatat ke `.setup/last-run.log` yang tidak berisi secret.
5. Setup tidak mengubah data production yang sudah ada selain migrasi yang belum diterapkan.

### 25.6 Pemeriksaan `pnpm doctor`

| Pemeriksaan | Kriteria lulus |
|---|---|
| Node.js | Versi 22.x |
| pnpm | Versi 9.x atau lebih baru |
| Supabase CLI | Terpasang dan login |
| Vercel CLI | Terpasang dan login |
| Docker | Berjalan (hanya target local) |
| Git | Repository bersih untuk rilis |
| Project Supabase | Dapat diakses dengan project ref yang tersimpan |
| Migrasi | Tidak ada migrasi tertunda di production |
| Edge Functions | Seluruh fungsi terdeploy dengan versi repository |
| Secret | `GATEOPS_INTERNAL_SECRET` tersedia di Supabase dan Vercel |
| Health check | `GET /api/v1/health` mengembalikan ok |
| RLS | Seluruh tabel publik memiliki RLS aktif |
| Grant RPC | Tidak ada RPC yang dapat dieksekusi oleh anon atau authenticated |

### 25.7 Data Demo (Local Saja)

1. `pnpm seed:demo` hanya berjalan jika target lokal terdeteksi. Perintah menolak dijalankan terhadap production.
2. Perintah membuat satu Komandan, lima Personel, dua gate, dan beberapa aktivitas contoh melalui API resmi.
3. Password demo dibuat acak dan disimpan di `.local/demo-credentials.json` yang masuk `.gitignore`.
4. Token QR demo disimpan di `.local/demo-qr/` sebagai berkas PNG untuk diuji dengan kamera atau tools.

---

## 26. Deployment

### 26.1 Environment

1. Environment yang digunakan: local dan production.
2. Tidak ada environment staging pada rilis ini.
3. Environment local menggunakan Supabase CLI dan `vercel dev` atau `next dev`.
4. Environment production menggunakan satu project Supabase dan satu project Vercel.
5. Preview deployment Vercel dinonaktifkan pada project. Hanya branch `main` yang dideploy ke production.
6. Preview deployment tidak terhubung ke Supabase production.

### 26.2 Supabase

1. Satu project Supabase production.
2. Paket yang digunakan WAJIB menyediakan backup harian dan PITR minimal 7 hari.
3. Ekstensi yang diaktifkan: pgTAP (hanya di local dan CI), pg_cron (production dan local).
4. Edge Functions dideploy dengan `verify_jwt = true`.
5. Secret yang disimpan: `GATEOPS_INTERNAL_SECRET`.
6. Region project mengikuti pilihan Owner saat membuat project dan tidak diubah setelah rilis.
7. Pengaturan Auth Supabase tidak digunakan untuk login aplikasi. Tidak ada user di `auth.users`.

### 26.3 Vercel

1. Satu project Vercel dengan root directory `apps/web`.
2. Integrasi Git terhubung ke repository. Branch `main` menjadi production.
3. Preview deployment dinonaktifkan.
4. Environment variables production: `SUPABASE_FUNCTIONS_URL`, `SUPABASE_ANON_KEY`, `GATEOPS_INTERNAL_SECRET`.
5. Runtime Node.js 22.
6. Fungsi region Vercel dipilih yang paling dekat dengan region Supabase production.
7. Build command: `pnpm --filter web build`. Install command: `pnpm install --frozen-lockfile`.

### 26.4 Urutan Rilis

`pnpm release` menjalankan urutan berikut dan berhenti jika satu langkah gagal:

1. `doctor` untuk memastikan prasyarat dan konfigurasi.
2. Pemeriksaan kualitas: lint, typecheck, unit test, pgTAP.
3. `supabase db push` untuk migrasi baru.
4. `supabase functions deploy` untuk seluruh Edge Functions.
5. `vercel deploy --prod` untuk aplikasi web.
6. Health check dan smoke test ringan.

Urutan ini memastikan skema baru tersedia sebelum fungsi dan web baru aktif.

### 26.5 Aturan Migrasi

1. Migrasi bersifat forward-only. Tidak ada file down migration.
2. Setiap migrasi berjalan dalam transaksi.
3. Perubahan dilakukan dengan pola expand-contract:
   - Tahap expand: menambah kolom, tabel, atau fungsi baru. Kode lama tetap berjalan.
   - Tahap migrasi kode: rilis menggunakan kolom atau fungsi baru.
   - Tahap contract: menghapus kolom atau fungsi lama pada rilis berikutnya, setelah kode lama sudah tidak dipakai.
4. Migrasi DILARANG menghapus kolom yang masih dipakai versi Edge Functions yang sedang berjalan.
5. Nama migrasi menggunakan timestamp dan deskripsi singkat.

### 26.6 Rollback

1. Web: menggunakan Instant Rollback Vercel ke deployment sebelumnya, atau menjalankan `pnpm release` dari commit sebelumnya.
2. Edge Functions: menjalankan `pnpm release` dari commit sebelumnya. Karena migrasi bersifat expand-contract, versi lama tetap kompatibel dengan skema terbaru.
3. Database: tidak ada rollback migrasi. Jika data perlu dipulihkan, digunakan PITR Supabase sesuai Bagian 24.4 dengan persetujuan Owner.
4. Setiap rilis dicatat dengan commit hash dan waktu rilis di `docs/ops/releases.md`.

### 26.7 Checklist Produksi

Seluruh butir WAJIB terpenuhi sebelum rilis pertama dan setiap rilis berikutnya yang menyentuh skema atau keamanan:

- [ ] `pnpm doctor` lulus.
- [ ] Seluruh pengujian di CI lulus.
- [ ] Migrasi diterapkan dan diuji di local.
- [ ] RLS aktif pada seluruh tabel.
- [ ] Tidak ada RPC yang dapat dieksekusi anon atau authenticated.
- [ ] Header keamanan terlihat di respons production.
- [ ] Health check production mengembalikan ok.
- [ ] Super Admin pertama berhasil login dan wajib mengganti password jika berasal dari reset.
- [ ] Backup dan PITR aktif.
- [ ] Uji restore PITR pertama selesai sebelum rilis pertama.
- [ ] Pengujian beban sesuai Bagian 24.2 lulus.

---

## 27. Pengujian dan Gerbang Kualitas

### 27.1 Lapisan Pengujian

| Lapisan | Alat | Cakupan |
|---|---|---|
| Unit UI | Vitest dan Testing Library | Komponen, format waktu dan durasi, status badge, logika status GPS di sisi tampilan |
| Unit Edge | Deno test | Hashing, validasi input, perbandingan constant-time, pemeriksaan sesi |
| Integration API | Deno test terhadap Supabase local | Setiap endpoint dengan setiap role |
| Database | pgTAP | RLS, grant RPC, invariant, audit append-only, constraint, perilaku RPC |
| E2E | Playwright | Alur end-to-end di Bagian 19 |
| Setup | Script test | Instalasi local dan idempotensi setup |

### 27.2 Skenario Wajib

| ID | Skenario | Lapisan |
|---|---|---|
| S-01 | Login berhasil, login gagal, cookie sesi dan atributnya, sesi kedaluwarsa dan idle timeout | API, E2E |
| S-02 | Super Admin membuat personel dan akun Komandan, mengubah data, validasi username unik, NRP tidak dapat diubah | API, E2E |
| S-03 | Membuat gate dan QR, token ditampilkan satu kali, hash tersimpan, keluar tercatat dengan status AKTIF | API, E2E |
| S-04 | Form Keluar tidak valid tidak membuka kamera, form valid membuka kamera, kegagalan kamera ditangani | E2E |
| S-05 | QR tidak valid menampilkan pesan dan tidak mengubah status, gate NONAKTIF ditolak | API, E2E |
| S-06 | Kembali tercatat, aktivitas SELESAI, durasi dihitung, lokasi GPS dihapus | API, E2E |
| S-07 | Dua request transaksi untuk Personel sama, request kedua ditolak TRANSACTION_IN_PROGRESS | Integration |
| S-08 | Kegagalan di tengah RPC membatalkan seluruh perubahan dan audit | Database |
| S-09 | Sesi berakhir saat scan menolak transaksi dan menghentikan kamera | E2E |
| S-10 | Koneksi terputus saat scan tidak menghasilkan transaksi dan tidak ada retry | E2E |
| S-11 | Keluar berhasil mengaktifkan tracking dan klien mengirim lokasi setiap 30 detik | E2E |
| S-12 | Status GPS AKTIF, OFFLINE, dan TIDAK AKTIF sesuai Bagian 11.4 termasuk batas 60 detik, pemulihan koneksi, dan izin dicabut | API, E2E |
| S-13 | Penghapusan personel menghapus akun Persit terverifikasi, sesi, dan riwayat secara atomik | Database, API |
| S-14 | Reset password menampilkan password sementara, wajib ganti sebelum akses halaman lain, sesi lain dicabut | API, E2E |
| S-15 | Lockout setelah lima kegagalan login dan terbuka kembali setelah 15 menit | API |
| S-16 | Riwayat dengan filter dan paginasi, laporan PDF dengan batas periode dan baris | API, E2E |
| S-17 | Komandan tidak dapat mengakses rute dan endpoint pengelolaan, Personel tidak dapat melihat data orang lain, Persit tidak dapat melihat GPS | API, E2E |
| S-18 | Audit tidak dapat diubah atau dihapus, RLS menolak akses anon dan authenticated | Database |
| S-19 | `pnpm setup -- --target local` pada environment kosong berhasil, dan dijalankan ulang tanpa perubahan | Setup |
| S-20 | `pnpm release` pada environment local menjalankan seluruh urutan dan health check | Setup |

### 27.3 Gerbang CI

Setiap pull request ke `main` WAJIB lulus seluruh gerbang berikut:

1. Lint dan format.
2. Typecheck seluruh workspace.
3. Unit test UI dan Edge.
4. Start Supabase local, terapkan migrasi, jalankan pgTAP.
5. Integration API.
6. E2E Playwright.
7. Build aplikasi web.
8. Pemeriksaan keamanan dependensi (audit lockfile) dengan kegagalan jika ada kerentanan tingkat tinggi atau kritis.

### 27.4 Definition of Done Per Fitur

Sebuah fitur dianggap selesai jika:

1. Kode, migrasi, dan tes sesuai kebutuhan di Bagian 23 tersedia.
2. Tes unit dan integration untuk fitur tersebut lulus di CI.
3. Audit dicatat jika fitur menyentuh data bisnis atau akses sensitif.
4. Tampilan mengikuti Bagian 21 untuk seluruh state: loading, empty, error, dan konfirmasi.
5. Tidak ada secret, log sensitif, atau akses langsung ke database dari browser.
6. Dokumentasi operasional di repository diperbarui jika perilaku deployment atau setup berubah.

---

## 28. Ringkasan Produk

GATEOPS adalah sistem pemantauan kehadiran dan pergerakan personel berbasis web. Personel melakukan transaksi keluar dan kembali melalui QR Code pada setiap gate. Status kehadiran ditentukan otomatis dari transaksi tersebut. Personel yang berada di luar dilacak lokasinya selama sesi aktif, sementara Super Admin dan Komandan memantau status, peta, riwayat, dan laporan PDF. Persit dapat memantau status kehadiran personel yang telah diverifikasi.

Sistem berjalan di Vercel dan Supabase, dapat dipasang dan dikonfigurasi melalui satu perintah otomatis, dan diuji secara otomatis sebelum setiap rilis. Seluruh keputusan dalam dokumen ini bersifat final.
