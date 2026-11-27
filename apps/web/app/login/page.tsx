"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiMutate, ApiError } from "@/lib/api";
import { MESSAGES, messageForCode } from "@/lib/messages";
import { Button, Card, Input } from "@/components/ui";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!username || !password) {
      setError("Username dan password wajib diisi.");
      return;
    }
    setLoading(true);
    try {
      const res = await apiMutate<{ mustChangePassword: boolean }>("auth/login", "POST", {
        username,
        password,
      });
      router.replace(res.data.mustChangePassword ? "/ganti-password" : "/komando");
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : messageForCode("INTERNAL_ERROR"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center p-6">
      <Card className="w-full max-w-sm">
        <div className="mb-6 flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-control bg-accent text-white">
            G
          </span>
          <span className="text-[17px] font-semibold">GATEOPS</span>
        </div>
        <h1 className="text-[28px] font-semibold tracking-[-0.02em]">{MESSAGES.LOGIN_TITLE}</h1>
        <p className="mt-1 text-[15px] text-ink-2">Masuk untuk melanjutkan.</p>
        <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
          <div>
            <label htmlFor="username" className="mb-1 block text-[13px] font-medium text-ink-2">
              Username
            </label>
            <Input
              id="username"
              autoComplete="username"
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
              autoComplete="current-password"
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
            Masuk
          </Button>
        </form>
        <p className="mt-4 text-center text-[13px] text-ink-2">
          Belum punya akun?{" "}
          <Link href="/registrasi-persit" className="text-accent">
            Registrasi Persit
          </Link>
        </p>
      </Card>
    </main>
  );
}
