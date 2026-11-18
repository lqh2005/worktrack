import { authedHandler, noContent, ok, parseJsonBody } from "@/lib/api/handler";
import { deleteIssue, getIssueWithActivity, updateIssue } from "@/lib/services/issue.service";
import { idSchema } from "@/lib/validations/common";
import { updateIssueSchema } from "@/lib/validations/issue";

export const dynamic = "force-dynamic";

type Params = { issueId: string };

export const GET = authedHandler<Params>(async (_req, { params, user }) => {
  const issueId = idSchema.parse(params.issueId);
  return ok(await getIssueWithActivity(user.id, issueId));
});

export const PATCH = authedHandler<Params>(async (req, { params, user }) => {
  const issueId = idSchema.parse(params.issueId);
  const input = await parseJsonBody(req, updateIssueSchema);
  return ok(await updateIssue(user.id, issueId, input));
});

export const DELETE = authedHandler<Params>(async (_req, { params, user }) => {
  const issueId = idSchema.parse(params.issueId);
  await deleteIssue(user.id, issueId);
  return noContent();
});
