"use client";

import { useEffect, useState } from "react";
import type { IssuePriority, IssueStatus } from "@prisma/client";
import {
  Clock,
  History,
  Loader2,
  Plus,
  Save,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { apiClient, ClientApiError } from "@/lib/api/client";
import {
  ACTIVITY_LABELS,
  canTransition,
  ISSUE_PRIORITIES,
  ISSUE_STATUSES,
  PRIORITY_LABELS,
  STATUS_LABELS,
  STORY_POINTS,
  type StoryPoint,
} from "@/lib/constants";
import { cn, toDateInputValue } from "@/lib/utils";
import type { Activity, Issue, Project } from "@/types/api";

interface IssueFormModalProps {
  open: boolean;
  onClose: () => void;
  projects: Project[];
  defaultProjectId?: string;
  defaultStatus?: IssueStatus;
  issue?: Issue | null;
  onSaved: (issue: Issue, mode: "create" | "update") => void;
  onDeleted?: (issueId: string) => void;
}

export function IssueFormModal({
  open,
  onClose,
  projects,
  defaultProjectId,
  defaultStatus = "TODO",
  issue,
  onSaved,
  onDeleted,
}: IssueFormModalProps) {
  const isEdit = Boolean(issue);

  const [tab, setTab] = useState<"details" | "activity">("details");
  const [projectId, setProjectId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<IssueStatus>("TODO");
  const [priority, setPriority] = useState<IssuePriority>("MEDIUM");
  const [storyPoints, setStoryPoints] = useState<StoryPoint>(3);
  const [dueDate, setDueDate] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[] | undefined>>({});

  const [activity, setActivity] = useState<Activity[]>([]);
  const [loadingActivity, setLoadingActivity] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTab("details");
    setError(null);
    setFieldErrors({});
    setConfirmDelete(false);

    if (issue) {
      setProjectId(issue.projectId);
      setTitle(issue.title);
      setDescription(issue.description ?? "");
      setStatus(issue.status);
      setPriority(issue.priority);
      setStoryPoints((STORY_POINTS.includes(issue.storyPoints as StoryPoint) ? issue.storyPoints : 3) as StoryPoint);
      setDueDate(toDateInputValue(issue.dueDate));
    } else {
      setProjectId(defaultProjectId || projects[0]?.id || "");
      setTitle("");
      setDescription("");
      setStatus(defaultStatus);
      setPriority("MEDIUM");
      setStoryPoints(3);
      setDueDate("");
    }
  }, [open, issue, defaultProjectId, defaultStatus, projects]);

  useEffect(() => {
    if (!open || !issue || tab !== "activity") return;
    let active = true;
    setLoadingActivity(true);
    apiClient.issues
      .get(issue.id)
      .then((res) => {
        if (active) setActivity(res.data.activity ?? []);
      })
      .catch(() => {
        if (active) toast.error("Failed to load issue activity");
      })
      .finally(() => {
        if (active) setLoadingActivity(false);
      });
    return () => {
      active = false;
    };
  }, [open, issue, tab]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    setSubmitting(true);

    try {
      if (issue) {
        const res = await apiClient.issues.update(issue.id, {
          title,
          description: description.trim() ? description : null,
          status,
          priority,
          storyPoints,
          dueDate: dueDate ? dueDate : null,
        });
        toast.success(`Updated ${res.data.key}`);
        onSaved(res.data, "update");
        onClose();
      } else {
        const res = await apiClient.issues.create({
          projectId,
          title,
          description: description.trim() ? description : null,
          status,
          priority,
          storyPoints,
          dueDate: dueDate ? dueDate : null,
        });
        toast.success(`Created ${res.data.key}: ${res.data.title}`);
        onSaved(res.data, "create");
        onClose();
      }
    } catch (err) {
      if (err instanceof ClientApiError) {
        setError(err.message);
        if (err.fieldErrors) setFieldErrors(err.fieldErrors);
      } else {
        setError("Could not save issue");
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!issue || deleting) return;
    setDeleting(true);
    try {
      await apiClient.issues.delete(issue.id);
      toast.success(`Deleted ${issue.key}`);
      onDeleted?.(issue.id);
      onClose();
    } catch (err) {
      const msg = err instanceof ClientApiError ? err.message : "Failed to delete issue";
      toast.error(msg);
      setDeleting(false);
    }
  }

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs animate-fade-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl animate-scale-in"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div className="flex items-center gap-3">
            {isEdit && issue ? (
              <span
                className="inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-bold text-white"
                style={{ backgroundColor: issue.project.color }}
              >
                {issue.key}
              </span>
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                <Plus className="h-4 w-4" />
              </div>
            )}
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {isEdit ? "Edit Issue" : "Create New Issue"}
              </h2>
              <p className="text-xs text-slate-500">
                {isEdit
                  ? `Project: ${issue?.project.name} • Member: ${issue?.reporter.name}`
                  : "Fill in task details, story points, and sprint priority."}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs when editing */}
        {isEdit && (
          <div className="flex border-b border-slate-200 bg-slate-50/70 px-6">
            <button
              type="button"
              onClick={() => setTab("details")}
              className={cn(
                "border-b-2 px-3 py-2.5 text-xs font-semibold transition",
                tab === "details"
                  ? "border-brand-600 text-brand-600"
                  : "border-transparent text-slate-500 hover:text-slate-800",
              )}
            >
              Issue Details
            </button>
            <button
              type="button"
              onClick={() => setTab("activity")}
              className={cn(
                "inline-flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-xs font-semibold transition",
                tab === "activity"
                  ? "border-brand-600 text-brand-600"
                  : "border-transparent text-slate-500 hover:text-slate-800",
              )}
            >
              <History className="h-3.5 w-3.5" />
              Activity Log
            </button>
          </div>
        )}

        {/* Body */}
        {tab === "activity" && isEdit ? (
          <div className="flex-1 overflow-y-auto p-6">
            {loadingActivity ? (
              <div className="flex items-center justify-center py-12 text-sm text-slate-500">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading activity history...
              </div>
            ) : activity.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-500">No activity recorded yet.</p>
            ) : (
              <ol className="relative border-l border-slate-200 ml-3 space-y-5">
                {activity.map((item) => (
                  <li key={item.id} className="ml-5">
                    <span className="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full border-2 border-white bg-brand-500" />
                    <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-700">
                      <span className="font-semibold text-slate-900">{item.actor.name}</span>
                      <span>{ACTIVITY_LABELS[item.type]}</span>
                      <span className="font-mono font-semibold text-brand-600">{item.issueKey}</span>
                      {item.field && (
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] text-slate-600">
                          {item.field}
                        </span>
                      )}
                      {item.fromValue && item.toValue && (
                        <span className="text-slate-500">
                          ({item.fromValue} → <strong className="text-slate-800">{item.toValue}</strong>)
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 flex items-center gap-1 text-[11px] text-slate-400">
                      <Clock className="h-3 w-3" />
                      {new Date(item.createdAt).toLocaleString()}
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
            {error && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-medium text-rose-700">
                {error}
              </div>
            )}

            {/* Project Selector (only when creating) */}
            {!isEdit && (
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600">
                  Project
                </label>
                <select
                  required
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                >
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      [{p.key}] {p.name}
                    </option>
                  ))}
                </select>
                {fieldErrors.projectId?.[0] && (
                  <p className="mt-1 text-xs text-rose-600">{fieldErrors.projectId[0]}</p>
                )}
              </div>
            )}

            {/* Title */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600">
                Issue Title
              </label>
              <input
                type="text"
                required
                minLength={3}
                maxLength={200}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Implement OAuth2 callback handler"
                className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
              {fieldErrors.title?.[0] && (
                <p className="mt-1 text-xs text-rose-600">{fieldErrors.title[0]}</p>
              )}
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600">
                Description <span className="font-normal text-slate-400">(optional)</span>
              </label>
              <textarea
                rows={3}
                maxLength={5000}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Acceptance criteria, technical context, or reproduction steps..."
                className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
              {fieldErrors.description?.[0] && (
                <p className="mt-1 text-xs text-rose-600">{fieldErrors.description[0]}</p>
              )}
            </div>

            {/* Status & Priority */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600">
                  Workflow Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as IssueStatus)}
                  className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                >
                  {ISSUE_STATUSES.map((s) => {
                    const allowed = !issue || canTransition(issue.status, s);
                    return (
                      <option key={s} value={s} disabled={!allowed}>
                        {STATUS_LABELS[s]} {!allowed ? "(Invalid transition)" : ""}
                      </option>
                    );
                  })}
                </select>
                {isEdit && issue && (
                  <p className="mt-1 text-[11px] text-slate-400">
                    State machine enforced from current status ({STATUS_LABELS[issue.status]}).
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600">
                  Priority
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as IssuePriority)}
                  className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                >
                  {ISSUE_PRIORITIES.map((p) => (
                    <option key={p} value={p}>
                      {PRIORITY_LABELS[p]}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Story Points (Fibonacci) & Due Date */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600">
                  Story Points (Fibonacci)
                </label>
                <div className="mt-1.5 flex gap-2">
                  {STORY_POINTS.map((pt) => (
                    <button
                      key={pt}
                      type="button"
                      onClick={() => setStoryPoints(pt)}
                      className={cn(
                        "flex-1 rounded-xl border py-2 text-xs font-bold transition",
                        storyPoints === pt
                          ? "border-brand-600 bg-brand-600 text-white shadow-xs"
                          : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50",
                      )}
                    >
                      {pt}
                    </button>
                  ))}
                </div>
                {fieldErrors.storyPoints?.[0] && (
                  <p className="mt-1 text-xs text-rose-600">{fieldErrors.storyPoints[0]}</p>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600">
                    Due Date
                  </label>
                  {dueDate && (
                    <button
                      type="button"
                      onClick={() => setDueDate("")}
                      className="text-[11px] font-medium text-slate-400 hover:text-slate-600"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                />
                {fieldErrors.dueDate?.[0] && (
                  <p className="mt-1 text-xs text-rose-600">{fieldErrors.dueDate[0]}</p>
                )}
              </div>
            </div>

            {/* Footer Actions */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4">
              {isEdit && issue ? (
                confirmDelete ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-rose-600">Delete {issue.key}?</span>
                    <button
                      type="button"
                      disabled={deleting}
                      onClick={handleDelete}
                      className="inline-flex items-center gap-1 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-500 disabled:opacity-50"
                    >
                      {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                      Confirm
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(false)}
                      className="rounded-lg px-2 py-1.5 text-xs text-slate-500 hover:bg-slate-100"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(true)}
                    className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold text-rose-600 transition hover:bg-rose-50"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete Issue
                  </button>
                )
              ) : (
                <div />
              )}

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-brand-600 px-4 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-brand-500 disabled:opacity-60"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      {isEdit ? "Save Changes" : "Create Issue"}
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
