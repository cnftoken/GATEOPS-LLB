import assert from "node:assert/strict";
import { constantTimeEqual, verifyInternalSecret } from "./internal.ts";

Deno.test("internal: constant-time sama untuk nilai identik", () => {
  assert.equal(constantTimeEqual("abc", "abc"), true);
});

Deno.test("internal: constant-time beda untuk nilai berbeda", () => {
  assert.equal(constantTimeEqual("abc", "abd"), false);
  assert.equal(constantTimeEqual("abc", "abcd"), false);
});

Deno.test("internal: verifyInternalSecret menolak null/kosong", () => {
  assert.equal(verifyInternalSecret("secret", null), false);
  assert.equal(verifyInternalSecret("secret", ""), false);
  assert.equal(verifyInternalSecret("", "secret"), false);
});

Deno.test("internal: verifyInternalSecret cocok", () => {
  assert.equal(verifyInternalSecret("secret", "secret"), true);
  assert.equal(verifyInternalSecret("secret", "Secret"), false);
});
