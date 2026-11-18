import { authedHandler, ok } from "@/lib/api/handler";

export const dynamic = "force-dynamic";

export const GET = authedHandler(async (_req, { user }) => {
  return ok({ user });
});
