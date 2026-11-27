"use client";

import dynamic from "next/dynamic";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/shell";
import { apiGet } from "@/lib/api";
import type { KomandoData } from "@/lib/types";
import {
  Badge,
  Card,
  EmptyState,
  ErrorState,
  GPS_TONE,
  PageHeader,
  Skeleton,
} from "@/components/ui";

const GpsMap = dynamic(() => import("@/components/gps-map").then((m) => m.GpsMap), {
  ssr: false,
  loading: () => <Skeleton className="h-[420px] w-full" />,
});

function GpsContent() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["komando"],
    queryFn: () => apiGet<KomandoData>("dashboard/komando"),
    refetchInterval: 15_000,
  });

  if (isLoading) return <Skeleton className="h-[420px] w-full" />;
  if (isError || !data) return <ErrorState onRetry={() => refetch()} />;

  const outside = data.data.outside;
  return (
    <>
      <PageHeader title="GPS Tracking" description="Posisi personel yang sedang di luar." />
      {outside.length === 0 ? (
        <Card>
          <EmptyState title="Belum ada personel DI LUAR." />
        </Card>
      ) : (
        <>
          <GpsMap points={outside} />
          <Card className="mt-4">
            <ul className="divide-y divide-line">
              {outside.map((p) => (
                <li key={p.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-[15px] font-medium">
                      {p.pangkat} {p.name}
                    </p>
                    <p className="text-[13px] text-ink-2">
                      NRP {p.nrp} · {p.tujuan}
                    </p>
                  </div>
                  <Badge tone={GPS_TONE[p.gpsStatus]}>{p.gpsStatus.replace("_", " ")}</Badge>
                </li>
              ))}
            </ul>
          </Card>
        </>
      )}
    </>
  );
}

export default function GpsPage() {
  return (
    <AppShell>
      <GpsContent />
    </AppShell>
  );
}
