import { authedHandler, created, ok, parseJsonBody } from "@/lib/api/handler";
import { createProject, listProjects } from "@/lib/services/project.service";
import { createProjectSchema } from "@/lib/validations/project";

export const dynamic = "force-dynamic";

export const GET = authedHandler(async (_req, { user }) => {
  return ok(await listProjects(user.id));
});

export const POST = authedHandler(async (req, { user }) => {
  const input = await parseJsonBody(req, createProjectSchema);
  return created(await createProject(user.id, input));
});
