// Endpoint accounts (PRD 16, 7.8, 25.3 bootstrap, 22.5).
import { handle, fromRpcError, requireCtx } from "../_shared/handler.ts";
import { paginated, success } from "../_shared/response.ts";
import { ApiError } from "../_shared/errors.ts";
import { asString, parsePagination, readJson, safeFilter, segments } from "../_shared/http.ts";
import {
  validateJabatan,
  validateNama,
  validateNrp,
  validatePangkat,
  validatePassword,
  validateUsername,
} from "../_shared/validation.ts";
import { generateTempPassword, hashPassword } from "../_shared/password.ts";
import { callRpc, checkDb, serviceClient } from "../_shared/db.ts";

async function list(
  req: Request,
  ctx: NonNullable<ReturnType<typeof requireCtx>>,
): Promise<Response> {
  const { page, pageSize } = parsePagination(req.url);
  const params = new URL(req.url).searchParams;
  const role = params.get("role");
  const status = params.get("status");
  const search = params.get("search")?.trim();
  let query = ctx.supabase
    .from("accounts")
    .select("id, nama, username, role, nrp, pangkat, jabatan, status, created_at", {
      count: "exact",
    });
  if (role) query = query.eq("role", role);
  if (status) query = query.eq("status", status);
  if (search) {
    const s = safeFilter(search);
    query = query.or(`nama.ilike.%${s}%,username.ilike.%${s}%,nrp.ilike.%${s}%`);
  }
  const from = (page - 1) * pageSize;
  const { data, count, error } = await query
    .order("created_at", { ascending: false })
    .range(from, from + pageSize - 1);
  checkDb(error);
  return paginated({ data: data ?? [], page, pageSize, total: count ?? 0 });
}

async function create(
  ctx: NonNullable<ReturnType<typeof requireCtx>>,
  req: Request,
): Promise<Response> {
  const body = await readJson(req);
  const role = asString(body.role);
  if (role !== "SUPER_ADMIN" && role !== "KOMANDAN") throw new ApiError("VALIDATION_FAILED");
  const nama = validateNama(asString(body.nama) ?? "");
  const username = validateUsername(asString(body.username) ?? "");
  const password = validatePassword(asString(body.password) ?? "");
  const nrp =
    role === "KOMANDAN" ? validateNrp(asString(body.nrp) ?? "") : { ok: true, value: null };
  const pangkat =
    role === "KOMANDAN" ? validatePangkat(asString(body.pangkat) ?? "") : { ok: true, value: null };
  const jabatan =
    role === "KOMANDAN" ? validateJabatan(asString(body.jabatan) ?? "") : { ok: true, value: null };
  if (!nama.ok || !username.ok || !password.ok || !nrp.ok || !pangkat.ok || !jabatan.ok) {
    throw new ApiError("VALIDATION_FAILED");
  }
  const id = await callRpc<string>(
    ctx.supabase,
    "create_account",
    {
      p_actor_account_id: ctx.account.id,
      p_role: role,
      p_username: username.value,
      p_password_hash: await hashPassword(password.value),
      p_nama: nama.value,
      p_nrp: nrp.value,
      p_pangkat: pangkat.value,
      p_jabatan: jabatan.value,
    },
    fromRpcError,
  );
  return success({ id });
}

async function patch(
  ctx: NonNullable<ReturnType<typeof requireCtx>>,
  req: Request,
  id: string,
): Promise<Response> {
  const body = await readJson(req);
  const nama = validateNama(asString(body.nama) ?? "");
  const username = validateUsername(asString(body.username) ?? "");
  const pangkat = asString(body.pangkat);
  const jabatan = asString(body.jabatan);
  if (
    !nama.ok ||
    !username.ok ||
    (pangkat !== undefined && !validatePangkat(pangkat).ok) ||
    (jabatan !== undefined && !validateJabatan(jabatan).ok)
  ) {
    throw new ApiError("VALIDATION_FAILED");
  }
  await callRpc(
    ctx.supabase,
    "update_account",
    {
      p_actor_account_id: ctx.account.id,
      p_account_id: id,
      p_nama: nama.value,
      p_pangkat: pangkat ?? null,
      p_jabatan: jabatan ?? null,
      p_username: username.value,
    },
    fromRpcError,
  );
  return success({ ok: true });
}

async function setStatus(
  ctx: NonNullable<ReturnType<typeof requireCtx>>,
  req: Request,
  id: string,
): Promise<Response> {
  const body = await readJson(req);
  const status = asString(body.status);
  if (status !== "AKTIF" && status !== "NONAKTIF") throw new ApiError("VALIDATION_FAILED");
  await callRpc(
    ctx.supabase,
    "set_account_status",
    { p_actor_account_id: ctx.account.id, p_account_id: id, p_status: status },
    fromRpcError,
  );
  return success({ ok: true });
}

async function resetPassword(
  ctx: NonNullable<ReturnType<typeof requireCtx>>,
  id: string,
): Promise<Response> {
  const temporaryPassword = generateTempPassword();
  await callRpc(
    ctx.supabase,
    "reset_account_password",
    {
      p_actor_account_id: ctx.account.id,
      p_account_id: id,
      p_password_hash: await hashPassword(temporaryPassword),
    },
    fromRpcError,
  );
  return success({ temporaryPassword });
}

// Bootstrap Super Admin pertama, idempotent (PRD 25.3.10, AGENTS 12).
async function bootstrap(req: Request): Promise<Response> {
  const body = await readJson(req);
  const username = validateUsername(asString(body.username) ?? "");
  const password = validatePassword(asString(body.password) ?? "");
  const nama = validateNama(asString(body.nama) ?? "");
  if (!username.ok || !password.ok || !nama.ok) throw new ApiError("VALIDATION_FAILED");

  const id = await callRpc<string | null>(
    serviceClient(),
    "bootstrap_admin",
    {
      p_username: username.value,
      p_password_hash: await hashPassword(password.value),
      p_nama: nama.value,
    },
    fromRpcError,
  );
  return success({ created: id !== null });
}

Deno.serve((req) => {
  const seg = segments(new URL(req.url).pathname);
  const method = req.method;

  if (method === "POST" && seg[1] === "bootstrap") {
    return handle(req, { endpoint: "accounts/bootstrap", auth: false, run: () => bootstrap(req) });
  }
  if (method === "GET" && !seg[1]) {
    return handle(req, {
      endpoint: "accounts",
      roles: ["SUPER_ADMIN"],
      run: (c) => list(req, requireCtx(c)),
    });
  }
  if (method === "POST" && !seg[1]) {
    return handle(req, {
      endpoint: "accounts",
      roles: ["SUPER_ADMIN"],
      run: (c) => create(requireCtx(c), req),
    });
  }
  if (method === "PATCH" && seg[1]) {
    return handle(req, {
      endpoint: "accounts/:id",
      roles: ["SUPER_ADMIN"],
      run: (c) => patch(requireCtx(c), req, seg[1] as string),
    });
  }
  if (method === "POST" && seg[2] === "status") {
    return handle(req, {
      endpoint: "accounts/:id/status",
      roles: ["SUPER_ADMIN"],
      run: (c) => setStatus(requireCtx(c), req, seg[1] as string),
    });
  }
  if (method === "POST" && seg[2] === "reset-password") {
    return handle(req, {
      endpoint: "accounts/:id/reset-password",
      roles: ["SUPER_ADMIN"],
      run: (c) => resetPassword(requireCtx(c), seg[1] as string),
    });
  }
  return handle(req, {
    endpoint: "accounts",
    run: () => {
      throw new ApiError("NOT_FOUND");
    },
  });
});
