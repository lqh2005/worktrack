"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Edit3,
  FolderPlus,
  Kanban,
  ListTodo,
  Loader2,
  Plus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { apiClient, ClientApiError } from "@/lib/api/client";
import { ISSUE_STATUSES, STATUS_COLORS, STATUS_LABELS } from "@/lib/constants";
import { useWorkspace } from "@/components/layout/app-shell";
import type { Project } from "@/types/api";

export function ProjectsView() {
  const {
    projects,
    refreshProjects,
    openCreateProject,
    openEditProject,
    openCreateIssue,
    bumpRevision,
  } = useWorkspace();

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleDelete(project: Project) {
    if (deletingId) return;
    setDeletingId(project.id);
    try {
      await apiClient.projects.delete(project.id);
      toast.success(`Deleted project [${project.key}] ${project.name}`);
      setConfirmDeleteId(null);
      await refreshProjects();
      bumpRevision();
    } catch (err) {
      const msg = err instanceof ClientApiError ? err.message : "Failed to delete project";
      toast.error(msg);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Agile Projects
          </h1>
          <p className="mt-0.5 text-sm text-slate-500">
            Manage repositories, issue key prefixes, and track sprint completion per project.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateProject}
          className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-brand-500"
        >
          <FolderPlus className="h-4 w-4" />
          New Project
        </button>
      </div>

      {projects.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-16 text-center">
          <p className="text-sm font-semibold text-slate-700">No projects in this workspace</p>
          <p className="mt-1 text-xs text-slate-500">
            Create your first project to start tracking issues and sprint velocity.
          </p>
          <button
            type="button"
            onClick={openCreateProject}
            className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-brand-600 px-4 py-2 text-xs font-semibold text-white"
          >
            <Plus className="h-4 w-4" />
            Create Project
          </button>
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {projects.map((project) => (
            <div
              key={project.id}
              className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs transition hover:border-slate-300 hover:shadow-md"
            >
              <div>
                {/* Card Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span
                      className="inline-flex items-center rounded-lg px-2.5 py-1 font-mono text-xs font-bold text-white"
                      style={{ backgroundColor: project.color }}
                    >
                      {project.key}
                    </span>
                    <div>
                      <h2 className="text-base font-bold text-slate-900">{project.name}</h2>
                      <p className="text-[11px] text-slate-400">
                        {project.stats.totalIssues} issues • {project.stats.totalPoints} story pts
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => openEditProject(project)}
                      title="Edit project"
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                    >
                      <Edit3 className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(project.id)}
                      title="Delete project"
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <p className="mt-3 text-xs leading-relaxed text-slate-600 line-clamp-2">
                  {project.description || "No project description provided."}
                </p>

                {/* Progress Bar */}
                <div className="mt-4">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-600">Sprint Progress</span>
                    <span className="font-bold text-slate-900">
                      {project.stats.completionRate}% ({project.stats.donePoints}/
                      {project.stats.totalPoints} pts)
                    </span>
                  </div>
                  <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${project.stats.completionRate}%`,
                        backgroundColor: project.color,
                      }}
                    />
                  </div>
                </div>

                {/* Status Breakdown */}
                <div className="mt-4 grid grid-cols-2 gap-2">
                  {ISSUE_STATUSES.map((status) => (
                    <div
                      key={status}
                      className="flex items-center justify-between rounded-lg bg-slate-50 px-2.5 py-1.5 text-[11px]"
                    >
                      <span className="flex items-center gap-1.5 text-slate-600">
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: STATUS_COLORS[status] }}
                        />
                        {STATUS_LABELS[status]}
                      </span>
                      <span className="font-bold text-slate-900">
                        {project.stats.byStatus[status]}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Delete Confirmation or Action Links */}
              <div className="mt-5 border-t border-slate-100 pt-3.5">
                {confirmDeleteId === project.id ? (
                  <div className="flex items-center justify-between rounded-xl bg-rose-50 px-3 py-2 text-xs">
                    <span className="font-medium text-rose-700">
                      Delete {project.key} &amp; all issues?
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        disabled={deletingId === project.id}
                        onClick={() => handleDelete(project)}
                        className="inline-flex items-center gap-1 rounded-lg bg-rose-600 px-2.5 py-1 font-semibold text-white hover:bg-rose-500"
                      >
                        {deletingId === project.id && (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        )}
                        Delete
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(null)}
                        className="rounded-lg px-2 py-1 text-slate-600 hover:bg-white"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/issues?projectId=${project.id}`}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-200"
                      >
                        <ListTodo className="h-3.5 w-3.5" />
                        Issues
                      </Link>
                      <Link
                        href={`/issues?projectId=${project.id}&view=board`}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-200"
                      >
                        <Kanban className="h-3.5 w-3.5" />
                        Board
                      </Link>
                    </div>

                    <button
                      type="button"
                      onClick={() => openCreateIssue({ projectId: project.id })}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-500"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add Issue
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
