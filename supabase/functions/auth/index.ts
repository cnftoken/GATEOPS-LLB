// Endpoint auth (PRD 7.3-7.9, 22.5).
import { handle, fromRpcError, type AuthedContext } from "../_shared/handler.ts";
import { success } from "../_shared/response.ts";
import { ApiError } from "../_shared/errors.ts";
import { asString, readJson } from "../_shared/http.ts";
import { normalizeUsername, validatePassword } from "../_shared/validation.ts";
import { hashPassword, verifyPassword } from "../_shared/password.ts";
import { generateSessionToken, hashToken, SESSION_TTL_MS } from "../_shared/sessions.ts";
import { callRpc, checkDb, serviceClient } from "../_shared/db.ts";
import { MESSAGES } from "../_shared/messages.ts";

// Hash dummy valid agar waktu respons seragam saat username tak ada (PRD 7.3.5).
const DUMMY_HASH =
  "pbkdf2_sha256$600000$AAAAAAAAAAAAAAAAAAAAAA==$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=";

const ALL_ROLES = ["SUPER_ADMIN", "KOMANDAN", "PERSONEL", "PERSIT"] as const;

function ctxOf(ctx: AuthedContext | null): AuthedContext {
  if (!ctx) throw new ApiError("UNAUTHENTICATED");
  return ctx;
}

async function login(req: Request): Promise<Response> {
  const body = await readJson(req);
  const username = asString(body.username);
  const password = asString(body.password);
  if (!username || !password) throw new ApiError("VALIDATION_FAILED", MESSAGES.LOGIN_EMPTY);

  const supabase = serviceClient();
  const now = Date.now();
  const { data: account, error: accountError } = await supabase
    .from("accounts")
    .select(
      "id, role, username, password_hash, status, failed_login_count, locked_until, must_change_password",
    )
    .eq("username", normalizeUsername(username))
    .maybeSingle();
  checkDb(accountError);

  if (account?.locked_until && Date.parse(account.locked_until) > now) {
    throw new ApiError("RATE_LIMITED", MESSAGES.LOGIN_LOCKED);
  }

  // PRD 7.4.3: masa kunci lewat -> reset penghitung sebelum percobaan berikutnya.
  if (account?.locked_until && Date.parse(account.locked_until) <= now) {
    const { error: unlockError } = await supabase
      .from("accounts")
      .update({ failed_login_count: 0, locked_until: null })
      .eq("id", account.id);
    checkDb(unlockError);
    account.failed_login_count = 0;
    account.locked_until = null;
  }

  const ok = await verifyPassword(password, account?.password_hash ?? DUMMY_HASH);

  if (!account || !ok) {
    if (account) {
      await callRpc(supabase, "register_failed_login", { p_account_id: account.id }, fromRpcError);
    }
    throw new ApiError("UNAUTHENTICATED", MESSAGES.LOGIN_INVALID);
  }

  if (account.status !== "AKTIF") throw new ApiError("ACCOUNT_INACTIVE", MESSAGES.LOGIN_INACTIVE);

  const { error: resetError } = await supabase
    .from("accounts")
    .update({ failed_login_count: 0, locked_until: null })
    .eq("id", account.id);
  checkDb(resetError);

  const token = generateSessionToken();
  const { error: sessionError } = await supabase.from("sessions").insert({
    account_id: account.id,
    token_hash: await hashToken(token),
    expires_at: new Date(now + SESSION_TTL_MS).toISOString(),
  });
  checkDb(sessionError);

  return success({ token, mustChangePassword: account.must_change_password });
}

async function logout(ctx: AuthedContext): Promise<Response> {
  const { error: logoutError } = await ctx.supabase
    .from("sessions")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", ctx.sessionId);
  checkDb(logoutError);
  return success({ ok: true });
}

function me(ctx: AuthedContext): Response {
  const a = ctx.account;
  return success({
    id: a.id,
    role: a.role,
    username: a.username,
    nama: a.nama,
    mustChangePassword: a.must_change_password,
  });
}

async function changePassword(ctx: AuthedContext, req: Request): Promise<Response> {
  const body = await readJson(req);
  const newPassword = asString(body.newPassword) ?? "";
  const oldPassword = asString(body.oldPassword) ?? "";
  const np = validatePassword(newPassword);
  if (!np.ok) throw new ApiError("VALIDATION_FAILED");

  if (!ctx.account.must_change_password) {
    const { data, error } = await ctx.supabase
      .from("accounts")
      .select("password_hash")
      .eq("id", ctx.account.id)
      .single();
    checkDb(error);
    const ok = await verifyPassword(oldPassword, (data as { password_hash: string }).password_hash);
    if (!ok || oldPassword === newPassword) throw new ApiError("VALIDATION_FAILED");
  }

  await callRpc(
    ctx.supabase,
    "change_own_password",
    {
      p_account_id: ctx.account.id,
      p_password_hash: await hashPassword(np.value),
      p_keep_session_id: ctx.sessionId,
    },
    fromRpcError,
  );
  return success({ ok: true });
}

Deno.serve((req) => {
  const action = new URL(req.url).pathname.split("/").pop();
  switch (action) {
    case "login":
      return handle(req, { endpoint: "auth/login", auth: false, run: () => login(req) });
    case "logout":
      return handle(req, {
        endpoint: "auth/logout",
        roles: [...ALL_ROLES],
        allowMustChange: true,
        run: (ctx) => logout(ctxOf(ctx)),
      });
    case "me":
      return handle(req, {
        endpoint: "auth/me",
        allowMustChange: true,
        run: (ctx) => Promise.resolve(me(ctxOf(ctx))),
      });
    case "password":
      return handle(req, {
        endpoint: "auth/password",
        allowMustChange: true,
        run: (ctx) => changePassword(ctxOf(ctx), req),
      });
    default:
      return handle(req, {
        endpoint: "auth",
        auth: false,
        run: () => {
          throw new ApiError("NOT_FOUND");
        },
      });
  }
});
