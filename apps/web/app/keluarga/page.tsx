"use client";

import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/shell";
import { apiGet } from "@/lib/api";
import type { KeluargaData } from "@/lib/types";
import {
  Badge,
  Card,
  ErrorState,
  LINK_TONE,
  PageHeader,
  PRESENCE_TONE,
  Skeleton,
} from "@/components/ui";

function KeluargaContent() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["keluarga"],
    queryFn: () => apiGet<KeluargaData>("dashboard/keluarga"),
    refetchInterval: 15_000,
  });

  if (isLoading) return <Skeleton className="h-48 w-full" />;
  if (isError || !data) return <ErrorState onRetry={() => refetch()} />;

  const d = data.data;
  return (
    <>
      <PageHeader title="Keluarga" description="Status pengaitan dan personel terhubung." />
      <Card>
        <div className="flex items-center justify-between">
          <p className="text-[13px] font-medium text-ink-2">Status pengaitan</p>
          <Badge tone={LINK_TONE[d.status]}>{d.status}</Badge>
        </div>

        {d.status === "DISETUJUI" && d.personnel ? (
          <div className="mt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[17px] font-semibold">
                  {d.personnel.pangkat} {d.personnel.nama}
                </p>
                <p className="text-[15px] text-ink-2">
                  NRP {d.personnel.nrp} · {d.personnel.jabatan}
                </p>
              </div>
              {d.presence && (
                <Badge tone={PRESENCE_TONE[d.presence]}>
                  {d.presence === "DI LUAR" ? "DI LUAR" : "DI DALAM"}
                </Badge>
              )}
            </div>
          </div>
        ) : (
          <p className="mt-4 text-[15px] text-ink-2">{d.message ?? "Pengajuan sedang diproses."}</p>
        )}
      </Card>
    </>
  );
}

export default function KeluargaPage() {
  return (
    <AppShell>
      <KeluargaContent />
    </AppShell>
  );
}
