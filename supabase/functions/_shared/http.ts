// Util request: parsing JSON body dan paginasi (PRD 22.6).
import { ApiError } from "./errors.ts";

export async function readJson(req: Request): Promise<Record<string, unknown>> {
  try {
    const body = await req.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      throw new Error("not-object");
    }
    return body as Record<string, unknown>;
  } catch {
    throw new ApiError("VALIDATION_FAILED");
  }
}

export interface Pagination {
  page: number;
  pageSize: number;
}

export function parsePagination(url: string): Pagination {
  const params = new URL(url).searchParams;
  const rawPage = Number(params.get("page") ?? "1");
  const rawSize = Number(params.get("pageSize") ?? "25");
  const page = Number.isFinite(rawPage) && rawPage >= 1 ? Math.floor(rawPage) : 1;
  const pageSize =
    Number.isFinite(rawSize) && rawSize >= 1 ? Math.min(100, Math.floor(rawSize)) : 25;
  return { page, pageSize };
}

export function asString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

export function segments(path: string): string[] {
  return path.split("/").filter(Boolean);
}

// Tolak karakter yang dapat menyuntik sintaks filter PostgREST (koma, kurung, backslash).
export function safeFilter(value: string): string {
  if (/[,()\\]/.test(value)) throw new ApiError("VALIDATION_FAILED");
  return value;
}
