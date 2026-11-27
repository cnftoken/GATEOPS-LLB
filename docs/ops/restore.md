# Restore Prosedur (PITR)

Rujukan: PRD 24.4, 26.6.

## Prasyarat

- Production menggunakan paket Supabase dengan backup harian otomatis dan Point-in-Time Recovery (PITR) minimal 7 hari (PRD 24.4.2).
- Restore hanya dilakukan dengan persetujuan Owner (PRD 26.6.3).

## Langkah Restore

1. Owner memutuskan kebutuhan restore dan menyetujui tindakan.
2. Buka dashboard Supabase project production.
3. Pilih titik waktu pemulihan (Point-in-Time) yang akan dipulihkan.
4. Jalankan PITR sesuai fitur Supabase.
5. Setelah pemulihan, jalankan `pnpm doctor` untuk memverifikasi koneksi, migrasi, RLS, dan grant RPC.
6. Verifikasi health check `GET /api/v1/health` mengembalikan `{ "status": "ok" }`.
7. Catat kejadian dan waktu pemulihan di `docs/ops/releases.md`.

## Catatan

- Tidak ada rollback migrasi. Migrasi bersifat forward-only dan expand-contract (PRD 26.5).
- Prosedur ini WAJIB diuji minimal sekali sebelum rilis pertama (PRD 24.4.3).