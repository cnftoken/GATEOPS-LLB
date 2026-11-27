// Endpoint persit (PRD 15, 22.5).
import { handle, fromRpcError, requireCtx } from "../_shared/handler.ts";
import { paginated, success } from "../_shared/response.ts";
import { ApiError } from "../_shared/errors.ts";
import { asString, parsePagination, readJson, segments } from "../_shared/http.ts";
import {
  validateNama,
  validateNrp,
  validatePassword,
  validateUsername,
} from "../_shared/validation.ts";
import { hashPassword } from "../_shared/password.ts";
import { callRpc } from "../_shared/db.ts";

async function register(req: Request): Promise<Response> {
  const body = await readJson(req);
  const nrp = validateNrp(asString(body.nrp) ?? "");
  const nama = validateNama(asString(body.nama) ?? "");
  const username = validateUsername(asString(body.username) ?? "");
  const password = validatePassword(asString(body.password) ?? "");
  if (!nrp.ok || !nama.ok || !username.ok || !password.ok) throw new ApiError("VALIDATION_FAILED");
  const supabase = (await import("../_shared/db.ts")).serviceClient();
  const id = await callRpc<string>(
    supabase,
    "register_persit",
    {
      p_nrp: nrp.value,
      p_nama: nama.value,
      p_username: username.value,
      p_password_hash: await hashPassword(password.value),
    },
    fromRpcError,
  );
  return success({ id });
}

async function requests(
  req: Request,
  ctx: NonNullable<ReturnType<typeof requireCtx>>,
): Promise<Response> {
  const { page, pageSize } = parsePagination(req.url);
  const status = new URL(req.url).searchParams.get("status") ?? "MENUNGGU";
  const from = (page - 1) * pageSize;
  const { data, count } = await ctx.supabase
    .from("persit_links")
    .select(
      "persit_account_id, requested_nrp, status, created_at, persit:accounts!persit_links_persit_account_id_fkey(nama, username)",
      { count: "exact" },
    )
    .eq("status", status)
    .order("created_at", { ascending: true })
    .range(from, from + pageSize - 1);
  return paginated({ data: data ?? [], page, pageSize, total: count ?? 0 });
}

async function approve(
  ctx: NonNullable<ReturnType<typeof requireCtx>>,
  id: string,
): Promise<Response> {
  await callRpc(
    ctx.supabase,
    "approve_persit",
    { p_actor_account_id: ctx.account.id, p_persit_account_id: id },
    fromRpcError,
  );
  return success({ ok: true });
}

async function reject(
  ctx: NonNullable<ReturnType<typeof requireCtx>>,
  id: string,
): Promise<Response> {
  await callRpc(
    ctx.supabase,
    "reject_persit",
    { p_actor_account_id: ctx.account.id, p_persit_account_id: id },
    fromRpcError,
  );
  return success({ ok: true });
}

async function remove(
  ctx: NonNullable<ReturnType<typeof requireCtx>>,
  id: string,
): Promise<Response> {
  await callRpc(
    ctx.supabase,
    "delete_persit_account",
    { p_actor_account_id: ctx.account.id, p_persit_account_id: id },
    fromRpcError,
  );
  return success({ ok: true });
}

Deno.serve((req) => {
  const seg = segments(new URL(req.url).pathname);
  const method = req.method;
  if (method === "POST" && seg[1] === "register") {
    return handle(req, { endpoint: "persit/register", auth: false, run: () => register(req) });
  }
  if (method === "GET" && seg[1] === "requests") {
    return handle(req, {
      endpoint: "persit/requests",
      roles: ["SUPER_ADMIN"],
      run: (c) => requests(req, requireCtx(c)),
    });
  }
  if (method === "POST" && seg[2] === "approve") {
    return handle(req, {
      endpoint: "persit/accounts/:id/approve",
      roles: ["SUPER_ADMIN"],
      run: (c) => approve(requireCtx(c), seg[1] as string),
    });
  }
  if (method === "POST" && seg[2] === "reject") {
    return handle(req, {
      endpoint: "persit/accounts/:id/reject",
      roles: ["SUPER_ADMIN"],
      run: (c) => reject(requireCtx(c), seg[1] as string),
    });
  }
  if (method === "DELETE" && seg[1]) {
    return handle(req, {
      endpoint: "persit/accounts/:id",
      roles: ["SUPER_ADMIN"],
      run: (c) => remove(requireCtx(c), seg[1] as string),
    });
  }
  return handle(req, {
    endpoint: "persit",
    run: () => {
      throw new ApiError("NOT_FOUND");
    },
  });
});
