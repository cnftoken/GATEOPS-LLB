// Endpoint activities (PRD 13, 14.2, 22.5).
import { handle, requireCtx } from "../_shared/handler.ts";
import { paginated, success } from "../_shared/response.ts";
import { ApiError } from "../_shared/errors.ts";
import { parsePagination, safeFilter, segments } from "../_shared/http.ts";

const SELECT =
  "id, exit_at, return_at, status, tujuan, keperluan, duration_seconds, personnel:accounts!activities_personnel_account_id_fkey(nama, nrp), exit_gate:gates!activities_exit_gate_id_fkey(name), return_gate:gates!activities_return_gate_id_fkey(name)";

interface Row {
  id: string;
  exit_at: string;
  return_at: string | null;
  status: string;
  tujuan: string;
  keperluan: string;
  duration_seconds: number | null;
  personnel: { nama: string; nrp: string };
  exit_gate: { name: string };
  return_gate: { name: string } | null;
}

function mapRow(r: Row) {
  return {
    id: r.id,
    name: r.personnel?.nama,
    nrp: r.personnel?.nrp,
    exitGate: r.exit_gate?.name,
    returnGate: r.return_gate?.name ?? null,
    exitAt: r.exit_at,
    returnAt: r.return_at,
    tujuan: r.tujuan,
    keperluan: r.keperluan,
    durationSeconds: r.duration_seconds,
    status: r.status,
  };
}

function applyFilters(
  query: {
    eq: (c: string, v: string) => unknown;
    gte: (c: string, v: string) => unknown;
    lte: (c: string, v: string) => unknown;
    or: (f: string) => unknown;
  },
  params: URLSearchParams,
): void {
  const from = params.get("dateFrom");
  const to = params.get("dateTo");
  const name = params.get("name")?.trim();
  const nrp = params.get("nrp")?.trim();
  const tujuan = params.get("tujuan")?.trim();
  const status = params.get("status");
  if (from) query.gte("exit_at", from);
  if (to) query.lte("exit_at", to);
  if (name) query.or(`personnel.nama.ilike.%${safeFilter(name)}%`);
  if (nrp) query.or(`personnel.nrp.ilike.%${safeFilter(nrp)}%`);
  if (tujuan) query.or(`tujuan.ilike.%${safeFilter(tujuan)}%`);
  if (status === "AKTIF" || status === "SELESAI") query.eq("status", status);
}

async function list(
  req: Request,
  ctx: NonNullable<ReturnType<typeof requireCtx>>,
): Promise<Response> {
  const { page, pageSize } = parsePagination(req.url);
  const params = new URL(req.url).searchParams;
  const query = ctx.supabase.from("activities").select(SELECT, { count: "exact" });
  applyFilters(query as never, params);
  const from = (page - 1) * pageSize;
  const { data, count } = await query
    .order("exit_at", { ascending: false })
    .range(from, from + pageSize - 1);
  return paginated({
    data: ((data ?? []) as unknown as Row[]).map(mapRow),
    page,
    pageSize,
    total: count ?? 0,
  });
}

async function report(
  req: Request,
  ctx: NonNullable<ReturnType<typeof requireCtx>>,
): Promise<Response> {
  const params = new URL(req.url).searchParams;
  const dateFrom = params.get("dateFrom");
  const dateTo = params.get("dateTo");
  if (dateFrom && dateTo) {
    const span = Date.parse(dateTo) - Date.parse(dateFrom);
    if (Number.isFinite(span) && span > 31 * 24 * 60 * 60 * 1000) {
      throw new ApiError("VALIDATION_FAILED");
    }
  }
  const query = ctx.supabase.from("activities").select(SELECT);
  applyFilters(query as never, params);
  const { data } = await query.order("exit_at", { ascending: false }).limit(5001);
  const rows = (data ?? []) as unknown as Row[];
  if (rows.length > 5000) throw new ApiError("REPORT_TOO_LARGE");
  return success({ data: rows.map(mapRow) });
}

async function mine(
  req: Request,
  ctx: NonNullable<ReturnType<typeof requireCtx>>,
): Promise<Response> {
  const { page, pageSize } = parsePagination(req.url);
  const from = (page - 1) * pageSize;
  const { data, count } = await ctx.supabase
    .from("activities")
    .select(SELECT, { count: "exact" })
    .eq("personnel_account_id", ctx.account.id)
    .order("exit_at", { ascending: false })
    .range(from, from + pageSize - 1);
  return paginated({
    data: ((data ?? []) as unknown as Row[]).map(mapRow),
    page,
    pageSize,
    total: count ?? 0,
  });
}

async function mineOne(
  ctx: NonNullable<ReturnType<typeof requireCtx>>,
  id: string,
): Promise<Response> {
  const { data } = await ctx.supabase
    .from("activities")
    .select(SELECT)
    .eq("id", id)
    .eq("personnel_account_id", ctx.account.id)
    .maybeSingle();
  if (!data) throw new ApiError("NOT_FOUND");
  return success(mapRow(data as unknown as Row));
}

async function one(ctx: NonNullable<ReturnType<typeof requireCtx>>, id: string): Promise<Response> {
  const { data } = await ctx.supabase.from("activities").select(SELECT).eq("id", id).maybeSingle();
  if (!data) throw new ApiError("NOT_FOUND");
  return success(mapRow(data as unknown as Row));
}

Deno.serve((req) => {
  const seg = segments(new URL(req.url).pathname);
  if (seg[1] === "report") {
    return handle(req, {
      endpoint: "activities/report",
      roles: ["SUPER_ADMIN", "KOMANDAN"],
      run: (c) => report(req, requireCtx(c)),
    });
  }
  if (seg[1] === "mine" && seg[2]) {
    return handle(req, {
      endpoint: "activities/mine/:id",
      roles: ["PERSONEL"],
      run: (c) => mineOne(requireCtx(c), seg[2] as string),
    });
  }
  if (seg[1] === "mine") {
    return handle(req, {
      endpoint: "activities/mine",
      roles: ["PERSONEL"],
      run: (c) => mine(req, requireCtx(c)),
    });
  }
  if (seg[1]) {
    return handle(req, {
      endpoint: "activities/:id",
      roles: ["SUPER_ADMIN", "KOMANDAN"],
      run: (c) => one(requireCtx(c), seg[1] as string),
    });
  }
  return handle(req, {
    endpoint: "activities",
    roles: ["SUPER_ADMIN", "KOMANDAN"],
    run: (c) => list(req, requireCtx(c)),
  });
});
