import { authedHandler, ok, parseSearchParams } from "@/lib/api/handler";
import { getBoard } from "@/lib/services/issue.service";
import { idSchema } from "@/lib/validations/common";
import { boardQuerySchema } from "@/lib/validations/issue";

export const dynamic = "force-dynamic";

export const GET = authedHandler<{ projectId: string }>(async (req, { params, user }) => {
  const projectId = idSchema.parse(params.projectId);
  const query = parseSearchParams(req, boardQuerySchema);
  return ok(await getBoard(user.id, projectId, query));
});
