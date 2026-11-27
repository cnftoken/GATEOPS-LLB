// Endpoint gates (PRD 9, 22.5). Token mentah hanya pada create/regenerate.
import { handle, fromRpcError, requireCtx } from "../_shared/handler.ts";
import { paginated, success } from "../_shared/response.ts";
import { ApiError } from "../_shared/errors.ts";
import { asString, parsePagination, readJson, segments } from "../_shared/http.ts";
import { validateGateLocation, validateGateName } from "../_shared/validation.ts";
import { generateSessionToken, hashToken } from "../_shared/sessions.ts";
import { callRpc } from "../_shared/db.ts";

async function list(
  req: Request,
  ctx: NonNullable<ReturnType<typeof requireCtx>>,
): Promise<Response> {
  const { page, pageSize } = parsePagination(req.url);
  const from = (page - 1) * pageSize;
  const { data, count } = await ctx.supabase
    .from("gates")
    .select("id, name, location, status, qr_regenerated_at, created_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, from + pageSize - 1);
  return paginated({ data: data ?? [], page, pageSize, total: count ?? 0 });
}

async function getOne(
  ctx: NonNullable<ReturnType<typeof requireCtx>>,
  id: string,
): Promise<Response> {
  const { data } = await ctx.supabase
    .from("gates")
    .select("id, name, location, status, qr_regenerated_at, created_at")
    .eq("id", id)
    .maybeSingle();
  if (!data) throw new ApiError("NOT_FOUND");
  return success(data);
}

async function create(
  ctx: NonNullable<ReturnType<typeof requireCtx>>,
  req: Request,
): Promise<Response> {
  const body = await readJson(req);
  const name = validateGateName(asString(body.name) ?? "");
  const location = validateGateLocation(asString(body.location) ?? "");
  const status = asString(body.status) ?? "AKTIF";
  if (!name.ok || !location.ok || (status !== "AKTIF" && status !== "NONAKTIF")) {
    throw new ApiError("VALIDATION_FAILED");
  }
  const token = generateSessionToken();
  const id = await callRpc<string>(
    ctx.supabase,
    "create_gate",
    {
      p_actor_account_id: ctx.account.id,
      p_name: name.value,
      p_location: location.value,
      p_status: status,
      p_qr_token_hash: await hashToken(token),
    },
    fromRpcError,
  );
  return success({ id, token });
}

async function patch(
  ctx: NonNullable<ReturnType<typeof requireCtx>>,
  req: Request,
  id: string,
): Promise<Response> {
  const body = await readJson(req);
  const name = validateGateName(asString(body.name) ?? "");
  const location = validateGateLocation(asString(body.location) ?? "");
  const status = asString(body.status) ?? "AKTIF";
  if (!name.ok || !location.ok || (status !== "AKTIF" && status !== "NONAKTIF"))
    throw new ApiError("VALIDATION_FAILED");
  await callRpc(
    ctx.supabase,
    "update_gate",
    {
      p_actor_account_id: ctx.account.id,
      p_gate_id: id,
      p_name: name.value,
      p_location: location.value,
      p_status: status,
    },
    fromRpcError,
  );
  return success({ ok: true });
}

async function regenerate(
  ctx: NonNullable<ReturnType<typeof requireCtx>>,
  id: string,
): Promise<Response> {
  const token = generateSessionToken();
  await callRpc(
    ctx.supabase,
    "regenerate_gate_qr",
    { p_actor_account_id: ctx.account.id, p_gate_id: id, p_qr_token_hash: await hashToken(token) },
    fromRpcError,
  );
  return success({ token });
}

Deno.serve((req) => {
  const seg = segments(new URL(req.url).pathname);
  const method = req.method;
  if (method === "GET" && !seg[1]) {
    return handle(req, {
      endpoint: "gates",
      roles: ["SUPER_ADMIN", "KOMANDAN"],
      run: (c) => list(req, requireCtx(c)),
    });
  }
  if (method === "POST" && !seg[1]) {
    return handle(req, {
      endpoint: "gates",
      roles: ["SUPER_ADMIN"],
      run: (c) => create(requireCtx(c), req),
    });
  }
  if (method === "GET" && seg[1]) {
    return handle(req, {
      endpoint: "gates/:id",
      roles: ["SUPER_ADMIN"],
      run: (c) => getOne(requireCtx(c), seg[1] as string),
    });
  }
  if (method === "PATCH" && seg[1]) {
    return handle(req, {
      endpoint: "gates/:id",
      roles: ["SUPER_ADMIN"],
      run: (c) => patch(requireCtx(c), req, seg[1] as string),
    });
  }
  if (method === "POST" && seg[2] === "regenerate-qr") {
    return handle(req, {
      endpoint: "gates/:id/regenerate-qr",
      roles: ["SUPER_ADMIN"],
      run: (c) => regenerate(requireCtx(c), seg[1] as string),
    });
  }
  return handle(req, {
    endpoint: "gates",
    run: () => {
      throw new ApiError("NOT_FOUND");
    },
  });
});
