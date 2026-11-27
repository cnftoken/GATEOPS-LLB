// Status GPS dihitung server saat request (PRD 11.4). Tidak disimpan sebagai kolom.
export type GpsStatus = "AKTIF" | "OFFLINE" | "TIDAK_AKTIF";

export interface GpsRow {
  latitude: number | null;
  longitude: number | null;
  permission_state: string;
  gps_updated_at: string;
}

export const GPS_ACTIVE_MS = 60_000; // PRD 11.4: <= 60 detik termasuk tepat 60.

export function computeGpsStatus(gps: GpsRow | null | undefined, now: number): GpsStatus {
  if (!gps || gps.latitude === null) return "TIDAK_AKTIF";
  if (gps.permission_state === "DENIED") return "OFFLINE";
  if (now - Date.parse(gps.gps_updated_at) <= GPS_ACTIVE_MS) return "AKTIF";
  return "OFFLINE";
}
