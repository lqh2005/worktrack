import type { ActivityType, IssuePriority, IssueStatus } from "@prisma/client";
import type { SessionUser } from "@/lib/auth/session";
import type { PaginationMeta } from "@/lib/services/issue.service";
import type { ProjectStats } from "@/lib/services/project.service";

export type User = SessionUser;

export interface ProjectSummary {
  id: string;
  key: string;
  name: string;
  color: string;
}

export interface Project extends ProjectSummary {
  description: string | null;
  createdAt: string;
  updatedAt: string;
  stats: ProjectStats;
}

export interface Issue {
  id: string;
  number: number;
  key: string;
  title: string;
  description: string | null;
  status: IssueStatus;
  priority: IssuePriority;
  storyPoints: number;
  dueDate: string | null;
  completedAt: string | null;
  projectId: string;
  reporterId: string;
  createdAt: string;
  updatedAt: string;
  project: ProjectSummary;
  reporter: {
    id: string;
    name: string;
  };
  allowedTransitions: IssueStatus[];
}

export interface Activity {
  id: string;
  type: ActivityType;
  field: string | null;
  fromValue: string | null;
  toValue: string | null;
  issueKey: string;
  issueTitle: string;
  issueId: string | null;
  projectId: string;
  actorId: string;
  createdAt: string;
  actor: {
    id: string;
    name: string;
  };
  project: ProjectSummary;
}

export interface IssueDetail extends Issue {
  activity: Activity[];
}

export interface Analytics {
  range: {
    projectId: string | null;
    days: number;
    weeks: number;
    generatedAt: string;
  };
  summary: {
    totalIssues: number;
    doneIssues: number;
    openIssues: number;
    activeIssues: number;
    completionRate: number;
    totalPoints: number;
    donePoints: number;
    remainingPoints: number;
    pointsCompletionRate: number;
    pointsBurnedInWindow: number;
    averageVelocity: number;
    overdueIssues: number;
    dueThisWeek: number;
  };
  byStatus: {
    status: IssueStatus;
    label: string;
    count: number;
    points: number;
  }[];
  byPriority: {
    priority: IssuePriority;
    label: string;
    count: number;
    points: number;
  }[];
  burndown: {
    date: string;
    label: string;
    remaining: number;
    completed: number;
    added: number;
    ideal: number;
  }[];
  velocity: {
    weekStart: string;
    label: string;
    points: number;
    issues: number;
    isCurrentWeek: boolean;
  }[];
  projects: (ProjectSummary & { stats: ProjectStats })[];
  recentActivity: Activity[];
}

export interface ApiSuccess<T> {
  data: T;
}

export interface Paginated<T> {
  data: T[];
  meta: PaginationMeta;
}

export interface BoardColumn {
  status: IssueStatus;
  label: string;
  totalPoints: number;
  issues: Issue[];
}

export interface Board {
  project: Omit<Project, "stats">;
  columns: BoardColumn[];
}

export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    details?: {
      fieldErrors?: Record<string, string[] | undefined>;
      formErrors?: string[];
      [key: string]: unknown;
    };
  };
}
