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
  Input,
  PageHeader,
  Pagination,
  Skeleton,
} from "@/components/ui";

export interface ActivityRow {
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

function RiwayatContent() {
  const [page, setPage] = useState(1);
  const [name, setName] = useState("");
  const [nrp, setNrp] = useState("");
  const [status, setStatus] = useState("");
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["activities", page, name, nrp, status],
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), pageSize: "25" });
      if (name) params.set("name", name);
      if (nrp) params.set("nrp", nrp);
      if (status) params.set("status", status);
      return apiList<ActivityRow>(`activities?${params.toString()}`);
    },
  });

  return (
    <>
      <PageHeader
        title="Riwayat & Laporan"
        description="Riwayat aktivitas seluruh personel."
        actions={
          <Link href="/laporan" className="text-accent">
            Buat Laporan PDF
          </Link>
        }
      />
      <div className="mb-4 flex flex-wrap gap-3">
        <Input
          placeholder="Nama"
          aria-label="Filter nama"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setPage(1);
          }}
          className="max-w-[180px]"
        />
        <Input
          placeholder="NRP"
          aria-label="Filter NRP"
          value={nrp}
          onChange={(e) => {
            setNrp(e.target.value);
            setPage(1);
          }}
          className="max-w-[140px]"
        />
        <select
          aria-label="Filter status"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
          className="h-11 rounded-control border border-line bg-surface px-3 text-[15px] outline-none focus:border-accent focus:ring-[3px] focus:ring-accent/25"
        >
          <option value="">Semua status</option>
          <option value="AKTIF">AKTIF</option>
          <option value="SELESAI">SELESAI</option>
        </select>
      </div>
      <Card>
        {isLoading ? (
          <Skeleton className="h-40 w-full" />
        ) : isError || !data ? (
          <ErrorState onRetry={() => refetch()} />
        ) : data.data.length === 0 ? (
          <EmptyState title="Belum ada aktivitas." />
        ) : (
          <ul className="divide-y divide-line">
            {data.data.map((r) => (
              <li key={r.id}>
                <Link
                  href={`/riwayat/${r.id}`}
                  className="flex items-center justify-between py-3 hover:bg-black/5"
                >
                  <div>
                    <p className="text-[15px] font-medium">
                      {r.name} <span className="text-ink-3">· {r.nrp}</span>
                    </p>
                    <p className="text-[13px] text-ink-2">
                      {r.exitGate ?? "—"} → {r.returnGate ?? "—"} · {r.tujuan}
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge tone={ACTIVITY_TONE[r.status]}>{r.status}</Badge>
                    <p className="mt-1 text-[13px] text-ink-2">
                      {formatDateTime(new Date(r.exitAt))}
                    </p>
                  </div>
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

export default function RiwayatPage() {
  return (
    <AppShell>
      <RiwayatContent />
    </AppShell>
  );
}
