"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { AppShell } from "@/components/shell";
import { apiList } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import {
  ACTIVITY_TONE,
  Badge,
  Card,
  EmptyState,
  ErrorState,
  PageHeader,
  Pagination,
  Skeleton,
} from "@/components/ui";

interface MineRow {
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

function RiwayatPribadiContent() {
  const [page, setPage] = useState(1);
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["activities-mine", page],
    queryFn: () => apiList<MineRow>(`activities/mine?page=${page}&pageSize=25`),
  });

  return (
    <>
      <PageHeader title="Riwayat Pribadi" description="Riwayat keluar-masuk Anda." />
      <Card>
        {isLoading ? (
          <Skeleton className="h-40 w-full" />
        ) : isError || !data ? (
          <ErrorState onRetry={() => refetch()} />
        ) : data.data.length === 0 ? (
          <EmptyState title="Belum ada riwayat." />
        ) : (
          <ul className="divide-y divide-line">
            {data.data.map((r) => (
              <li key={r.id}>
                <Link
                  href={`/keluar-masuk/riwayat/${r.id}`}
                  className="flex items-center justify-between py-3 hover:bg-black/5"
                >
                  <div>
                    <p className="text-[15px] font-medium">
                      {r.exitGate ?? "—"} → {r.returnGate ?? "—"}
                    </p>
                    <p className="text-[13px] text-ink-2">
                      {r.tujuan} · {formatDateTime(new Date(r.exitAt))}
                    </p>
                  </div>
                  <Badge tone={ACTIVITY_TONE[r.status]}>{r.status}</Badge>
                </Link>
              </li>
            ))}
          </ul>
        )}
        <Pagination
          page={page}
          total={data?.total ?? 0}
          pageSize={data?.pageSize ?? 25}
          onPage={setPage}
        />
      </Card>
    </>
  );
}

export default function RiwayatPribadiPage() {
  return (
    <AppShell>
      <RiwayatPribadiContent />
    </AppShell>
  );
}
