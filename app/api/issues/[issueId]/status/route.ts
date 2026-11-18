import { authedHandler, ok, parseJsonBody } from "@/lib/api/handler";
import { transitionIssueStatus } from "@/lib/services/issue.service";
import { idSchema } from "@/lib/validations/common";
import { statusTransitionSchema } from "@/lib/validations/issue";

export const dynamic = "force-dynamic";

export const PATCH = authedHandler<{ issueId: string }>(async (req, { params, user }) => {
  const issueId = idSchema.parse(params.issueId);
  const { status } = await parseJsonBody(req, statusTransitionSchema);
  return ok(await transitionIssueStatus(user.id, issueId, status));
});
