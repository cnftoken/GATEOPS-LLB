import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const workflow = readFileSync(".github/workflows/deploy-supabase.yml", "utf8");

test("Supabase production deployment is opt-in and manually dispatched", () => {
  assert.match(workflow, /^on:\n  workflow_dispatch:/m);
  assert.doesNotMatch(workflow, /^  (push|pull_request):/m);
});

test("Supabase deployment uses repository secrets and never requests service role key", () => {
  for (const secret of [
    "SUPABASE_ACCESS_TOKEN",
    "SUPABASE_PROJECT_REF",
    "SUPABASE_DB_PASSWORD",
    "GATEOPS_INTERNAL_SECRET",
  ]) {
    assert.ok(workflow.includes("secrets." + secret), "missing secret " + secret);
  }
  assert.doesNotMatch(workflow, /SUPABASE_SERVICE_ROLE_KEY/);
});

test("database migrations run before Edge Functions deployment", () => {
  const migration = workflow.indexOf("supabase db push");
  const functions = workflow.indexOf("supabase functions deploy");
  assert.ok(migration >= 0 && functions > migration);
});

test("runtime internal secret is set before Edge Functions are deployed", () => {
  const secret = workflow.indexOf("supabase secrets set");
  const functions = workflow.indexOf("supabase functions deploy");
  assert.ok(secret >= 0 && functions > secret);
});
