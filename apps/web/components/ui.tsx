"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";

/* Badge status (PRD 21.4). Selalu ada teks. */
type Tone = "success" | "warning" | "danger" | "accent" | "neutral";
const TONE: Record<Tone, string> = {
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  danger: "bg-danger/10 text-danger",
  accent: "bg-accent/10 text-accent",
  neutral: "bg-neutral-badge text-ink-2",
};

export function Badge({ tone = "neutral", children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[13px] font-medium ${TONE[tone]}`}
    >
      {children}
    </span>
  );
}

export const PRESENCE_TONE: Record<string, Tone> = { DI_DALAM: "success", DI_LUAR: "warning" };
export const GPS_TONE: Record<string, Tone> = {
  AKTIF: "accent",
  OFFLINE: "warning",
  TIDAK_AKTIF: "neutral",
};
export const ACTIVITY_TONE: Record<string, Tone> = { AKTIF: "warning", SELESAI: "neutral" };
export const ACCOUNT_TONE: Record<string, Tone> = { AKTIF: "success", NONAKTIF: "neutral" };
export const LINK_TONE: Record<string, Tone> = {
  MENUNGGU: "warning",
  DISETUJUI: "success",
  DITOLAK: "danger",
};

/* Tombol (PRD 21.3). */
export function Button({
  variant = "primary",
  loading,
  className = "",
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger";
  loading?: boolean;
}) {
  const base =
    "inline-flex h-11 items-center justify-center gap-2 rounded-control px-4 text-[15px] font-medium focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-accent/30 disabled:opacity-50";
  const styles = {
    primary: "bg-accent text-white hover:bg-accent-hover",
    secondary: "bg-neutral-badge text-ink hover:bg-black/5",
    danger: "bg-danger text-white hover:opacity-90",
  }[variant];
  return (
    <button
      className={`${base} ${styles} ${className}`}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading && (
        <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/50 border-t-white" />
      )}
      {children}
    </button>
  );
}

export function Card({ className = "", children }: { className?: string; children: ReactNode }) {
  return (
    <div className={`rounded-card bg-surface p-4 shadow-card sm:p-5 ${className}`}>{children}</div>
  );
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-[24px] font-semibold leading-tight tracking-[-0.02em] sm:text-[28px]">
          {title}
        </h1>
        {description && <p className="mt-1 text-[15px] text-ink-2">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </header>
  );
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`h-11 w-full rounded-control border border-line bg-surface px-3 text-[15px] outline-none focus:border-accent focus:ring-[3px] focus:ring-accent/25 ${props.className ?? ""}`}
    />
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div aria-hidden className={`animate-pulse rounded-md bg-black/5 ${className}`} />;
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div
      role="status"
      className="flex flex-col items-center justify-center gap-1 py-12 text-center"
    >
      <p className="text-[17px] font-semibold">{title}</p>
      {hint && <p className="text-[15px] text-ink-2">{hint}</p>}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-center justify-center gap-3 py-12 text-center">
      <p className="text-[17px] font-semibold">Terjadi kesalahan</p>
      {message && <p className="text-[15px] text-ink-2">{message}</p>}
      {onRetry && (
        <Button variant="secondary" onClick={onRetry}>
          Coba lagi
        </Button>
      )}
    </div>
  );
}

export function Pagination({
  page,
  total,
  pageSize,
  onPage,
}: {
  page: number;
  total: number;
  pageSize: number;
  onPage: (p: number) => void;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  return (
    <nav aria-label="Paginasi" className="mt-4 flex items-center justify-center gap-3 text-[15px]">
      <Button variant="secondary" disabled={page <= 1} onClick={() => onPage(page - 1)}>
        Sebelumnya
      </Button>
      <span className="text-ink-2">
        Halaman {page} dari {pages}
      </span>
      <Button variant="secondary" disabled={page >= pages} onClick={() => onPage(page + 1)}>
        Berikutnya
      </Button>
    </nav>
  );
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Konfirmasi",
  danger,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const titleId = useId();
  const descId = useId();
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const node = ref.current;
    const focusable = node?.querySelectorAll<HTMLElement>(
      "button, [href], input, select, textarea",
    );
    focusable?.[0]?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab" && focusable && focusable.length > 0) {
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      previous?.focus();
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
      onClick={onClose}
    >
      <div
        ref={ref}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        className="max-h-[85vh] w-full max-w-sm overflow-y-auto rounded-card bg-surface p-5 shadow-card"
        onClick={(e) => e.stopPropagation()}
      >
        <p id={titleId} className="text-[17px] font-semibold">
          {title}
        </p>
        {description && (
          <p id={descId} className="mt-1 text-[15px] text-ink-2">
            {description}
          </p>
        )}
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Batal
          </Button>
          <Button variant={danger ? "danger" : "primary"} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

/* Segmented control untuk filter (PRD 21.3). */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly T[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div role="group" className="inline-flex rounded-control bg-neutral-badge p-1">
      {options.map((o) => (
        <button
          key={o}
          type="button"
          aria-pressed={value === o}
          onClick={() => onChange(o)}
          className={`min-h-9 rounded-[8px] px-3 py-1.5 text-[13px] font-medium focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-accent/30 ${value === o ? "bg-surface text-ink shadow-sm" : "text-ink-2"}`}
        >
          {o}
        </button>
      ))}
    </div>
  );
}

/* Toast umpan balik aksi (PRD 21.3). Otomatis tutup 4 detik. */
export function Toast({ message, onDone }: { message: string | null; onDone: () => void }) {
  useEffect(() => {
    if (!message) return;
    const id = setTimeout(onDone, 4000);
    return () => clearTimeout(id);
  }, [message, onDone]);
  if (!message) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-control bg-ink px-4 py-2 text-[15px] text-white shadow-card md:bottom-8"
    >
      {message}
    </div>
  );
}

/* Sheet panel bawah untuk mobile (PRD 21.3). */
export function Sheet({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title?: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const titleId = useId();
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    ref.current?.querySelector<HTMLElement>("button, [href], input")?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      previous?.focus();
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/30 md:hidden" onClick={onClose}>
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        className="max-h-[85vh] w-full overflow-y-auto rounded-t-card bg-surface p-5 shadow-card"
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <p id={titleId} className="mb-3 text-[17px] font-semibold">
            {title}
          </p>
        )}
        {children}
      </div>
    </div>
  );
}
