// BFF: hanya meneruskan request, mengelola cookie sesi, dan cek Origin.
// Tidak memuat aturan bisnis/state (AGENTS 7.3, PRD 22.1).
import { NextRequest, NextResponse } from "next/server";

export const SESSION_COOKIE = "gateops_session";
const SESSION_MAX_AGE = 12 * 60 * 60; // 12 jam (PRD 7.3.9)

const MUTATION_METHODS = new Set(["POST", "PATCH", "PUT", "DELETE"]);

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
  const body = hasBody ? await request.text() : undefined;

  const upstream = await fetch(`${functionsBase()}/${path.join("/")}`, {
    method,
    headers,
    body,
  });

  const isLogin = path.join("/") === "auth/login" && method === "POST";
  const isLogout = path.join("/") === "auth/logout";

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
