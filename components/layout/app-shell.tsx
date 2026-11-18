"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { IssueStatus } from "@prisma/client";
import {
  Activity,
  BarChart3,
  FolderKanban,
  ListTodo,
  Loader2,
  LogOut,
  Menu,
  Plus,
  RotateCcw,
  Sparkles,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { apiClient, ClientApiError } from "@/lib/api/client";
import { TEAM_MEMBERS } from "@/lib/demo/constants";
import { cn } from "@/lib/utils";
import type { Issue, Project, User } from "@/types/api";
import { IssueFormModal } from "@/components/issues/issue-form-modal";
import { ProjectFormModal } from "@/components/projects/project-form-modal";

interface CreateIssueDefaults {
  projectId?: string;
  status?: IssueStatus;
}

interface WorkspaceContextValue {
  user: User;
  projects: Project[];
  refreshProjects: () => Promise<void>;
  openCreateIssue: (defaults?: CreateIssueDefaults) => void;
  openEditIssue: (issue: Issue) => void;
  openCreateProject: () => void;
  openEditProject: (project: Project) => void;
  revision: number;
  bumpRevision: () => void;
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) {
    throw new Error("useWorkspace must be used within AppShell");
  }
  return ctx;
}

interface AppShellProps {
  initialUser: User;
  initialProjects: Project[];
  children: React.ReactNode;
}

