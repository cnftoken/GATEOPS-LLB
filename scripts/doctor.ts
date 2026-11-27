// Pemeriksaan prasyarat & konfigurasi (PRD 25.6). Non-mutatif.
import { execSync } from "node:child_process";
import { readEnvLocal } from "./_lib";

interface CheckResult {
  name: string;
  passed: boolean;
  detail: string;
  required: boolean;
}

function run(command: string): string {
  return execSync(command, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
}

function major(version: string): number {
  const match = version.match(/(\d+)\.(\d+)\.(\d+)/);
  return match ? Number(match[1]) : Number.NaN;
}

function checkNode(): CheckResult {
  const version = process.versions.node;
  return {
    name: "Node.js 22.x",
    passed: major(version) === 22,
    detail: `v${version}`,
    required: true,
  };
}

function checkPnpm(): CheckResult {
  try {
    const version = run("pnpm --version");
    return { name: "pnpm 9.x+", passed: major(version) >= 9, detail: version, required: true };
  } catch {
    return { name: "pnpm 9.x+", passed: false, detail: "not found", required: true };
  }
}

function checkGit(): CheckResult {
  try {
    run("git rev-parse --is-inside-work-tree");
    const status = run("git status --porcelain");
    return {
      name: "Git repository",
      passed: status.length === 0,
      detail: status ? "dirty (releases require clean tree)" : "clean",
      required: true,
    };
  } catch {
    return {
      name: "Git repository",
      passed: false,
      detail: "not a git repository",
      required: true,
    };
  }
}

function checkTool(command: string, label: string): CheckResult {
  try {
    const version = run(`${command} --version`);
    return {
      name: label,
      passed: true,
      detail: version.split("\n")[0] ?? "installed",
      required: true,
    };
  } catch {
    return { name: label, passed: false, detail: "not found", required: true };
  }
}

function checkLogin(command: string, label: string, required: boolean): CheckResult {
  try {
    run(command);
    return { name: label, passed: true, detail: "logged in", required };
  } catch {
    return { name: label, passed: false, detail: "not logged in", required };
  }
}

function checkDocker(): CheckResult {
  try {
    const info = run("docker info");
    return { name: "Docker (local)", passed: info.length > 0, detail: "running", required: false };
  } catch {
    return {
      name: "Docker (local)",
      passed: false,
      detail: "not running (only for local target)",
      required: false,
    };
  }
}

function checkHealth(required: boolean): CheckResult {
  const env = readEnvLocal();
  const url = process.env.SUPABASE_FUNCTIONS_URL ?? env.SUPABASE_FUNCTIONS_URL;
  if (!url)
    return {
      name: "Health check",
      passed: false,
      detail: "SUPABASE_FUNCTIONS_URL belum diset",
      required,
    };
  try {
    const res = execSync(`curl -fsS "${url.replace(/\/+$/, "")}/health"`, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    return { name: "Health check", passed: res.includes("ok"), detail: "ok", required };
  } catch {
    return {
      name: "Health check",
      passed: false,
      detail: "tidak dapat dihubungi",
      required,
    };
  }
}

function dbContainer(): string | null {
  try {
    return (
      run("docker ps --format {{.Names}}")
        .split("\n")
        .find((n) => n.startsWith("supabase_db_")) ?? null
    );
  } catch {
    return null;
  }
}

function checkRls(): CheckResult {
  const dbUrl = process.env.DATABASE_URL;
  const container = dbContainer();
  if (!dbUrl && !container)
    return {
      name: "RLS aktif",
      passed: false,
      detail: "DATABASE_URL atau Supabase local tidak tersedia",
      required: true,
    };
  try {
    const query = "select count(*) from pg_tables where schemaname='public' and rowsecurity=false";
    const out = dbUrl
      ? run(`psql "${dbUrl}" -tAc "${query}"`)
      : run(`docker exec -i ${container} psql -U postgres -d postgres -tAc "${query}"`);
    const bad = Number(out.trim());
    return {
      name: "RLS aktif",
      passed: bad === 0,
      detail: bad === 0 ? "semua tabel RLS aktif" : `${bad} tabel tanpa RLS`,
      required: true,
    };
  } catch {
    return { name: "RLS aktif", passed: false, detail: "psql tidak tersedia", required: true };
  }
}

function checkGrants(): CheckResult {
  const dbUrl = process.env.DATABASE_URL;
  const container = dbContainer();
  if (!dbUrl && !container)
    return {
      name: "Grant RPC",
      passed: false,
      detail: "DATABASE_URL atau Supabase local tidak tersedia",
      required: true,
    };
  try {
    const query =
      "select count(*) from information_schema.routine_grants where routine_name in (select proname from pg_proc where pronamespace='public'::regnamespace) and grantee in ('anon','authenticated')";
    const out = dbUrl
      ? run(`psql "${dbUrl}" -tAc "${query}"`)
      : run(`docker exec -i ${container} psql -U postgres -d postgres -tAc "${query}"`);
    const bad = Number(out.trim());
    return {
      name: "Grant RPC",
      passed: bad === 0,
      detail: bad === 0 ? "tidak ada grant anon/authenticated" : `${bad} grant berisiko`,
      required: true,
    };
  } catch {
    return { name: "Grant RPC", passed: false, detail: "psql tidak tersedia", required: true };
  }
}

function checkMigrations(required: boolean): CheckResult {
  try {
    const out = run("supabase migration list");
    const pending = /not applied/i.test(out);
    return {
      name: "Migrasi",
      passed: !pending,
      detail: pending ? "ada migrasi tertunda" : "tidak ada migrasi tertunda",
      required,
    };
  } catch {
    return { name: "Migrasi", passed: false, detail: "tidak dapat memeriksa", required };
  }
}

function checkFunctions(required: boolean): CheckResult {
  try {
    const out = run("supabase functions list");
    return {
      name: "Edge Functions",
      passed: out.length > 0,
      detail: out ? "terdeploy" : "kosong",
      required,
    };
  } catch {
    return { name: "Edge Functions", passed: false, detail: "tidak dapat memeriksa", required };
  }
}

function checkSecret(required: boolean): CheckResult {
  const local = readEnvLocal().GATEOPS_INTERNAL_SECRET;
  if (!local)
    return { name: "Secret", passed: false, detail: "GATEOPS_INTERNAL_SECRET belum ada", required };
  try {
    const out = run("supabase secrets list");
    if (!out.includes("GATEOPS_INTERNAL_SECRET"))
      return { name: "Secret", passed: false, detail: "belum ada di Supabase", required };
    return { name: "Secret", passed: true, detail: "tersedia", required };
  } catch {
    return { name: "Secret", passed: false, detail: "tidak dapat memeriksa", required };
  }
}

function main(): void {
  const argv = process.argv.slice(2);
  const local = argv.includes("--target") && argv.includes("local");
  const results: CheckResult[] = [
    checkNode(),
    checkPnpm(),
    checkGit(),
    checkTool("supabase", "Supabase CLI"),
    checkTool("vercel", "Vercel CLI"),
    checkLogin("supabase projects list", "Supabase login", !local),
    checkLogin("vercel whoami", "Vercel login", !local),
    checkDocker(),
    checkHealth(!local),
    checkRls(),
    checkGrants(),
    checkMigrations(!local),
    checkFunctions(!local),
    checkSecret(!local),
  ];

  for (const r of results) {
    const status = r.passed ? "PASS" : r.required ? "FAIL" : "WARN";
    console.log(`[${status}] ${r.name}: ${r.detail}`);
  }

  const failed = results.filter((r) => r.required && !r.passed);
  if (failed.length > 0) {
    console.error(`\n${failed.length} pemeriksaan wajib gagal.`);
    process.exit(1);
  }
  console.log("\nSemua pemeriksaan wajib lulus.");
}

main();
