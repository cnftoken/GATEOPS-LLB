-- GATEOPS: ekstensi pgTAP/pg_cron + pembersihan sesi kedaluwarsa.
-- Rujukan: PRD 7.5.7, 24.7, 26.2, 25.3. pgTAP untuk local/CI, pg_cron untuk production/local.

create extension if not exists pgtap;
create extension if not exists pg_cron;

-- Hapus sesi kedaluwarsa > 7 hari, harian (PRD 7.5.7).
do $$
begin
  if exists (select 1 from cron.job where jobname = 'gateops-cleanup-sessions') then
    perform cron.unschedule('gateops-cleanup-sessions');
  end if;
end;
$$;

select cron.schedule(
  'gateops-cleanup-sessions',
  '0 3 * * *',
  $job$ delete from public.sessions where expires_at < now() - interval '7 days' $job$
);