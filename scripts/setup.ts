// Wizard setup (PRD 25.2/25.3). Idempoten. Tidak mencetak secret.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import {
  apiFetch,
  ensureInternalSecret,
  log,
  parseTarget,
  readEnvLocal,
  run,
  writeEnvLocal,
} from "./_lib";

function readLocalSetup(): Record<string, string> {
  const path = ".local/setup.json";
  if (!existsSync(path)) return {};
  return JSON.parse(readFileSync(path, "utf8")) as Record<string, string>;
}

function writeLocalSetup(values: Record<string, string>): void {
  mkdirSync(".local", { recursive: true });
  writeFileSync(".local/setup.json", JSON.stringify({ ...readLocalSetup(), ...values }, null, 2));
}

async function bootstrapSuperAdmin(): Promise<void> {
  const setup = readLocalSetup();
  let username = process.env.GATEOPS_SA_USERNAME ?? setup.saUsername;
  let password = process.env.GATEOPS_SA_PASSWORD ?? setup.saPassword;
  if (!username || !password) {
    username = username ?? "superadmin";
    password = password ?? randomPassword();
    writeLocalSetup({ saUsername: username, saPassword: password });
    log(
      `Super Admin lokal dibuat: username ${username} (password tersimpan di .local/setup.json).`,
    );
  }
  const res = await apiFetch("accounts/bootstrap", "POST", {
    username,
    password,
    nama: "Super Admin",
  });
  if (res.status === 200 || res.status === 201) {
    const created = (res.json as { data?: { created?: boolean } }).data?.created;
    log(`Super Admin bootstrap: ${created === false ? "sudah ada (dilewati)" : "dibuat"}.`);
  } else {
    log(`Super Admin bootstrap gagal (status ${res.status}).`);
  }
}

function randomPassword(len = 16): string {
  return Array.from(
    { length: len },
    () =>
      "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789"[Math.floor(Math.random() * 54)],
  ).join("");
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

  log("Langkah: supabase db reset (migrasi + seed kosong)");
  run("supabase db reset");

  await bootstrapSuperAdmin();
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

async function setupProduction(argv: string[]): Promise<void> {
  requireExplicitProduction(argv);
  const env = readEnvLocal();
  const ref = process.env.SUPABASE_PROJECT_REF ?? env.SUPABASE_PROJECT_REF;
  if (!ref) throw new Error("SUPABASE_PROJECT_REF belum diset.");

  ensureInternalSecret();
  const secret = readEnvLocal().GATEOPS_INTERNAL_SECRET ?? "";

  log("Langkah: pnpm install --frozen-lockfile");
  run("pnpm install --frozen-lockfile");

  log("Langkah: supabase link");
  run(`supabase link --project-ref ${ref}`, { allowFail: true });

  log("Langkah: supabase db push");
  run("supabase db push");

  log("Langkah: supabase functions deploy");
  run("supabase functions deploy");

  log("Langkah: supabase secrets set GATEOPS_INTERNAL_SECRET");
  run(`supabase secrets set GATEOPS_INTERNAL_SECRET=${secret}`, { allowFail: true });

  await bootstrapSuperAdmin();

  log("Langkah: vercel deploy --prod");
  run("vercel deploy --prod", { allowFail: true });

  log("Setup production selesai. Jalankan smoke test (PRD 25.3.13).");
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

main();
