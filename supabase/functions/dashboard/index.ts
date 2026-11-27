// Endpoint dashboard (PRD 12.1-12.3, 22.5).
import { handle, requireCtx } from "../_shared/handler.ts";
import { success } from "../_shared/response.ts";
import { ApiError } from "../_shared/errors.ts";
import { computeGpsStatus, type GpsRow } from "../_shared/gps.ts";

interface PersonnelLite {
  nama: string;
  nrp: string;
  pangkat: string;
  jabatan: string;
}
interface GateLite {
  name: string;
}
interface ActivityRow {
  id: string;
  exit_at: string;
  return_at: string | null;
  status: string;
  tujuan: string;
  keperluan: string;
  personnel: PersonnelLite;
  exit_gate: GateLite;
  return_gate: GateLite | null;
}

async function komando(ctx: NonNullable<ReturnType<typeof requireCtx>>): Promise<Response> {
  const supabase = ctx.supabase;
  const now = Date.now();

  const { count: total } = await supabase
    .from("accounts")
    .select("id", { count: "exact", head: true })
    .eq("role", "PERSONEL");

  const { data: active } = await supabase
    .from("activities")
    .select(
      "id, personnel_account_id, exit_at, tujuan, keperluan, personnel:accounts!activities_personnel_account_id_fkey(nama, nrp, pangkat, jabatan), exit_gate:gates!activities_exit_gate_id_fkey(name)",
    )
    .eq("status", "AKTIF");
  const activeRows = (active ?? []) as unknown as ActivityRow[];

  const personnelIds = activeRows
    .map((r) => (r as unknown as { personnel_account_id?: string }).personnel_account_id)
    .filter(Boolean) as string[];

  const gpsMap = new Map<string, GpsRow>();
  if (personnelIds.length > 0) {
    const { data: gps } = await supabase
      .from("gps_locations")
      .select("personnel_account_id, latitude, longitude, permission_state, gps_updated_at")
      .in("personnel_account_id", personnelIds);
    for (const g of (gps ?? []) as unknown as Array<GpsRow & { personnel_account_id: string }>) {
      gpsMap.set(g.personnel_account_id, g);
    }
  }

  const outside = activeRows.map((r) => {
    const pid = (r as unknown as { personnel_account_id?: string }).personnel_account_id ?? "";
    const gps = gpsMap.get(pid) ?? null;
    return {
      name: r.personnel?.nama,
      nrp: r.personnel?.nrp,
      pangkat: r.personnel?.pangkat,
      jabatan: r.personnel?.jabatan,
      exitGate: r.exit_gate?.name,
      tujuan: r.tujuan,
      keperluan: r.keperluan,
      exitAt: r.exit_at,
      gpsStatus: computeGpsStatus(gps, now),
      latitude: gps?.latitude ?? null,
      longitude: gps?.longitude ?? null,
      gpsUpdatedAt: gps?.gps_updated_at ?? null,
    };
  });

  const { data: recent } = await supabase
    .from("activities")
    .select(
      "id, exit_at, return_at, status, personnel:accounts!activities_personnel_account_id_fkey(nama, nrp), exit_gate:gates!activities_exit_gate_id_fkey(name)",
    )
    .order("exit_at", { ascending: false })
    .limit(10);
  const recentRows = (recent ?? []) as unknown as ActivityRow[];

  return success({
    stats: { total: total ?? 0, inside: (total ?? 0) - outside.length, outside: outside.length },
    outside,
    recent: recentRows.map((r) => ({
      id: r.id,
      name: r.personnel?.nama,
      nrp: r.personnel?.nrp,
      gate: r.exit_gate?.name,
      at: r.return_at ?? r.exit_at,
      type: r.status === "AKTIF" ? "KELUAR" : "KEMBALI",
      status: r.status,
    })),
  });
}

