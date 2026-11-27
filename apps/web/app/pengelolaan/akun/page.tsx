"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/shell";
import { apiList, apiMutate, ApiError } from "@/lib/api";
import { messageForCode } from "@/lib/messages";
import {
  ACCOUNT_TONE,
  Badge,
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  PageHeader,
  Skeleton,
} from "@/components/ui";

interface AccountRow {
  id: string;
  nama: string;
  username: string;
  role: string;
  nrp: string | null;
  status: string;
}

function AkunContent() {
  const qc = useQueryClient();
  const [roleFilter, setRoleFilter] = useState("");
  const [confirmStatus, setConfirmStatus] = useState<{ id: string; status: string } | null>(null);
  const [confirmReset, setConfirmReset] = useState<string | null>(null);
  const [temp, setTemp] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["accounts", roleFilter],
    queryFn: () =>
      apiList<AccountRow>(`accounts?page=1&pageSize=25${roleFilter ? `&role=${roleFilter}` : ""}`),
  });

  const setStatus = useMutation({
    mutationFn: (v: { id: string; status: string }) =>
      apiMutate(`accounts/${v.id}/status`, "POST", { status: v.status }),
    onSuccess: () => {
      setConfirmStatus(null);
      qc.invalidateQueries({ queryKey: ["accounts"] });
    },
    onError: (err) => {
      setConfirmStatus(null);
      setError(err instanceof ApiError ? err.message : messageForCode("INTERNAL_ERROR"));
    },
  });
  const reset = useMutation({
    mutationFn: (id: string) =>
      apiMutate<{ temporaryPassword: string }>(`accounts/${id}/reset-password`, "POST"),
    onSuccess: (res) => {
      setTemp(res.data.temporaryPassword);
      setConfirmReset(null);
    },
    onError: (err) => {
      setConfirmReset(null);
      setError(err instanceof ApiError ? err.message : messageForCode("INTERNAL_ERROR"));
    },
  });

  return (
    <>
      <PageHeader title="Pengelolaan Akun" description="Kelola akun Super Admin dan Komandan." />
      {error && (
        <p role="alert" className="mb-3 text-[13px] text-danger">
          {error}
        </p>
      )}
      {temp && (
        <Card className="mb-4 max-w-lg border-accent/40">
          <p className="text-[15px] font-semibold">Password sementara</p>
          <p className="mt-1 text-[13px] text-ink-2">Ditampilkan satu kali. Salin sekarang.</p>
          <code className="mt-2 block rounded-control bg-app p-3 text-[13px]">{temp}</code>
          <Button variant="secondary" className="mt-3" onClick={() => setTemp(null)}>
            Tutup
          </Button>
        </Card>
      )}
      <div className="mb-4">
        <select
          aria-label="Filter role"
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="h-11 rounded-control border border-line bg-surface px-3 text-[15px] outline-none focus:border-accent focus:ring-[3px] focus:ring-accent/25"
        >
          <option value="">Semua role</option>
          <option value="SUPER_ADMIN">Super Admin</option>
          <option value="KOMANDAN">Komandan</option>
        </select>
      </div>
      <Card>
        {isLoading ? (
          <Skeleton className="h-40 w-full" />
        ) : isError || !data ? (
          <ErrorState onRetry={() => refetch()} />
        ) : data.data.length === 0 ? (
          <EmptyState title="Belum ada akun." />
        ) : (
          <ul className="divide-y divide-line">
            {data.data.map((a) => (
              <li key={a.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="text-[15px] font-medium">
                    {a.nama} <span className="text-ink-3">· @{a.username}</span>
                  </p>
                  <p className="text-[13px] text-ink-2">
                    {a.role === "SUPER_ADMIN" ? "Super Admin" : "Komandan"}
                    {a.nrp ? ` · NRP ${a.nrp}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone={ACCOUNT_TONE[a.status]}>{a.status}</Badge>
                  <Button
                    variant="secondary"
                    onClick={() =>
                      setConfirmStatus({
                        id: a.id,
                        status: a.status === "AKTIF" ? "NONAKTIF" : "AKTIF",
                      })
                    }
                  >
                    {a.status === "AKTIF" ? "Nonaktifkan" : "Aktifkan"}
                  </Button>
                  <Button variant="secondary" onClick={() => setConfirmReset(a.id)}>
                    Reset Password
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <ConfirmDialog
        open={confirmStatus !== null}
        title={confirmStatus?.status === "AKTIF" ? "Aktifkan akun?" : "Nonaktifkan akun?"}
        confirmLabel={confirmStatus?.status === "AKTIF" ? "Aktifkan" : "Nonaktifkan"}
        danger={confirmStatus?.status !== "AKTIF"}
        onConfirm={() => confirmStatus && setStatus.mutate(confirmStatus)}
        onClose={() => setConfirmStatus(null)}
      />
      <ConfirmDialog
        open={confirmReset !== null}
        title="Reset password?"
        description="Password sementara 12 karakter akan dibuat dan ditampilkan satu kali."
        confirmLabel="Reset"
        danger
        onConfirm={() => confirmReset && reset.mutate(confirmReset)}
        onClose={() => setConfirmReset(null)}
      />
    </>
  );
}

export default function AkunPage() {
  return (
    <AppShell>
      <AkunContent />
    </AppShell>
  );
}
