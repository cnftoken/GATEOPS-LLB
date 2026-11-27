// Klien API browser. Seluruh panggilan melewati BFF /api/v1/* (AGENTS 2.3).
// Tidak menyimpan token; cookie sesi dikelola BFF (HttpOnly).
import { messageForCode, NETWORK_ERROR_MESSAGE } from "./messages";

export class ApiError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

interface ListResponse<T> {
  data: T[];
  page?: number;
  pageSize?: number;
  total?: number;
}
interface SingleResponse<T> {
  data: T;
}
interface ErrorResponse {
  error?: { code?: string; message?: string };
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`/api/v1/${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
      credentials: "same-origin",
    });
  } catch {
    throw new ApiError("NETWORK", NETWORK_ERROR_MESSAGE, 0);
  }

  const text = await res.text();
  const body = (text ? JSON.parse(text) : {}) as ErrorResponse & Record<string, unknown>;

  if (!res.ok) {
    const code = body.error?.code ?? "INTERNAL_ERROR";
    throw new ApiError(code, messageForCode(code), res.status);
  }
  return body as T;
}

export function apiGet<T>(path: string): Promise<SingleResponse<T>> {
  return request<SingleResponse<T>>(path, { method: "GET" });
}

export function apiList<T>(path: string): Promise<ListResponse<T>> {
  return request<ListResponse<T>>(path, { method: "GET" });
}

export function apiMutate<T>(
  path: string,
  method: "POST" | "PATCH" | "PUT" | "DELETE",
  body?: unknown,
): Promise<SingleResponse<T>> {
  return request<SingleResponse<T>>(path, {
    method,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}
