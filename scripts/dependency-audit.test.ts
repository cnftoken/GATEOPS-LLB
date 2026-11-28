import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";

interface AuditAdvisory {
  severity: string;
  module_name: string;
  title: string;
}

interface AuditReport {
  advisories?: Record<string, AuditAdvisory>;
}

test("PRD 27.3 dependency audit has no high or critical vulnerabilities", () => {
  const result = spawnSync("pnpm", ["audit", "--audit-level", "high", "--json"], {
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
  });

  assert.equal(result.error, undefined);
  assert.equal(result.signal, null);

  const report = JSON.parse(result.stdout) as AuditReport;
  const blocking = Object.values(report.advisories ?? {}).filter(
    (advisory) => advisory.severity === "high" || advisory.severity === "critical",
  );

  assert.deepEqual(
    blocking.map((advisory) => `${advisory.severity}:${advisory.module_name}:${advisory.title}`),
    [],
    "PRD 27.3 requires the lockfile audit to fail on high or critical vulnerabilities",
  );
});
