import { execFileSync } from "node:child_process";

type SupabaseExecutor = (
  file: string,
  args: string[],
  options: { stdio: "inherit"; shell: false },
) => unknown;

export function createSupabaseLinkInvocation(projectRef: string): {
  file: "supabase";
  args: string[];
  options: { stdio: "inherit"; shell: false };
} {
  const ref = projectRef.trim();
  if (!ref) throw new Error("Supabase project ref wajib diisi.");
  return {
    file: "supabase",
    args: ["link", "--project-ref", ref],
    options: { stdio: "inherit", shell: false },
  };
}

export function runSupabaseLink(
  projectRef: string,
  execute: SupabaseExecutor = (file, args, options) => execFileSync(file, args, options),
): void {
  const invocation = createSupabaseLinkInvocation(projectRef);
  try {
    execute(invocation.file, invocation.args, invocation.options);
  } catch {
    throw new Error(
      "Gagal menghubungkan project Supabase. Periksa project ref dan selesaikan prompt CLI jika diminta.",
    );
  }
}
