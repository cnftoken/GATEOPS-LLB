import { execFileSync } from "node:child_process";

type SupabaseExecutor = (
  file: string,
  args: string[],
  options: {
    encoding: "utf8";
    stdio: ["ignore", "pipe", "pipe"];
    shell: false;
  },
) => string;

export function createSupabaseLinkArgs(projectRef: string, databasePassword: string): string[] {
  const ref = projectRef.trim();
  if (!ref) throw new Error("Supabase project ref wajib diisi.");
  if (!databasePassword.trim()) throw new Error("Password database Supabase wajib diisi.");

  return ["link", "--project-ref", ref, "--password", databasePassword];
}

export function runSupabaseLink(
  projectRef: string,
  databasePassword: string,
  execute: SupabaseExecutor = (file, args, options) => execFileSync(file, args, options),
): string {
  const args = createSupabaseLinkArgs(projectRef, databasePassword);
  try {
    return execute("supabase", args, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      shell: false,
    }).trim();
  } catch {
    throw new Error(
      "Gagal menghubungkan project Supabase. Periksa project ref dan password database.",
    );
  }
}
