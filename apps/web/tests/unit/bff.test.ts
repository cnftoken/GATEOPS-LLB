// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { handleBff, SESSION_COOKIE } from "@/lib/server/bff";

const BASE = "http://func.local/functions/v1";

function setEnv() {
  process.env.SUPABASE_FUNCTIONS_URL = BASE;
  process.env.SUPABASE_ANON_KEY = "anon-key";
  process.env.GATEOPS_INTERNAL_SECRET = "internal-secret";
}

function req(path: string, init: RequestInit & { headers?: Record<string, string> } = {}) {
  return new NextRequest(`http://localhost/api/v1/${path}`, init as never);
}

beforeEach(() => {
  setEnv();
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("BFF (4.7, PRD 7.3/22.1)", () => {
  it("meneruskan path & header ke Edge Function", async () => {
    const fetchMock = vi.fn(
      async () => new Response(JSON.stringify({ data: { ok: true } }), { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const res = await handleBff(
      req("dashboard/komando", { headers: { cookie: `${SESSION_COOKIE}=sess-123` } }),
      ["dashboard", "komando"],
    );

    expect(res.status).toBe(200);
    const call = fetchMock.mock.calls[0] as [string, RequestInit] | undefined;
    expect(call).toBeDefined();
    const [url, init] = call as [string, RequestInit];
    expect(url).toBe(`${BASE}/dashboard/komando`);
    const headers = init.headers as Headers;
    expect(headers.get("authorization")).toBe("Bearer anon-key");
    expect(headers.get("x-internal-secret")).toBe("internal-secret");
    expect(headers.get("x-session-token")).toBe("sess-123");
  });

  it("menolak mutasi dengan Origin berbeda (403)", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const res = await handleBff(
      req("transactions/scan", {
        method: "POST",
        headers: { origin: "http://evil.example", host: "localhost" },
      }),
      ["transactions", "scan"],
    );

    expect(res.status).toBe(403);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("login sukses menulis cookie sesi & tidak membocorkan token", async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(
          JSON.stringify({ data: { token: "raw-session-token", mustChangePassword: false } }),
          { status: 200 },
        ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const res = await handleBff(
      req("auth/login", {
        method: "POST",
        headers: { origin: "http://localhost", host: "localhost" },
      }),
      ["auth", "login"],
    );

    const body = await res.json();
    expect(body).toEqual({ data: { mustChangePassword: false } });
    const cookie = res.cookies.get(SESSION_COOKIE);
    expect(cookie?.value).toBe("raw-session-token");
    expect(cookie?.httpOnly).toBe(true);
    expect(cookie?.secure).toBe(true);
    expect(cookie?.sameSite).toBe("strict");
  });

  it("logout menghapus cookie", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ data: { ok: true } }), { status: 200 })),
    );

    const res = await handleBff(
      req("auth/logout", {
        method: "POST",
        headers: { origin: "http://localhost", host: "localhost", cookie: `${SESSION_COOKIE}=x` },
      }),
      ["auth", "logout"],
    );

    const cookie = res.cookies.get(SESSION_COOKIE);
    expect(cookie?.value).toBe("");
    expect(cookie?.maxAge).toBe(0);
  });
});
