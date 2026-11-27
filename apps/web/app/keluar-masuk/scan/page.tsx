"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/shell";
import { CameraScanner } from "@/components/camera-scanner";
import { apiGet, apiMutate, ApiError } from "@/lib/api";
import { SCAN_LIMITS } from "@/lib/limits";
import { formatDateTime, formatDuration } from "@/lib/format";
import { messageForCode } from "@/lib/messages";
import type { BerandaData } from "@/lib/types";
import { Button, Card, Input, PageHeader, Skeleton } from "@/components/ui";

type Phase = "form" | "scan" | "result";

interface ScanResult {
  type: "KELUAR" | "KEMBALI";
  gateName: string;
  occurredAt: string;
  presence: "DI LUAR" | "DI DALAM";
  durationSeconds: number | null;
}

function ScanContent() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["beranda"],
    queryFn: () => apiGet<BerandaData>("dashboard/beranda"),
    refetchInterval: 15_000,
  });

  const isOut = data?.data.presence === "DI LUAR";
  const [phase, setPhase] = useState<Phase>(isOut ? "scan" : "form");
  const [tujuan, setTujuan] = useState("");
  const [keperluan, setKeperluan] = useState("");
  const [scanError, setScanError] = useState<string | null>(null);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [cameraKey, setCameraKey] = useState(0);

  const mutation = useMutation({
    mutationFn: (token: string) =>
      apiMutate<ScanResult>("transactions/scan", "POST", {
        token,
        ...(isOut ? {} : { tujuan: tujuan.trim(), keperluan: keperluan.trim() }),
      }),
    onSuccess: (res) => {
      setResult(res.data);
      setPhase("result");
      setScanError(null);
      setTujuan("");
      setKeperluan("");
      qc.invalidateQueries({ queryKey: ["beranda"] });
    },
    onError: (err) => {
      if (err instanceof ApiError && err.code === "INVALID_QR") {
        // Kamera tetap aktif untuk pemindaian ulang (PRD 10.6).
        setScanError(err.message);
        return;
      }
      // Sesi berakhir / jaringan / server: tutup kamera, tampilkan Scan ulang.
      setScanError(err instanceof ApiError ? err.message : messageForCode("NETWORK"));
      setPhase(isOut ? "scan" : "form");
      setCameraKey((k) => k + 1);
    },
  });

  if (isLoading || !data) {
    return <Skeleton className="h-64 w-full" />;
  }

  const tujuanValid = tujuan.trim().length >= 1 && tujuan.trim().length <= SCAN_LIMITS.tujuanMax;
  const keperluanValid =
    keperluan.trim().length >= 1 && keperluan.trim().length <= SCAN_LIMITS.keperluanMax;

  function scanAgain() {
    setScanError(null);
    setResult(null);
    setPhase(isOut ? "scan" : "form");
    setCameraKey((k) => k + 1);
  }

  return (
    <>
      <PageHeader
        title={isOut ? "Scan untuk Kembali" : "Scan untuk Keluar"}
        description={
          phase === "form"
            ? "Langkah 1 dari 2 · Isi form keluar"
            : phase === "scan"
              ? "Langkah 2 dari 2 · Pindai QR gate"
              : "Transaksi selesai"
        }
      />

      {phase === "form" && (
        <Card className="max-w-md">
          <div className="space-y-4">
            <div>
              <label htmlFor="tujuan" className="mb-1 block text-[13px] font-medium text-ink-2">
                Tujuan
              </label>
              <Input
                id="tujuan"
                maxLength={SCAN_LIMITS.tujuanMax}
                value={tujuan}
                onChange={(e) => setTujuan(e.target.value)}
                placeholder="Tujuan keluar"
              />
            </div>
            <div>
              <label htmlFor="keperluan" className="mb-1 block text-[13px] font-medium text-ink-2">
                Keperluan
              </label>
              <Input
                id="keperluan"
                maxLength={SCAN_LIMITS.keperluanMax}
                value={keperluan}
                onChange={(e) => setKeperluan(e.target.value)}
                placeholder="Keperluan keluar"
              />
            </div>
            {scanError && (
              <p role="alert" className="text-[13px] text-danger">
                {scanError}
              </p>
            )}
            <Button
              className="w-full"
              disabled={!tujuanValid || !keperluanValid}
              onClick={() => setPhase("scan")}
            >
              Lanjut ke kamera
            </Button>
          </div>
        </Card>
      )}

      {phase === "scan" && (
        <div className="max-w-md">
          <CameraScanner
            key={cameraKey}
            paused={mutation.isPending}
            onDecode={(token) => mutation.mutate(token)}
          />
          {scanError && (
            <p role="alert" className="mt-3 text-[13px] text-danger">
              {scanError}
            </p>
          )}
        </div>
      )}

      {phase === "result" && result && (
        <Card className="max-w-md">
          <p className="text-[17px] font-semibold">
            {result.type === "KELUAR" ? "Keluar tercatat" : "Kembali tercatat"}
          </p>
          <p className="mt-1 text-[15px] text-ink-2">
            {formatDateTime(new Date(result.occurredAt))} melalui {result.gateName}.
            {result.durationSeconds !== null &&
              ` Durasi di luar: ${formatDuration(result.durationSeconds)}.`}
          </p>
          <Button variant="secondary" className="mt-4 w-full" onClick={scanAgain}>
            Scan ulang
          </Button>
        </Card>
      )}
    </>
  );
}

export default function ScanPage() {
  return (
    <AppShell>
      <ScanContent />
    </AppShell>
  );
}
