// Wizard setup (PRD 25.2/25.3). Idempoten. Tidak mencetak secret.
import { closeSync, existsSync, mkdirSync, openSync, readFileSync, writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { execFileSync, spawn } from "node:child_process";
import { createInterface } from "node:readline/promises";
import {
  apiFetch,
  ensureInternalSecret,
  log,
  parseTarget,
  readEnvLocal,
  run,
  writeEnvLocal,
} from "./_lib";
import { runSupabaseLink } from "./setup-production";
import { waitForLocalFunctionsHealth } from "./local-functions";

function readLocalSetup(): Record<string, string> {
  const path = ".local/setup.json";
  if (!existsSync(path)) return {};
  return JSON.parse(readFileSync(path, "utf8")) as Record<string, string>;
}

function writeLocalSetup(values: Record<string, string>): void {
  mkdirSync(".local", { recursive: true });
  writeFileSync(".local/setup.json", JSON.stringify({ ...readLocalSetup(), ...values }, null, 2));
}

function randomPassword(len = 16): string {
  return randomBytes(len).toString("base64url").slice(0, len);
}

async function ask(question: string, secret = false): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    if (secret) process.stdout.write(question);
    return (await rl.question(secret ? "" : question)).trim();
  } finally {
    rl.close();
    if (secret) process.stdout.write("\n");
  }
}

async function bootstrapSuperAdmin(
  username: string,
  password: string,
  persist: boolean,
): Promise<void> {
  if (persist) writeLocalSetup({ saUsername: username, saPassword: password });
  const res = await apiFetch("accounts/bootstrap", "POST", {
    username,
    password,
    nama: "Super Admin",
  });
  if (res.status === 200 || res.status === 201) {
    const created = (res.json as { data?: { created?: boolean } }).data?.created;
    log(`Super Admin bootstrap: ${created === false ? "sudah ada (dilewati)" : "dibuat"}.`);
  } else {
    throw new Error(`bootstrap Super Admin gagal (status ${res.status}).`);
  }
}

function runWithInput(command: string, input: string): string {
  return execFileSync("bash", ["-lc", command], {
    encoding: "utf8",
    input,
    stdio: ["pipe", "pipe", "pipe"],
  }).trim();
}

async function setupLocal(): Promise<void> {
  ensureInternalSecret();
  log("Langkah: supabase start");
  run("supabase start");

  log("Langkah: membaca status Supabase lokal");
  const statusRaw = run("supabase status -o json");
  const status = JSON.parse(statusRaw) as { API_URL?: string; ANON_KEY?: string };
  const apiUrl = status.API_URL ?? "http://127.0.0.1:54321";
  const anonKey = status.ANON_KEY ?? "";
  writeEnvLocal({
    SUPABASE_FUNCTIONS_URL: `${apiUrl.replace(/\/+$/, "")}/functions/v1`,
    SUPABASE_ANON_KEY: anonKey,
  });

  let pending = true;
  try {
    pending = /not applied/i.test(run("supabase migration list"));
  } catch {
    pending = true;
  }
  if (pending) {
    log("Langkah: supabase db reset (migrasi tertunda)");
    run("supabase db reset");
  } else {
    log("Langkah: migrasi sudah sesuai (db reset dilewati)");
  }

  mkdirSync(".setup", { recursive: true });
  try {
    await waitForLocalFunctionsHealth(fetch, async () => {}, 1);
    log("Edge Functions lokal sudah berjalan.");
  } catch {
    const logFd = openSync(".setup/functions.log", "a");
    let child;
    try {
      child = spawn("supabase", ["functions", "serve", "--env-file", ".env.local"], {
        detached: true,
        stdio: ["ignore", logFd, logFd],
      });
    } finally {
      closeSync(logFd);
    }
    child.once("error", () => log("Gagal memulai proses Edge Functions lokal."));
    child.unref();
    log("Menunggu health Edge Functions lokal.");
    await waitForLocalFunctionsHealth();
  }

  const setup = readLocalSetup();
  const username = process.env.GATEOPS_SA_USERNAME ?? setup.saUsername ?? "superadmin";
  const password = process.env.GATEOPS_SA_PASSWORD ?? setup.saPassword ?? randomPassword();
  await bootstrapSuperAdmin(username, password, true);
  log("Setup lokal selesai. Jalankan `pnpm dev`.");
}

function requireExplicitProduction(argv: string[]): void {
  const explicit = argv.includes("--target") && argv.includes("production");
  if (!explicit) {
    console.error(
      "Menolak setup production: gunakan `pnpm setup -- --target production` secara eksplisit (AGENTS 5/12.13).",
    );
    process.exit(1);
  }
}

