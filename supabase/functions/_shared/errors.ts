// Kode galat terpusat + handler INTERNAL_ERROR (PRD 22.4, AGENTS 8.4).
// UI memetakan code -> messages; server tidak membocorkan detail internal.

export const ERROR_STATUS: Readonly<Record<string, number>> = {
  VALIDATION_FAILED: 400,
  FORM_INCOMPLETE: 400,
  UNAUTHENTICATED: 401,
  SESSION_EXPIRED: 401,
  FORBIDDEN: 403,
  MUST_CHANGE_PASSWORD: 403,
  ACCOUNT_INACTIVE: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  NOT_OUT: 409,
  TRANSACTION_IN_PROGRESS: 409,
  GATE_INACTIVE: 409,
  PERSONNEL_NOT_FOUND: 409,
  INVALID_QR: 422,
  REPORT_TOO_LARGE: 422,
  RATE_LIMITED: 429,
  TRANSACTION_FAILED: 500,
  INTERNAL_ERROR: 500,
} as const;

export type ErrorCode = keyof typeof ERROR_STATUS;

// Pemetaan pesan error RPC (migrasi) -> kode API (PRD 22.4).
const RPC_CODE_MAP: Readonly<Record<string, ErrorCode>> = {
  USERNAME_ALREADY_USED: "CONFLICT",
  CONFLICT: "CONFLICT",
  NRP_ALREADY_USED: "CONFLICT",
  ACCOUNT_NOT_FOUND: "NOT_FOUND",
  GATE_NOT_FOUND: "NOT_FOUND",
  PERSIT_LINK_NOT_FOUND: "NOT_FOUND",
  NRP_NOT_FOUND: "PERSONNEL_NOT_FOUND",
  NRP_NOT_REGISTERED: "NOT_FOUND",
  INVALID_ROLE: "FORBIDDEN",
  CANNOT_DEACTIVATE_SELF: "CONFLICT",
  LAST_SUPER_ADMIN: "CONFLICT",
  PERSONNEL_OUTSIDE: "CONFLICT",
  PERSIT_NOT_PENDING: "CONFLICT",
  NOT_OUT: "NOT_OUT",
  TRANSACTION_IN_PROGRESS: "TRANSACTION_IN_PROGRESS",
  FORM_INCOMPLETE: "FORM_INCOMPLETE",
  GATE_INACTIVE: "GATE_INACTIVE",
};

export class ApiError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly details?: unknown;

  constructor(code: ErrorCode, message?: string, details?: unknown) {
    super(message ?? code);
    this.name = "ApiError";
    this.code = code;
    this.status = ERROR_STATUS[code] ?? 500;
    this.details = details;
  }
}

// Konversi error tak terduga menjadi INTERNAL_ERROR tanpa detail (AGENTS 8.4).
export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;
  return new ApiError("INTERNAL_ERROR");
}

// Petakan pesan exception RPC ke ApiError.
export function fromRpcError(message: string): ApiError {
  const code = RPC_CODE_MAP[message];
  if (code) return new ApiError(code);
  return new ApiError("INTERNAL_ERROR");
}
