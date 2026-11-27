"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell, useSession } from "@/components/shell";
import { apiMutate, ApiError } from "@/lib/api";
import { MESSAGES, messageForCode } from "@/lib/messages";
import { homeForRole } from "@/lib/session";
import { Button, Card, Input, PageHeader } from "@/components/ui";

function ChangePasswordForm() {
  const router = useRouter();
  const { data } = useSession();
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (newPassword !== confirm) {
      setError("Konfirmasi password tidak cocok.");
      return;
    }
    setLoading(true);
    try {
      await apiMutate("auth/password", "POST", { oldPassword, newPassword });
      setDone(true);
      const role = data?.data.role;
      setTimeout(() => router.replace(role ? homeForRole(role) : "/"), 1200);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : messageForCode("INTERNAL_ERROR"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <PageHeader title="Ganti Password" description="Gunakan password yang kuat dan unik." />
      <Card className="max-w-md">
        {done ? (
          <p className="text-[15px] text-success">{MESSAGES.PASSWORD_CHANGED}</p>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label htmlFor="old" className="mb-1 block text-[13px] font-medium text-ink-2">
                Password lama
              </label>
              <Input
                id="old"
                type="password"
                autoComplete="current-password"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                required
              />
            </div>
            <div>
              <label htmlFor="new" className="mb-1 block text-[13px] font-medium text-ink-2">
                Password baru
              </label>
              <Input
                id="new"
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
            </div>
            <div>
              <label htmlFor="confirm" className="mb-1 block text-[13px] font-medium text-ink-2">
                Ulangi password baru
              </label>
              <Input
                id="confirm"
                type="password"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
              />
            </div>
            {error && <p className="text-[13px] text-danger">{error}</p>}
            <Button type="submit" loading={loading} className="w-full">
              Simpan
            </Button>
          </form>
        )}
      </Card>
    </>
  );
}

export default function ChangePasswordPage() {
  return (
    <AppShell>
      <ChangePasswordForm />
    </AppShell>
  );
}
