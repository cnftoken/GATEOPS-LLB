"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/shell";
import { apiGet, apiMutate, ApiError } from "@/lib/api";
import { messageForCode } from "@/lib/messages";
import { Button, Card, ErrorState, Input, PageHeader, Skeleton } from "@/components/ui";

interface PersonDetail {
  id: string;
  nama: string;
  nrp: string;
  pangkat: string;
  jabatan: string;
  username: string;
}

function EditContent({ id }: { id: string }) {
  const router = useRouter();
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["personnel", id],
    queryFn: () => apiGet<PersonDetail>(`personnel/${id}`),
  });
  const [form, setForm] = useState<{
    nama: string;
    pangkat: string;
    jabatan: string;
    username: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (isLoading) return <Skeleton className="h-48 w-full" />;
  if (isError || !data) return <ErrorState onRetry={() => refetch()} />;

  const p = data.data;
  const f = form ?? { nama: p.nama, pangkat: p.pangkat, jabatan: p.jabatan, username: p.username };

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await apiMutate(`personnel/${id}`, "PATCH", f);
      router.push(`/personel/${id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : messageForCode("INTERNAL_ERROR"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <PageHeader title="Ubah Personel" description={`NRP ${p.nrp} (tidak dapat diubah).`} />
      <Card className="max-w-lg">
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label htmlFor="nama" className="mb-1 block text-[13px] font-medium text-ink-2">
              Nama
            </label>
            <Input
              id="nama"
              value={f.nama}
              onChange={(e) => setForm({ ...f, nama: e.target.value })}
              required
            />
          </div>
          <div>
            <label htmlFor="pangkat" className="mb-1 block text-[13px] font-medium text-ink-2">
              Pangkat
            </label>
            <Input
              id="pangkat"
              value={f.pangkat}
              onChange={(e) => setForm({ ...f, pangkat: e.target.value })}
              required
            />
          </div>
          <div>
            <label htmlFor="jabatan" className="mb-1 block text-[13px] font-medium text-ink-2">
              Jabatan
            </label>
            <Input
              id="jabatan"
              value={f.jabatan}
              onChange={(e) => setForm({ ...f, jabatan: e.target.value })}
              required
            />
          </div>
          <div>
            <label htmlFor="username" className="mb-1 block text-[13px] font-medium text-ink-2">
              Username
            </label>
            <Input
              id="username"
              value={f.username}
              onChange={(e) => setForm({ ...f, username: e.target.value })}
              required
            />
          </div>
          {error && (
            <p role="alert" className="text-[13px] text-danger">
              {error}
            </p>
          )}
          <Button type="submit" loading={loading}>
            Simpan
          </Button>
        </form>
      </Card>
    </>
  );
}

export default function PersonelEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <AppShell>
      <EditContent id={id} />
    </AppShell>
  );
}
