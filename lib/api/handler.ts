import { NextResponse, type NextRequest } from "next/server";
import type { z } from "zod";
import { requireUser, type SessionUser } from "@/lib/auth/session";
import { ApiError, errorResponse } from "./errors";

type RouteParams = Record<string, string>;
type RouteContext<P extends RouteParams> = { params: P };
type AuthedContext<P extends RouteParams> = RouteContext<P> & { user: SessionUser };

export function apiHandler<P extends RouteParams = RouteParams>(
  handler: (req: NextRequest, ctx: RouteContext<P>) => Promise<Response>,
) {
  return async (req: NextRequest, ctx: RouteContext<P>): Promise<Response> => {
    try {
      return await handler(req, ctx);
    } catch (error) {
      return errorResponse(error);
    }
  };
}

export function authedHandler<P extends RouteParams = RouteParams>(
  handler: (req: NextRequest, ctx: AuthedContext<P>) => Promise<Response>,
) {
  return apiHandler<P>(async (req, ctx) => {
    const user = await requireUser();
    return handler(req, { ...ctx, user });
  });
}

export async function parseJsonBody<S extends z.ZodTypeAny>(
  req: NextRequest,
  schema: S,
): Promise<z.output<S>> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    throw ApiError.badRequest("Invalid JSON body");
  }
  return schema.parse(raw);
}

export function parseSearchParams<S extends z.ZodTypeAny>(
  req: NextRequest,
  schema: S,
): z.output<S> {
  const params = req.nextUrl.searchParams;
  const result: Record<string, string> = {};
  for (const key of new Set(params.keys())) {
    const values = params
      .getAll(key)
      .map((v) => v.trim())
      .filter(Boolean);
    if (values.length > 0) result[key] = values.join(",");
  }
  return schema.parse(result);
}

export function ok<T>(data: T, init?: { status?: number; meta?: unknown }) {
  const body = init?.meta !== undefined ? { data, meta: init.meta } : { data };
  return NextResponse.json(body, { status: init?.status ?? 200 });
}

export function created<T>(data: T) {
  return ok(data, { status: 201 });
}

export function noContent() {
  return new NextResponse(null, { status: 204 });
}
