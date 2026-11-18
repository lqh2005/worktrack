import { authedHandler, ok, parseSearchParams } from "@/lib/api/handler";
import { listActivity } from "@/lib/services/activity.service";
import { activityQuerySchema } from "@/lib/validations/issue";

export const dynamic = "force-dynamic";

export const GET = authedHandler(async (req, { user }) => {
  const query = parseSearchParams(req, activityQuerySchema);
  return ok(await listActivity(user.id, query));
});
