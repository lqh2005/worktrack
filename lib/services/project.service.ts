import "server-only";
import type { IssueStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ApiError, isPrismaError } from "@/lib/api/errors";
import { ISSUE_STATUSES } from "@/lib/constants";
import type { CreateProjectInput, UpdateProjectInput } from "@/lib/validations/project";

const projectSelect = {
  id: true,
  name: true,
  key: true,
  description: true,
  color: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.ProjectSelect;

export interface ProjectStats {
  totalIssues: number;
  openIssues: number;
  doneIssues: number;
  totalPoints: number;
  donePoints: number;
  completionRate: number;
  byStatus: Record<IssueStatus, number>;
}

function emptyStats(): ProjectStats {
  return {
    totalIssues: 0,
    openIssues: 0,
    doneIssues: 0,
    totalPoints: 0,
    donePoints: 0,
    completionRate: 0,
    byStatus: Object.fromEntries(ISSUE_STATUSES.map((s) => [s, 0])) as Record<IssueStatus, number>,
  };
}

export async function computeProjectStats(where: Prisma.IssueWhereInput) {
  const rows = await prisma.issue.groupBy({
    by: ["projectId", "status"],
    where,
    _count: { _all: true },
    _sum: { storyPoints: true },
  });

  const statsByProject = new Map<string, ProjectStats>();
  for (const row of rows) {
    const stats = statsByProject.get(row.projectId) ?? emptyStats();
    const count = row._count._all;
    const points = row._sum.storyPoints ?? 0;

    stats.byStatus[row.status] += count;
    stats.totalIssues += count;
    stats.totalPoints += points;
    if (row.status === "DONE") {
      stats.doneIssues += count;
      stats.donePoints += points;
    } else {
      stats.openIssues += count;
    }
    statsByProject.set(row.projectId, stats);
  }

  for (const stats of statsByProject.values()) {
    stats.completionRate = stats.totalIssues
      ? Math.round((stats.doneIssues / stats.totalIssues) * 100)
      : 0;
  }
  return { get: (projectId: string) => statsByProject.get(projectId) ?? emptyStats() };
}

export async function assertProjectOwnership(userId: string, projectId: string) {
  const project = await prisma.project.findFirst({
    where: { id: projectId, ownerId: userId },
    select: projectSelect,
  });
  if (!project) throw ApiError.notFound("Project");
  return project;
}

export async function listProjects(userId: string) {
  const projects = await prisma.project.findMany({
    where: { ownerId: userId },
    select: projectSelect,
    orderBy: { createdAt: "asc" },
  });
  const stats = await computeProjectStats({ project: { ownerId: userId } });
  return projects.map((project) => ({ ...project, stats: stats.get(project.id) }));
}

export async function getProject(userId: string, projectId: string) {
  const project = await assertProjectOwnership(userId, projectId);
  const stats = await computeProjectStats({ projectId: project.id });
  return { ...project, stats: stats.get(project.id) };
}

export async function createProject(userId: string, input: CreateProjectInput) {
  try {
    const project = await prisma.project.create({
      data: {
        name: input.name,
        key: input.key,
        description: input.description,
        ...(input.color ? { color: input.color } : {}),
        ownerId: userId,
      },
      select: projectSelect,
    });
    return { ...project, stats: emptyStats() };
  } catch (error) {
    if (isPrismaError(error, "P2002")) {
      throw ApiError.conflict(`Project key "${input.key}" is already in use`, "PROJECT_KEY_TAKEN", {
        fieldErrors: { key: [`Project key "${input.key}" is already in use`] },
      });
    }
    throw error;
  }
}

export async function updateProject(
  userId: string,
  projectId: string,
  input: UpdateProjectInput,
) {
  await assertProjectOwnership(userId, projectId);
  const project = await prisma.project.update({
    where: { id: projectId },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.color !== undefined ? { color: input.color } : {}),
    },
    select: projectSelect,
  });
  const stats = await computeProjectStats({ projectId });
  return { ...project, stats: stats.get(projectId) };
}

export async function deleteProject(userId: string, projectId: string) {
  await assertProjectOwnership(userId, projectId);
  await prisma.project.delete({ where: { id: projectId } });
}

export type ProjectDTO = Awaited<ReturnType<typeof getProject>>;
