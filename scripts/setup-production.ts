import { execFileSync } from "node:child_process";

type SupabaseExecutor = (
  file: string,
  args: string[],
  options: {
    encoding: "utf8";
    stdio: "inherit";
    shell: false;
  },
) => string;

export function createSupabaseLinkArgs(projectRef: string): string[] {
  const ref = projectRef.trim();
  if (!ref) throw new Error("Supabase project ref wajib diisi.");
  return ["link", "--project-ref", ref];
}

export function runSupabaseLink(
  projectRef: string,
  execute: SupabaseExecutor = (file, args, options) => execFileSync(file, args, options),
): string {
  const args = createSupabaseLinkArgs(projectRef);
  try {
    return execute("supabase", args, {
      encoding: "utf8",
      stdio: "inherit",
      shell: false,
    }).trim();
  } catch {
    throw new Error(
      "Gagal menghubungkan project Supabase. Periksa project ref, login CLI, dan kredensial database jika dimasukkan.",
    );
  }
}