async function smokeTest(baseInput: string, username: string, password: string): Promise<void> {
  const base = baseInput.replace(/\/+$/, "");
  const health = await fetch(`${base}/api/v1/health`);
  if (!health.ok) throw new Error(`smoke health gagal: ${health.status}`);

  const login = await fetch(`${base}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: base },
    body: JSON.stringify({ username, password }),
  });
  if (!login.ok) throw new Error(`smoke login gagal: ${login.status}`);
  const setCookie = login.headers.get("set-cookie") ?? "";
  const cookie = setCookie.match(/gateops_session=[^;]+/)?.[0] ?? "";
  if (!cookie) throw new Error("smoke login tidak mengembalikan cookie sesi");

  const me = await fetch(`${base}/api/v1/auth/me`, { headers: { Cookie: cookie } });
  if (!me.ok) throw new Error(`smoke auth/me gagal: ${me.status}`);

  const logout = await fetch(`${base}/api/v1/auth/logout`, {
    method: "POST",
    headers: { Cookie: cookie, Origin: base },
  });
  if (!logout.ok) throw new Error(`smoke logout gagal: ${logout.status}`);
  log("Smoke test lulus: health, login, auth/me, logout.");
}

async function setupProduction(argv: string[]): Promise<void> {
  requireExplicitProduction(argv);
  const env = readEnvLocal();

  log("Langkah 1/14 preflight doctor");
  run("pnpm doctor", { allowFail: true });
  run("supabase login", { allowFail: true });
  run("vercel login", { allowFail: true });

  log("Langkah 2/14 input wizard");
  const ref = (await ask("Supabase project ref: ")).trim();
  const vercelProject = (await ask("Nama project Vercel: ")).trim();
  if (!ref) throw new Error("Supabase project ref wajib diisi.");
  if (!vercelProject) throw new Error("Nama project Vercel wajib diisi.");
  writeEnvLocal({ SUPABASE_PROJECT_REF: ref });
  const saUsername = await ask("Username Super Admin: ");
  const saPassword = await ask("Password Super Admin: ", true);
  const saRepeat = await ask("Ulangi password Super Admin: ", true);
  if (saPassword !== saRepeat) throw new Error("Password Super Admin tidak sama.");

  log("Langkah 3/14 secret internal");
  ensureInternalSecret();
  const secret = readEnvLocal().GATEOPS_INTERNAL_SECRET ?? "";

  log("Langkah 4/14 dependensi");
  run("pnpm install --frozen-lockfile");

  log("Langkah 5/14 supabase link");
  runSupabaseLink(ref);

  log("Langkah 6/14 migrasi");
  run("supabase db push");

  log("Langkah 7/14 ekstensi (migrasi pertama)");
  log("pgTAP dan pg_cron diaktifkan oleh migrasi 170000/170500.");

  log("Langkah 8/14 Edge Functions");
  run("supabase functions deploy");

  log("Langkah 9/14 secret Edge Functions");
  run(`supabase secrets set GATEOPS_INTERNAL_SECRET=${secret}`);

  log("Langkah 10/14 Super Admin");
  await bootstrapSuperAdmin(saUsername, saPassword, false);

  log("Langkah 11/14 Vercel link dan env production");
  run(`vercel link --project ${vercelProject}`);
  const anonKey = env.SUPABASE_ANON_KEY ?? "";
  const webUrl = `https://${vercelProject}.vercel.app`;
  for (const [name, value] of [
    ["SUPABASE_FUNCTIONS_URL", `https://${ref}.supabase.co/functions/v1`],
    ["SUPABASE_ANON_KEY", anonKey],
    ["GATEOPS_INTERNAL_SECRET", secret],
  ] as const) {
    run(`vercel env rm ${name} production`, { allowFail: true });
    runWithInput(`vercel env add ${name} production`, value);
  }

  log("Langkah 12/14 deploy awal");
  const deployed = run("vercel deploy --prod");
  const url = deployed.match(/https:\/\/[^\s]+\.vercel\.app/)?.[0] ?? webUrl;

  log("Langkah 13/14 smoke test");
  await smokeTest(url, saUsername, saPassword);

  log(`Langkah 14/14 ringkasan: ${url} — seluruh langkah lulus.`);
}

function main(): void {
  const argv = process.argv.slice(2);
  const target = parseTarget(argv);
  log(`GATEOPS setup target: ${target}`);
  const task = target === "local" ? setupLocal() : setupProduction(argv);
  task.catch((err: unknown) => {
    console.error(`Setup gagal: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  });
}

void main();
