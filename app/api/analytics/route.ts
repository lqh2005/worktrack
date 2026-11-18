import { authedHandler, ok, parseSearchParams } from "@/lib/api/handler";
import { getAnalytics } from "@/lib/services/analytics.service";
import { analyticsQuerySchema } from "@/lib/validations/analytics";

export const dynamic = "force-dynamic";

export const GET = authedHandler(async (req, { user }) => {
  const query = parseSearchParams(req, analyticsQuerySchema);
  return ok(await getAnalytics(user.id, query));
});
