import assert from "node:assert/strict";
import test from "node:test";
import { parseSupabaseAnonKey } from "./setup-production";

test("mengambil legacy anon key dari output JSON Supabase CLI", () => {
  const output = JSON.stringify([
    { name: "service_role", api_key: "must-not-be-used" },
    { name: "anon", api_key: "anon-jwt-key" },
  ]);

  assert.equal(parseSupabaseAnonKey(output), "anon-jwt-key");
});

test("menolak output CLI tanpa anon key", () => {
  const output = JSON.stringify([{ name: "publishable", api_key: "sb_publishable_x" }]);

  assert.throws(() => parseSupabaseAnonKey(output), /legacy anon key tidak ditemukan/i);
});

test("menolak output CLI yang bukan JSON valid", () => {
  assert.throws(() => parseSupabaseAnonKey("not-json"), /format JSON/i);
});
