// Helper bersama skrip (setup/doctor/release/seed). Tidak pernah mencetak secret.
import { execSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { join } from "node:path";

export type Target = "local" | "production";

export function parseTarget(argv: string[]): Target {
  const index = argv.indexOf("--target");
  const value = index >= 0 ? argv[index + 1] : undefined;
  if (value === "local") return "local";
  if (value === "production") return "production";
  if (value === undefined) return "production";
  throw new Error(`Target tidak dikenal: ${value}. Gunakan "local" atau "production".`);
}

export function run(command: string, opts: { cwd?: string; allowFail?: boolean } = {}): string {
  try {
    return execSync(command, {
      encoding: "utf8",
      cwd: opts.cwd,
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
  } catch (err) {
    if (opts.allowFail) return "";
    const e = err as { stderr?: string; stdout?: string };
    throw new Error(`Perintah gagal: ${command}\n${e.stderr ?? e.stdout ?? ""}`);
  }
}

const LOG_DIR = ".setup";
const LOG_FILE = join(LOG_DIR, "last-run.log");

export function log(message: string): void {
  mkdirSync(LOG_DIR, { recursive: true });
  const line = `[${new Date().toISOString()}] ${message}\n`;
  writeFileSync(LOG_FILE, line, { flag: "a" });
  console.log(message);
}

export function readEnvLocal(): Record<string, string> {
  const path = ".env.local";
  if (!existsSync(path)) return {};
  const out: Record<string, string> = {};
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && m[1] && m[2] !== undefined) out[m[1]] = m[2];
  }
  return out;
}

export function writeEnvLocal(values: Record<string, string>): void {
  const existing = readEnvLocal();
  const merged = { ...existing, ...values };
  const body = Object.entries(merged)
    .map(([k, v]) => `${k}=${v}`)
    .join("\n");
  writeFileSync(".env.local", `${body}\n`);
}

export function ensureInternalSecret(): string {
  const env = readEnvLocal();
  if (env.GATEOPS_INTERNAL_SECRET) return env.GATEOPS_INTERNAL_SECRET;
  const secret = randomBytes(32).toString("base64url");
  writeEnvLocal({ GATEOPS_INTERNAL_SECRET: secret });
  return secret;
}

export function functionsBase(): string {
  const env = readEnvLocal();
  const url = process.env.SUPABASE_FUNCTIONS_URL ?? env.SUPABASE_FUNCTIONS_URL;
  if (!url) throw new Error("SUPABASE_FUNCTIONS_URL belum diset (.env.local).");
  return url.replace(/\/+$/, "");
}

export async function apiFetch(
  path: string,
  method: "GET" | "POST" | "PATCH" | "DELETE",
  body?: unknown,
  sessionToken?: string,
): Promise<{ status: number; json: unknown }> {
  const env = readEnvLocal();
  const secret = process.env.GATEOPS_INTERNAL_SECRET ?? env.GATEOPS_INTERNAL_SECRET ?? "";
  const anon = process.env.SUPABASE_ANON_KEY ?? env.SUPABASE_ANON_KEY ?? "";
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Internal-Secret": secret,
    Authorization: `Bearer ${anon}`,
  };
  if (sessionToken) headers["X-Session-Token"] = sessionToken;
  const res = await fetch(`${functionsBase()}/${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  return { status: res.status, json: text ? JSON.parse(text) : {} };
}
