import assert from "node:assert/strict";
import {
  generateSessionToken,
  hashToken,
  SESSION_IDLE_MS,
  SESSION_TTL_MS,
  validateSession,
  type SessionRow,
} from "./sessions.ts";

Deno.test("sessions: token 32 byte base64url (43 karakter)", () => {
  const token = generateSessionToken();
  assert.equal(token.length, 43);
  assert.match(token, /^[A-Za-z0-9_-]+$/);
});

Deno.test("sessions: hashToken SHA-256 hex 64 karakter dan deterministik", async () => {
  const a = await hashToken("token");
  const b = await hashToken("token");
  assert.equal(a, b);
  assert.match(a, /^[0-9a-f]{64}$/);
});

const base = Date.parse("2026-11-27T10:00:00Z");
const fresh: SessionRow = {
  revoked_at: null,
  expires_at: new Date(base + SESSION_TTL_MS).toISOString(),
  last_seen_at: new Date(base).toISOString(),
};

Deno.test("sessions: valid -> ok", () => {
  assert.deepEqual(validateSession(fresh, "AKTIF", base), { ok: true });
});

Deno.test("sessions: null -> UNAUTHENTICATED", () => {
  assert.deepEqual(validateSession(null, "AKTIF", base), { ok: false, code: "UNAUTHENTICATED" });
});

Deno.test("sessions: revoked -> SESSION_EXPIRED", () => {
  const s = { ...fresh, revoked_at: new Date(base).toISOString() };
  assert.deepEqual(validateSession(s, "AKTIF", base), { ok: false, code: "SESSION_EXPIRED" });
});

Deno.test("sessions: kedaluwarsa -> SESSION_EXPIRED", () => {
  assert.deepEqual(validateSession(fresh, "AKTIF", base + SESSION_TTL_MS), {
    ok: false,
    code: "SESSION_EXPIRED",
  });
});

Deno.test("sessions: idle > 2 jam -> SESSION_EXPIRED", () => {
  assert.deepEqual(validateSession(fresh, "AKTIF", base + SESSION_IDLE_MS + 1), {
    ok: false,
    code: "SESSION_EXPIRED",
  });
});

Deno.test("sessions: idle tepat 2 jam masih ok", () => {
  assert.deepEqual(validateSession(fresh, "AKTIF", base + SESSION_IDLE_MS), { ok: true });
});

Deno.test("sessions: akun NONAKTIF -> ACCOUNT_INACTIVE", () => {
  assert.deepEqual(validateSession(fresh, "NONAKTIF", base), {
    ok: false,
    code: "ACCOUNT_INACTIVE",
  });
});
