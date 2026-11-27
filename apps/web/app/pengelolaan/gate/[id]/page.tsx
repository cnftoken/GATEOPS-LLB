"use client";

import { use, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
  Input,
  PageHeader,
  Skeleton,
} from "@/components/ui";

interface GateDetail {
  id: string;
  name: string;
  location: string;
  status: string;
  qr_regenerated_at: string | null;
  created_at: string;
}

function DetailContent({ id }: { id: string }) {
  const qc = useQueryClient();
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["gate", id],
    queryFn: () => apiGet<GateDetail>(`gates/${id}`),
  });
  const [form, setForm] = useState<{ name: string; location: string; status: string } | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [confirmRegen, setConfirmRegen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const regen = useMutation({
    mutationFn: () => apiMutate<{ token: string }>(`gates/${id}/regenerate-qr`, "POST"),
    onSuccess: (res) => {
      setToken(res.data.token);
      setConfirmRegen(false);
      qc.invalidateQueries({ queryKey: ["gate", id] });
    },
    onError: (err) => {
      setConfirmRegen(false);
      setError(err instanceof ApiError ? err.message : messageForCode("INTERNAL_ERROR"));
    },
  });

  if (isLoading) return <Skeleton className="h-48 w-full" />;
  if (isError || !data) return <ErrorState onRetry={() => refetch()} />;

  const g = data.data;
  const f = form ?? { name: g.name, location: g.location, status: g.status };

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await apiMutate(`gates/${id}`, "PATCH", f);
      qc.invalidateQueries({ queryKey: ["gate", id] });
      setForm(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : messageForCode("INTERNAL_ERROR"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader
        title={g.name}
        description={g.location}
        actions={<Badge tone={ACCOUNT_TONE[g.status]}>{g.status}</Badge>}
      />
      {error && <p className="mb-3 text-[13px] text-danger">{error}</p>}
      <Card className="max-w-lg">
        <form onSubmit={onSave} className="space-y-4">
          <div>
            <label className="mb-1 block text-[13px] font-medium text-ink-2">Nama</label>
            <Input
              value={f.name}
              onChange={(e) => setForm({ ...f, name: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-[13px] font-medium text-ink-2">Lokasi</label>
            <Input
              value={f.location}
              onChange={(e) => setForm({ ...f, location: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-[13px] font-medium text-ink-2">Status</label>
            <select
              value={f.status}
              onChange={(e) => setForm({ ...f, status: e.target.value })}
              className="h-10 w-full rounded-control border border-line bg-surface px-3 text-[15px]"
            >
              <option value="AKTIF">AKTIF</option>
              <option value="NONAKTIF">NONAKTIF</option>
            </select>
          </div>
          <div className="flex gap-2">
            <Button type="submit" loading={saving}>
              Simpan
            </Button>
            <Button type="button" variant="secondary" onClick={() => setConfirmRegen(true)}>
              Regenerasi QR
            </Button>
          </div>
        </form>
      </Card>
      {token && (
        <Card className="mt-4 max-w-lg border-accent/40">
          <p className="text-[15px] font-semibold">Token QR baru</p>
          <p className="mt-1 text-[13px] text-ink-2">Token mentah hanya ditampilkan satu kali.</p>
          <code className="mt-2 block break-all rounded-control bg-app p-3 text-[13px]">
            {token}
          </code>
        </Card>
      )}
      <ConfirmDialog
        open={confirmRegen}
        title="Regenerasi QR?"
        description="QR lama akan tidak berlaku. Token baru ditampilkan satu kali."
        confirmLabel="Regenerasi"
        danger
        onConfirm={() => regen.mutate()}
        onClose={() => setConfirmRegen(false)}
      />
    </>
  );
}

export default function GateDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <AppShell>
      <DetailContent id={id} />
    </AppShell>
  );
}