async function beranda(ctx: NonNullable<ReturnType<typeof requireCtx>>): Promise<Response> {
  const supabase = ctx.supabase;
  const pid = ctx.account.id;
  const { data: active } = await supabase
    .from("activities")
    .select("id, exit_at, tujuan, keperluan, exit_gate:gates!activities_exit_gate_id_fkey(name)")
    .eq("personnel_account_id", pid)
    .eq("status", "AKTIF")
    .maybeSingle();
  const a = active as unknown as ActivityRow | null;

  let gps: GpsRow | null = null;
  if (a) {
    const { data: g } = await supabase
      .from("gps_locations")
      .select("latitude, permission_state, gps_updated_at")
      .eq("personnel_account_id", pid)
      .maybeSingle();
    gps = (g as unknown as GpsRow) ?? null;
  }

  const { data: recent } = await supabase
    .from("activities")
    .select("id, exit_at, return_at, status, exit_gate:gates!activities_exit_gate_id_fkey(name)")
    .eq("personnel_account_id", pid)
    .order("exit_at", { ascending: false })
    .limit(3);
  const recentRows = (recent ?? []) as unknown as ActivityRow[];

  return success({
    presence: a ? "DI LUAR" : "DI DALAM",
    active: a
      ? {
          id: a.id,
          exitGate: a.exit_gate?.name,
          tujuan: a.tujuan,
          keperluan: a.keperluan,
          exitAt: a.exit_at,
          gpsStatus: computeGpsStatus(gps, Date.now()),
        }
      : null,
    recent: recentRows.map((r) => ({
      id: r.id,
      exitGate: r.exit_gate?.name,
      exitAt: r.exit_at,
      returnAt: r.return_at,
      status: r.status,
    })),
  });
}

async function keluarga(ctx: NonNullable<ReturnType<typeof requireCtx>>): Promise<Response> {
  const supabase = ctx.supabase;
  const { data: link } = await supabase
    .from("persit_links")
    .select("status, personnel_account_id")
    .eq("persit_account_id", ctx.account.id)
    .maybeSingle();
  const l = link as { status: string; personnel_account_id: string | null } | null;
  if (!l) throw new ApiError("NOT_FOUND");

  if (l.status === "MENUNGGU") {
    return success({
      status: "MENUNGGU",
      message: "Pengajuan pengaitan menunggu verifikasi Super Admin.",
    });
  }
  if (l.status === "DITOLAK") {
    return success({
      status: "DITOLAK",
      message: "Pengajuan pengaitan ditolak. Hubungi Super Admin.",
    });
  }

  const { data: p } = await supabase
    .from("accounts")
    .select("nama, nrp, pangkat, jabatan")
    .eq("id", l.personnel_account_id)
    .single();
  const person = p as PersonnelLite;
  const { count } = await supabase
    .from("activities")
    .select("id", { count: "exact", head: true })
    .eq("personnel_account_id", l.personnel_account_id)
    .eq("status", "AKTIF");
  return success({
    status: "DISETUJUI",
    personnel: {
      nama: person.nama,
      nrp: person.nrp,
      pangkat: person.pangkat,
      jabatan: person.jabatan,
    },
    presence: (count ?? 0) > 0 ? "DI LUAR" : "DI DALAM",
  });
}

Deno.serve((req) => {
  const action = new URL(req.url).pathname.split("/").pop();
  switch (action) {
    case "komando":
      return handle(req, {
        endpoint: "dashboard/komando",
        roles: ["SUPER_ADMIN", "KOMANDAN"],
        run: (ctx) => komando(requireCtx(ctx)),
      });
    case "beranda":
      return handle(req, {
        endpoint: "dashboard/beranda",
        roles: ["PERSONEL"],
        run: (ctx) => beranda(requireCtx(ctx)),
      });
    case "keluarga":
      return handle(req, {
        endpoint: "dashboard/keluarga",
        roles: ["PERSIT"],
        run: (ctx) => keluarga(requireCtx(ctx)),
      });
    default:
      return handle(req, {
        endpoint: "dashboard",
        run: () => {
          throw new ApiError("NOT_FOUND");
        },
      });
  }
});
