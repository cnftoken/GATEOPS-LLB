"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/shell";
import { apiList, apiMutate, ApiError } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import { messageForCode } from "@/lib/messages";
import {
  Badge,
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  LINK_TONE,
  PageHeader,
  Skeleton,
} from "@/components/ui";

interface RequestRow {
  persit_account_id: string;
  requested_nrp: string;
  status: "MENUNGGU" | "DISETUJUI" | "DITOLAK";
  created_at: string;
  persit: { nama: string; username: string } | null;
}

const FILTERS = ["MENUNGGU", "DISETUJUI", "DITOLAK"] as const;

function VerifikasiContent() {
  const qc = useQueryClient();
  const [status, setStatus] = useState<(typeof FILTERS)[number]>("MENUNGGU");
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["persit-requests", status],
    queryFn: () => apiList<RequestRow>(`persit/requests?status=${status}&page=1&pageSize=25`),
  });

  const approve = useMutation({
    mutationFn: (id: string) => apiMutate(`persit/accounts/${id}/approve`, "POST"),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["persit-requests"] }),
    onError: (err) =>
      setError(err instanceof ApiError ? err.message : messageForCode("INTERNAL_ERROR")),
  });
  const reject = useMutation({
    mutationFn: (id: string) => apiMutate(`persit/accounts/${id}/reject`, "POST"),
    onSuccess: () => {
      setRejectId(null);
      qc.invalidateQueries({ queryKey: ["persit-requests"] });
    },
    onError: (err) => {
      setRejectId(null);
      setError(err instanceof ApiError ? err.message : messageForCode("INTERNAL_ERROR"));
    },
  });

  return (
    <>
      <PageHeader
        title="Verifikasi Persit"
        description="Setujui atau tolak permintaan pengaitan keluarga."
      />
      <div className="mb-4 inline-flex rounded-control bg-neutral-badge p-1">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setStatus(f)}
            className={`rounded-[8px] px-3 py-1.5 text-[13px] font-medium ${status === f ? "bg-surface text-ink shadow-sm" : "text-ink-2"}`}
          >
            {f}
          </button>
        ))}
      </div>
      {error && <p className="mb-3 text-[13px] text-danger">{error}</p>}
      <Card>
        {isLoading ? (
          <Skeleton className="h-40 w-full" />
        ) : isError || !data ? (
          <ErrorState onRetry={() => refetch()} />
        ) : data.data.length === 0 ? (
          <EmptyState title="Tidak ada permintaan." />
        ) : (
          <ul className="divide-y divide-line">
            {data.data.map((r) => (
              <li key={r.persit_account_id} className="flex items-center justify-between py-3">
                <div>
                  <p className="text-[15px] font-medium">{r.persit?.nama ?? "—"}</p>
                  <p className="text-[13px] text-ink-2">
                    NRP {r.requested_nrp} · {r.persit?.username ?? "—"}
                  </p>
                  <p className="text-[13px] text-ink-3">{formatDateTime(new Date(r.created_at))}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone={LINK_TONE[r.status]}>{r.status}</Badge>
                  {r.status === "MENUNGGU" && (
                    <>
                      <Button
                        loading={approve.isPending}
                        onClick={() => approve.mutate(r.persit_account_id)}
                      >
                        Setujui
                      </Button>
                      <Button variant="secondary" onClick={() => setRejectId(r.persit_account_id)}>
                        Tolak
                      </Button>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
      <ConfirmDialog
        open={rejectId !== null}
        title="Tolak pengaitan?"
        description="Permintaan akan ditolak dan akun Persit tidak terhubung."
        confirmLabel="Tolak"
        danger
        onConfirm={() => rejectId && reject.mutate(rejectId)}
        onClose={() => setRejectId(null)}
      />
    </>
  );
}

export default function VerifikasiPage() {
  return (
    <AppShell>
      <VerifikasiContent />
    </AppShell>
  );
}
