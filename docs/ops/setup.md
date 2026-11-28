# Setup Production GATEOPS

Rujukan: PRD 25.3–25.5, FR-55, S-19, S-20.

## Password database Supabase

Wizard GATEOPS tidak meminta, membaca, menyimpan, atau meneruskan password database Supabase. Setelah wizard menjalankan:

```sh
supabase link --project-ref <project-ref>
```

Supabase CLI menampilkan prompt password database opsional.

- Jika pengguna memasukkan password, Supabase CLI dapat menyimpannya di native credentials storage yang tersedia pada sistem.
- Jika pengguna mengosongkan prompt, proses link tetap berjalan tanpa validasi password database.
- Perintah database berikutnya seperti migrasi dapat meminta kredensial ketika diperlukan.
- Wizard tidak memasukkan password ke argumen proses, environment variable, `.env.local`, repository, atau log.
- Jika native credentials storage tidak tersedia, jangan menganggap password tersimpan dengan aman; ikuti prompt CLI dan kebijakan keamanan sistem operasi.

Pengguna memilih sendiri apakah akan memasukkan password pada prompt CLI. Tidak ada pilihan default yang menyimpan password secara otomatis oleh wizard.

## Setup lokal

Perintah yang benar untuk menjalankan wizard adalah:

```sh
pnpm run setup -- --target local
```

Setup lokal menyiapkan Supabase, menulis konfigurasi lokal, menerapkan migrasi yang tertunda, lalu memastikan Edge Functions lokal merespons endpoint health sebelum bootstrap Super Admin. Jika fungsi belum berjalan, wizard menjalankan `supabase functions serve --env-file .env.local` sebagai proses latar belakang dan menunggu health check terbatas. Log proses tersedia di `.setup/functions.log`; folder `.setup/` tidak masuk Git.

CI menggunakan perintah `pnpm run setup` (bukan `pnpm setup`, yang merupakan perintah bawaan pnpm) dan tidak menjalankan server Edge Functions kedua setelah wizard selesai.
