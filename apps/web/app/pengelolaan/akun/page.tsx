"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/shell";
import { apiList, apiMutate, ApiError } from "@/lib/api";
import { ROLE_LABEL, type Role } from "@/lib/session";
import { messageForCode } from "@/lib/messages";
import {
  ACCOUNT_TONE,
  Badge,
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  Input,
  PageHeader,
  Pagination,
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
  const [page, setPage] = useState(1);
  const [form, setForm] = useState<{
    id?: string;
    role: string;
    nrp: string;
    nama: string;
    pangkat: string;
    jabatan: string;
    username: string;
    password: string;
  } | null>(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["accounts", roleFilter, page],
    queryFn: () =>
      apiList<AccountRow>(
        `accounts?page=${page}&pageSize=25${roleFilter ? `&role=${roleFilter}` : ""}`,
      ),
  });

  const save = useMutation({
    mutationFn: (v: NonNullable<typeof form>) =>
      v.id
        ? apiMutate(`accounts/${v.id}`, "PATCH", {
            nama: v.nama,
            username: v.username,
            ...(v.role === "KOMANDAN" ? { pangkat: v.pangkat, jabatan: v.jabatan } : {}),
          })
        : apiMutate("accounts", "POST", {
            role: v.role,
            nrp: v.nrp,
            nama: v.nama,
            pangkat: v.pangkat,
            jabatan: v.jabatan,
            username: v.username,
            password: v.password,
          }),
    onSuccess: () => {
      setForm(null);
      qc.invalidateQueries({ queryKey: ["accounts"] });
    },
    onError: (err) =>
      setError(err instanceof ApiError ? err.message : messageForCode("INTERNAL_ERROR")),
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
      <PageHeader
        title="Pengelolaan Akun"
        description="Kelola akun Super Admin dan Komandan."
        actions={
          <Button
            onClick={() =>
              setForm({
                role: "KOMANDAN",
                nrp: "",
                nama: "",
                pangkat: "",
                jabatan: "",
                username: "",
                password: "",
              })
            }
          >
            Buat Akun
          </Button>
        }
      />
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
      {form && (
        <Card className="mb-4 max-w-2xl">
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              setError(null);
              save.mutate(form);
            }}
          >
            <div>
              <label htmlFor="role" className="mb-1 block text-[13px] font-medium text-ink-2">
                Role
              </label>
              <select
                id="role"
                value={form.role}
                disabled={Boolean(form.id)}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
                className="h-11 w-full rounded-control border border-line bg-surface px-3 text-[15px] outline-none focus:border-accent focus:ring-[3px] focus:ring-accent/25"
              >
                <option value="SUPER_ADMIN">Super Admin</option>
                <option value="KOMANDAN">Komandan</option>
              </select>
            </div>
            {form.role === "KOMANDAN" && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label htmlFor="nrp" className="mb-1 block text-[13px] font-medium text-ink-2">
                    NRP
                  </label>
                  <Input
                    id="nrp"
                    value={form.nrp}
                    disabled={Boolean(form.id)}
                    onChange={(e) => setForm({ ...form, nrp: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label
                    htmlFor="pangkat"
                    className="mb-1 block text-[13px] font-medium text-ink-2"
                  >
                    Pangkat
                  </label>
                  <Input
                    id="pangkat"
                    value={form.pangkat}
                    onChange={(e) => setForm({ ...form, pangkat: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label
                    htmlFor="jabatan"
                    className="mb-1 block text-[13px] font-medium text-ink-2"
                  >
                    Jabatan
                  </label>
                  <Input
                    id="jabatan"
                    value={form.jabatan}
                    onChange={(e) => setForm({ ...form, jabatan: e.target.value })}
                    required
                  />
                </div>
              </div>
            )}
            <div>
              <label htmlFor="nama" className="mb-1 block text-[13px] font-medium text-ink-2">
                Nama
              </label>
              <Input
                id="nama"
                value={form.nama}
                onChange={(e) => setForm({ ...form, nama: e.target.value })}
                required
              />
            </div>
            <div>
              <label htmlFor="username" className="mb-1 block text-[13px] font-medium text-ink-2">
                Username
              </label>
              <Input
                id="username"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                required
              />
            </div>
            {!form.id && (
              <div>
                <label htmlFor="password" className="mb-1 block text-[13px] font-medium text-ink-2">
                  Password
                </label>
                <Input
                  id="password"
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required
                />
              </div>
            )}
            <div className="flex gap-2">
              <Button type="submit" loading={save.isPending}>
                Simpan
              </Button>
              <Button type="button" variant="secondary" onClick={() => setForm(null)}>
                Batal
              </Button>
            </div>
          </form>
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
                    {ROLE_LABEL[a.role as Role] ?? a.role}
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
                  <Button
                    variant="secondary"
                    onClick={() =>
                      setForm({
                        id: a.id,
                        role: a.role,
                        nrp: a.nrp ?? "",
                        nama: a.nama,
                        pangkat: "",
                        jabatan: "",
                        username: a.username,
                        password: "",
                      })
                    }
                  >
                    Ubah
                  </Button>
                  <Button variant="secondary" onClick={() => setConfirmReset(a.id)}>
                    Reset Password
                  </Button>
                </div>
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
