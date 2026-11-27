// Verifikasi X-Internal-Secret dengan perbandingan constant-time (PRD 4.6.5, 7.1).
export function constantTimeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const ea = enc.encode(a);
  const eb = enc.encode(b);
  let diff = ea.length ^ eb.length;
  const len = Math.max(ea.length, eb.length);
  for (let i = 0; i < len; i++) {
    diff |= (ea[i] ?? 0) ^ (eb[i] ?? 0);
  }
  return diff === 0;
}

export function verifyInternalSecret(expected: string, provided: string | null): boolean {
  if (!expected || !provided) return false;
  return constantTimeEqual(expected, provided);
}
