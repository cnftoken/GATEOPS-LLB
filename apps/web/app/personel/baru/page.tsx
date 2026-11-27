"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/shell";
import { apiMutate, ApiError } from "@/lib/api";
import { messageForCode } from "@/lib/messages";
import { Button, Card, Input, PageHeader } from "@/components/ui";

function TambahContent() {
  const router = useRouter();
  const [form, setForm] = useState({
    nama: "",
    nrp: "",
    pangkat: "",
    jabatan: "",
    username: "",
    password: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function set(key: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await apiMutate<{ id: string }>("personnel", "POST", form);
      router.push(`/personel/${res.data.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : messageForCode("INTERNAL_ERROR"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <PageHeader title="Tambah Personel" description="Buat akun personel baru." />
      <Card className="max-w-lg">
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="nama" className="mb-1 block text-[13px] font-medium text-ink-2">
                Nama
              </label>
              <Input
                id="nama"
                value={form.nama}
                onChange={(e) => set("nama", e.target.value)}
                required
              />
            </div>
            <div>
              <label htmlFor="nrp" className="mb-1 block text-[13px] font-medium text-ink-2">
                NRP
              </label>
              <Input
                id="nrp"
                value={form.nrp}
                onChange={(e) => set("nrp", e.target.value)}
                required
              />
            </div>
            <div>
              <label htmlFor="pangkat" className="mb-1 block text-[13px] font-medium text-ink-2">
                Pangkat
              </label>
              <Input
                id="pangkat"
                value={form.pangkat}
                onChange={(e) => set("pangkat", e.target.value)}
                required
              />
            </div>
            <div>
              <label htmlFor="jabatan" className="mb-1 block text-[13px] font-medium text-ink-2">
                Jabatan
              </label>
              <Input
                id="jabatan"
                value={form.jabatan}
                onChange={(e) => set("jabatan", e.target.value)}
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
                onChange={(e) => set("username", e.target.value)}
                required
              />
            </div>
            <div>
              <label htmlFor="password" className="mb-1 block text-[13px] font-medium text-ink-2">
                Password
              </label>
              <Input
                id="password"
                type="password"
                value={form.password}
                onChange={(e) => set("password", e.target.value)}
                required
              />
            </div>
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

export default function TambahPersonelPage() {
  return (
    <AppShell>
      <TambahContent />
    </AppShell>
  );
}
