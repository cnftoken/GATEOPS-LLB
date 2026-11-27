"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/shell";
import { apiMutate, ApiError } from "@/lib/api";
import { messageForCode } from "@/lib/messages";
import { Button, Card, Input, PageHeader } from "@/components/ui";
import { QrTokenCard } from "@/components/qr-token";

function BaruContent() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await apiMutate<{ id: string; token: string }>("gates", "POST", {
        name,
        location,
        status: "AKTIF",
      });
      setToken(res.data.token);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : messageForCode("INTERNAL_ERROR"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <PageHeader title="Tambah Gate" description="Buat gate baru dan QR sekali." />
      <Card className="max-w-lg">
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="mb-1 block text-[13px] font-medium text-ink-2">
              Nama
            </label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div>
            <label htmlFor="location" className="mb-1 block text-[13px] font-medium text-ink-2">
              Lokasi
            </label>
            <Input
              id="location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              required
            />
          </div>
          {error && (
            <p role="alert" className="text-[13px] text-danger">
              {error}
            </p>
          )}
          <Button type="submit" loading={loading}>
            Buat Gate
          </Button>
        </form>
      </Card>
      {token && <QrTokenCard token={token} />}
      {token && (
        <div className="mt-4">
          <Button variant="secondary" onClick={() => router.push("/pengelolaan/gate")}>
            Kembali ke daftar
          </Button>
        </div>
      )}
    </>
  );
}

export default function GateBaruPage() {
  return (
    <AppShell>
      <BaruContent />
    </AppShell>
  );
}
