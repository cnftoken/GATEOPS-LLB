// Pembuat PDF laporan di browser (PRD 14). @react-pdf/renderer + grafik SVG.
import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Svg,
  Rect,
  Line,
  Font,
  pdf,
} from "@react-pdf/renderer";
import { formatDateTime, formatDuration } from "./format";

export interface ReportRow {
  id: string;
  name: string;
  nrp: string;
  exitGate: string | null;
  returnGate: string | null;
  exitAt: string;
  returnAt: string | null;
  tujuan: string;
  keperluan: string;
  durationSeconds: number | null;
  status: string;
}

export interface ReportMeta {
  start: string;
  end: string;
  author: string;
  role: string;
  generatedAt: Date;
  inside: number;
  outside: number;
}

// Inter disematkan (PRD 14.4). Fallback ke Helvetica bila gagal dimuat.
try {
  Font.register({
    family: "Inter",
    fonts: [
      { src: "https://rsms.me/inter/font-files/Inter-Regular.ttf", fontWeight: 400 },
      { src: "https://rsms.me/inter/font-files/Inter-Bold.ttf", fontWeight: 700 },
    ],
  });
} catch {
  // biarkan fallback
}

const C = {
  ink: "#1D1D1F",
  ink2: "#6E6E73",
  line: "rgba(0,0,0,0.08)",
  accent: "#0071E3",
  success: "#248A3D",
  warning: "#C93400",
  neutral: "#E8E8ED",
};

const styles = StyleSheet.create({
  page: { padding: 36, fontFamily: "Inter", fontSize: 9, color: C.ink },
  title: { fontSize: 18, fontWeight: 700 },
  subtitle: { fontSize: 10, color: C.ink2, marginTop: 2 },
  section: { marginTop: 16, fontSize: 12, fontWeight: 700, marginBottom: 6 },
  summary: { flexDirection: "row", gap: 12, marginTop: 6 },
  summaryCard: { flex: 1, borderWidth: 1, borderColor: C.line, borderRadius: 8, padding: 8 },
  summaryLabel: { fontSize: 8, color: C.ink2 },
  summaryValue: { fontSize: 14, fontWeight: 700, marginTop: 2 },
  tableHead: {
    flexDirection: "row",
    fontWeight: 700,
    borderBottomWidth: 1,
    borderColor: C.line,
    paddingVertical: 4,
  },
  tableRow: { flexDirection: "row", borderBottomWidth: 1, borderColor: C.line, paddingVertical: 3 },
  tableRowAlt: { flexDirection: "row", backgroundColor: "#F5F5F7", paddingVertical: 3 },
  cell: { paddingHorizontal: 3 },
  footer: {
    position: "absolute",
    bottom: 18,
    left: 36,
    right: 36,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 8,
    color: C.ink2,
  },
});

const COLS = [1.6, 0.8, 1.1, 1.1, 1.4, 1.4, 1.6, 1.6, 1.0, 0.9];

function summary(rows: ReportRow[]) {
  const total = rows.length;
  const keluar = rows.length;
  const kembali = rows.filter((r) => r.returnAt !== null).length;
  const aktif = rows.filter((r) => r.status === "AKTIF").length;
  return { total, keluar, kembali, aktif };
}

function daily(rows: ReportRow[], start: Date, end: Date) {
  const days: Array<{ key: string; label: string; keluar: number; kembali: number }> = [];
  const byDay = new Map<string, { keluar: number; kembali: number }>();
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    byDay.set(key, { keluar: 0, kembali: 0 });
    days.push({ key, label: key.slice(5), keluar: 0, kembali: 0 });
  }
  for (const r of rows) {
    const ek = r.exitAt.slice(0, 10);
    if (byDay.has(ek)) byDay.get(ek)!.keluar += 1;
    if (r.returnAt) {
      const rk = r.returnAt.slice(0, 10);
      if (byDay.has(rk)) byDay.get(rk)!.kembali += 1;
    }
  }
  return days.map((d) => {
    const v = byDay.get(d.key) ?? { keluar: 0, kembali: 0 };
    return { label: d.label, keluar: v.keluar, kembali: v.kembali };
  });
}

