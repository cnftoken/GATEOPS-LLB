"use client";

import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/shell";
import { apiGet } from "@/lib/api";
import { formatDateTime, formatDuration } from "@/lib/format";
import { ACTIVITY_TONE, Badge, Card, ErrorState, PageHeader, Skeleton } from "@/components/ui";

interface Detail {
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

function DetailContent({ id }: { id: string }) {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["activity-mine", id],
    queryFn: () => apiGet<Detail>(`activities/mine/${id}`),
  });
  if (isLoading) return <Skeleton className="h-48 w-full" />;
  if (isError || !data) return <ErrorState onRetry={() => refetch()} />;
  const r = data.data;
  return (
    <>
      <PageHeader title="Detail Aktivitas" description={`${r.name} · ${r.nrp}`} />
      <Card className="max-w-lg">
        <dl className="grid grid-cols-2 gap-4 text-[15px]">
          <div>
            <dt className="text-[13px] text-ink-2">Status</dt>
            <dd>
              <Badge tone={ACTIVITY_TONE[r.status]}>{r.status}</Badge>
            </dd>
          </div>
          <div>
            <dt className="text-[13px] text-ink-2">Durasi</dt>
            <dd>{r.durationSeconds !== null ? formatDuration(r.durationSeconds) : "—"}</dd>
          </div>
          <div>
            <dt className="text-[13px] text-ink-2">Gate Keluar</dt>
            <dd>{r.exitGate ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-[13px] text-ink-2">Gate Kembali</dt>
            <dd>{r.returnGate ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-[13px] text-ink-2">Waktu Keluar</dt>
            <dd>{formatDateTime(new Date(r.exitAt))}</dd>
          </div>
          <div>
            <dt className="text-[13px] text-ink-2">Waktu Kembali</dt>
            <dd>{r.returnAt ? formatDateTime(new Date(r.returnAt)) : "—"}</dd>
          </div>
          <div className="col-span-2">
            <dt className="text-[13px] text-ink-2">Tujuan</dt>
            <dd>{r.tujuan}</dd>
          </div>
          <div className="col-span-2">
            <dt className="text-[13px] text-ink-2">Keperluan</dt>
            <dd>{r.keperluan}</dd>
          </div>
        </dl>
      </Card>
    </>
  );
}

export default function MineDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <AppShell>
      <DetailContent id={id} />
    </AppShell>
  );
}
