// Tipe tampilan turunan dari respons API (camelCase, PRD 8.1).
export type Presence = "DI DALAM" | "DI LUAR";
export type GpsStatus = "AKTIF" | "OFFLINE" | "TIDAK_AKTIF";

export interface KomandoData {
  stats: { total: number; inside: number; outside: number };
  outside: Array<{
    id: string;
    name: string;
    nrp: string;
    pangkat: string;
    jabatan: string;
    tujuan: string;
    keperluan: string;
    exitAt: string;
    gpsStatus: GpsStatus;
    latitude: number | null;
    longitude: number | null;
    gpsUpdatedAt: string | null;
  }>;
  recent: Array<{
    id: string;
    name: string;
    nrp: string;
    at: string;
    type: "KELUAR" | "KEMBALI";
    status: string;
  }>;
}

export interface BerandaData {
  presence: Presence;
  active: null | {
    id: string;
    exitGate: string | null;
    tujuan: string;
    keperluan: string;
    exitAt: string;
    gpsStatus: GpsStatus;
  };
  recent: Array<{
    id: string;
    exitGate: string | null;
    exitAt: string;
    returnAt: string | null;
    status: string;
  }>;
}

export interface KeluargaData {
  status: "MENUNGGU" | "DITOLAK" | "DISETUJUI";
  message?: string;
  personnel?: { nama: string; nrp: string; pangkat: string; jabatan: string };
  presence?: Presence;
}