function Chart({ rows, start, end }: { rows: ReportRow[]; start: Date; end: Date }) {
  const data = daily(rows, start, end);
  const max = Math.max(1, ...data.map((d) => Math.max(d.keluar, d.kembali)));
  const width = 760;
  const height = 160;
  const pad = 20;
  const step = data.length ? (width - pad * 2) / data.length : 0;
  const barW = Math.max(2, step / 3);
  return (
    <Svg width={width} height={height}>
      <Line x1={pad} y1={height - pad} x2={width - pad} y2={height - pad} stroke={C.line} />
      {data.map((d, i) => {
        const x = pad + i * step + step / 4;
        const hK = ((height - pad * 2) * d.keluar) / max;
        const hB = ((height - pad * 2) * d.kembali) / max;
        return (
          <React.Fragment key={d.label}>
            <Rect x={x} y={height - pad - hK} width={barW} height={hK} fill={C.warning} />
            <Rect x={x + barW} y={height - pad - hB} width={barW} height={hB} fill={C.success} />
          </React.Fragment>
        );
      })}
    </Svg>
  );
}

function Row({ r, alt }: { r: ReportRow; alt: boolean }) {
  const wrap = alt ? styles.tableRowAlt : styles.tableRow;
  const cells = [
    r.name,
    r.nrp,
    r.exitGate ?? "—",
    r.returnGate ?? "—",
    formatDateTime(new Date(r.exitAt)),
    r.returnAt ? formatDateTime(new Date(r.returnAt)) : "—",
    r.tujuan,
    r.keperluan,
    r.durationSeconds !== null ? formatDuration(r.durationSeconds) : "—",
    r.status,
  ];
  return (
    <View style={wrap}>
      {cells.map((c, i) => (
        <Text key={i} style={[styles.cell, { width: `${(COLS[i] ?? 1) * 10}%` }]}>
          {c}
        </Text>
      ))}
    </View>
  );
}

export async function generateReportPdf(rows: ReportRow[], meta: ReportMeta): Promise<Blob> {
  const s = summary(rows);
  const start = new Date(`${meta.start}T00:00:00`);
  const end = new Date(`${meta.end}T00:00:00`);
  const doc = (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        <Text style={styles.title}>Laporan Aktivitas GATEOPS</Text>
        <Text style={styles.subtitle}>
          Periode {meta.start} s.d. {meta.end} · Dibuat oleh {meta.author} ({meta.role}) ·{" "}
          {formatDateTime(meta.generatedAt)}
        </Text>

        <Text style={styles.section}>Ringkasan Periode</Text>
        <View style={styles.summary}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Total Transaksi</Text>
            <Text style={styles.summaryValue}>{s.total}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Keluar</Text>
            <Text style={styles.summaryValue}>{s.keluar}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Kembali</Text>
            <Text style={styles.summaryValue}>{s.kembali}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Aktif</Text>
            <Text style={styles.summaryValue}>{s.aktif}</Text>
          </View>
        </View>

        <Text style={styles.section}>Data Aktivitas</Text>
        <View style={styles.tableHead}>
          {[
            "Nama",
            "NRP",
            "Gate Keluar",
            "Gate Kembali",
            "Waktu Keluar",
            "Waktu Kembali",
            "Tujuan",
            "Keperluan",
            "Durasi",
            "Status",
          ].map((h, i) => (
            <Text key={h} style={[styles.cell, { width: `${(COLS[i] ?? 1) * 10}%` }]}>
              {h}
            </Text>
          ))}
        </View>
        {rows.map((r, i) => (
          <Row key={r.id} r={r} alt={i % 2 === 1} />
        ))}

        <Text style={styles.section}>Statistik Snapshot ({formatDateTime(meta.generatedAt)})</Text>
        <View style={styles.summary}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Di Dalam</Text>
            <Text style={styles.summaryValue}>{meta.inside}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Di Luar</Text>
            <Text style={styles.summaryValue}>{meta.outside}</Text>
          </View>
        </View>

        <Text style={styles.section}>Grafik Transaksi per Hari</Text>
        <Chart rows={rows} start={start} end={end} />

        <View style={styles.footer} fixed>
          <Text>Dokumen dihasilkan oleh GATEOPS</Text>
          <Text
            render={({ pageNumber, totalPages }) => `Halaman ${pageNumber} dari ${totalPages}`}
          />
        </View>
      </Page>
    </Document>
  );
  return pdf(doc).toBlob();
}

export function reportFileName(start: string, end: string): string {
  return `GATEOPS_Laporan_${start}_${end}.pdf`;
}
