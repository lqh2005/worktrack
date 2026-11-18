import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { ProjectsView } from "@/components/projects/projects-view";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }

  return <ProjectsView />;
}
