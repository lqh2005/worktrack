import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ApiError } from "@/lib/api/errors";
import { SESSION_COOKIE, SESSION_MAX_AGE_SECONDS, signSession, verifySession } from "./jwt";

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  isDemo: boolean;
}

const sessionCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: SESSION_MAX_AGE_SECONDS,
};

export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const token = cookies().get(SESSION_COOKIE)?.value;
  const payload = await verifySession(token);
  if (!payload) return null;

  return {
    id: payload.sub,
    email: payload.email,
    name: payload.name,
    isDemo: payload.isDemo,
  };
});

export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw ApiError.unauthorized();
  return user;
}

export async function createSessionResponse(user: SessionUser, status = 200) {
  const token = await signSession({
    sub: user.id,
    email: user.email,
    name: user.name,
    isDemo: user.isDemo,
  });
  const response = NextResponse.json({ data: { user } }, { status });
  response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions);
  return response;
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set(SESSION_COOKIE, "", { ...sessionCookieOptions, maxAge: 0 });
  return response;
}
