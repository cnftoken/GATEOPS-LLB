import assert from "node:assert/strict";
import { generateTempPassword, hashPassword, verifyPassword } from "./password.ts";

Deno.test("password: format PBKDF2 tersimpan sesuai PRD 7.2.4", async () => {
  const stored = await hashPassword("rahasia");
  const parts = stored.split("$");
  assert.equal(parts.length, 4);
  assert.equal(parts[0], "pbkdf2_sha256");
  assert.equal(parts[1], "600000");
});

Deno.test("password: verifikasi benar dan salah", async () => {
  const stored = await hashPassword("rahasia");
  assert.equal(await verifyPassword("rahasia", stored), true);
  assert.equal(await verifyPassword("salah", stored), false);
});

Deno.test("password: format tidak dikenal ditolak", async () => {
  assert.equal(await verifyPassword("x", "bukan-format"), false);
});

Deno.test("password: sementara 12 karakter dari A-Za-z0-9", () => {
  const temp = generateTempPassword();
  assert.equal(temp.length, 12);
  assert.match(temp, /^[A-Za-z0-9]{12}$/);
});
