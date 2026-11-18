import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { listIssues } from "@/lib/services/issue.service";
import { IssuesView } from "@/components/issues/issues-view";
import type { Issue, Paginated } from "@/types/api";

export const dynamic = "force-dynamic";

export default async function IssuesPage({
  searchParams,
}: {
  searchParams?: { projectId?: string };
}) {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }

  let projectId =
    typeof searchParams?.projectId === "string" && searchParams.projectId
      ? searchParams.projectId
      : undefined;

  if (projectId) {
    const exists = await prisma.project.findFirst({
      where: { id: projectId, ownerId: user.id },
      select: { id: true },
    });
    if (!exists) {
      projectId = undefined;
    }
  }

  const rawList = await listIssues(user.id, {
    projectId,
    page: 1,
    pageSize: 10,
    sortBy: "createdAt",
    sortOrder: "desc",
  });

  const initialList: Paginated<Issue> = JSON.parse(JSON.stringify(rawList));

  return <IssuesView initialList={initialList} initialProjectId={projectId ?? ""} />;
}
