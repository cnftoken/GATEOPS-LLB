import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const workflow = readFileSync(".github/workflows/deploy-supabase.yml", "utf8");
const deploymentGuide = readFileSync("docs/ops/deployment.md", "utf8");
const ciWorkflow = readFileSync(".github/workflows/ci.yml", "utf8");
const packageJson = JSON.parse(readFileSync("package.json", "utf8")) as {
  devDependencies: { supabase: string };
};

test("FR-55/S-20: workflow is manual only", () => {
  assert.match(workflow, /^on:\n  workflow_dispatch:/m);
  assert.doesNotMatch(workflow, /^  (push|pull_request):/m);
});

test("FR-55/S-20: workflow uses required secrets only", () => {
  const secrets = [
    "SUPABASE_ACCESS_TOKEN",
    "SUPABASE_PROJECT_REF",
    "SUPABASE_DB_PASSWORD",
    "GATEOPS_INTERNAL_SECRET",
  ];
  for (const secret of secrets) {
    assert.ok(workflow.includes("secrets." + secret));
  }
  assert.doesNotMatch(workflow, /SUPABASE_SERVICE_ROLE_KEY/);
});

test("FR-55/S-20: database password is passed without an interactive prompt", () => {
  assert.ok(
    workflow.includes('supabase link --project-ref "$SUPABASE_PROJECT_REF"'),
  );
  assert.ok(workflow.includes('--password "$SUPABASE_DB_PASSWORD"'));
});

test("FR-55/S-20: migrations run before Edge Functions deployment", () => {
  const migration = workflow.indexOf("supabase db push");
  const functions = workflow.indexOf("supabase functions deploy");
  assert.ok(migration >= 0 && functions > migration);
});

test("FR-55/S-20: internal secret is set before Edge Functions deployment", () => {
  const secret = workflow.indexOf("supabase secrets set");
  const functions = workflow.indexOf("supabase functions deploy");
  assert.ok(secret >= 0 && functions > secret);
  assert.match(workflow, /supabase secrets set --yes --project-ref/);
});

test("FR-55/S-19: Vercel deployment does not require local CLI", () => {
  assert.match(deploymentGuide, /Root Directory.*apps\/web/);
  assert.match(deploymentGuide, /Build Command.*@gateops\/web build/);
  assert.match(deploymentGuide, /SUPABASE_FUNCTIONS_URL/);
  const standardGuide = deploymentGuide.split("## 6. Jalur CLI opsional")[0] ?? "";
  assert.doesNotMatch(standardGuide, /pnpm (setup|doctor|release) wajib/);
});

test("FR-55/S-20: CI and production pin Supabase CLI to the repository version", () => {
  for (const source of [workflow, ciWorkflow]) {
    assert.match(source, /uses: supabase\/setup-cli@v3/);
    assert.match(
      source,
      new RegExp(
        "version: " + packageJson.devDependencies.supabase.replaceAll(".", "\\."),
      ),
    );
    assert.doesNotMatch(source, /version: latest/);
  }
});

test("FR-55/S-20: production hosted mutations are explicitly non-interactive", () => {
  assert.match(
    workflow,
    /supabase db push --remote "\$SUPABASE_PROJECT_REF" --yes/,
  );
  assert.match(
    workflow,
    /supabase functions deploy --project-ref "\$SUPABASE_PROJECT_REF" --yes/,
  );
});
