import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Activity,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  GitBranch,
  Kanban,
  Layers,
  History,
  Zap,
} from "lucide-react";
import { getSessionUser } from "@/lib/auth/session";
import { TEAM_MEMBERS } from "@/lib/demo/constants";
import { DemoLoginButton } from "@/components/auth/demo-login-button";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const user = await getSessionUser();
  if (user) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800/80 bg-slate-950/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 shadow-lg shadow-brand-600/30">
              <Activity className="h-5 w-5 text-white" />
            </div>
            <div>
              <span className="text-lg font-bold tracking-tight text-white">WorkTrack</span>
              <span className="ml-2 rounded-full bg-brand-500/15 px-2 py-0.5 text-[11px] font-medium text-brand-300 ring-1 ring-inset ring-brand-500/30">
                Issue Tracker
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="rounded-lg px-3.5 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-800/70 hover:text-white"
            >
              Sign in
            </Link>
            <Link
              href="/register"
              className="rounded-lg bg-white/10 px-4 py-2 text-sm font-semibold text-white ring-1 ring-inset ring-white/15 transition hover:bg-white/15"
            >
              Register
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 pb-24 pt-16 lg:pt-24">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-brand-500/10 px-3.5 py-1.5 text-xs font-medium text-brand-300 ring-1 ring-inset ring-brand-500/25">
            <Zap className="h-3.5 w-3.5 text-brand-400" />
            Mini Agile Issue Tracker &amp; Sprint Analytics
          </div>

          <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-6xl">
            Manage project tasks and{" "}
            <span className="bg-gradient-to-r from-brand-400 via-indigo-300 to-sky-300 bg-clip-text text-transparent">
              sprint progress
            </span>{" "}
            in one place.
          </h1>

          <p className="mt-6 text-base leading-relaxed text-slate-400 sm:text-lg">
            A lightweight task tracker for small software teams with a Kanban board, workflow
            status rules, server-side search and filters, and sprint velocity charts. Built with
            Next.js 14, TypeScript, Prisma and PostgreSQL.
          </p>

          <div className="mt-9 flex flex-col items-center justify-center gap-3.5 sm:flex-row">
            <DemoLoginButton
              label="Login as Demo User"
              className="w-full px-6 py-3 text-base sm:w-auto"
            />
            <Link
              href="/login"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-6 py-3 text-base font-semibold text-slate-200 transition hover:border-slate-600 hover:bg-slate-800 sm:w-auto"
            >
              Sign in with Email
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <p className="mt-4 text-xs text-slate-500">
            Demo account: <code className="text-slate-300">demo@worktrack.app</code> /{" "}
            <code className="text-slate-300">demo1234</code>
          </p>
        </div>

        <div className="mt-20 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[
            {
              icon: GitBranch,
              title: "Workflow State Transitions",
              desc: "Issues follow a clear workflow (TODO -> IN_PROGRESS -> IN_REVIEW -> DONE) and automatically record completion time when done.",
            },
            {
              icon: BarChart3,
              title: "Burndown & Velocity Charts",
              desc: "Track remaining Story Points day by day and compare weekly completed points using Recharts.",
            },
            {
              icon: Kanban,
              title: "List View & Kanban Board",
              desc: "Switch between a paginated table view and a drag-and-drop Kanban board with quick status menus.",
            },
            {
              icon: Layers,
              title: "Filter, Search & Sort",
              desc: "Filter issues by project, status, priority or overdue state, and search by keyword or issue key (e.g. DEV-5).",
            },
            {
              icon: History,
              title: "Issue Activity History",
              desc: "Every status or priority change is saved in an activity log so you can see when each task was updated.",
            },
            {
              icon: CheckCircle2,
              title: "Instant Demo Mode",
              desc: "Sign in with one click using the sample workspace (3 projects and 44 issues) without creating an account.",
            },
          ].map((feature) => (
            <div
              key={feature.title}
              className="rounded-2xl border border-slate-800/90 bg-slate-900/60 p-6 transition hover:border-slate-700"
            >
              <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500/15 text-brand-400 ring-1 ring-inset ring-brand-500/30">
                <feature.icon className="h-5 w-5" />
              </div>
              <h3 className="text-base font-semibold text-white">{feature.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">{feature.desc}</p>
            </div>
          ))}
        </div>

        <div className="mt-16 rounded-2xl border border-slate-800/80 bg-slate-900/40 p-6">
          <p className="text-center text-xs font-semibold uppercase tracking-wider text-slate-400">
            Project Team Members
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            {TEAM_MEMBERS.map((member) => (
              <div
                key={member.id}
                className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/80 px-4 py-3"
              >
                <span
                  style={{ backgroundColor: member.color }}
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                >
                  {member.initials}
                </span>
                <div>
                  <p className="text-sm font-semibold text-white">{member.name}</p>
                  <p className="text-xs text-slate-400">{member.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
