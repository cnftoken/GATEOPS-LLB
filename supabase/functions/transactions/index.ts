// POST /transactions/scan (PRD 9.5, 10, 22.5, 22.7).
import { handle, fromRpcError, requireCtx } from "../_shared/handler.ts";
import { success } from "../_shared/response.ts";
import { ApiError } from "../_shared/errors.ts";
import { asString, readJson } from "../_shared/http.ts";
import { constantTimeEqual } from "../_shared/internal.ts";
import { hashToken } from "../_shared/sessions.ts";
import { callRpc } from "../_shared/db.ts";
import { MESSAGES } from "../_shared/messages.ts";

interface AttendanceResult {
  result: "EXIT" | "RETURN";
  activity_id: string;
  exit_at?: string;
  return_at?: string;
  duration_seconds?: number | null;
}

async function scan(
  ctx: NonNullable<ReturnType<typeof requireCtx>>,
  req: Request,
): Promise<Response> {
  const body = await readJson(req);
  const token = asString(body.token);
  if (!token) throw new ApiError("INVALID_QR", MESSAGES.INVALID_QR);

  const hash = await hashToken(token);
  const { data: gate } = await ctx.supabase
    .from("gates")
    .select("id, name, qr_token_hash")
    .eq("qr_token_hash", hash)
    .maybeSingle();
  if (!gate || !constantTimeEqual((gate as { qr_token_hash: string }).qr_token_hash, hash)) {
    throw new ApiError("INVALID_QR", MESSAGES.INVALID_QR);
  }
  const g = gate as { id: string; name: string };

  const result = await callRpc<AttendanceResult>(
    ctx.supabase,
    "record_attendance",
    {
      p_personnel_account_id: ctx.account.id,
      p_gate_id: g.id,
      p_tujuan: asString(body.tujuan) ?? "",
      p_keperluan: asString(body.keperluan) ?? "",
    },
    fromRpcError,
  );

  const isExit = result.result === "EXIT";
  return success({
    type: isExit ? "KELUAR" : "KEMBALI",
    activityId: result.activity_id,
    gateName: g.name,
    occurredAt: isExit ? result.exit_at : result.return_at,
    presence: isExit ? "DI LUAR" : "DI DALAM",
    durationSeconds: isExit ? null : (result.duration_seconds ?? 0),
  });
}

Deno.serve((req) =>
  handle(req, {
    endpoint: "transactions/scan",
    roles: ["PERSONEL"],
    run: (ctx) => scan(requireCtx(ctx), req),
  }),
);
