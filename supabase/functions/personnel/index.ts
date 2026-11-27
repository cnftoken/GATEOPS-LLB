// Endpoint personnel (PRD 8.2-8.3, 22.5).
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
import { hashPassword } from "../_shared/password.ts";
import { callRpc } from "../_shared/db.ts";

interface PersonRow {
  id: string;
  nama: string;
  nrp: string;
  pangkat: string;
  jabatan: string;
  username: string;
  status: string;
  created_at: string;
}

const SA_KMD = ["SUPER_ADMIN", "KOMANDAN"] as const;

async function list(
  req: Request,
  ctx: NonNullable<ReturnType<typeof requireCtx>>,
): Promise<Response> {
  const { page, pageSize } = parsePagination(req.url);
  const search = new URL(req.url).searchParams.get("search")?.trim();
  let query = ctx.supabase
    .from("accounts")
    .select("id, nama, nrp, pangkat, jabatan, username, status, created_at", { count: "exact" })
    .eq("role", "PERSONEL");
  if (search) {
    const s = safeFilter(search);
    query = query.or(`nama.ilike.%${s}%,nrp.ilike.%${s}%,username.ilike.%${s}%`);
  }
  const from = (page - 1) * pageSize;
  const { data, count } = await query
    .order("nama", { ascending: true })
    .range(from, from + pageSize - 1);
  return paginated({
    data: (data ?? []) as unknown as PersonRow[],
    page,
    pageSize,
    total: count ?? 0,
  });
}

async function getOne(
  ctx: NonNullable<ReturnType<typeof requireCtx>>,
  id: string,
): Promise<Response> {
  const { data } = await ctx.supabase
    .from("accounts")
    .select("id, nama, nrp, pangkat, jabatan, username, status, created_at")
    .eq("id", id)
    .eq("role", "PERSONEL")
    .maybeSingle();
  if (!data) throw new ApiError("NOT_FOUND");
  return success(data);
}

async function create(
  ctx: NonNullable<ReturnType<typeof requireCtx>>,
  req: Request,
): Promise<Response> {
  const body = await readJson(req);
  const nrp = validateNrp(asString(body.nrp) ?? "");
  const nama = validateNama(asString(body.nama) ?? "");
  const pangkat = validatePangkat(asString(body.pangkat) ?? "");
  const jabatan = validateJabatan(asString(body.jabatan) ?? "");
  const username = validateUsername(asString(body.username) ?? "");
  const password = validatePassword(asString(body.password) ?? "");
  if (!nrp.ok || !nama.ok || !pangkat.ok || !jabatan.ok || !username.ok || !password.ok) {
    throw new ApiError("VALIDATION_FAILED");
  }
  const id = await callRpc<string>(
    ctx.supabase,
    "create_personnel",
    {
      p_actor_account_id: ctx.account.id,
      p_nrp: nrp.value,
      p_nama: nama.value,
      p_pangkat: pangkat.value,
      p_jabatan: jabatan.value,
      p_username: username.value,
      p_password_hash: await hashPassword(password.value),
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
  const pangkat = validatePangkat(asString(body.pangkat) ?? "");
  const jabatan = validateJabatan(asString(body.jabatan) ?? "");
  const username = validateUsername(asString(body.username) ?? "");
  if (!nama.ok || !pangkat.ok || !jabatan.ok || !username.ok)
    throw new ApiError("VALIDATION_FAILED");
  await callRpc(
    ctx.supabase,
    "update_personnel",
    {
      p_actor_account_id: ctx.account.id,
      p_account_id: id,
      p_nama: nama.value,
      p_pangkat: pangkat.value,
      p_jabatan: jabatan.value,
      p_username: username.value,
    },
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
    "delete_personnel",
    { p_actor_account_id: ctx.account.id, p_account_id: id },
    fromRpcError,
  );
  return success({ ok: true });
}

Deno.serve((req) => {
  const seg = segments(new URL(req.url).pathname);
  const id = seg[1];
  const method = req.method;
  if (method === "GET" && !id) {
    return handle(req, {
      endpoint: "personnel",
      roles: [...SA_KMD],
      run: (c) => list(req, requireCtx(c)),
    });
  }
  if (method === "POST" && !id) {
    return handle(req, {
      endpoint: "personnel",
      roles: ["SUPER_ADMIN"],
      run: (c) => create(requireCtx(c), req),
    });
  }
  if (method === "GET" && id) {
    return handle(req, {
      endpoint: "personnel/:id",
      roles: [...SA_KMD],
      run: (c) => getOne(requireCtx(c), id),
    });
  }
  if (method === "PATCH" && id) {
    return handle(req, {
      endpoint: "personnel/:id",
      roles: ["SUPER_ADMIN"],
      run: (c) => patch(requireCtx(c), req, id),
    });
  }
  if (method === "DELETE" && id) {
    return handle(req, {
      endpoint: "personnel/:id",
      roles: ["SUPER_ADMIN"],
      run: (c) => remove(requireCtx(c), id),
    });
  }
  return handle(req, {
    endpoint: "personnel",
    run: () => {
      throw new ApiError("NOT_FOUND");
    },
  });
});
