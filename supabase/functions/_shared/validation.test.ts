import assert from "node:assert/strict";
import {
  normalizeUsername,
  validateJabatan,
  validateKeperluan,
  validateNama,
  validateNrp,
  validatePangkat,
  validatePassword,
  validateTujuan,
  validateUsername,
} from "./validation.ts";

Deno.test("validation: username dinormalisasi lowercase & regex", () => {
  assert.equal(normalizeUsername("AbC"), "abc");
  assert.deepEqual(validateUsername("Budi.Sakti_1"), { ok: true, value: "budi.sakti_1" });
  assert.deepEqual(validateUsername("ab"), { ok: false });
  assert.deepEqual(validateUsername("1abc"), { ok: false });
});

Deno.test("validation: NRP 6-12 digit", () => {
  assert.deepEqual(validateNrp("123456"), { ok: true, value: "123456" });
  assert.deepEqual(validateNrp("12345"), { ok: false });
  assert.deepEqual(validateNrp("12345abc"), { ok: false });
});

Deno.test("validation: nama 3-100 setelah trim", () => {
  assert.deepEqual(validateNama("  Budi  "), { ok: true, value: "Budi" });
  assert.deepEqual(validateNama("ab"), { ok: false });
});

Deno.test("validation: tujuan 1-150, keperluan 1-255", () => {
  assert.deepEqual(validateTujuan("Jakarta"), { ok: true, value: "Jakarta" });
  assert.deepEqual(validateTujuan("   "), { ok: false });
  assert.deepEqual(validateKeperluan("Rapat"), { ok: true, value: "Rapat" });
});

Deno.test("validation: password tidak di-trim, 1-256", () => {
  assert.deepEqual(validatePassword("  x  "), { ok: true, value: "  x  " });
  assert.deepEqual(validatePassword(""), { ok: false });
});

Deno.test("validation: pangkat/jabatan 1-100", () => {
  assert.deepEqual(validatePangkat("Brigadir"), { ok: true, value: "Brigadir" });
  assert.deepEqual(validateJabatan("Anggota"), { ok: true, value: "Anggota" });
});
