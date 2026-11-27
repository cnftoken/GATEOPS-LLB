// GET /audit (PRD 17.5, 22.5). Super Admin saja.
import { handle, requireCtx } from "../_shared/handler.ts";
import { paginated } from "../_shared/response.ts";
import { parsePagination } from "../_shared/http.ts";

interface AuditRow {
  id: number;
  occurred_at: string;
  actor_username: string | null;
  actor_role: string | null;
  action: string;
  object_type: string;
  object_id: string | null;
  metadata: unknown;
}

async function list(
  req: Request,
  ctx: NonNullable<ReturnType<typeof requireCtx>>,
): Promise<Response> {
  const { page, pageSize } = parsePagination(req.url);
  const params = new URL(req.url).searchParams;
  const from = params.get("dateFrom");
  const to = params.get("dateTo");
  const username = params.get("username")?.trim();
  const action = params.get("action");
  let query = ctx.supabase
    .from("audit_logs")
    .select(
      "id, occurred_at, actor_username, actor_role, action, object_type, object_id, metadata",
      { count: "exact" },
    );
  if (from) query = query.gte("occurred_at", from);
  if (to) query = query.lte("occurred_at", to);
  if (username) query = query.ilike("actor_username", `%${username}%`);
  if (action) query = query.eq("action", action);
  const start = (page - 1) * pageSize;
  const { data, count } = await query
    .order("occurred_at", { ascending: false })
    .range(start, start + pageSize - 1);
  return paginated({
    data: (data ?? []) as unknown as AuditRow[],
    page,
    pageSize,
    total: count ?? 0,
  });
}

Deno.serve((req) =>
  handle(req, { endpoint: "audit", roles: ["SUPER_ADMIN"], run: (c) => list(req, requireCtx(c)) }),
);
