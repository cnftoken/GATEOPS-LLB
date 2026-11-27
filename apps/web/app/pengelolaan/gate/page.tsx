"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { AppShell } from "@/components/shell";
import { apiList } from "@/lib/api";
import {
  ACCOUNT_TONE,
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  PageHeader,
  Pagination,
  Skeleton,
} from "@/components/ui";

interface GateRow {
  id: string;
  name: string;
  location: string;
  status: string;
  qr_regenerated_at: string | null;
  created_at: string;
}

function GateContent() {
  const [page, setPage] = useState(1);
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["gates", page],
    queryFn: () => apiList<GateRow>(`gates?page=${page}&pageSize=25`),
  });

  return (
    <>
      <PageHeader
        title="Gate & QR"
        description="Daftar gate dan status QR."
        actions={
          <Link href="/pengelolaan/gate/baru">
            <Button>Tambah Gate</Button>
          </Link>
        }
      />
      <Card>
        {isLoading ? (
          <Skeleton className="h-40 w-full" />
        ) : isError || !data ? (
          <ErrorState onRetry={() => refetch()} />
        ) : data.data.length === 0 ? (
          <EmptyState title="Belum ada gate." />
        ) : (
          <ul className="divide-y divide-line">
            {data.data.map((g) => (
              <li key={g.id}>
                <Link
                  href={`/pengelolaan/gate/${g.id}`}
                  className="flex items-center justify-between py-3 hover:bg-black/5"
                >
                  <div>
                    <p className="text-[15px] font-medium">{g.name}</p>
                    <p className="text-[13px] text-ink-2">{g.location}</p>
                  </div>
                  <Badge tone={ACCOUNT_TONE[g.status]}>{g.status}</Badge>
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

export default function GatePage() {
  return (
    <AppShell>
      <GateContent />
    </AppShell>
  );
}
