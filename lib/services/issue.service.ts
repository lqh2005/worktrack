import "server-only";
import type { IssueStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ApiError, isPrismaError } from "@/lib/api/errors";
import { ISSUE_STATUSES, STATUS_LABELS, canTransition, getAllowedTransitions } from "@/lib/constants";
import type { BoardQuery, CreateIssueInput, IssueListQuery, UpdateIssueInput } from "@/lib/validations/issue";
import { assertProjectOwnership } from "./project.service";
import { listIssueActivity } from "./activity.service";

const issueInclude = {
  project: { select: { id: true, key: true, name: true, color: true } },
  reporter: { select: { id: true, name: true } },
} satisfies Prisma.IssueInclude;

type IssueWithRelations = Prisma.IssueGetPayload<{ include: typeof issueInclude }>;

export function toIssueDTO(issue: IssueWithRelations) {
  return {
    ...issue,
    key: `${issue.project.key}-${issue.number}`,
    allowedTransitions: getAllowedTransitions(issue.status),
  };
}

export type IssueDTO = ReturnType<typeof toIssueDTO>;

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

const ISSUE_KEY_PATTERN = /^([A-Za-z][A-Za-z0-9]{1,5})-(\d{1,9})$/;

function startOfTodayUtc() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

function buildIssueWhere(
  userId: string,
  filters: Pick<IssueListQuery, "projectId" | "status" | "priority" | "q" | "overdue">,
): Prisma.IssueWhereInput {
  const and: Prisma.IssueWhereInput[] = [{ project: { ownerId: userId } }];

  if (filters.projectId) and.push({ projectId: filters.projectId });
  if (filters.status?.length) and.push({ status: { in: filters.status } });
  if (filters.priority?.length) and.push({ priority: { in: filters.priority } });

  if (filters.q) {
    const or: Prisma.IssueWhereInput[] = [{ title: { contains: filters.q, mode: "insensitive" } }];
    const keyMatch = ISSUE_KEY_PATTERN.exec(filters.q);
    if (keyMatch) {
      or.push({ project: { key: keyMatch[1].toUpperCase() }, number: Number(keyMatch[2]) });
    }
    and.push({ OR: or });
  }

  if (filters.overdue) {
    and.push({ status: { not: "DONE" }, dueDate: { lt: startOfTodayUtc() } });
  }

  return { AND: and };
}

function buildOrderBy(
  sortBy: IssueListQuery["sortBy"],
  sortOrder: IssueListQuery["sortOrder"],
): Prisma.IssueOrderByWithRelationInput[] {
  switch (sortBy) {
    case "dueDate":
      return [{ dueDate: { sort: sortOrder, nulls: "last" } }, { priority: "desc" }, { id: "asc" }];
    case "priority":
      return [{ priority: sortOrder }, { dueDate: { sort: "asc", nulls: "last" } }, { id: "asc" }];
    case "storyPoints":
      return [{ storyPoints: sortOrder }, { id: "asc" }];
    case "title":
      return [{ title: sortOrder }, { id: "asc" }];
    case "updatedAt":
      return [{ updatedAt: sortOrder }, { id: "asc" }];
    case "createdAt":
    default:
      return [{ createdAt: sortOrder }, { id: "asc" }];
  }
}

async function findOwnedIssueOrThrow(userId: string, issueId: string) {
  const issue = await prisma.issue.findFirst({
    where: { id: issueId, project: { ownerId: userId } },
    include: issueInclude,
  });
  if (!issue) throw ApiError.notFound("Issue");
  return issue;
}

function assertTransition(from: IssueStatus, to: IssueStatus) {
  if (canTransition(from, to)) return;
  const allowed = getAllowedTransitions(from);
  throw ApiError.unprocessable(
    `Cannot move issue from "${STATUS_LABELS[from]}" to "${STATUS_LABELS[to]}". ` +
      `Allowed next status: ${allowed.map((s) => STATUS_LABELS[s]).join(", ")}.`,
    "INVALID_STATUS_TRANSITION",
    { from, to, allowed },
  );
}

const toDateString = (date: Date | null) => (date ? date.toISOString().slice(0, 10) : null);

export async function listIssues(userId: string, query: IssueListQuery) {
  if (query.projectId) await assertProjectOwnership(userId, query.projectId);

  const where = buildIssueWhere(userId, query);
  const total = await prisma.issue.count({ where });
  const issues = await prisma.issue.findMany({
    where,
    include: issueInclude,
    orderBy: buildOrderBy(query.sortBy, query.sortOrder),
    skip: (query.page - 1) * query.pageSize,
    take: query.pageSize,
  });

  const totalPages = Math.max(1, Math.ceil(total / query.pageSize));
  const meta: PaginationMeta = {
    page: query.page,
    pageSize: query.pageSize,
    total,
    totalPages,
    hasNextPage: query.page < totalPages,
    hasPrevPage: query.page > 1,
  };

  return { data: issues.map(toIssueDTO), meta };
}

export async function getIssue(userId: string, issueId: string) {
  return toIssueDTO(await findOwnedIssueOrThrow(userId, issueId));
}

export async function getIssueWithActivity(userId: string, issueId: string) {
  const issue = await findOwnedIssueOrThrow(userId, issueId);
  const activity = await listIssueActivity(issue.id);
  return { ...toIssueDTO(issue), activity };
}

