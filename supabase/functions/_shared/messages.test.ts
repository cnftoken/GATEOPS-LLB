import assert from "node:assert/strict";
import { ERROR_MESSAGES, MESSAGES } from "./messages.ts";

// Pesan harus persis sama dengan PRD (AGENTS 10.3, 12.15).
Deno.test("messages: teks server persis PRD", () => {
  assert.equal(MESSAGES.USERNAME_ALREADY_USED, "Username sudah digunakan.");
  assert.equal(MESSAGES.LOGIN_INVALID, "Username atau password salah.");
  assert.equal(MESSAGES.LOGIN_LOCKED, "Terlalu banyak percobaan gagal. Coba lagi dalam 15 menit.");
  assert.equal(MESSAGES.LOGIN_INACTIVE, "Akun tidak aktif. Hubungi Super Admin.");
  assert.equal(MESSAGES.LOGIN_EMPTY, "Username dan password wajib diisi.");
  // Catatan: ejaan "silahkan" dipertahankan sesuai PRD 9.5.
  assert.equal(MESSAGES.INVALID_QR, "QR Gate tidak valid atau tidak dikenal. silahkan pindai lagi");
  assert.equal(MESSAGES.GATE_INACTIVE, "Gate sedang NONAKTIF. Transaksi tidak dapat diproses.");
  assert.equal(MESSAGES.FORM_INCOMPLETE, "Tujuan dan keperluan wajib diisi.");
  assert.equal(MESSAGES.NRP_NOT_REGISTERED, "NRP tidak terdaftar pada data personel.");
});

Deno.test("messages: peta kode galat konsisten", () => {
  assert.equal(ERROR_MESSAGES.INVALID_QR, MESSAGES.INVALID_QR);
  assert.equal(ERROR_MESSAGES.GATE_INACTIVE, MESSAGES.GATE_INACTIVE);
  assert.equal(ERROR_MESSAGES.FORM_INCOMPLETE, MESSAGES.FORM_INCOMPLETE);
});
