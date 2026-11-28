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

Setup lokal membuat atau memperbarui `supabase/functions/.env` dengan `GATEOPS_INTERNAL_SECRET` lokal sebelum menjalankan `supabase start`. File tersebut adalah sumber secret yang dibaca Edge Functions pada stack lokal dan diabaikan Git. Setelah stack siap, wizard menulis URL dan anon key ke `.env.local`, menerapkan migrasi yang tertunda, menunggu endpoint health Edge Functions, lalu melakukan bootstrap Super Admin. Jangan menjalankan `supabase start` terpisah sebelum wizard karena secret harus tersedia saat stack pertama kali dimulai.

CI menggunakan perintah `pnpm run setup` (bukan `pnpm setup`, yang merupakan perintah bawaan pnpm). Wizard sendiri memulai Supabase sehingga job Integration API dan E2E tidak boleh memulai stack lebih dahulu.
