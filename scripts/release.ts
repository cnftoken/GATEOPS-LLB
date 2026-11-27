// Rilis production (PRD 26.4). Guard target eksplisit (AGENTS 5/12.13).
import { functionsBase, log, run } from "./_lib";

function requireExplicitProduction(argv: string[]): void {
  const explicit = argv.includes("--target") && argv.includes("production");
  if (!explicit) {
    console.error(
      "Menolak rilis: gunakan `pnpm release -- --target production` secara eksplisit (AGENTS 5).",
    );
    process.exit(1);
  }
}

function main(): void {
  const argv = process.argv.slice(2);
  requireExplicitProduction(argv);
  log("Rilis production dimulai.");

  log("1/7 doctor");
  run("pnpm doctor");

  log("2/7 quality gates");
  run("pnpm lint");
  run("pnpm typecheck");
  run("pnpm test");
  run("pnpm test:db");

  log("3/7 supabase db push");
  run("supabase db push");

  log("4/7 supabase functions deploy");
  run("supabase functions deploy");

  log("5/7 vercel deploy --prod");
  run("vercel deploy --prod");

  log("6/7 health check");
  run(`curl -fsS "${functionsBase()}/health"`);

  log("7/7 selesai. Jalankan smoke test PRD 26.7.");
}

main();
