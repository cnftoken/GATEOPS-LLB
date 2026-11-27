import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { SCAN_LIMITS } from "@/lib/limits";

const server = readFileSync(
  resolve(process.cwd(), "../../supabase/functions/_shared/validation.ts"),
  "utf8",
);

function maxOf(field: string): number {
  const match = server.match(
    new RegExp(`${field}:\\s*\\{\\s*min:\\s*\\d+,\\s*max:\\s*(\\d+)\\s*\\}`),
  );
  if (!match) throw new Error(`batas server ${field} tidak ditemukan`);
  return Number(match[1]);
}

describe("batas input UI vs server (AGENTS 8.6.3)", () => {
  it("tujuan sama dengan LIMITS server", () => {
    expect(SCAN_LIMITS.tujuanMax).toBe(maxOf("tujuan"));
  });

  it("keperluan sama dengan LIMITS server", () => {
    expect(SCAN_LIMITS.keperluanMax).toBe(maxOf("keperluan"));
  });
});
