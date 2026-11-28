import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const workflow = readFileSync(".github/workflows/deploy-supabase.yml", "utf8");
const deploymentGuide = readFileSync("docs/ops/deployment.md", "utf8");

test(
  "FR-55 S-20: Supabase production deployment is opt-in and manually dispatched",
  () => {
    assert.match(workflow, /^on:\n  workflow_dispatch:/m);
    assert.doesNotMatch(workflow, /^  (push|pull_request):/m);
  },
);

test(
  "FR-55 S-20: Supabase deployment uses repository secrets and never requests service role key",
  () => {
    for (const secret of [
      "SUPABASE_ACCESS_TOKEN",
      "SUPABASE_PROJECT_REF",
      "SUPABASE_DB_PASSWORD",
      "GATEOPS_INTERNAL_SECRET",
    ]) {
      assert.ok(workflow.includes("secrets." + secret), "missing secret " + secret);
    }
    assert.doesNotMatch(workflow, /SUPABASE_SERVICE_ROLE_KEY/);
  },
);

test(
  "FR-55 S-20: Supabase project linking receives the database password non-interactively",
  () => {
    assert.match(
      workflow,
      /supabase link --project-ref "\$SUPABASE_PROJECT_REF" --password "\$SUPABASE_DB_PASSWORD"/,
    );
  },
);

test(
  "FR-55 S-20: database migrations run before Edge Functions deployment",
  () => {
    const migration = workflow.indexOf("supabase db push");
    const functions = workflow.indexOf("supabase functions deploy");
    assert.ok(migration >= 0 && functions > migration);
  },
);

test(
  "FR-55 S-20: runtime internal secret is set before Edge Functions are deployed",
  () => {
    const secret = workflow.indexOf("supabase secrets set");
    const functions = workflow.indexOf("supabase functions deploy");
    assert.ok(secret >= 0 && functions > secret);
  },
);

test(
  "FR-55 S-19: Vercel deployment guide requires no local deployment CLI",
  () => {
    assert.match(deploymentGuide, /Root Directory.*apps\/web/);
    assert.match(deploymentGuide, /Build Command.*@gateops\/web build/);
    assert.match(deploymentGuide, /SUPABASE_FUNCTIONS_URL/);
    const standardGuide =
      deploymentGuide.split("## 6. Jalur CLI opsional")[0] ?? "";
    assert.doesNotMatch(standardGuide, /pnpm (setup|doctor|release) wajib/);
  },
);
