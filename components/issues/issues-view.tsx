"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { IssuePriority, IssueStatus } from "@prisma/client";
import {
  AlertCircle,
  ArrowDownUp,
  ChevronLeft,
  ChevronRight,
  Filter,
  GripVertical,
  Kanban,
  List,
  Loader2,
  Plus,
  RotateCcw,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import { apiClient, ClientApiError } from "@/lib/api/client";
import {
  canTransition,
  ISSUE_PRIORITIES,
  ISSUE_STATUSES,
  PRIORITY_LABELS,
  STATUS_COLORS,
  STATUS_LABELS,
  type IssueSortField,
} from "@/lib/constants";
import { cn } from "@/lib/utils";
import {
  DueDateBadge,
  MemberBadge,
  PriorityBadge,
  StoryPointsBadge,
} from "@/components/ui/badges";
import { QuickStatusMenu } from "@/components/issues/quick-status-menu";
import { useWorkspace } from "@/components/layout/app-shell";
import type { BoardColumn, Issue, Paginated } from "@/types/api";

interface IssuesViewProps {
  initialList: Paginated<Issue>;
  initialProjectId?: string;
}

export function IssuesView({ initialList, initialProjectId = "" }: IssuesViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { projects, openCreateIssue, openEditIssue, revision, refreshProjects } = useWorkspace();

  const [viewMode, setViewMode] = useState<"list" | "board">(
    searchParams.get("view") === "board" ? "board" : "list",
  );

  const [projectId, setProjectId] = useState<string>(
    searchParams.get("projectId") ?? initialProjectId,
  );
  const [statuses, setStatuses] = useState<IssueStatus[]>([]);
  const [priorities, setPriorities] = useState<IssuePriority[]>([]);
  const [searchInput, setSearchInput] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [sortBy, setSortBy] = useState<IssueSortField>("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [listData, setListData] = useState<Paginated<Issue>>(initialList);
  const [boardColumns, setBoardColumns] = useState<BoardColumn[]>([]);
  const [loading, setLoading] = useState(false);

  const [draggedIssue, setDraggedIssue] = useState<Issue | null>(null);
  const [dragOverStatus, setDragOverStatus] = useState<IssueStatus | null>(null);

  // Sync projectId from URL and reset if project no longer exists
  useEffect(() => {
    const urlProjectId = searchParams.get("projectId") ?? "";
    if (urlProjectId && projects.length > 0 && !projects.some((p) => p.id === urlProjectId)) {
      setProjectId("");
      router.replace("/issues");
      return;
    }
    setProjectId(urlProjectId);
    setPage(1);
  }, [searchParams, projects, router]);

  // Debounce search input (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchInput.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const activeBoardProjectId = projectId || projects[0]?.id || "";

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.issues.list({
        projectId: projectId || undefined,
        status: statuses.length ? statuses : undefined,
        priority: priorities.length ? priorities : undefined,
        q: debouncedQuery || undefined,
        overdue: overdueOnly ? true : undefined,
        sortBy,
        sortOrder,
        page,
        pageSize,
      });
      setListData(res);
    } catch (err) {
      const msg = err instanceof ClientApiError ? err.message : "Failed to load issues";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [projectId, statuses, priorities, debouncedQuery, overdueOnly, sortBy, sortOrder, page, pageSize]);

  const fetchBoard = useCallback(async () => {
    if (!activeBoardProjectId) return;
    setLoading(true);
    try {
      const res = await apiClient.projects.board(activeBoardProjectId, {
        q: debouncedQuery || undefined,
        priority: priorities.length ? priorities : undefined,
      });
      setBoardColumns(res.data.columns);
    } catch (err) {
      const msg = err instanceof ClientApiError ? err.message : "Failed to load Kanban board";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [activeBoardProjectId, debouncedQuery, priorities]);

  useEffect(() => {
    if (viewMode === "list") {
      fetchList();
    } else {
      fetchBoard();
    }
  }, [viewMode, fetchList, fetchBoard, revision]);

  function toggleStatus(s: IssueStatus) {
    setPage(1);
    setStatuses((prev) => (prev.includes(s) ? prev.filter((item) => item !== s) : [...prev, s]));
  }

  function togglePriority(p: IssuePriority) {
    setPage(1);
    setPriorities((prev) => (prev.includes(p) ? prev.filter((item) => item !== p) : [...prev, p]));
  }

  function clearFilters() {
    setProjectId("");
    setStatuses([]);
    setPriorities([]);
    setSearchInput("");
    setDebouncedQuery("");
    setOverdueOnly(false);
    setSortBy("createdAt");
    setSortOrder("desc");
    setPage(1);
    router.replace("/issues");
  }

  const hasActiveFilters =
    Boolean(projectId) ||
    statuses.length > 0 ||
    priorities.length > 0 ||
    Boolean(debouncedQuery) ||
    overdueOnly;

  async function handleCardDrop(targetStatus: IssueStatus) {
    const issue = draggedIssue;
    setDraggedIssue(null);
    setDragOverStatus(null);
    if (!issue || issue.status === targetStatus) return;

    if (!canTransition(issue.status, targetStatus)) {
      toast.error(
        `Invalid workflow transition: ${STATUS_LABELS[issue.status]} → ${STATUS_LABELS[targetStatus]}`,
      );
      return;
    }

    // Update UI immediately before calling API
    const previousColumns = boardColumns;
    setBoardColumns((cols) =>
      cols.map((col) => {
        if (col.status === issue.status) {
          const nextIssues = col.issues.filter((i) => i.id !== issue.id);
          return {
            ...col,
            issues: nextIssues,
            totalPoints: nextIssues.reduce((sum, i) => sum + i.storyPoints, 0),
          };
        }
        if (col.status === targetStatus) {
          const moved: Issue = { ...issue, status: targetStatus };
          const nextIssues = [moved, ...col.issues];
          return {
            ...col,
            issues: nextIssues,
            totalPoints: nextIssues.reduce((sum, i) => sum + i.storyPoints, 0),
          };
        }
        return col;
      }),
    );

    try {
      await apiClient.issues.transitionStatus(issue.id, targetStatus);
      toast.success(`${issue.key} moved to ${STATUS_LABELS[targetStatus]}`);
      await Promise.all([fetchBoard(), refreshProjects()]);
    } catch (err) {
      setBoardColumns(previousColumns);
      const msg = err instanceof ClientApiError ? err.message : "Could not move issue";
      toast.error(msg);
    }
  }

  return (
    <div className="space-y-5">
      {/* Header & View Switcher */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Issues &amp; Sprint Board
          </h1>
          <p className="mt-0.5 text-sm text-slate-500">
            Filter, search, and transition tasks across your Agile workflow.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* View Toggle */}
          <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1 shadow-2xs">
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition",
                viewMode === "list"
                  ? "bg-slate-900 text-white"
                  : "text-slate-600 hover:text-slate-900",
              )}
            >
              <List className="h-3.5 w-3.5" />
              List View
            </button>
            <button
              type="button"
              onClick={() => {
                if (!projectId && projects[0]) {
                  setProjectId(projects[0].id);
                }
                setViewMode("board");
              }}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition",
                viewMode === "board"
                  ? "bg-slate-900 text-white"
                  : "text-slate-600 hover:text-slate-900",
              )}
            >
              <Kanban className="h-3.5 w-3.5" />
              Kanban Board
            </button>
          </div>

          <button
            type="button"
            onClick={() => openCreateIssue({ projectId: projectId || projects[0]?.id })}
            className="inline-flex items-center gap-1.5 rounded-xl bg-brand-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-brand-500"
          >
            <Plus className="h-4 w-4" />
            Create Issue
          </button>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs space-y-3.5">
        <div className="grid gap-3 md:grid-cols-12">
          {/* Search Input */}
          <div className="relative md:col-span-5">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search title or issue key (e.g. DEV-5)..."
              className="w-full rounded-xl border border-slate-300 bg-white py-2 pl-9 pr-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            />
          </div>

          {/* Project Selector */}
          <div className="md:col-span-3">
            <select
              aria-label="Filter by project"
              value={viewMode === "board" ? activeBoardProjectId : projectId}
              onChange={(e) => {
                setProjectId(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 focus:border-brand-500 focus:outline-none"
            >
              {viewMode === "list" && <option value="">All Projects ({projects.length})</option>}
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  [{p.key}] {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Sort Controls (List mode) */}
          {viewMode === "list" ? (
            <div className="flex gap-2 md:col-span-4">
              <div className="relative flex-1">
                <ArrowDownUp className="pointer-events-none absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <select
                  aria-label="Sort field"
                  value={sortBy}
                  onChange={(e) => {
                    setSortBy(e.target.value as IssueSortField);
                    setPage(1);
                  }}
                  className="w-full rounded-xl border border-slate-300 bg-white py-2 pl-8 pr-2 text-xs font-medium text-slate-700 focus:border-brand-500 focus:outline-none"
                >
                  <option value="createdAt">Sort: Created Date</option>
                  <option value="dueDate">Sort: Due Date</option>
                  <option value="priority">Sort: Priority</option>
                  <option value="storyPoints">Sort: Story Points</option>
                  <option value="updatedAt">Sort: Updated Date</option>
                  <option value="title">Sort: Title</option>
                </select>
              </div>

              <button
                type="button"
                onClick={() => setSortOrder((o) => (o === "asc" ? "desc" : "asc"))}
                className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                {sortOrder === "asc" ? "ASC ↑" : "DESC ↓"}
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-end text-xs text-slate-500 md:col-span-4">
              Drag cards across columns or use the status dropdown on any card.
            </div>
          )}
        </div>

        {/* Multi-filter Pills */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              <Filter className="h-3 w-3" />
              Filters:
            </span>

            {/* Status pills (List view only) */}
            {viewMode === "list" &&
              ISSUE_STATUSES.map((s) => {
                const active = statuses.includes(s);
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => toggleStatus(s)}
                    className={cn(
                      "rounded-full px-2.5 py-1 text-[11px] font-semibold transition",
                      active
                        ? "bg-slate-900 text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200",
                    )}
                  >
                    {STATUS_LABELS[s]}
                  </button>
                );
              })}

            {viewMode === "list" && <span className="text-slate-300">|</span>}

            {/* Priority pills */}
            {ISSUE_PRIORITIES.map((p) => {
              const active = priorities.includes(p);
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => togglePriority(p)}
                  className={cn(
                    "rounded-md px-2 py-1 text-[11px] font-semibold transition",
                    active
                      ? "bg-brand-600 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200",
                  )}
                >
                  {PRIORITY_LABELS[p]}
                </button>
              );
            })}

            {viewMode === "list" && (
              <button
                type="button"
                onClick={() => {
                  setOverdueOnly((v) => !v);
                  setPage(1);
                }}
                className={cn(
                  "inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-semibold transition",
                  overdueOnly
                    ? "bg-rose-600 text-white"
                    : "bg-rose-50 text-rose-700 hover:bg-rose-100",
                )}
              >
                <AlertCircle className="h-3 w-3" />
                Overdue Only
              </button>
            )}
          </div>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-800"
            >
              <RotateCcw className="h-3 w-3" />
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Main View Content */}
      {viewMode === "list" ? (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xs">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-slate-50/80 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-3">Key</th>
                  <th className="px-4 py-3">Issue Title</th>
                  <th className="px-4 py-3">Member</th>
                  <th className="px-4 py-3">Status (Quick Transition)</th>
                  <th className="px-4 py-3">Priority</th>
                  <th className="px-4 py-3">Estimate</th>
                  <th className="px-4 py-3">Due Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading && listData.data.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-16 text-center text-sm text-slate-500">
                      <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin text-brand-600" />
                      Loading issues...
                    </td>
                  </tr>
                ) : listData.data.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-16 text-center">
                      <p className="text-sm font-semibold text-slate-700">
                        No issues match the current filters
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        Try clearing filters or create a new issue.
                      </p>
                    </td>
                  </tr>
                ) : (
                  listData.data.map((issue) => (
                    <tr
                      key={issue.id}
                      onClick={() => openEditIssue(issue)}
                      className="cursor-pointer transition hover:bg-slate-50/90"
                    >
                      <td className="whitespace-nowrap px-4 py-3.5">
                        <span
                          className="inline-flex items-center rounded-md px-2 py-0.5 font-mono text-xs font-bold text-white"
                          style={{ backgroundColor: issue.project.color }}
                        >
                          {issue.key}
                        </span>
                      </td>

                      <td className="max-w-md px-4 py-3.5">
                        <div className="font-semibold text-slate-900 line-clamp-1">
                          {issue.title}
                        </div>
                        {issue.description && (
                          <div className="mt-0.5 text-xs text-slate-400 line-clamp-1">
                            {issue.description}
                          </div>
                        )}
                      </td>

                      <td className="whitespace-nowrap px-4 py-3.5">
                        <MemberBadge name={issue.reporter.name} />
                      </td>

                      <td className="whitespace-nowrap px-4 py-3.5">
                        <QuickStatusMenu
                          issue={issue}
                          onUpdated={async () => {
                            await Promise.all([fetchList(), refreshProjects()]);
                          }}
                        />
                      </td>

                      <td className="whitespace-nowrap px-4 py-3.5">
                        <PriorityBadge priority={issue.priority} />
                      </td>

                      <td className="whitespace-nowrap px-4 py-3.5">
                        <StoryPointsBadge points={issue.storyPoints} />
                      </td>

                      <td className="whitespace-nowrap px-4 py-3.5">
                        <DueDateBadge dueDate={issue.dueDate} status={issue.status} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Server-Side Pagination Footer */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-50/60 px-4 py-3 text-xs text-slate-600">
            <div className="flex items-center gap-2">
              <span>
                Total <strong className="text-slate-900">{listData.meta.total}</strong> issues •
                Page <strong className="text-slate-900">{listData.meta.page}</strong> of{" "}
                <strong className="text-slate-900">{listData.meta.totalPages}</strong>
              </span>
              {loading && <Loader2 className="h-3.5 w-3.5 animate-spin text-brand-600" />}
            </div>

            <div className="flex items-center gap-2">
              <select
                aria-label="Rows per page"
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
                className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700"
              >
                <option value={10}>10 / page</option>
                <option value={20}>20 / page</option>
                <option value={50}>50 / page</option>
              </select>

              <button
                type="button"
                disabled={!listData.meta.hasPrevPage || loading}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1 font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                Prev
              </button>

              <button
                type="button"
                disabled={!listData.meta.hasNextPage || loading}
                onClick={() => setPage((p) => p + 1)}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1 font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {boardColumns.map((col) => {
            const isValidDrop =
              draggedIssue !== null &&
              draggedIssue.status !== col.status &&
              canTransition(draggedIssue.status, col.status);
            const isInvalidDrop =
              draggedIssue !== null &&
              draggedIssue.status !== col.status &&
              !canTransition(draggedIssue.status, col.status);

            return (
              <div
                key={col.status}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOverStatus(col.status);
                }}
                onDragLeave={() => {
                  if (dragOverStatus === col.status) setDragOverStatus(null);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  handleCardDrop(col.status);
                }}
                className={cn(
                  "flex flex-col rounded-2xl border bg-slate-100/80 p-3 transition",
                  dragOverStatus === col.status && isValidDrop
                    ? "border-brand-500 bg-brand-50/50 ring-2 ring-brand-500/30"
                    : "border-slate-200/90",
                  isInvalidDrop && "opacity-55",
                )}
              >
                {/* Column Header */}
                <div className="mb-3 flex items-center justify-between px-1">
                  <div className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: STATUS_COLORS[col.status] }}
                    />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      {col.label}
                    </h3>
                    <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-bold text-slate-600 shadow-2xs">
                      {col.issues.length}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-semibold text-indigo-600">
                      {col.totalPoints} pts
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        openCreateIssue({
                          projectId: activeBoardProjectId,
                          status: col.status,
                        })
                      }
                      title={`Add issue to ${col.label}`}
                      className="rounded-lg p-1 text-slate-400 hover:bg-white hover:text-slate-700"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* Cards Container */}
                <div className="flex-1 space-y-2.5">
                  {col.issues.length === 0 ? (
                    <div className="flex h-28 items-center justify-center rounded-xl border border-dashed border-slate-300/80 text-xs text-slate-400">
                      {isValidDrop ? "Drop here to transition" : "No issues"}
                    </div>
                  ) : (
                    col.issues.map((issue) => (
                      <div
                        key={issue.id}
                        draggable
                        onDragStart={() => setDraggedIssue(issue)}
                        onDragEnd={() => {
                          setDraggedIssue(null);
                          setDragOverStatus(null);
                        }}
                        onClick={() => openEditIssue(issue)}
                        className="group cursor-pointer rounded-xl border border-slate-200/90 bg-white p-3.5 shadow-2xs transition hover:border-brand-300 hover:shadow-md"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="inline-flex items-center gap-1 font-mono text-[11px] font-bold text-slate-500">
                            <GripVertical className="h-3.5 w-3.5 text-slate-300 group-hover:text-slate-500" />
                            {issue.key}
                          </span>
                          <PriorityBadge priority={issue.priority} size="xs" />
                        </div>

                        <p className="mt-2 text-xs font-semibold leading-snug text-slate-900 line-clamp-2">
                          {issue.title}
                        </p>

                        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-2.5">
                          <div className="flex items-center gap-1.5">
                            <MemberBadge name={issue.reporter.name} compact />
                            <StoryPointsBadge points={issue.storyPoints} />
                            {issue.dueDate && (
                              <DueDateBadge dueDate={issue.dueDate} status={issue.status} />
                            )}
                          </div>

                          <QuickStatusMenu
                            issue={issue}
                            size="xs"
                            onUpdated={async () => {
                              await Promise.all([fetchBoard(), refreshProjects()]);
                            }}
                          />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
