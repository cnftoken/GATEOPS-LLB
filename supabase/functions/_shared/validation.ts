// Konstanta validasi + normalisasi (PRD 6, 7; AGENTS 8.6).
// UI dan server memakai batas yang sama; tes memastikan kesamaan (To-dos 7.7).

export const LIMITS = {
  username: { min: 3, max: 32 },
  nrp: { min: 6, max: 12 },
  nama: { min: 3, max: 100 },
  pangkat: { min: 1, max: 100 },
  jabatan: { min: 1, max: 100 },
  tujuan: { min: 1, max: 150 },
  keperluan: { min: 1, max: 255 },
  password: { min: 1, max: 256 },
  gateName: { min: 3, max: 100 },
  gateLocation: { min: 1, max: 200 },
} as const;

export const USERNAME_RE = /^[a-z][a-z0-9._]{2,31}$/;
export const NRP_RE = /^[0-9]{6,12}$/;

export type ValidationResult = { ok: true; value: string } | { ok: false };

export function normalizeUsername(username: string): string {
  return username.toLowerCase();
}

function checkTrimmed(value: string, min: number, max: number): ValidationResult {
  const trimmed = value.trim();
  if (trimmed.length < min || trimmed.length > max) return { ok: false };
  return { ok: true, value: trimmed };
}

export function validateUsername(username: string): ValidationResult {
  const normalized = normalizeUsername(username);
  if (!USERNAME_RE.test(normalized)) return { ok: false };
  return { ok: true, value: normalized };
}

export function validateNrp(nrp: string): ValidationResult {
  const trimmed = nrp.trim();
  if (!NRP_RE.test(trimmed)) return { ok: false };
  return { ok: true, value: trimmed };
}

export const validateNama = (v: string): ValidationResult =>
  checkTrimmed(v, LIMITS.nama.min, LIMITS.nama.max);
export const validatePangkat = (v: string): ValidationResult =>
  checkTrimmed(v, LIMITS.pangkat.min, LIMITS.pangkat.max);
export const validateJabatan = (v: string): ValidationResult =>
  checkTrimmed(v, LIMITS.jabatan.min, LIMITS.jabatan.max);
export const validateTujuan = (v: string): ValidationResult =>
  checkTrimmed(v, LIMITS.tujuan.min, LIMITS.tujuan.max);
export const validateKeperluan = (v: string): ValidationResult =>
  checkTrimmed(v, LIMITS.keperluan.min, LIMITS.keperluan.max);
export const validateGateName = (v: string): ValidationResult =>
  checkTrimmed(v, LIMITS.gateName.min, LIMITS.gateName.max);
export const validateGateLocation = (v: string): ValidationResult =>
  checkTrimmed(v, LIMITS.gateLocation.min, LIMITS.gateLocation.max);

// Password tidak di-trim (PRD 7.2.2, AGENTS 8.6.2).
export function validatePassword(password: string): ValidationResult {
  if (password.length < LIMITS.password.min || password.length > LIMITS.password.max) {
    return { ok: false };
  }
  return { ok: true, value: password };
}
