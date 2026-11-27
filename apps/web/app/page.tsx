"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/components/shell";
import { homeForRole } from "@/lib/session";

export default function HomePage() {
  const router = useRouter();
  const { data, isLoading } = useSession();

  useEffect(() => {
    if (isLoading) return;
    if (!data) {
      router.replace("/login");
      return;
    }
    const me = data.data;
    router.replace(me.mustChangePassword ? "/ganti-password" : homeForRole(me.role));
  }, [data, isLoading, router]);

  return (
    <main className="grid min-h-screen place-items-center">
      <p className="text-[15px] text-ink-2">Memuat…</p>
    </main>
  );
}
