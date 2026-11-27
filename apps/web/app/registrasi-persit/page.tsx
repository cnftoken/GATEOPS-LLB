"use client";

import { useState } from "react";
import Link from "next/link";
import { apiMutate, ApiError } from "@/lib/api";
import { messageForCode } from "@/lib/messages";
import { Button, Card, Input } from "@/components/ui";

export default function RegistrasiPersitPage() {
  const [nrp, setNrp] = useState("");
  const [nama, setNama] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await apiMutate("persit/register", "POST", { nrp, nama, username, password });
      setDone(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : messageForCode("INTERNAL_ERROR"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center p-6">
      <Card className="w-full max-w-md">
        <h1 className="text-[28px] font-semibold tracking-[-0.02em]">Registrasi Persit</h1>
        <p className="mt-1 text-[15px] text-ink-2">Daftarkan akun keluarga personel.</p>
        {done ? (
          <div className="mt-6">
            <p className="text-[15px] text-success">
              Registrasi terkirim. Menunggu verifikasi Super Admin.
            </p>
            <Link href="/login" className="mt-4 inline-block text-accent">
              Kembali ke halaman masuk
            </Link>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <div>
              <label htmlFor="nrp" className="mb-1 block text-[13px] font-medium text-ink-2">
                NRP Personel
              </label>
              <Input id="nrp" value={nrp} onChange={(e) => setNrp(e.target.value)} required />
            </div>
            <div>
              <label htmlFor="nama" className="mb-1 block text-[13px] font-medium text-ink-2">
                Nama
              </label>
              <Input id="nama" value={nama} onChange={(e) => setNama(e.target.value)} required />
            </div>
            <div>
              <label htmlFor="username" className="mb-1 block text-[13px] font-medium text-ink-2">
                Username
              </label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
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
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {error && (
              <p role="alert" className="text-[13px] text-danger">
                {error}
              </p>
            )}
            <Button type="submit" loading={loading} className="w-full">
              Daftar
            </Button>
            <p className="text-center text-[13px] text-ink-2">
              <Link href="/login" className="text-accent">
                Kembali ke masuk
              </Link>
            </p>
          </form>
        )}
      </Card>
    </main>
  );
}
