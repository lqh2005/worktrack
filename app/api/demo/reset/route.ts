import { authedHandler, ok } from "@/lib/api/handler";
import { ApiError } from "@/lib/api/errors";
import { resetDemoWorkspace } from "@/lib/demo/demo-workspace";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const POST = authedHandler(async (_req, { user }) => {
  if (!user.isDemo) throw ApiError.forbidden("Only the demo account can be reset");
  const result = await resetDemoWorkspace(prisma, user.id);
  return ok(result);
});
