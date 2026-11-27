"use client";

import { use, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/shell";
import { apiGet, apiMutate, ApiError } from "@/lib/api";
import { messageForCode } from "@/lib/messages";
import {
  ACCOUNT_TONE,
  Badge,
  Button,
  Card,
  ConfirmDialog,
  ErrorState,
  PageHeader,
  Skeleton,
} from "@/components/ui";

interface PersonDetail {
  id: string;
  nama: string;
  nrp: string;
  pangkat: string;
  jabatan: string;
  username: string;
  status: string;
  presence: string;
  persitCount: number;
}

function DetailContent({ id }: { id: string }) {
  const router = useRouter();
  const qc = useQueryClient();
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["personnel", id],
    queryFn: () => apiGet<PersonDetail>(`personnel/${id}`),
  });

  const del = useMutation({
    mutationFn: () => apiMutate(`personnel/${id}`, "DELETE"),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["personnel"] });
      router.push("/personel");
    },
    onError: (err) => {
      setConfirm(false);
      setError(err instanceof ApiError ? err.message : messageForCode("INTERNAL_ERROR"));
    },
  });

  if (isLoading) return <Skeleton className="h-48 w-full" />;
  if (isError || !data) return <ErrorState onRetry={() => refetch()} />;

  const p = data.data;
  return (
    <>
      <PageHeader
        title={`${p.pangkat} ${p.nama}`}
        description={`NRP ${p.nrp}`}
        actions={
          <>
            <Link href={`/personel/${id}/edit`}>
              <Button variant="secondary">Ubah</Button>
            </Link>
            <Button variant="danger" onClick={() => setConfirm(true)}>
              Hapus
            </Button>
          </>
        }
      />
      {error && (
        <p role="alert" className="mb-3 text-[13px] text-danger">
          {error}
        </p>
      )}
      <Card className="max-w-lg">
        <dl className="grid grid-cols-1 gap-4 text-[15px] sm:grid-cols-2">
          <div>
            <dt className="text-[13px] text-ink-2">Nama</dt>
            <dd>{p.nama}</dd>
          </div>
          <div>
            <dt className="text-[13px] text-ink-2">NRP</dt>
            <dd>{p.nrp}</dd>
          </div>
          <div>
            <dt className="text-[13px] text-ink-2">Pangkat</dt>
            <dd>{p.pangkat}</dd>
          </div>
          <div>
            <dt className="text-[13px] text-ink-2">Jabatan</dt>
            <dd>{p.jabatan}</dd>
          </div>
          <div>
            <dt className="text-[13px] text-ink-2">Username</dt>
            <dd>@{p.username}</dd>
          </div>
          <div>
            <dt className="text-[13px] text-ink-2">Status</dt>
            <dd>
              <Badge tone={ACCOUNT_TONE[p.status]}>{p.status}</Badge>
            </dd>
          </div>
        </dl>
      </Card>
      <ConfirmDialog
        open={confirm}
        title="Hapus personel?"
        description={
          p.presence === "DI LUAR"
            ? `Personel sedang DI LUAR. Aktivitas aktif dan lokasi GPS terakhir akan ikut dihapus.${
                p.persitCount > 0
                  ? ` ${p.persitCount} akun Persit terhubung juga akan dihapus.`
                  : ""
              }`
            : `Personel akan dihapus permanen. Tindakan ini tidak dapat dibatalkan.${
                p.persitCount > 0
                  ? ` ${p.persitCount} akun Persit terhubung juga akan dihapus.`
                  : ""
              }`
        }
        confirmLabel="Hapus"
        danger
        onConfirm={() => del.mutate()}
        onClose={() => setConfirm(false)}
      />
    </>
  );
}

export default function PersonelDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <AppShell>
      <DetailContent id={id} />
    </AppShell>
  );
}
