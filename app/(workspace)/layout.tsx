import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { listProjects } from "@/lib/services/project.service";
import { AppShell } from "@/components/layout/app-shell";
import type { Project } from "@/types/api";

export const dynamic = "force-dynamic";

export default async function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }

  const rawProjects = await listProjects(user.id);
  const initialProjects: Project[] = JSON.parse(JSON.stringify(rawProjects));

  return (
    <AppShell initialUser={user} initialProjects={initialProjects}>
      {children}
    </AppShell>
  );
}
