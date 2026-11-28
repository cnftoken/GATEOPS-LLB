import { execFileSync } from "node:child_process";

type SupabaseExecutor = (
  file: string,
  args: string[],
  options: { stdio: "inherit"; shell: false },
) => unknown;

type SupabaseOutputExecutor = (
  file: string,
  args: string[],
  options: { encoding: "utf8"; stdio: ["ignore", "pipe", "pipe"]; shell: false },
) => string;

export function parseSupabaseAnonKey(output: string): string {
  let parsed: unknown;
  try {
    parsed = JSON.parse(output);
  } catch {
    throw new Error("Output Supabase CLI tidak dalam format JSON.");
  }

  const entries = Array.isArray(parsed)
    ? parsed
    : typeof parsed === "object" && parsed !== null && "data" in parsed
      ? (parsed as { data: unknown }).data
      : [];

  if (!Array.isArray(entries)) {
    throw new Error("Format daftar API key Supabase tidak dikenali.");
  }

  const anon = entries.find(
    (entry): entry is { name: string; api_key: string } =>
      typeof entry === "object" &&
      entry !== null &&
      "name" in entry &&
      entry.name === "anon" &&
      "api_key" in entry &&
      typeof entry.api_key === "string" &&
      entry.api_key.length > 0,
  );

  if (!anon) {
    throw new Error("Supabase legacy anon key tidak ditemukan pada project.");
  }
  return anon.api_key;
}

export function getSupabaseAnonKey(
  projectRef: string,
  execute: SupabaseOutputExecutor = (file, args, options) =>
    execFileSync(file, args, options) as string,
): string {
  const ref = projectRef.trim();
  if (!ref) throw new Error("Supabase project ref wajib diisi.");
  try {
    const output = execute(
      "supabase",
      ["projects", "api-keys", "--project-ref", ref, "--output", "json"],
      { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], shell: false },
    );
    return parseSupabaseAnonKey(output);
  } catch (error) {
    if (error instanceof Error && /legacy anon key|format JSON|format daftar/.test(error.message)) {
      throw error;
    }
    throw new Error("Gagal mengambil legacy anon key dari Supabase CLI. Pastikan sudah login dan project dapat diakses.");
  }
}

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
