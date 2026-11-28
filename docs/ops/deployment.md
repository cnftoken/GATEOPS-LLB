# Deployment GATEOPS

Panduan ini adalah jalur deployment standar. Clone repository tidak mewajibkan instalasi CLI lokal atau menjalankan `pnpm setup`, `pnpm doctor`, maupun `pnpm release`.

## 1. Hubungkan repository ke Vercel

1. Buka Vercel dan pilih **Add New → Project**.
2. Import repository GitHub `cnftoken/GATEOPS-LLB`.
3. Atur **Root Directory** ke `apps/web`.
4. Gunakan Node.js 22.
5. Atur:
   - Install Command: `pnpm install --frozen-lockfile`
   - Build Command: `pnpm --filter @gateops/web build`
   - Production Branch: `main`
6. Tambahkan environment variables berikut pada **Production**:
   - `SUPABASE_FUNCTIONS_URL`: URL Functions project Supabase, berformat `https://<project-ref>.supabase.co/functions/v1`.
   - `SUPABASE_ANON_KEY`: publishable/anon key Supabase untuk header BFF.
   - `GATEOPS_INTERNAL_SECRET`: secret bersama BFF dan Edge Functions. Gunakan nilai yang sama dengan GitHub Actions dan Supabase.
7. Klik **Deploy**.

Jangan menambahkan `SUPABASE_SERVICE_ROLE_KEY` ke Vercel. Key tersebut hanya disediakan oleh Supabase di runtime Edge Functions.

Auto deployment dari push/merge ke `main` dapat diaktifkan atau dinonaktifkan pada pengaturan Git Vercel. Jika dinonaktifkan, deployment berikutnya dapat dimulai dari dashboard Vercel.

## 2. Siapkan deployment Supabase satu kali

Di GitHub repository, buka **Settings → Secrets and variables → Actions → New repository secret**. Tambahkan:

| Secret | Nilai |
|---|---|
| `SUPABASE_ACCESS_TOKEN` | Access token dari Supabase Account → Access Tokens |
| `SUPABASE_PROJECT_REF` | Project Reference Supabase |
| `SUPABASE_DB_PASSWORD` | Password database project Supabase |
| `GATEOPS_INTERNAL_SECRET` | Nilai yang sama dengan environment variable Vercel |

Secret ini hanya digunakan oleh workflow deployment. Jangan menaruh nilainya di file repository, commit, atau log.

## 3. Deploy database dan Edge Functions

1. Pastikan perubahan sudah berada pada branch `main` dan CI pada commit tersebut lulus.
2. Buka tab **Actions** di GitHub.
3. Pilih workflow **Deploy Supabase Production**.
4. Klik **Run workflow**, pilih branch `main`, lalu jalankan.
5. Workflow mengatur secret Edge Functions, menerapkan migrasi yang belum diterapkan, lalu men-deploy seluruh Edge Functions.
6. Pastikan workflow berstatus **Success**.

Workflow ini manual dan tidak berjalan otomatis saat push atau merge. Jalankan hanya jika perubahan menyentuh migrasi atau Edge Functions. Untuk perubahan web saja, langkah Supabase tidak diperlukan.

## 4. Deploy ulang web

Setelah workflow Supabase berhasil, deploy web melalui dashboard Vercel. Jika auto deployment Vercel aktif, perubahan pada `main` akan memicu deployment sesuai pengaturan project.

## 5. Aturan keamanan

- `SUPABASE_SERVICE_ROLE_KEY` tidak boleh disimpan di Vercel, GitHub Actions secrets, browser, repository, atau log. Supabase menyediakannya langsung di Edge Functions.
- `GATEOPS_INTERNAL_SECRET` harus sama pada Vercel dan Supabase.
- Jangan gunakan environment Preview Vercel yang terhubung ke database production.
- Jangan menjalankan `supabase db push`, `supabase functions deploy`, atau `vercel deploy --prod` secara ad-hoc. Gunakan workflow yang disediakan atau jalur CLI opsional `pnpm release`.
- Migrasi bersifat forward-only. Pemulihan data mengikuti prosedur PITR di `restore.md`.

## 6. Jalur CLI opsional

Developer yang membutuhkan bootstrap atau deployment terorkestrasi masih dapat menggunakan `pnpm setup`, `pnpm doctor`, dan `pnpm release` sesuai PRD Bagian 25–26. Perintah ini bukan prasyarat deployment standar.
