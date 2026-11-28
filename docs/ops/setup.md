# Setup Production GATEOPS

Rujukan: PRD 25.3–25.5, FR-55, S-19, S-20.

## Menjalankan wizard

Jalankan dari root repository:

```bash
pnpm setup -- --target production
```

Wizard meminta project ref Supabase, nama project Vercel, dan kredensial awal Super Admin. Password database tidak diminta oleh wizard.

## Password database Supabase (opsional)

Pada langkah `supabase link --project-ref <ref>`, Supabase CLI menampilkan prompt:

```text
Enter your database password (or leave blank to skip):
```

- Tekan Enter tanpa mengisi password untuk melewati validasi koneksi database pada tahap link.
- Masukkan password hanya jika ingin CLI memvalidasi koneksi database. Supabase CLI menyimpan password tersebut melalui native credentials storage bila tersedia.
- GATEOPS tidak membaca, menyimpan, atau mencatat password yang dimasukkan pada prompt CLI.
- Jika prompt dilewati, operasi database berikutnya memakai autentikasi Supabase CLI yang telah login dan mekanisme temporary login role yang didukung CLI. Jika CLI tetap meminta kredensial, ikuti prompt CLI; jangan memasukkan password ke file repository atau log.

## Keamanan

- Jangan menambahkan password database ke `.env.local`, `.env.example`, repository, atau `.setup/last-run.log`.
- Jangan membagikan password database, access token, atau secret melalui chat.
- `SUPABASE_SERVICE_ROLE_KEY` tidak boleh ditambahkan ke environment Vercel.
- Setup production hanya boleh dijalankan dengan persetujuan Owner dan target eksplisit.
