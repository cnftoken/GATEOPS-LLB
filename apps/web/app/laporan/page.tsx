"use client";

import { useState } from "react";
import { AppShell, useSession } from "@/components/shell";
import { apiGet, ApiError } from "@/lib/api";
import { ROLE_LABEL } from "@/lib/session";
import type { KomandoData } from "@/lib/types";
import { generateReportPdf, reportFileName, type ReportRow } from "@/lib/pdf";
import { Button, Card, Input, PageHeader } from "@/components/ui";

function toIso(date: string, endOfDay: boolean): string {
  return new Date(`${date}T${endOfDay ? "23:59:59.999" : "00:00:00"}`).toISOString();
}

function daysInclusive(start: string, end: string): number {
  const a = new Date(`${start}T00:00:00`).getTime();
  const b = new Date(`${end}T00:00:00`).getTime();
  return Math.floor((b - a) / 86_400_000) + 1;
}

function LaporanContent() {
  const { data: meData } = useSession();
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [name, setName] = useState("");
  const [nrp, setNrp] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tooLong = start && end ? daysInclusive(start, end) > 31 : false;
  const valid = Boolean(start && end) && !tooLong;

  async function onGenerate() {
    setError(null);
    if (!valid) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        dateFrom: toIso(start, false),
        dateTo: toIso(end, true),
      });
      if (name) params.set("name", name);
      if (nrp) params.set("nrp", nrp);
      if (status) params.set("status", status);

      const [report, komando] = await Promise.all([
        apiGet<ReportRow[]>(`activities/report?${params.toString()}`),
        apiGet<KomandoData>("dashboard/komando"),
      ]);

      const me = meData?.data;
      const blob = await generateReportPdf(report.data, {
        start,
        end,
        author: me?.nama ?? "-",
        role: me ? ROLE_LABEL[me.role] : "-",
        generatedAt: new Date(),
        inside: komando.data.stats.inside,
        outside: komando.data.stats.outside,
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = reportFileName(start, end);
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      const message =
        err instanceof ApiError && err.code === "REPORT_TOO_LARGE"
          ? err.message
          : "Laporan gagal dibuat. Coba lagi.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Laporan PDF"
        description="Buat laporan aktivitas dalam periode tertentu."
      />
      <Card className="max-w-2xl">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="start" className="mb-1 block text-[13px] font-medium text-ink-2">
              Tanggal mulai
            </label>
            <Input
              id="start"
              type="date"
              value={start}
              onChange={(e) => setStart(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="end" className="mb-1 block text-[13px] font-medium text-ink-2">
              Tanggal akhir
            </label>
            <Input id="end" type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
          </div>
          <div>
            <label htmlFor="name" className="mb-1 block text-[13px] font-medium text-ink-2">
              Nama personel
            </label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Filter nama"
              aria-label="Filter nama"
            />
          </div>
          <div>
            <label htmlFor="nrp" className="mb-1 block text-[13px] font-medium text-ink-2">
              NRP
            </label>
            <Input
              id="nrp"
              value={nrp}
              onChange={(e) => setNrp(e.target.value)}
              placeholder="Filter NRP"
              aria-label="Filter NRP"
            />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="status" className="mb-1 block text-[13px] font-medium text-ink-2">
              Status aktivitas
            </label>
            <select
              id="status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="h-11 w-full rounded-control border border-line bg-surface px-3 text-[15px] outline-none focus:border-accent focus:ring-[3px] focus:ring-accent/25"
            >
              <option value="">Semua status</option>
              <option value="AKTIF">AKTIF</option>
              <option value="SELESAI">SELESAI</option>
            </select>
          </div>
        </div>

        {tooLong && (
          <p role="alert" className="mt-3 text-[13px] text-danger">
            Periode maksimal 31 hari.
          </p>
        )}
        {error && (
          <p role="alert" className="mt-3 text-[13px] text-danger">
            {error}{" "}
            <button className="text-accent underline" onClick={onGenerate}>
              coba lagi
            </button>
          </p>
        )}

        <Button
          className="mt-4"
          loading={loading}
          disabled={!valid || loading}
          onClick={onGenerate}
        >
          Buat Laporan
        </Button>
      </Card>
    </>
  );
}

export default function LaporanPage() {
  return (
    <AppShell>
      <LaporanContent />
    </AppShell>
  );
}
