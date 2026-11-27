"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { AppShell } from "@/components/shell";
import { apiGet } from "@/lib/api";
import { formatDateTime, formatDuration } from "@/lib/format";
import { useGpsTracking } from "@/lib/use-gps";
import type { BerandaData } from "@/lib/types";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  PageHeader,
  PRESENCE_TONE,
  Skeleton,
  GPS_TONE,
} from "@/components/ui";

function BerandaContent() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["beranda"],
    queryFn: () => apiGet<BerandaData>("dashboard/beranda"),
    refetchInterval: 15_000,
  });

  // Klien GPS aktif hanya saat Personel DI LUAR (PRD 11.1).
  useGpsTracking(data?.data.presence === "DI LUAR");

  if (isLoading) {
    return (
      <>
        <Skeleton className="h-8 w-40" />
        <Skeleton className="mt-6 h-36 w-full" />
        <Skeleton className="mt-4 h-24 w-full" />
      </>
    );
  }
  if (isError || !data) {
    return <ErrorState onRetry={() => refetch()} />;
  }

  const d = data.data;
  const out = d.presence === "DI LUAR";
  const duration = d.active
    ? formatDuration((now - new Date(d.active.exitAt).getTime()) / 1000)
    : null;

  return (
    <>
      <PageHeader
        title="Beranda"
        description="Status kehadiran dan aktivitas Anda."
        actions={
          <Link href="/keluar-masuk/scan">
            <Button>{out ? "Scan untuk Kembali" : "Scan untuk Keluar"}</Button>
          </Link>
        }
      />

      <Card className="mb-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[13px] font-medium text-ink-2">Status Anda</p>
            <div className="mt-1">
              <Badge tone={PRESENCE_TONE[d.presence]}>{out ? "DI LUAR" : "DI DALAM"}</Badge>
            </div>
          </div>
          {d.active && (
            <div className="text-right">
              <p className="text-[13px] font-medium text-ink-2">Durasi di luar</p>
              <p className="text-[17px] font-semibold">{duration}</p>
            </div>
          )}
        </div>
        {d.active && (
          <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-line pt-4 text-[15px]">
            <div>
              <dt className="text-[13px] text-ink-2">Gerbang keluar</dt>
              <dd>{d.active.exitGate ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-[13px] text-ink-2">Status GPS</dt>
              <dd>
                <Badge tone={GPS_TONE[d.active.gpsStatus]}>
                  {d.active.gpsStatus.replace("_", " ")}
                </Badge>
              </dd>
            </div>
            <div>
              <dt className="text-[13px] text-ink-2">Tujuan</dt>
              <dd>{d.active.tujuan}</dd>
            </div>
            <div>
              <dt className="text-[13px] text-ink-2">Keperluan</dt>
              <dd>{d.active.keperluan}</dd>
            </div>
          </dl>
        )}
      </Card>

      <Card>
        <h2 className="text-[17px] font-semibold">Aktivitas terakhir</h2>
        {d.recent.length === 0 ? (
          <EmptyState title="Belum ada aktivitas." hint="Aktivitas Anda akan muncul di sini." />
        ) : (
          <ul className="mt-3 divide-y divide-line">
            {d.recent.map((r) => (
              <li key={r.id} className="flex items-center justify-between py-3 text-[15px]">
                <div>
                  <p className="font-medium">{r.exitGate ?? "Gate"}</p>
                  <p className="text-[13px] text-ink-2">{formatDateTime(new Date(r.exitAt))}</p>
                </div>
                <span className="text-[13px] text-ink-2">
                  {r.returnAt ? `Kembali ${formatDateTime(new Date(r.returnAt))}` : "Belum kembali"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}

export default function BerandaPage() {
  return (
    <AppShell>
      <BerandaContent />
    </AppShell>
  );
}
