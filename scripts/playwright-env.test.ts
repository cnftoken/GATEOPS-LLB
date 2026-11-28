import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { loadPlaywrightEnv } from "./playwright-env";

test("FR-55/S-19: Playwright receives values written by local setup in root .env.local", () => {
  const root = mkdtempSync(join(tmpdir(), "gateops-playwright-env-"));
  try {
    writeFileSync(
      join(root, ".env.local"),
      "SUPABASE_FUNCTIONS_URL=http://127.0.0.1:54321/functions/v1\nSUPABASE_ANON_KEY=local-key\nGATEOPS_INTERNAL_SECRET=local-secret\n",
    );
    const env = loadPlaywrightEnv(root, {});
    assert.equal(env.SUPABASE_FUNCTIONS_URL, "http://127.0.0.1:54321/functions/v1");
    assert.equal(env.SUPABASE_ANON_KEY, "local-key");
    assert.equal(env.GATEOPS_INTERNAL_SECRET, "local-secret");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("FR-55/S-19: process environment takes precedence over root .env.local", () => {
  const root = mkdtempSync(join(tmpdir(), "gateops-playwright-env-"));
  try {
    writeFileSync(join(root, ".env.local"), "SUPABASE_ANON_KEY=file-key\n");
    const env = loadPlaywrightEnv(root, { SUPABASE_ANON_KEY: "process-key" });
    assert.equal(env.SUPABASE_ANON_KEY, "process-key");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("FR-55/S-19: missing root .env.local does not fail Playwright configuration", () => {
  const root = mkdtempSync(join(tmpdir(), "gateops-playwright-env-"));
  try {
    assert.deepEqual(loadPlaywrightEnv(root, { CI: "true" }), { CI: "true" });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("FR-55/S-19: omit undefined process environment values", () => {
  const root = mkdtempSync(join(tmpdir(), "gateops-playwright-env-"));
  try {
    const env = loadPlaywrightEnv(root, { CI: "true", OPTIONAL_VALUE: undefined });
    assert.deepEqual(env, { CI: "true" });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
