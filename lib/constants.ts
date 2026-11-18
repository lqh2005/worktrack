import type { ActivityType, IssuePriority, IssueStatus } from "@prisma/client";

export const ISSUE_STATUSES = ["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"] as const satisfies readonly IssueStatus[];
export const ISSUE_PRIORITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const satisfies readonly IssuePriority[];
export const STORY_POINTS = [1, 2, 3, 5, 8] as const;
export type StoryPoint = (typeof STORY_POINTS)[number];

export const STATUS_LABELS: Record<IssueStatus, string> = {
  TODO: "To Do",
  IN_PROGRESS: "In Progress",
  IN_REVIEW: "In Review",
  DONE: "Done",
};

export const PRIORITY_LABELS: Record<IssuePriority, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  CRITICAL: "Critical",
};

export const ACTIVITY_LABELS: Record<ActivityType, string> = {
  ISSUE_CREATED: "created",
  ISSUE_UPDATED: "updated",
  STATUS_CHANGED: "changed status of",
  PRIORITY_CHANGED: "changed priority of",
  ISSUE_DELETED: "deleted",
};

export const STATUS_COLORS: Record<IssueStatus, string> = {
  TODO: "#94a3b8",
  IN_PROGRESS: "#3b82f6",
  IN_REVIEW: "#a855f7",
  DONE: "#22c55e",
};

export const PRIORITY_COLORS: Record<IssuePriority, string> = {
  LOW: "#64748b",
  MEDIUM: "#0ea5e9",
  HIGH: "#f97316",
  CRITICAL: "#ef4444",
};

export const PROJECT_COLORS = [
  "#6366f1",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#3b82f6",
  "#ec4899",
  "#14b8a6",
  "#8b5cf6",
] as const;

// Allowed workflow status transitions
export const STATUS_TRANSITIONS: Record<IssueStatus, readonly IssueStatus[]> = {
  TODO: ["IN_PROGRESS"],
  IN_PROGRESS: ["TODO", "IN_REVIEW"],
  IN_REVIEW: ["IN_PROGRESS", "DONE"],
  DONE: ["IN_PROGRESS"],
};

export function getAllowedTransitions(from: IssueStatus): IssueStatus[] {
  return [...STATUS_TRANSITIONS[from]];
}

export function canTransition(from: IssueStatus, to: IssueStatus): boolean {
  return from === to || STATUS_TRANSITIONS[from].includes(to);
}

export const ISSUE_SORT_FIELDS = ["createdAt", "updatedAt", "dueDate", "priority", "storyPoints", "title"] as const;
export type IssueSortField = (typeof ISSUE_SORT_FIELDS)[number];

export const DEFAULT_PAGE_SIZE = 10;
export const MAX_PAGE_SIZE = 100;
