// Cek idempotensi setup (PRD 25.5, To-dos 7.6). Non-destruktif terhadap .env.local.
import assert from "node:assert/strict";
import { ensureInternalSecret, parseTarget } from "./_lib";

assert.equal(parseTarget(["--target", "local"]), "local");
assert.equal(parseTarget(["--target", "production"]), "production");

const a = ensureInternalSecret();
const b = ensureInternalSecret();
assert.ok(a.length >= 32, "secret minimal 32 karakter");
assert.equal(a, b, "ensureInternalSecret idempoten");

console.log("PASS: parseTarget & ensureInternalSecret idempoten");
