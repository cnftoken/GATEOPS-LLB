// Uji beban kapasitas desain PRD 24.2. Hanya untuk target local (AGENTS 12/13).
import { execFileSync } from "node:child_process";
import { pbkdf2Sync } from "node:crypto";
import { readFileSync } from "node:fs";
import { parseTarget, readEnvLocal, functionsBase, log } from "./_lib";

const TARGET = parseTarget(process.argv.slice(2));
if (TARGET !== "local") {
  throw new Error("Uji beban hanya dijalankan pada target local.");
}

const DB_CONTAINER = "supabase_db_gateops";
const PASSWORD = "LoadPass123";
const SALT = Buffer.alloc(16, 7);
const HASH = `pbkdf2_sha256$600000$${SALT.toString("base64")}$${pbkdf2Sync(
  PASSWORD,
  SALT,
  600_000,
  32,
  "sha256",
).toString("base64")}`;

function sql(query: string): void {
  execFileSync(
    "docker",
    [
      "exec",
      "-i",
      DB_CONTAINER,
      "psql",
      "-U",
      "postgres",
      "-d",
      "postgres",
      "-v",
      "ON_ERROR_STOP=1",
      "-f",
      "-",
    ],
    {
      input: query,
      encoding: "utf8",
    },
  );
}

function seed(): void {
  sql(`
delete from public.accounts where username like 'loadp%';
delete from public.gates where name like 'LoadGate%';
insert into public.accounts (role, username, password_hash, nama, nrp, pangkat, jabatan)
select 'PERSONEL', 'loadp' || lpad(i::text, 4, '0'), $h$${HASH}$h$,
       'Load Personel ' || lpad(i::text, 4, '0'), lpad(i::text, 6, '0'), 'Brigadir', 'Anggota'
from generate_series(1, 2000) as i;
insert into public.gates (name, location, qr_token_hash)
select 'LoadGate ' || lpad(i::text, 3, '0'), 'Load',
       encode(sha256(('loadtoken' || i)::bytea), 'hex')
from generate_series(1, 100) as i;
insert into public.activities (personnel_account_id, exit_gate_id, exit_at, tujuan, keperluan, status)
select a.id, (select id from public.gates where name = 'LoadGate 001'),
       now() - interval '10 minutes', 'Tujuan', 'Keperluan', 'AKTIF'
from public.accounts a where a.username like 'loadp%'
order by a.username limit 500;
insert into public.gps_locations (personnel_account_id, latitude, longitude, permission_state)
select a.id, -6.2, 106.8, 'GRANTED'
from public.accounts a where a.username like 'loadp%'
order by a.username limit 500;
`);
}

function cleanup(): void {
  sql(`
delete from public.accounts where username like 'loadp%';
delete from public.gates where name like 'LoadGate%';
`);
}

const env = readEnvLocal();
const secret = process.env.GATEOPS_INTERNAL_SECRET ?? env.GATEOPS_INTERNAL_SECRET ?? "";
const anon = process.env.SUPABASE_ANON_KEY ?? env.SUPABASE_ANON_KEY ?? "";
const base = functionsBase();

async function call(
  path: string,
  method: "GET" | "POST",
  body?: unknown,
  token?: string,
): Promise<{ status: number; json: unknown }> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Internal-Secret": secret,
    Authorization: `Bearer ${anon}`,
  };
  if (token) headers["X-Session-Token"] = token;
  const res = await fetch(`${base}/${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  return { status: res.status, json: text ? JSON.parse(text) : {} };
}

async function login(username: string, password = PASSWORD): Promise<string> {
  const res = await call("auth/login", "POST", { username, password });
  if (res.status !== 200) throw new Error(`login ${username} gagal: ${res.status}`);
  const data = res.json as { data?: { token?: string } };
  const token = data.data?.token;
  if (!token) throw new Error(`login ${username} tanpa token`);
  return token;
}

function p95(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * 0.95) - 1)] ?? 0;
}

async function timed(
  label: string,
  total: number,
  fn: (index: number) => Promise<unknown>,
): Promise<number> {
  const durations: number[] = [];
  let index = 0;
  const failures: string[] = [];
  await Promise.all(
    Array.from({ length: total }, async () => {
      while (index < total) {
        const current = index++;
        const start = performance.now();
        try {
          await fn(current);
        } catch (err) {
          failures.push(`${label}#${current}: ${String(err)}`);
        }
        durations.push(performance.now() - start);
      }
    }),
  );
  if (failures.length > 0) throw new Error(`${label} gagal ${failures.length}: ${failures[0]}`);
  const value = p95(durations);
  log(`${label}: p95=${value.toFixed(0)}ms (n=${durations.length})`);
  return value;
}

async function timedRate(
  label: string,
  total: number,
  intervalMs: number,
  fn: (index: number) => Promise<unknown>,
): Promise<number> {
  const durations: number[] = [];
  for (let i = 0; i < total; i++) {
    const start = performance.now();
    await fn(i);
    durations.push(performance.now() - start);
    const wait = intervalMs - (performance.now() - start);
    if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
  }
  const value = p95(durations);
  log(
    `${label}: p95=${value.toFixed(0)}ms (n=${durations.length}, ${(1000 / intervalMs).toFixed(0)} rps)`,
  );
  return value;
}

async function main(): Promise<void> {
  const health = await call("health", "GET");
  if (health.status !== 200) throw new Error("functions serve tidak aktif (health bukan 200).");

  seed();
  try {
    const results: Record<string, number> = {};

    results.login = await timed("login", 150, async (i) => {
      await login(`loadp${String(i + 1).padStart(4, "0")}`);
    });

    const saPassword = (
      JSON.parse(readFileSync(".local/setup.json", "utf8")) as { saPassword: string }
    ).saPassword;
    const sa = await login("superadmin", saPassword);
    results.dashboard = await timed("dashboard", 150, () =>
      call("dashboard/komando", "GET", undefined, sa),
    );

    results.scan = await timed("scan", 150, async (i) => {
      const token = await login(`loadp${String(501 + i).padStart(4, "0")}`);
      await call(
        "transactions/scan",
        "POST",
        { token: "loadtoken1", tujuan: "Tujuan", keperluan: "Keperluan" },
        token,
      );
    });

    const gpsTokens = await Promise.all(
      Array.from({ length: 50 }, (_, i) => login(`loadp${String(i + 1).padStart(4, "0")}`)),
    );
    results.gps = await timedRate("gps", 85, 59, (i) =>
      call(
        "gps/report",
        "POST",
        { permissionState: "GRANTED", latitude: -6.2, longitude: 106.8 },
        gpsTokens[i % gpsTokens.length],
      ),
    );

    results.history = await timed("history", 150, () =>
      call("activities?page=1&pageSize=50", "GET", undefined, sa),
    );

    const targets: Record<string, number> = {
      login: 1500,
      dashboard: 1500,
      scan: 1500,
      gps: 500,
      history: 1500,
    };
    const failed = Object.entries(targets).filter(([key, target]) => (results[key] ?? 0) > target);
    log(`ringkasan: ${JSON.stringify(results)}`);
    if (failed.length > 0) {
      throw new Error(
        `target PRD 24.2 terlampaui: ${failed.map(([k, t]) => `${k}>${t}ms`).join(", ")}`,
      );
    }
    log("uji beban LULUS target PRD 24.2");
  } finally {
    cleanup();
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
