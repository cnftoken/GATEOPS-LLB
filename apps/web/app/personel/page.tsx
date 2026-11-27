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
  Input,
  PageHeader,
  Pagination,
  Skeleton,
} from "@/components/ui";

interface PersonRow {
  id: string;
  nama: string;
  nrp: string;
  pangkat: string;
  jabatan: string;
  username: string;
  status: string;
}

function PersonelContent() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["personnel", page, search],
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), pageSize: "25" });
      if (search) params.set("search", search);
      return apiList<PersonRow>(`personnel?${params.toString()}`);
    },
  });

  return (
    <>
      <PageHeader
        title="Data Personel"
        description="Daftar personel terdaftar."
        actions={
          <Link href="/personel/baru">
            <Button>Tambah Personel</Button>
          </Link>
        }
      />
      <div className="mb-4">
        <Input
          placeholder="Cari nama, NRP, atau username"
          aria-label="Cari personel"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="max-w-sm"
        />
      </div>
      <Card>
        {isLoading ? (
          <Skeleton className="h-40 w-full" />
        ) : isError || !data ? (
          <ErrorState onRetry={() => refetch()} />
        ) : data.data.length === 0 ? (
          <EmptyState title="Belum ada personel." />
        ) : (
          <ul className="divide-y divide-line">
            {data.data.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/personel/${p.id}`}
                  className="flex items-center justify-between py-3 hover:bg-black/5"
                >
                  <div>
                    <p className="text-[15px] font-medium">
                      {p.pangkat} {p.nama}
                    </p>
                    <p className="text-[13px] text-ink-2">
                      NRP {p.nrp} · @{p.username}
                    </p>
                  </div>
                  <Badge tone={ACCOUNT_TONE[p.status]}>{p.status}</Badge>
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

export default function PersonelPage() {
  return (
    <AppShell>
      <PersonelContent />
    </AppShell>
  );
}
