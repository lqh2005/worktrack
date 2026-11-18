import { authedHandler, noContent, ok, parseJsonBody } from "@/lib/api/handler";
import { deleteProject, getProject, updateProject } from "@/lib/services/project.service";
import { idSchema } from "@/lib/validations/common";
import { updateProjectSchema } from "@/lib/validations/project";

export const dynamic = "force-dynamic";

type Params = { projectId: string };

export const GET = authedHandler<Params>(async (_req, { params, user }) => {
  const projectId = idSchema.parse(params.projectId);
  return ok(await getProject(user.id, projectId));
});

export const PATCH = authedHandler<Params>(async (req, { params, user }) => {
  const projectId = idSchema.parse(params.projectId);
  const input = await parseJsonBody(req, updateProjectSchema);
  return ok(await updateProject(user.id, projectId, input));
});

export const DELETE = authedHandler<Params>(async (_req, { params, user }) => {
  const projectId = idSchema.parse(params.projectId);
  await deleteProject(user.id, projectId);
  return noContent();
});
