import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export function writeLocalFunctionsEnv(
  secret: string,
  directory = join("supabase", "functions"),
): void {
  if (!/^[A-Za-z0-9_-]{32,}$/.test(secret)) {
    throw new Error("Secret Edge Functions lokal tidak valid.");
  }

  mkdirSync(directory, { recursive: true });
  const path = join(directory, ".env");
  const existing = existsSync(path) ? readFileSync(path, "utf8") : "";
  const lines = existing
    .split(/\r?\n/)
    .filter((line) => line.length > 0 && !/^GATEOPS_INTERNAL_SECRET=/.test(line));
  lines.push(`GATEOPS_INTERNAL_SECRET=${secret}`);

  writeFileSync(path, `${lines.join("\n")}\n`, { mode: 0o600 });
  chmodSync(path, 0o600);
}