export function AppShell({
  initialUser,
  initialProjects,
  children,
}: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();

  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [resettingDemo, setResettingDemo] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [revision, setRevision] = useState(0);

  const [issueModalOpen, setIssueModalOpen] = useState(false);
  const [editingIssue, setEditingIssue] = useState<Issue | null>(null);
  const [issueDefaults, setIssueDefaults] = useState<CreateIssueDefaults>({});

  const [projectModalOpen, setProjectModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);

  const bumpRevision = useCallback(() => {
    setRevision((r) => r + 1);
  }, []);

  const refreshProjects = useCallback(async () => {
    try {
      const res = await apiClient.projects.list();
      setProjects(res.data);
    } catch {
      // Keep existing projects on transient failure
    }
  }, []);

  const openCreateIssue = useCallback((defaults?: CreateIssueDefaults) => {
    setEditingIssue(null);
    setIssueDefaults(defaults ?? {});
    setIssueModalOpen(true);
  }, []);

  const openEditIssue = useCallback((issue: Issue) => {
    setEditingIssue(issue);
    setIssueModalOpen(true);
  }, []);

  const openCreateProject = useCallback(() => {
    setEditingProject(null);
    setProjectModalOpen(true);
  }, []);

  const openEditProject = useCallback((project: Project) => {
    setEditingProject(project);
    setProjectModalOpen(true);
  }, []);

  // Press 'C' to open create issue modal
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target?.isContentEditable) {
        return;
      }
      if (e.key === "c" || e.key === "C") {
        e.preventDefault();
        openCreateIssue();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [openCreateIssue]);

  async function handleResetDemo() {
    if (resettingDemo) return;
    setResettingDemo(true);
    try {
      const res = await apiClient.demo.reset();
      toast.success(
        `Demo workspace restored: ${res.data.projects} projects & ${res.data.issues} issues.`,
      );
      await refreshProjects();
      bumpRevision();
      router.refresh();
    } catch (err) {
      const msg = err instanceof ClientApiError ? err.message : "Failed to reset demo data";
      toast.error(msg);
    } finally {
      setResettingDemo(false);
    }
  }

  async function handleLogout() {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await apiClient.auth.logout();
      router.push("/login");
      router.refresh();
    } catch {
      setLoggingOut(false);
    }
  }

  const navLinks = [
    { href: "/dashboard", label: "Analytics Dashboard", icon: BarChart3 },
    { href: "/issues", label: "Issues & Kanban", icon: ListTodo },
    { href: "/projects", label: "Projects", icon: FolderKanban },
  ];

  return (
    <WorkspaceContext.Provider
      value={{
        user: initialUser,
        projects,
        refreshProjects,
        openCreateIssue,
        openEditIssue,
        openCreateProject,
        openEditProject,
        revision,
        bumpRevision,
      }}
    >
      <div className="flex min-h-screen bg-slate-50">
        {/* Mobile Backdrop */}
        {sidebarOpen && (
          <div
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 z-30 bg-slate-900/50 backdrop-blur-xs lg:hidden"
          />
        )}

        {/* Sidebar */}
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-slate-200 bg-white transition-transform lg:static lg:translate-x-0",
            sidebarOpen ? "translate-x-0" : "-translate-x-full",
          )}
        >
          {/* Brand Header */}
          <div className="flex h-16 items-center justify-between border-b border-slate-200 px-5">
            <Link href="/dashboard" className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 shadow-xs">
                <Activity className="h-4 w-4 text-white" />
              </div>
              <span className="text-base font-bold tracking-tight text-slate-900">WorkTrack</span>
            </Link>
            <button
              type="button"
              onClick={() => setSidebarOpen(false)}
              className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 lg:hidden"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Quick Create CTA */}
          <div className="p-4">
            <button
              type="button"
              onClick={() => {
                setSidebarOpen(false);
                openCreateIssue();
              }}
              className="flex w-full items-center justify-between rounded-xl bg-brand-600 px-3.5 py-2.5 text-xs font-semibold text-white shadow-sm shadow-brand-600/20 transition hover:bg-brand-500"
            >
              <span className="inline-flex items-center gap-2">
                <Plus className="h-4 w-4" />
                New Issue
              </span>
              <kbd className="rounded bg-brand-700/80 px-1.5 py-0.5 font-mono text-[10px] text-brand-100">
                C
              </kbd>
            </button>
          </div>

          {/* Main Navigation */}
          <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-2">
            <div className="space-y-1">
              <div className="px-2.5 pb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Workspace
              </div>
              {navLinks.map((item) => {
                const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={cn(
                      "flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium transition",
                      active
                        ? "bg-brand-50 text-brand-700 font-semibold"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                    )}
                  >
                    <item.icon
                      className={cn("h-4 w-4", active ? "text-brand-600" : "text-slate-400")}
                    />
                    {item.label}
                  </Link>
                );
              })}
            </div>

            {/* Projects List */}
            <div>
              <div className="flex items-center justify-between px-2.5 pb-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Projects ({projects.length})
                </span>
                <button
                  type="button"
                  onClick={openCreateProject}
                  title="Create project"
                  className="rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="space-y-1">
                {projects.map((p) => (
                  <Link
                    key={p.id}
                    href={`/issues?projectId=${p.id}`}
                    onClick={() => setSidebarOpen(false)}
                    className="group flex items-center justify-between rounded-xl px-2.5 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
                  >
                    <span className="flex items-center gap-2 truncate">
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: p.color }}
                      />
                      <span className="font-mono text-[11px] font-semibold text-slate-400 group-hover:text-slate-600">
                        {p.key}
                      </span>
                      <span className="truncate">{p.name}</span>
                    </span>
                    <span className="ml-2 rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500 group-hover:bg-white">
                      {p.stats.openIssues}
                    </span>
                  </Link>
                ))}
              </div>
            </div>

            <div>
              <div className="px-2.5 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Team Members ({TEAM_MEMBERS.length})
              </div>
              <div className="space-y-1.5 px-1">
                {TEAM_MEMBERS.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center gap-2.5 rounded-xl px-2 py-1.5 text-xs"
                  >
                    <span
                      style={{ backgroundColor: member.color }}
                      className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
                    >
                      {member.initials}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-slate-800">{member.name}</p>
                      <p className="truncate text-[10px] text-slate-400">{member.role}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </nav>

          {/* User Footer */}
          <div className="border-t border-slate-200 p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="truncate text-xs font-bold text-slate-900">{initialUser.name}</p>
                  {initialUser.isDemo && (
                    <span className="rounded bg-amber-100 px-1.5 py-0.2 text-[10px] font-semibold text-amber-800">
                      DEMO
                    </span>
                  )}
                </div>
                <p className="truncate text-[11px] text-slate-500">{initialUser.email}</p>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                disabled={loggingOut}
                title="Sign out"
                className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              >
                {loggingOut ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <LogOut className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Topbar */}
          <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200 bg-white/90 px-4 backdrop-blur sm:px-6">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setSidebarOpen(true)}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden"
              >
                <Menu className="h-5 w-5" />
              </button>

              {initialUser.isDemo && (
                <div className="flex flex-wrap items-center gap-2 rounded-xl border border-indigo-200/80 bg-indigo-50/70 px-3 py-1.5 text-xs">
                  <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
                  <span className="font-medium text-indigo-950">
                    Demo Account
                  </span>
                  <button
                    type="button"
                    onClick={handleResetDemo}
                    disabled={resettingDemo}
                    className="inline-flex items-center gap-1 rounded-lg bg-white px-2 py-0.5 text-[11px] font-semibold text-indigo-700 shadow-2xs ring-1 ring-inset ring-indigo-200 transition hover:bg-indigo-100 disabled:opacity-50"
                  >
                    {resettingDemo ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <RotateCcw className="h-3 w-3" />
                    )}
                    Reset Sample Data
                  </button>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={openCreateProject}
                className="hidden items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 sm:inline-flex"
              >
                <Plus className="h-3.5 w-3.5" />
                New Project
              </button>
              <button
                type="button"
                onClick={() => openCreateIssue()}
                className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-800"
              >
                <Plus className="h-3.5 w-3.5" />
                New Issue
              </button>
            </div>
          </header>

          {/* Page Content */}
          <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
        </div>
      </div>

      {/* Global Create / Edit Issue Modal */}
      <IssueFormModal
        open={issueModalOpen}
        onClose={() => setIssueModalOpen(false)}
        projects={projects}
        defaultProjectId={issueDefaults.projectId}
        defaultStatus={issueDefaults.status}
        issue={editingIssue}
        onSaved={async () => {
          await refreshProjects();
          bumpRevision();
        }}
        onDeleted={async () => {
          await refreshProjects();
          bumpRevision();
        }}
      />

      {/* Global Create / Edit Project Modal */}
      <ProjectFormModal
        open={projectModalOpen}
        onClose={() => setProjectModalOpen(false)}
        project={editingProject}
        onSaved={async () => {
          await refreshProjects();
          bumpRevision();
        }}
      />
    </WorkspaceContext.Provider>
  );
}
