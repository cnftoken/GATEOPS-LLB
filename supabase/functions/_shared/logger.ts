// Logger JSON terstruktur dengan daftar kunci terlarang (PRD 8.5, 24.5, AGENTS 8.5).
// Kunci sensitif dibuang otomatis: password, token, secret, lat/long, tujuan, keperluan.

const FORBIDDEN_KEYS = new Set([
  "password",
  "password_hash",
  "passwordhash",
  "token",
  "token_hash",
  "session_token",
  "x-session-token",
  "secret",
  "x-internal-secret",
  "cookie",
  "authorization",
  "latitude",
  "longitude",
  "tujuan",
  "keperluan",
  "qr_token",
  "qr_token_hash",
  "service_role_key",
]);

const REDACTED = "[REDACTED]";

function redact(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redact);
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      if (FORBIDDEN_KEYS.has(key.toLowerCase())) {
        out[key] = REDACTED;
      } else {
        out[key] = redact(val);
      }
    }
    return out;
  }
  return value;
}

export interface LogFields {
  endpoint?: string;
  role?: string;
  durationMs?: number;
  [key: string]: unknown;
}

export interface Logger {
  info(message: string, fields?: LogFields): void;
  warn(message: string, fields?: LogFields): void;
  error(message: string, fields?: LogFields): void;
}

export function createLogger(requestId: string): Logger {
  const write = (level: string, message: string, fields?: LogFields): void => {
    const entry = redact({ level, requestId, message, ...fields });
    console.log(JSON.stringify(entry));
  };
  return {
    info: (m, f) => write("info", m, f),
    warn: (m, f) => write("warn", m, f),
    error: (m, f) => write("error", m, f),
  };
}
