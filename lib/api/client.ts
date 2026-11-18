import type {
  Activity,
  Analytics,
  ApiErrorResponse,
  ApiSuccess,
  Board,
  Issue,
  IssueDetail,
  Paginated,
  Project,
  User,
} from "@/types/api";
import type { IssuePriority, IssueStatus } from "@prisma/client";
import type { IssueSortField, StoryPoint } from "@/lib/constants";

export class ClientApiError extends Error {
  public readonly status: number;
  public readonly code: string;
  public readonly fieldErrors?: Record<string, string[] | undefined>;
  public readonly details?: Record<string, unknown>;

  constructor(status: number, body?: ApiErrorResponse["error"]) {
    super(body?.message || `Request failed with status ${status}`);
    this.name = "ClientApiError";
    this.status = status;
    this.code = body?.code || "UNKNOWN_ERROR";
    this.fieldErrors = body?.details?.fieldErrors;
    this.details = body?.details;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    credentials: "same-origin",
  });

  if (res.status === 204) {
    return undefined as T;
  }

  let payload: unknown = null;
  try {
    payload = await res.json();
  } catch {
    // Non-JSON error response
  }

  if (!res.ok) {
    const errBody =
      payload && typeof payload === "object" && "error" in payload
        ? (payload as ApiErrorResponse).error
        : undefined;
    throw new ClientApiError(res.status, errBody);
  }

  return payload as T;
}

function toQueryString(params: Record<string, string | number | boolean | readonly string[] | undefined | null>): string {
  const sp = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    if (Array.isArray(value)) {
      if (value.length > 0) sp.set(key, value.join(","));
    } else {
      sp.set(key, String(value));
    }
  }
  const qs = sp.toString();
  return qs ? `?${qs}` : "";
}

export interface IssueFilterParams {
  projectId?: string;
  status?: IssueStatus[];
  priority?: IssuePriority[];
  q?: string;
  overdue?: boolean;
  sortBy?: IssueSortField;
  sortOrder?: "asc" | "desc";
  page?: number;
  pageSize?: number;
}

export interface CreateIssuePayload {
  projectId: string;
  title: string;
  description?: string | null;
  status?: IssueStatus;
  priority?: IssuePriority;
  storyPoints?: StoryPoint;
  dueDate?: string | null;
}

export interface UpdateIssuePayload {
  title?: string;
  description?: string | null;
  status?: IssueStatus;
  priority?: IssuePriority;
  storyPoints?: StoryPoint;
  dueDate?: string | null;
}

export interface CreateProjectPayload {
  name: string;
  key: string;
  description?: string | null;
  color?: string;
}

export interface UpdateProjectPayload {
  name?: string;
  description?: string | null;
  color?: string;
}

export const apiClient = {
  auth: {
    login: (input: { email: string; password: string }) =>
      request<ApiSuccess<{ user: User }>>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    register: (input: { name: string; email: string; password: string }) =>
      request<ApiSuccess<{ user: User }>>("/api/auth/register", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    loginDemo: () =>
      request<ApiSuccess<{ user: User }>>("/api/auth/demo", {
        method: "POST",
      }),
    logout: () =>
      request<ApiSuccess<{ success: boolean }>>("/api/auth/logout", {
        method: "POST",
      }),
    me: () => request<ApiSuccess<{ user: User }>>("/api/auth/me"),
  },

  demo: {
    reset: () =>
      request<ApiSuccess<{ projects: number; issues: number; activityLogs: number }>>("/api/demo/reset", {
        method: "POST",
      }),
  },

  projects: {
    list: () => request<ApiSuccess<Project[]>>("/api/projects"),
    get: (projectId: string) => request<ApiSuccess<Project>>(`/api/projects/${projectId}`),
    create: (input: CreateProjectPayload) =>
      request<ApiSuccess<Project>>("/api/projects", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    update: (projectId: string, input: UpdateProjectPayload) =>
      request<ApiSuccess<Project>>(`/api/projects/${projectId}`, {
        method: "PATCH",
        body: JSON.stringify(input),
      }),
    delete: (projectId: string) =>
      request<void>(`/api/projects/${projectId}`, {
        method: "DELETE",
      }),
    board: (projectId: string, params?: { q?: string; priority?: IssuePriority[] }) =>
      request<ApiSuccess<Board>>(`/api/projects/${projectId}/board${toQueryString(params ?? {})}`),
  },

  issues: {
    list: (params: IssueFilterParams = {}) =>
      request<Paginated<Issue>>(`/api/issues${toQueryString({ ...params })}`),
    get: (issueId: string) => request<ApiSuccess<IssueDetail>>(`/api/issues/${issueId}`),
    create: (input: CreateIssuePayload) =>
      request<ApiSuccess<Issue>>("/api/issues", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    update: (issueId: string, input: UpdateIssuePayload) =>
      request<ApiSuccess<Issue>>(`/api/issues/${issueId}`, {
        method: "PATCH",
        body: JSON.stringify(input),
      }),
    transitionStatus: (issueId: string, status: IssueStatus) =>
      request<ApiSuccess<Issue>>(`/api/issues/${issueId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      }),
    delete: (issueId: string) =>
      request<void>(`/api/issues/${issueId}`, {
        method: "DELETE",
      }),
  },

  analytics: {
    get: (params?: { projectId?: string; days?: number; weeks?: number }) =>
      request<ApiSuccess<Analytics>>(`/api/analytics${toQueryString(params ?? {})}`),
  },

  activity: {
    list: (params?: { projectId?: string; limit?: number }) =>
      request<ApiSuccess<Activity[]>>(`/api/activity${toQueryString(params ?? {})}`),
  },
};
