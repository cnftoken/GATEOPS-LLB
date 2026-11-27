// Catch-all BFF /api/v1/[...path] (PRD 22.1, AGENTS 7.3).
import type { NextRequest } from "next/server";
import { handleBff } from "@/lib/server/bff";

type Context = { params: Promise<{ path: string[] }> };

async function dispatch(request: NextRequest, context: Context) {
  const { path } = await context.params;
  return handleBff(request, path);
}

export const GET = dispatch;
export const POST = dispatch;
export const PATCH = dispatch;
export const PUT = dispatch;
export const DELETE = dispatch;
