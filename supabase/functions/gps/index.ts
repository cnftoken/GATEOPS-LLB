// Endpoint gps (PRD 11, 22.5, 22.8).
import { handle, fromRpcError, requireCtx } from "../_shared/handler.ts";
import { success } from "../_shared/response.ts";
import { ApiError } from "../_shared/errors.ts";
import { asString, readJson } from "../_shared/http.ts";
import { computeGpsStatus, type GpsRow } from "../_shared/gps.ts";
import { callRpc } from "../_shared/db.ts";

interface ActiveRow {
  personnel_account_id: string;
  exit_at: string;
  personnel: { nama: string; nrp: string; pangkat: string; jabatan: string };
  exit_gate: { name: string };
}

async function report(
  ctx: NonNullable<ReturnType<typeof requireCtx>>,
  req: Request,
): Promise<Response> {
  const body = await readJson(req);
  const permissionState = asString(body.permissionState);
  if (permissionState !== "GRANTED" && permissionState !== "DENIED")
    throw new ApiError("VALIDATION_FAILED");

  let latitude: number | null = null;
  let longitude: number | null = null;
  if (permissionState === "GRANTED") {
    if (body.latitude === null || body.latitude === undefined)
      throw new ApiError("VALIDATION_FAILED");
    if (body.longitude === null || body.longitude === undefined)
      throw new ApiError("VALIDATION_FAILED");
    latitude = Number(body.latitude);
    longitude = Number(body.longitude);
    if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90)
      throw new ApiError("VALIDATION_FAILED");
    if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180)
      throw new ApiError("VALIDATION_FAILED");
  }

  await callRpc(
    ctx.supabase,
    "report_gps",
    {
      p_personnel_account_id: ctx.account.id,
      p_permission_state: permissionState,
      p_latitude: latitude,
      p_longitude: longitude,
    },
    fromRpcError,
  );
  return success({ ok: true });
}

async function list(ctx: NonNullable<ReturnType<typeof requireCtx>>): Promise<Response> {
  const now = Date.now();
  const { data: active } = await ctx.supabase
    .from("activities")
    .select(
      "personnel_account_id, exit_at, personnel:accounts!activities_personnel_account_id_fkey(nama, nrp, pangkat, jabatan), exit_gate:gates!activities_exit_gate_id_fkey(name)",
    )
    .eq("status", "AKTIF");
  const rows = (active ?? []) as unknown as ActiveRow[];
  const ids = rows.map((r) => r.personnel_account_id);

  const gpsMap = new Map<string, GpsRow>();
  if (ids.length > 0) {
    const { data: gps } = await ctx.supabase
      .from("gps_locations")
      .select("personnel_account_id, latitude, longitude, permission_state, gps_updated_at")
      .in("personnel_account_id", ids);
    for (const g of (gps ?? []) as unknown as Array<GpsRow & { personnel_account_id: string }>) {
      gpsMap.set(g.personnel_account_id, g);
    }
  }

  return success({
    data: rows.map((r) => {
      const gps = gpsMap.get(r.personnel_account_id) ?? null;
      return {
        name: r.personnel.nama,
        nrp: r.personnel.nrp,
        pangkat: r.personnel.pangkat,
        jabatan: r.personnel.jabatan,
        exitGate: r.exit_gate.name,
        exitAt: r.exit_at,
        gpsStatus: computeGpsStatus(gps, now),
        latitude: gps?.latitude ?? null,
        longitude: gps?.longitude ?? null,
        gpsUpdatedAt: gps?.gps_updated_at ?? null,
      };
    }),
  });
}

Deno.serve((req) => {
  const action = new URL(req.url).pathname.split("/").pop();
  if (action === "report") {
    return handle(req, {
      endpoint: "gps/report",
      roles: ["PERSONEL"],
      run: (c) => report(requireCtx(c), req),
    });
  }
  return handle(req, {
    endpoint: "gps",
    roles: ["SUPER_ADMIN", "KOMANDAN"],
    run: (c) => list(requireCtx(c)),
  });
});