export async function getBoard(userId: string, projectId: string, query: BoardQuery) {
  const project = await assertProjectOwnership(userId, projectId);
  const issues = await prisma.issue.findMany({
    where: buildIssueWhere(userId, { projectId, priority: query.priority, q: query.q }),
    include: issueInclude,
    orderBy: [{ priority: "desc" }, { updatedAt: "desc" }, { id: "asc" }],
    take: 500,
  });

  const columns = ISSUE_STATUSES.map((status) => {
    const columnIssues = issues.filter((issue) => issue.status === status).map(toIssueDTO);
    return {
      status,
      label: STATUS_LABELS[status],
      totalPoints: columnIssues.reduce((sum, issue) => sum + issue.storyPoints, 0),
      issues: columnIssues,
    };
  });

  return { project, columns };
}

export async function createIssue(userId: string, input: CreateIssueInput) {
  await assertProjectOwnership(userId, input.projectId);

  const issue = await prisma.$transaction(async (tx) => {
    const project = await tx.project.update({
      where: { id: input.projectId },
      data: { issueCounter: { increment: 1 } },
      select: { key: true, issueCounter: true },
    });

    const createdIssue = await tx.issue.create({
      data: {
        number: project.issueCounter,
        title: input.title,
        description: input.description,
        status: input.status,
        priority: input.priority,
        storyPoints: input.storyPoints,
        dueDate: input.dueDate,
        completedAt: input.status === "DONE" ? new Date() : null,
        projectId: input.projectId,
        reporterId: userId,
      },
      include: issueInclude,
    });

    await tx.activityLog.create({
      data: {
        type: "ISSUE_CREATED",
        toValue: createdIssue.status,
        issueId: createdIssue.id,
        issueKey: `${project.key}-${createdIssue.number}`,
        issueTitle: createdIssue.title,
        projectId: createdIssue.projectId,
        actorId: userId,
      },
    });

    return createdIssue;
  });

  return toIssueDTO(issue);
}

export async function updateIssue(userId: string, issueId: string, input: UpdateIssueInput) {
  const existing = await findOwnedIssueOrThrow(userId, issueId);
  const issueKey = `${existing.project.key}-${existing.number}`;

  const data: Prisma.IssueUpdateInput = {};
  const logs: Prisma.ActivityLogCreateManyInput[] = [];
  const logBase = {
    issueId,
    issueKey,
    issueTitle: input.title ?? existing.title,
    projectId: existing.projectId,
    actorId: userId,
  };

  if (input.title !== undefined && input.title !== existing.title) {
    data.title = input.title;
    logs.push({
      ...logBase,
      type: "ISSUE_UPDATED",
      field: "title",
      fromValue: existing.title.slice(0, 255),
      toValue: input.title.slice(0, 255),
    });
  }

  if (input.description !== undefined && input.description !== existing.description) {
    data.description = input.description;
    logs.push({ ...logBase, type: "ISSUE_UPDATED", field: "description" });
  }

  if (input.storyPoints !== undefined && input.storyPoints !== existing.storyPoints) {
    data.storyPoints = input.storyPoints;
    logs.push({
      ...logBase,
      type: "ISSUE_UPDATED",
      field: "storyPoints",
      fromValue: String(existing.storyPoints),
      toValue: String(input.storyPoints),
    });
  }

  if (input.dueDate !== undefined && toDateString(input.dueDate) !== toDateString(existing.dueDate)) {
    data.dueDate = input.dueDate;
    logs.push({
      ...logBase,
      type: "ISSUE_UPDATED",
      field: "dueDate",
      fromValue: toDateString(existing.dueDate),
      toValue: toDateString(input.dueDate),
    });
  }

  if (input.priority !== undefined && input.priority !== existing.priority) {
    data.priority = input.priority;
    logs.push({
      ...logBase,
      type: "PRIORITY_CHANGED",
      field: "priority",
      fromValue: existing.priority,
      toValue: input.priority,
    });
  }

  if (input.status !== undefined && input.status !== existing.status) {
    assertTransition(existing.status, input.status);
    data.status = input.status;
    data.completedAt = input.status === "DONE" ? new Date() : null;
    logs.push({
      ...logBase,
      type: "STATUS_CHANGED",
      field: "status",
      fromValue: existing.status,
      toValue: input.status,
    });
  }

  if (logs.length === 0) return toIssueDTO(existing);

  try {
    const [updated] = await prisma.$transaction([
      prisma.issue.update({
        where: { id: issueId, updatedAt: existing.updatedAt },
        data,
        include: issueInclude,
      }),
      prisma.activityLog.createMany({ data: logs }),
    ]);
    return toIssueDTO(updated);
  } catch (error) {
    if (isPrismaError(error, "P2025")) {
      throw ApiError.conflict(
        "Issue was updated by another request. Please refresh and try again.",
        "STALE_ISSUE",
      );
    }
    throw error;
  }
}

export async function transitionIssueStatus(userId: string, issueId: string, status: IssueStatus) {
  return updateIssue(userId, issueId, { status });
}

export async function deleteIssue(userId: string, issueId: string) {
  const existing = await findOwnedIssueOrThrow(userId, issueId);

  await prisma.$transaction([
    prisma.activityLog.create({
      data: {
        type: "ISSUE_DELETED",
        fromValue: existing.status,
        issueId: null,
        issueKey: `${existing.project.key}-${existing.number}`,
        issueTitle: existing.title,
        projectId: existing.projectId,
        actorId: userId,
      },
    }),
    prisma.issue.delete({ where: { id: existing.id } }),
  ]);
}
