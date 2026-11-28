import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { writeLocalFunctionsEnv } from "./local-functions-env";

test("FR-55/S-19: local setup writes the internal secret to Supabase Functions env", () => {
  const root = mkdtempSync(join(tmpdir(), "gateops-functions-env-"));
  const directory = join(root, "supabase", "functions");
  try {
    writeLocalFunctionsEnv("local_secret_123", directory);
    assert.equal(
      readFileSync(join(directory, ".env"), "utf8"),
      "GATEOPS_INTERNAL_SECRET=local_secret_123\n",
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("FR-55/S-19: preserve other function variables and replace the previous internal secret", () => {
  const root = mkdtempSync(join(tmpdir(), "gateops-functions-env-"));
  const directory = join(root, "supabase", "functions");
  mkdirSync(directory, { recursive: true });
  writeFileSync(
    join(directory, ".env"),
    "CUSTOM_FUNCTION_VALUE=keep-me\nGATEOPS_INTERNAL_SECRET=old_secret\n",
  );
  try {
    writeLocalFunctionsEnv("new_secret_456", directory);
    const content = readFileSync(join(directory, ".env"), "utf8");
    assert.match(content, /CUSTOM_FUNCTION_VALUE=keep-me/);
    assert.match(content, /GATEOPS_INTERNAL_SECRET=new_secret_456/);
    assert.doesNotMatch(content, /old_secret/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("FR-55/S-19: reject an empty or unsafe local function secret", () => {
  const root = mkdtempSync(join(tmpdir(), "gateops-functions-env-"));
  try {
    assert.throws(() => writeLocalFunctionsEnv("", root), /secret/i);
    assert.throws(() => writeLocalFunctionsEnv("bad\nINJECTED=value", root), /secret/i);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
