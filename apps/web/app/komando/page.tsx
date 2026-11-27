"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { AppShell } from "@/components/shell";
import { apiGet } from "@/lib/api";
import { formatDateTime, formatNumber } from "@/lib/format";
import type { KomandoData } from "@/lib/types";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  GPS_TONE,
  PageHeader,
  Skeleton,
} from "@/components/ui";

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <p className="text-[13px] font-medium text-ink-2">{label}</p>
      <p className="mt-1 text-[28px] font-semibold tracking-[-0.02em]">{formatNumber(value)}</p>
    </Card>
  );
}

function KomandoContent() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["komando"],
    queryFn: () => apiGet<KomandoData>("dashboard/komando"),
    refetchInterval: 15_000,
  });

  if (isLoading) {
    return (
      <>
        <Skeleton className="h-8 w-56" />
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <Skeleton className="mt-4 h-48 w-full" />
      </>
    );
  }
  if (isError || !data) return <ErrorState onRetry={() => refetch()} />;

  const d = data.data;
  return (
    <>
      <PageHeader
        title="Dashboard Komando"
        description="Ringkasan kehadiran dan personel di luar."
        actions={
          <Link href="/gps">
            <Button variant="secondary">Lihat Peta GPS</Button>
          </Link>
        }
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Stat label="Total Personel" value={d.stats.total} />
        <Stat label="Di Dalam" value={d.stats.inside} />
        <Stat label="Di Luar" value={d.stats.outside} />
      </div>

      <Card className="mt-4">
        <h2 className="text-[17px] font-semibold">Personel di luar</h2>
        {d.outside.length === 0 ? (
          <EmptyState title="Belum ada personel DI LUAR." />
        ) : (
          <ul className="mt-3 divide-y divide-line">
            {d.outside.map((p) => (
              <li key={p.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="text-[15px] font-medium">
                    {p.pangkat} {p.name}
                  </p>
                  <p className="text-[13px] text-ink-2">
                    NRP {p.nrp} · {p.tujuan}
                  </p>
                </div>
                <div className="text-right">
                  <Badge tone={GPS_TONE[p.gpsStatus]}>{p.gpsStatus.replace("_", " ")}</Badge>
                  <p className="mt-1 text-[13px] text-ink-2">
                    {formatDateTime(new Date(p.exitAt))}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="mt-4">
        <h2 className="text-[17px] font-semibold">Aktivitas terbaru</h2>
        {d.recent.length === 0 ? (
          <EmptyState title="Belum ada aktivitas." />
        ) : (
          <ul className="mt-3 divide-y divide-line">
            {d.recent.map((r) => (
              <li key={r.id} className="flex items-center justify-between py-3 text-[15px]">
                <div>
                  <p className="font-medium">{r.name}</p>
                  <p className="text-[13px] text-ink-2">NRP {r.nrp}</p>
                </div>
                <div className="text-right">
                  <p className="text-[13px] font-medium text-ink">{r.type}</p>
                  <p className="text-[13px] text-ink-2">{formatDateTime(new Date(r.at))}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}

export default function KomandoPage() {
  return (
    <AppShell>
      <KomandoContent />
    </AppShell>
  );
}
