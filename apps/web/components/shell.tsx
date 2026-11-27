"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  LogIn,
  MapPin,
  FileText,
  Heart,
  Settings,
  DoorOpen,
  ShieldCheck,
  ScrollText,
  type LucideIcon,
} from "lucide-react";
import { apiGet } from "@/lib/api";
import { homeForRole, type Me, type Role } from "@/lib/session";
import { Skeleton } from "./ui";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

const NAV: Record<Role, NavItem[]> = {
  SUPER_ADMIN: [
    { href: "/komando", label: "Dashboard Komando", icon: LayoutDashboard },
    { href: "/personel", label: "Data Personel", icon: Users },
    { href: "/gps", label: "GPS Tracking", icon: MapPin },
    { href: "/riwayat", label: "Riwayat & Laporan", icon: FileText },
    { href: "/keluarga/verifikasi", label: "Verifikasi Persit", icon: Heart },
    { href: "/pengelolaan/gate", label: "Gate & QR", icon: DoorOpen },
    { href: "/pengelolaan/akun", label: "Akun", icon: ShieldCheck },
    { href: "/pengelolaan/audit", label: "Audit Log", icon: ScrollText },
    { href: "/pengaturan", label: "Pengaturan", icon: Settings },
  ],
  KOMANDAN: [
    { href: "/komando", label: "Dashboard Komando", icon: LayoutDashboard },
    { href: "/personel", label: "Data Personel", icon: Users },
    { href: "/gps", label: "GPS Tracking", icon: MapPin },
    { href: "/riwayat", label: "Riwayat & Laporan", icon: FileText },
    { href: "/pengaturan", label: "Pengaturan", icon: Settings },
  ],
  PERSONEL: [
    { href: "/beranda", label: "Beranda", icon: LayoutDashboard },
    { href: "/keluar-masuk/scan", label: "Scan QR", icon: LogIn },
    { href: "/keluar-masuk/riwayat", label: "Riwayat", icon: FileText },
    { href: "/pengaturan", label: "Pengaturan", icon: Settings },
  ],
  PERSIT: [
    { href: "/keluarga", label: "Keluarga", icon: Heart },
    { href: "/pengaturan", label: "Pengaturan", icon: Settings },
  ],
};

export function useSession() {
  return useQuery({
    queryKey: ["me"],
    queryFn: () => apiGet<Me>("auth/me"),
    staleTime: 60_000,
    retry: false,
  });
}

function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

// Prefix rute yang diizinkan per role (PRD 20.1). Otorisasi tetap di server.
const ALLOWED: Record<Role, string[]> = {
  SUPER_ADMIN: [
    "/komando",
    "/personel",
    "/gps",
    "/riwayat",
    "/laporan",
    "/keluarga",
    "/pengelolaan",
    "/pengaturan",
  ],
  KOMANDAN: ["/komando", "/personel", "/gps", "/riwayat", "/laporan", "/pengaturan"],
  PERSONEL: ["/beranda", "/keluar-masuk", "/pengaturan"],
  PERSIT: ["/keluarga", "/pengaturan"],
};

function isAllowed(role: Role, pathname: string): boolean {
  if (pathname === "/ganti-password" || pathname === "/pengaturan") return true;
  return ALLOWED[role].some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { data, isLoading, isError } = useSession();

  if (isLoading) {
    return (
      <div className="mx-auto max-w-[1200px] p-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="mt-6 h-40 w-full" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6">
        <p className="text-[17px] font-semibold">Sesi berakhir</p>
        <p className="text-[15px] text-ink-2">Silakan masuk kembali.</p>
        <Link href="/login" className="rounded-control bg-accent px-4 py-2 text-white">
          Ke halaman masuk
        </Link>
      </div>
    );
  }

  const me = data.data;
  const items = NAV[me.role];

  if (me.mustChangePassword && pathname !== "/ganti-password") {
    router.replace("/ganti-password");
    return null;
  }

  if (!isAllowed(me.role, pathname) && pathname !== "/ganti-password") {
    router.replace(homeForRole(me.role));
    return null;
  }

  return (
    <div className="min-h-screen">
      <Sidebar items={items} pathname={pathname} nama={me.nama} />
      <main className="md:pl-[260px] md:pr-6 pb-24 md:pb-10 pt-6 md:pt-10">
        <div className="mx-auto max-w-[1200px]">{children}</div>
      </main>
      <BottomNav items={items} pathname={pathname} />
    </div>
  );
}

function Sidebar({ items, pathname, nama }: { items: NavItem[]; pathname: string; nama: string }) {
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-[260px] flex-col border-r border-line bg-surface/70 backdrop-blur-xl md:flex md:w-[72px] lg:w-[260px]">
      <div className="flex h-16 items-center gap-2 px-5">
        <span className="grid h-8 w-8 place-items-center rounded-control bg-accent text-white">
          G
        </span>
        <span className="hidden text-[17px] font-semibold lg:inline">GATEOPS</span>
      </div>
      <nav className="flex-1 space-y-1 px-3 py-2">
        {items.map((item) => {
          const Icon = item.icon;
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-label={item.label}
              title={item.label}
              className={`flex h-11 items-center gap-3 rounded-control px-3 text-[15px] ${
                active ? "bg-black/5 font-medium text-accent" : "text-ink-2 hover:bg-black/5"
              }`}
            >
              <Icon className="h-5 w-5 shrink-0" aria-hidden />
              <span className="hidden lg:inline">{item.label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="hidden border-t border-line p-4 text-[13px] text-ink-3 lg:block">{nama}</div>
    </aside>
  );
}

function BottomNav({ items, pathname }: { items: NavItem[]; pathname: string }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t border-line bg-surface/90 backdrop-blur-xl md:hidden">
      {items.map((item) => {
        const Icon = item.icon;
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-label={item.label}
            className={`flex flex-1 flex-col items-center gap-1 py-2 text-[11px] ${active ? "text-accent" : "text-ink-3"}`}
          >
            <Icon className="h-5 w-5" aria-hidden />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
