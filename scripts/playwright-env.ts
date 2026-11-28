import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

function parseEnvFile(content: string): Record<string, string> {
  const values: Record<string, string> = {};
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separator = trimmed.indexOf("=");
    if (separator < 1) continue;
    const key = trimmed.slice(0, separator).trim();
    const value = trimmed.slice(separator + 1);
    if (/^[A-Z0-9_]+$/.test(key)) values[key] = value;
  }
  return values;
}

export function loadPlaywrightEnv(
  repositoryRoot: string,
  processEnv: NodeJS.ProcessEnv = process.env,
): NodeJS.ProcessEnv {
  const path = join(repositoryRoot, ".env.local");
  const fileEnv = existsSync(path) ? parseEnvFile(readFileSync(path, "utf8")) : {};
  return { ...fileEnv, ...processEnv };
}
