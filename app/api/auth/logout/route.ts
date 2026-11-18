import { NextResponse } from "next/server";
import { apiHandler } from "@/lib/api/handler";
import { clearSessionCookie } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export const POST = apiHandler(async () => {
  return clearSessionCookie(NextResponse.json({ data: { success: true } }));
});
