// Sesi: token 32 byte base64url, hash SHA-256, validasi revoked/expires/idle/status.
// Rujukan: PRD 7.5, FR-07.

export const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12 jam (PRD 7.5.3)
export const SESSION_IDLE_MS = 2 * 60 * 60 * 1000; // idle 2 jam (PRD 7.5.4)

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function generateSessionToken(): string {
  return bytesToBase64Url(crypto.getRandomValues(new Uint8Array(32)));
}

export async function hashToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export interface SessionRow {
  revoked_at: string | null;
  expires_at: string;
  last_seen_at: string;
}

export type SessionErrorCode = "UNAUTHENTICATED" | "SESSION_EXPIRED" | "ACCOUNT_INACTIVE";
export type SessionResult = { ok: true } | { ok: false; code: SessionErrorCode };

// Validasi sesi + status akun (PRD 7.5.6). now = waktu server.
export function validateSession(
  session: SessionRow | null,
  accountStatus: string,
  now: number,
): SessionResult {
  if (!session) return { ok: false, code: "UNAUTHENTICATED" };
  if (session.revoked_at !== null) return { ok: false, code: "SESSION_EXPIRED" };
  if (now >= Date.parse(session.expires_at)) return { ok: false, code: "SESSION_EXPIRED" };
  if (now - Date.parse(session.last_seen_at) > SESSION_IDLE_MS) {
    return { ok: false, code: "SESSION_EXPIRED" };
  }
  if (accountStatus !== "AKTIF") return { ok: false, code: "ACCOUNT_INACTIVE" };
  return { ok: true };
}
