import { NextResponse } from "next/server";
import { authedHandler, created, parseJsonBody, parseSearchParams } from "@/lib/api/handler";
import { createIssue, listIssues } from "@/lib/services/issue.service";
import { createIssueSchema, issueListQuerySchema } from "@/lib/validations/issue";

export const dynamic = "force-dynamic";

export const GET = authedHandler(async (req, { user }) => {
  const query = parseSearchParams(req, issueListQuerySchema);
  const result = await listIssues(user.id, query);
  return NextResponse.json(result);
});

export const POST = authedHandler(async (req, { user }) => {
  const input = await parseJsonBody(req, createIssueSchema);
  return created(await createIssue(user.id, input));
});
