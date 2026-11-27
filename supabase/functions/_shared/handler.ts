// Orkestrasi request Edge Function (AGENTS 7.1): internal secret -> sesi ->
// must_change_password -> role -> run -> respons -> log. Otorisasi per request.
import { ApiError, fromRpcError, toApiError, type ErrorCode } from "./errors.ts";
import { verifyInternalSecret } from "./internal.ts";
import { createLogger } from "./logger.ts";
import { failure } from "./response.ts";
import { hashToken, validateSession } from "./sessions.ts";
import { checkDb, serviceClient } from "./db.ts";
import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import { roleAllowed, type Role } from "./roles.ts";

export { roleAllowed };
export type { Role };

export interface AccountRow {
  id: string;
  role: Role;
  username: string;
  nama: string;
  status: string;
  must_change_password: boolean;
}

interface SessionWithAccount {
  id: string;
  revoked_at: string | null;
  expires_at: string;
  last_seen_at: string;
  account: AccountRow | null;
}

export interface AuthedContext {
  requestId: string;
  sessionId: string;
  account: AccountRow;
  supabase: SupabaseClient;
}

export interface HandleOptions {
  endpoint: string;
  auth?: boolean; // default true
  roles?: Role[];
  allowMustChange?: boolean;
  public?: boolean;
  run: (ctx: AuthedContext | null, req: Request) => Promise<Response>;
}

export { fromRpcError };

export function requireCtx(ctx: AuthedContext | null): AuthedContext {
  if (!ctx) throw new ApiError("UNAUTHENTICATED");
  return ctx;
}

async function authenticate(req: Request): Promise<AuthedContext> {
  const token = req.headers.get("x-session-token");
  if (!token) throw new ApiError("UNAUTHENTICATED");
  const hash = await hashToken(token);
  const supabase = serviceClient();
  const { data, error } = await supabase
    .from("sessions")
    .select(
      "id, revoked_at, expires_at, last_seen_at, account:accounts(id, role, username, nama, status, must_change_password)",
    )
    .eq("token_hash", hash)
    .maybeSingle();
  checkDb(error);
  const row = data as unknown as SessionWithAccount | null;
  const account = row?.account ?? null;
  const result = validateSession(row, account?.status ?? "", Date.now());
  if (!result.ok) throw new ApiError(result.code as ErrorCode);
  if (row && Date.now() - Date.parse(row.last_seen_at) > 60_000) {
    await supabase
      .from("sessions")
      .update({ last_seen_at: new Date().toISOString() })
      .eq("id", row.id);
  }
  return {
    requestId: "",
    sessionId: (row as SessionWithAccount).id,
    account: account as AccountRow,
    supabase,
  };
}

export async function handle(req: Request, opts: HandleOptions): Promise<Response> {
  const requestId = crypto.randomUUID();
  const logger = createLogger(requestId);
  const start = performance.now();
  try {
    if (!opts.public) {
      const expected = Deno.env.get("GATEOPS_INTERNAL_SECRET") ?? "";
      if (!verifyInternalSecret(expected, req.headers.get("x-internal-secret"))) {
        throw new ApiError("UNAUTHENTICATED");
      }
    }

    let ctx: AuthedContext | null = null;
    if (opts.auth !== false) {
      ctx = await authenticate(req);
      ctx.requestId = requestId;
      if (opts.roles && !roleAllowed(opts.roles, ctx.account.role)) {
        throw new ApiError("FORBIDDEN");
      }
      if (ctx.account.must_change_password && !opts.allowMustChange) {
        throw new ApiError("MUST_CHANGE_PASSWORD");
      }
    }

    const res = await opts.run(ctx, req);
    logger.info("ok", {
      endpoint: opts.endpoint,
      role: ctx?.account.role,
      durationMs: Math.round(performance.now() - start),
    });
    return res;
  } catch (error) {
    const apiError = toApiError(error);
    logger.error("error", {
      endpoint: opts.endpoint,
      code: apiError.code,
      durationMs: Math.round(performance.now() - start),
    });
    return failure(apiError, requestId);
  }
}
