"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/shell";
import { apiList } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import {
  Card,
  EmptyState,
  ErrorState,
  Input,
  PageHeader,
  Pagination,
  Skeleton,
} from "@/components/ui";

interface AuditRow {
  id: number;
  occurred_at: string;
  actor_username: string | null;
  actor_role: string | null;
  action: string;
  object_type: string | null;
  object_id: string | null;
}

function AuditContent() {
  const [page, setPage] = useState(1);
  const [action, setAction] = useState("");
  const [username, setUsername] = useState("");
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["audit", page, action, username],
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), pageSize: "25" });
      if (action) params.set("action", action);
      if (username) params.set("username", username);
      return apiList<AuditRow>(`audit?${params.toString()}`);
    },
  });

  if (isLoading) return <Skeleton className="h-64 w-full" />;
  if (isError || !data) return <ErrorState onRetry={() => refetch()} />;

  return (
    <>
      <PageHeader title="Audit Log" description="Catatan aktivitas sistem (append-only)." />
      <div className="mb-4 flex flex-wrap gap-3">
        <Input
          placeholder="Filter aksi"
          value={action}
          onChange={(e) => {
            setAction(e.target.value);
            setPage(1);
          }}
          className="max-w-xs"
        />
        <Input
          placeholder="Filter username"
          value={username}
          onChange={(e) => {
            setUsername(e.target.value);
            setPage(1);
          }}
          className="max-w-xs"
        />
      </div>
      <Card>
        {data.data.length === 0 ? (
          <EmptyState title="Belum ada audit." />
        ) : (
          <ul className="divide-y divide-line">
            {data.data.map((r) => (
              <li key={r.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="text-[15px] font-medium">{r.action}</p>
                  <p className="text-[13px] text-ink-2">
                    {r.actor_username ?? "—"} {r.actor_role ? `(${r.actor_role})` : ""} ·{" "}
                    {r.object_type ?? "—"}
                  </p>
                </div>
                <p className="text-[13px] text-ink-2">{formatDateTime(new Date(r.occurred_at))}</p>
              </li>
            ))}
          </ul>
        )}
        <Pagination
          page={page}
          total={data.total ?? 0}
          pageSize={data.pageSize ?? 25}
          onPage={setPage}
        />
      </Card>
    </>
  );
}

export default function AuditPage() {
  return (
    <AppShell>
      <AuditContent />
    </AppShell>
  );
}
