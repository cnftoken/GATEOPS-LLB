// BFF: hanya meneruskan request, mengelola cookie sesi, dan cek Origin.
// Tidak memuat aturan bisnis/state (AGENTS 7.3, PRD 22.1).
import { NextRequest, NextResponse } from "next/server";

export const SESSION_COOKIE = "gateops_session";
const SESSION_MAX_AGE = 12 * 60 * 60; // 12 jam (PRD 7.3.9)

const MUTATION_METHODS = new Set(["POST", "PATCH", "PUT", "DELETE"]);
const MAX_BODY_BYTES = 64 * 1024;
const UPSTREAM_TIMEOUT_MS = 10_000;

// Daftar izin path PRD 22.5. Path di luar daftar tidak pernah diteruskan.
const ALLOWED: ReadonlyArray<readonly [string, RegExp]> = [
  ["GET", /^health$/],
  ["POST", /^auth\/login$/],
  ["POST", /^auth\/logout$/],
  ["GET", /^auth\/me$/],
  ["POST", /^auth\/password$/],
  ["GET", /^dashboard\/komando$/],
  ["GET", /^dashboard\/beranda$/],
  ["GET", /^dashboard\/keluarga$/],
  ["GET", /^personnel$/],
  ["POST", /^personnel$/],
  ["GET", /^personnel\/[^/]+$/],
  ["PATCH", /^personnel\/[^/]+$/],
  ["DELETE", /^personnel\/[^/]+$/],
  ["GET", /^accounts$/],
  ["POST", /^accounts$/],
  ["PATCH", /^accounts\/[^/]+$/],
  ["POST", /^accounts\/[^/]+\/status$/],
  ["POST", /^accounts\/[^/]+\/reset-password$/],
  ["GET", /^gates$/],
  ["POST", /^gates$/],
  ["GET", /^gates\/[^/]+$/],
  ["PATCH", /^gates\/[^/]+$/],
  ["POST", /^gates\/[^/]+\/regenerate-qr$/],
  ["POST", /^transactions\/scan$/],
  ["POST", /^gps\/report$/],
  ["GET", /^gps$/],
  ["GET", /^activities$/],
  ["GET", /^activities\/report$/],
  ["GET", /^activities\/mine$/],
  ["GET", /^activities\/mine\/[^/]+$/],
  ["GET", /^activities\/[^/]+$/],
  ["POST", /^persit\/register$/],
  ["GET", /^persit\/requests$/],
  ["POST", /^persit\/accounts\/[^/]+\/approve$/],
  ["POST", /^persit\/accounts\/[^/]+\/reject$/],
  ["DELETE", /^persit\/accounts\/[^/]+$/],
  ["GET", /^audit$/],
];

function env(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`ENV_MISSING:${name}`);
  return value;
}

function functionsBase(): string {
  return env("SUPABASE_FUNCTIONS_URL").replace(/\/+$/, "");
}

function isSameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    return new URL(origin).host === request.headers.get("host");
  } catch {
    return false;
  }
}

function forbidden(requestId: string): NextResponse {
  return NextResponse.json(
    { error: { code: "FORBIDDEN", message: "Origin tidak diizinkan.", requestId } },
    { status: 403 },
  );
}

export async function handleBff(request: NextRequest, path: string[]): Promise<NextResponse> {
  const requestId = crypto.randomUUID();
  const method = request.method.toUpperCase();
  const route = path.join("/");

  if (path.some((segment) => segment === "" || segment === "." || segment === "..")) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Endpoint tidak ditemukan.", requestId } },
      { status: 404 },
    );
  }
  if (!ALLOWED.some(([m, re]) => m === method && re.test(route))) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Endpoint tidak ditemukan.", requestId } },
      { status: 404 },
    );
  }

  if (MUTATION_METHODS.has(method) && !isSameOrigin(request)) {
    return forbidden(requestId);
  }

  const sessionToken = request.cookies.get(SESSION_COOKIE)?.value;
  const headers = new Headers();
  headers.set("Content-Type", "application/json");
  headers.set("Authorization", `Bearer ${env("SUPABASE_ANON_KEY")}`);
  headers.set("X-Internal-Secret", env("GATEOPS_INTERNAL_SECRET"));
  if (sessionToken) headers.set("X-Session-Token", sessionToken);

  const hasBody = method !== "GET" && method !== "HEAD";
  const declaredLength = Number(request.headers.get("content-length") ?? "0");
  if (hasBody && declaredLength > MAX_BODY_BYTES) {
    return NextResponse.json(
      { error: { code: "VALIDATION_FAILED", message: "Body terlalu besar.", requestId } },
      { status: 413 },
    );
  }
  const body = hasBody ? await request.text() : undefined;
  if (body !== undefined && new TextEncoder().encode(body).length > MAX_BODY_BYTES) {
    return NextResponse.json(
      { error: { code: "VALIDATION_FAILED", message: "Body terlalu besar.", requestId } },
      { status: 413 },
    );
  }

  const upstream = await fetch(`${functionsBase()}/${route}`, {
    method,
    headers,
    body,
    signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
  });

  const isLogin = route === "auth/login" && method === "POST";
  const isLogout = route === "auth/logout";

  if (isLogin && upstream.ok) {
    const payload = (await upstream.json()) as {
      data?: { token?: string; mustChangePassword?: boolean };
    };
    const token = payload.data?.token;
    const response = NextResponse.json(
      { data: { mustChangePassword: payload.data?.mustChangePassword ?? false } },
      { status: upstream.status },
    );
    if (token) {
      response.cookies.set(SESSION_COOKIE, token, {
        httpOnly: true,
        secure: true,
        sameSite: "strict",
        path: "/",
        maxAge: SESSION_MAX_AGE,
      });
    }
    return response;
  }

  const response = new NextResponse(upstream.body, {
    status: upstream.status,
    headers: { "Content-Type": "application/json" },
  });
  if (isLogout) {
    response.cookies.set(SESSION_COOKIE, "", { path: "/", maxAge: 0 });
  }
  return response;
}
