// Klien Supabase service_role. Hanya dipakai di Edge Functions (PRD 4.5.2).
import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";

export function serviceClient(): SupabaseClient {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) throw new Error("SUPABASE_ENV_MISSING");
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// Panggil RPC dan lempar ApiError dari pesan exception bila gagal.
export async function callRpc<T>(
  supabase: SupabaseClient,
  fn: string,
  args: Record<string, unknown>,
  fromRpcError: (message: string) => Error,
): Promise<T> {
  const { data, error } = await supabase.rpc(fn, args);
  if (error) throw fromRpcError(error.message);
  return data as T;
}
