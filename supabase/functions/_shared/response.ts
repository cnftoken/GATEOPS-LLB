// Pembuat respons sukses/galat + requestId (PRD 22.3, 22.6.1).
import { ApiError } from "./errors.ts";

export interface Paginated<T> {
  data: T[];
  page: number;
  pageSize: number;
  total: number;
}

export function success(data: unknown): Response {
  return json({ data });
}

export function paginated<T>(body: Paginated<T>): Response {
  return json(body);
}

export function failure(error: ApiError, requestId: string): Response {
  const payload: Record<string, unknown> = {
    error: {
      code: error.code,
      message: error.message,
      requestId,
    },
  };
  if (error.details !== undefined) {
    (payload.error as Record<string, unknown>).details = error.details;
  }
  return json(payload, error.status);
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
