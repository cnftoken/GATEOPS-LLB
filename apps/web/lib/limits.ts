// Batas input yang harus sama dengan server (supabase/functions/_shared/validation.ts LIMITS).
export const SCAN_LIMITS = {
  tujuanMax: 150,
  keperluanMax: 255,
} as const;
