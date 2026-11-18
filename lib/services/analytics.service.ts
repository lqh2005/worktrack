import "server-only";
import type { IssuePriority, IssueStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ISSUE_PRIORITIES, ISSUE_STATUSES, PRIORITY_LABELS, STATUS_LABELS } from "@/lib/constants";
import type { AnalyticsQuery } from "@/lib/validations/analytics";
import { assertProjectOwnership, type ProjectStats } from "./project.service";
import { listActivity } from "./activity.service";

const DAY = 86_400_000;

const utcMidnight = (date: Date) =>
  Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());

const utcWeekStart = (ms: number) => {
  const date = new Date(ms);
  const dayOfWeek = (date.getUTCDay() + 6) % 7; // Monday = 0
  return utcMidnight(date) - dayOfWeek * DAY;
};

const formatDay = (ms: number) =>
  new Date(ms).toLocaleDateString("en-US", { month: "short", day: "2-digit", timeZone: "UTC" });

const isoDay = (ms: number) => new Date(ms).toISOString().slice(0, 10);

const round1 = (value: number) => Math.round(value * 10) / 10;

function emptyProjectStats(): ProjectStats {
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

export async function getAnalytics(userId: string, query: AnalyticsQuery) {
  if (query.projectId) await assertProjectOwnership(userId, query.projectId);

  const scope: Prisma.IssueWhereInput = {
    project: { ownerId: userId },
    ...(query.projectId ? { projectId: query.projectId } : {}),
  };

  const now = new Date();
  const todayMs = utcMidnight(now);
  const burndownStartMs = todayMs - (query.days - 1) * DAY;
  const currentWeekStartMs = utcWeekStart(now.getTime());
  const velocityStartMs = currentWeekStartMs - (query.weeks - 1) * 7 * DAY;

  // Query sequentially to avoid connection pool timeout on Neon
  const allIssues = await prisma.issue.findMany({
    where: scope,
    select: {
      projectId: true,
      status: true,
      priority: true,
      storyPoints: true,
      dueDate: true,
      createdAt: true,
      completedAt: true,
    },
  });

  const userProjects = query.projectId
    ? []
    : await prisma.project.findMany({
        where: { ownerId: userId },
        select: { id: true, key: true, name: true, color: true },
        orderBy: { createdAt: "asc" },
      });

  const recentActivity = await listActivity(userId, {
    projectId: query.projectId,
    limit: 8,
  });

  const statusMap = new Map<IssueStatus, { count: number; points: number }>(
    ISSUE_STATUSES.map((s) => [s, { count: 0, points: 0 }]),
  );
  const priorityMap = new Map<IssuePriority, { count: number; points: number }>(
    ISSUE_PRIORITIES.map((p) => [p, { count: 0, points: 0 }]),
  );
  const statsByProject = new Map<string, ProjectStats>();

  let overdueIssues = 0;
  let dueThisWeek = 0;
  const next7DaysMs = todayMs + 7 * DAY;

  for (const issue of allIssues) {
    const sBucket = statusMap.get(issue.status)!;
    sBucket.count += 1;
    sBucket.points += issue.storyPoints;

    const pBucket = priorityMap.get(issue.priority)!;
    pBucket.count += 1;
    pBucket.points += issue.storyPoints;

    if (issue.status !== "DONE" && issue.dueDate) {
      const dueMs = issue.dueDate.getTime();
      if (dueMs < todayMs) {
        overdueIssues += 1;
      } else if (dueMs < next7DaysMs) {
        dueThisWeek += 1;
      }
    }

    if (!query.projectId) {
      const pStats = statsByProject.get(issue.projectId) ?? emptyProjectStats();
      pStats.byStatus[issue.status] += 1;
      pStats.totalIssues += 1;
      pStats.totalPoints += issue.storyPoints;
      if (issue.status === "DONE") {
        pStats.doneIssues += 1;
        pStats.donePoints += issue.storyPoints;
      } else {
        pStats.openIssues += 1;
      }
      statsByProject.set(issue.projectId, pStats);
    }
  }

  for (const pStats of statsByProject.values()) {
    pStats.completionRate = pStats.totalIssues
      ? Math.round((pStats.doneIssues / pStats.totalIssues) * 100)
      : 0;
  }

  const byStatus = ISSUE_STATUSES.map((status) => ({
    status,
    label: STATUS_LABELS[status],
    count: statusMap.get(status)!.count,
    points: statusMap.get(status)!.points,
  }));

  const byPriority = ISSUE_PRIORITIES.map((priority) => ({
    priority,
    label: PRIORITY_LABELS[priority],
    count: priorityMap.get(priority)!.count,
    points: priorityMap.get(priority)!.points,
  }));

  // Daily burndown calculation
  const days = Array.from({ length: query.days }, (_, i) => burndownStartMs + i * DAY);
  const burndownRaw = days.map((dayStartMs) => {
    const dayEndMs = dayStartMs + DAY;
    let remaining = 0;
    let completed = 0;
    let added = 0;
    for (const issue of allIssues) {
      const createdMs = issue.createdAt.getTime();
      const completedMs = issue.completedAt?.getTime() ?? null;
      if (createdMs < dayEndMs && (completedMs === null || completedMs >= dayEndMs)) {
        remaining += issue.storyPoints;
      }
      if (completedMs !== null && completedMs >= dayStartMs && completedMs < dayEndMs) {
        completed += issue.storyPoints;
      }
      if (createdMs >= dayStartMs && createdMs < dayEndMs) {
        added += issue.storyPoints;
      }
    }
    return { dayStartMs, remaining, completed, added };
  });

  const startRemaining = burndownRaw[0]?.remaining ?? 0;
  const burndown = burndownRaw.map((point, index) => ({
    date: isoDay(point.dayStartMs),
    label: formatDay(point.dayStartMs),
    remaining: point.remaining,
    completed: point.completed,
    added: point.added,
    ideal: query.days > 1 ? round1(startRemaining * (1 - index / (query.days - 1))) : 0,
  }));

  // Weekly velocity calculation
  const velocity = Array.from({ length: query.weeks }, (_, i) => {
    const weekStartMs = velocityStartMs + i * 7 * DAY;
    const weekEndMs = weekStartMs + 7 * DAY;
    let points = 0;
    let issues = 0;
    for (const issue of allIssues) {
      const completedMs = issue.completedAt?.getTime();
      if (completedMs !== undefined && completedMs >= weekStartMs && completedMs < weekEndMs) {
        points += issue.storyPoints;
        issues += 1;
      }
    }
    return {
      weekStart: isoDay(weekStartMs),
      label: formatDay(weekStartMs),
      points,
      issues,
      isCurrentWeek: weekStartMs === currentWeekStartMs,
    };
  });

  const completedWeeks = velocity.filter((week) => !week.isCurrentWeek);
  const averageVelocity = completedWeeks.length
    ? round1(completedWeeks.reduce((sum, week) => sum + week.points, 0) / completedWeeks.length)
    : 0;

  const totalIssues = byStatus.reduce((sum, s) => sum + s.count, 0);
  const totalPoints = byStatus.reduce((sum, s) => sum + s.points, 0);
  const done = byStatus.find((s) => s.status === "DONE")!;
  const activeIssues = byStatus
    .filter((s) => s.status === "IN_PROGRESS" || s.status === "IN_REVIEW")
    .reduce((sum, s) => sum + s.count, 0);
  const pointsBurnedInWindow = burndown.reduce((sum, d) => sum + d.completed, 0);

  const summary = {
    totalIssues,
    doneIssues: done.count,
    openIssues: totalIssues - done.count,
    activeIssues,
    completionRate: totalIssues ? Math.round((done.count / totalIssues) * 100) : 0,
    totalPoints,
    donePoints: done.points,
    remainingPoints: totalPoints - done.points,
    pointsCompletionRate: totalPoints ? Math.round((done.points / totalPoints) * 100) : 0,
    pointsBurnedInWindow,
    averageVelocity,
    overdueIssues,
    dueThisWeek,
  };

  const projects = userProjects.map((project) => ({
    ...project,
    stats: statsByProject.get(project.id) ?? emptyProjectStats(),
  }));

  return {
    range: {
      projectId: query.projectId ?? null,
      days: query.days,
      weeks: query.weeks,
      generatedAt: now.toISOString(),
    },
    summary,
    byStatus,
    byPriority,
    burndown,
    velocity,
    projects,
    recentActivity,
  };
}

export type AnalyticsDTO = Awaited<ReturnType<typeof getAnalytics>>;
