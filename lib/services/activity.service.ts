import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { ActivityQuery } from "@/lib/validations/issue";

const activityInclude = {
  actor: { select: { id: true, name: true } },
  project: { select: { id: true, key: true, name: true, color: true } },
} satisfies Prisma.ActivityLogInclude;

export async function listActivity(userId: string, query: ActivityQuery) {
  return prisma.activityLog.findMany({
    where: {
      project: { ownerId: userId },
      ...(query.projectId ? { projectId: query.projectId } : {}),
    },
    include: activityInclude,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: query.limit,
  });
}

export async function listIssueActivity(issueId: string, limit = 50) {
  return prisma.activityLog.findMany({
    where: { issueId },
    include: activityInclude,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: limit,
  });
}

export type ActivityDTO = Awaited<ReturnType<typeof listActivity>>[number];
