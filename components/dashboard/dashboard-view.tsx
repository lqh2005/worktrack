"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  Flame,
  Layers,
  Loader2,
  TrendingUp,
} from "lucide-react";
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { apiClient } from "@/lib/api/client";
import {
  ACTIVITY_LABELS,
  PRIORITY_COLORS,
  STATUS_COLORS,
} from "@/lib/constants";
import { useWorkspace } from "@/components/layout/app-shell";
import type { Analytics } from "@/types/api";

interface DashboardViewProps {
  initialAnalytics: Analytics;
}

export function DashboardView({ initialAnalytics }: DashboardViewProps) {
  const { projects, revision, openCreateIssue } = useWorkspace();

  const [analytics, setAnalytics] = useState<Analytics>(initialAnalytics);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [days, setDays] = useState<number>(14);
  const [weeks, setWeeks] = useState<number>(8);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setAnalytics(initialAnalytics);
  }, [initialAnalytics]);

  useEffect(() => {
    if (selectedProjectId && projects.length > 0 && !projects.some((p) => p.id === selectedProjectId)) {
      setSelectedProjectId("");
      return;
    }
    // Avoid fetching again on first render if using default filters
    if (!selectedProjectId && days === 14 && weeks === 8 && revision === 0) {
      return;
    }
    let active = true;
    setLoading(true);
    apiClient.analytics
      .get({
        projectId: selectedProjectId || undefined,
        days,
        weeks,
      })
      .then((res) => {
        if (active) setAnalytics(res.data);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [selectedProjectId, days, weeks, revision]);

  const { summary, byStatus, byPriority, burndown, velocity, recentActivity } = analytics;

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Sprint Analytics &amp; Velocity
          </h1>
          <p className="mt-0.5 text-sm text-slate-500">
            Real-time Story Points burndown, weekly team velocity, and workload distribution.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {loading && <Loader2 className="h-4 w-4 animate-spin text-brand-600" />}

          <select
            aria-label="Filter by project"
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-2xs focus:border-brand-500 focus:outline-none"
          >
            <option value="">All Projects ({projects.length})</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                [{p.key}] {p.name}
              </option>
            ))}
          </select>

          <select
            aria-label="Burndown window"
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-2xs focus:border-brand-500 focus:outline-none"
          >
            <option value={14}>14-Day Burndown</option>
            <option value={30}>30-Day Burndown</option>
          </select>

          <select
            aria-label="Velocity window"
            value={weeks}
            onChange={(e) => setWeeks(Number(e.target.value))}
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-2xs focus:border-brand-500 focus:outline-none"
          >
            <option value={8}>8-Week Velocity</option>
            <option value={12}>12-Week Velocity</option>
          </select>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {/* Card 1: Total Issues */}
        <div className="rounded-2xl border border-slate-200 border-t-4 border-t-brand-600 bg-white p-5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Total Issues
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
              <Layers className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900">{summary.totalIssues}</span>
            <span className="text-xs font-medium text-slate-500">
              ({summary.openIssues} open)
            </span>
          </div>
          <p className="mt-2 text-xs text-slate-500">
            <strong className="font-semibold text-blue-600">{summary.activeIssues}</strong> actively in
            progress or code review
          </p>
        </div>

        {/* Card 2: Completion Rate */}
        <div className="rounded-2xl border border-slate-200 border-t-4 border-t-emerald-500 bg-white p-5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Completion Rate
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900">{summary.completionRate}%</span>
            <span className="text-xs font-medium text-emerald-600">
              {summary.doneIssues}/{summary.totalIssues} done
            </span>
          </div>
          <div className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all duration-500"
              style={{ width: `${summary.completionRate}%` }}
            />
          </div>
        </div>

        {/* Card 3: Story Points & Velocity */}
        <div className="rounded-2xl border border-slate-200 border-t-4 border-t-sky-500 bg-white p-5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Story Points Burned
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
              <Flame className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900">
              {summary.donePoints}
              <span className="text-lg font-semibold text-slate-400">/{summary.totalPoints}</span>
            </span>
            <span className="text-xs font-semibold text-indigo-600">
              ({summary.pointsCompletionRate}%)
            </span>
          </div>
          <p className="mt-2 flex items-center gap-1 text-xs text-slate-500">
            <TrendingUp className="h-3.5 w-3.5 text-indigo-500" />
            Avg velocity:{" "}
            <strong className="font-semibold text-slate-800">{summary.averageVelocity} pts/wk</strong>
          </p>
        </div>

        {/* Card 4: Delivery Health */}
        <div className="rounded-2xl border border-slate-200 border-t-4 border-t-rose-500 bg-white p-5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Schedule Risk
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
              <AlertTriangle className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900">{summary.overdueIssues}</span>
            <span className="text-xs font-medium text-rose-600">overdue tasks</span>
          </div>
          <p className="mt-2 text-xs text-slate-500">
            <strong className="font-semibold text-amber-600">{summary.dueThisWeek}</strong> open tasks
            due within 7 days
          </p>
        </div>
      </div>

      {/* Row 1 Charts: Burndown & Velocity */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Burndown Chart */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Sprint Burndown ({days} Days)
              </h2>
              <p className="text-xs text-slate-500">
                Remaining open Story Points vs. ideal linear burn trajectory
              </p>
            </div>
            <span className="rounded-lg bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700">
              {summary.pointsBurnedInWindow} pts burned
            </span>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={burndown} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                <defs>
                  <linearGradient id="remainingFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.28} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#64748b" }} />
                <YAxis tick={{ fontSize: 11, fill: "#64748b" }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    borderRadius: "12px",
                    border: "1px solid #e2e8f0",
                    fontSize: "12px",
                  }}
                />
                <Legend wrapperStyle={{ fontSize: "12px" }} />
                <Area
                  type="monotone"
                  dataKey="remaining"
                  name="Remaining Story Points"
                  stroke="#6366f1"
                  strokeWidth={2.5}
                  fill="url(#remainingFill)"
                />
                <Line
                  type="monotone"
                  dataKey="ideal"
                  name="Ideal Guideline"
                  stroke="#94a3b8"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Weekly Velocity Chart */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Weekly Velocity ({weeks} Weeks)
              </h2>
              <p className="text-xs text-slate-500">
                Completed Story Points per ISO week against rolling average
              </p>
            </div>
            <span className="rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
              Avg {summary.averageVelocity} pts / wk
            </span>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={velocity} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#64748b" }} />
                <YAxis tick={{ fontSize: 11, fill: "#64748b" }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    borderRadius: "12px",
                    border: "1px solid #e2e8f0",
                    fontSize: "12px",
                  }}
                />
                <Legend wrapperStyle={{ fontSize: "12px" }} />
                {summary.averageVelocity > 0 && (
                  <ReferenceLine
                    y={summary.averageVelocity}
                    stroke="#f59e0b"
                    strokeDasharray="4 4"
                    label={{
                      value: `Avg (${summary.averageVelocity})`,
                      position: "insideTopRight",
                      fill: "#d97706",
                      fontSize: 11,
                    }}
                  />
                )}
                <Bar
                  dataKey="points"
                  name="Completed Story Points"
                  fill="#22c55e"
                  radius={[6, 6, 0, 0]}
                />
                <Bar
                  dataKey="issues"
                  name="Completed Issues"
                  fill="#3b82f6"
                  radius={[6, 6, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Row 2 Charts: Status Donut & Priority Distribution */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Status Distribution */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
          <h2 className="text-base font-bold text-slate-900">Tasks by Workflow Status</h2>
          <p className="text-xs text-slate-500">
            Breakdown of issues and Story Points across Agile workflow stages
          </p>

          <div className="mt-4 grid items-center gap-4 sm:grid-cols-2">
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={byStatus}
                    dataKey="count"
                    nameKey="label"
                    innerRadius={52}
                    outerRadius={80}
                    paddingAngle={3}
                  >
                    {byStatus.map((entry) => (
                      <Cell key={entry.status} fill={STATUS_COLORS[entry.status]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      borderRadius: "12px",
                      border: "1px solid #e2e8f0",
                      fontSize: "12px",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="space-y-2.5">
              {byStatus.map((item) => (
                <div
                  key={item.status}
                  className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-2 text-xs"
                >
                  <span className="flex items-center gap-2 font-medium text-slate-700">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: STATUS_COLORS[item.status] }}
                    />
                    {item.label}
                  </span>
                  <span className="font-semibold text-slate-900">
                    {item.count} tasks{" "}
                    <span className="font-normal text-slate-400">({item.points} pts)</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Priority Distribution */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
          <h2 className="text-base font-bold text-slate-900">Workload by Priority</h2>
          <p className="text-xs text-slate-500">
            Issue count and Story Point allocation across severity tiers
          </p>

          <div className="mt-4 h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byPriority} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 12, fill: "#475569" }} />
                <YAxis tick={{ fontSize: 11, fill: "#64748b" }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    borderRadius: "12px",
                    border: "1px solid #e2e8f0",
                    fontSize: "12px",
                  }}
                />
                <Bar dataKey="count" name="Issues" radius={[6, 6, 0, 0]}>
                  {byPriority.map((entry) => (
                    <Cell key={entry.priority} fill={PRIORITY_COLORS[entry.priority]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Row 3: Project Breakdown & Recent Activity */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Projects Progress */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Projects Health</h2>
              <p className="text-xs text-slate-500">
                Delivery progress and Story Points across active repositories
              </p>
            </div>
            <Link
              href="/projects"
              className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-500"
            >
              Manage Projects
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {projects.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-sm text-slate-500">No projects yet.</p>
              <button
                type="button"
                onClick={() => openCreateIssue()}
                className="mt-3 rounded-xl bg-brand-600 px-4 py-2 text-xs font-semibold text-white"
              >
                Get Started
              </button>
            </div>
          ) : (
            <div className="space-y-3.5">
              {projects.map((project) => (
                <div
                  key={project.id}
                  className="rounded-xl border border-slate-200/80 p-4 transition hover:border-slate-300"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <span
                        className="inline-flex items-center rounded-lg px-2 py-0.5 font-mono text-xs font-bold text-white"
                        style={{ backgroundColor: project.color }}
                      >
                        {project.key}
                      </span>
                      <Link
                        href={`/issues?projectId=${project.id}`}
                        className="text-sm font-bold text-slate-900 hover:text-brand-600"
                      >
                        {project.name}
                      </Link>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-500">
                      <span>
                        <strong className="text-slate-800">{project.stats.doneIssues}</strong>/
                        {project.stats.totalIssues} tasks
                      </span>
                      <span>•</span>
                      <span>
                        <strong className="text-indigo-600">{project.stats.donePoints}</strong>/
                        {project.stats.totalPoints} pts
                      </span>
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 font-semibold text-emerald-700">
                        {project.stats.completionRate}%
                      </span>
                    </div>
                  </div>

                  <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${project.stats.completionRate}%`,
                        backgroundColor: project.color,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Activity Feed */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Recent Activity</h2>
              <p className="text-xs text-slate-500">Live audit log across sprints</p>
            </div>
            <Link
              href="/issues"
              className="text-xs font-semibold text-brand-600 hover:text-brand-500"
            >
              All issues →
            </Link>
          </div>

          {recentActivity.length === 0 ? (
            <p className="py-8 text-center text-xs text-slate-400">No recent activity.</p>
          ) : (
            <ol className="relative ml-2 border-l border-slate-200 space-y-4">
              {recentActivity.map((item) => (
                <li key={item.id} className="ml-4">
                  <span
                    className="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full border-2 border-white"
                    style={{ backgroundColor: item.project.color }}
                  />
                  <p className="text-xs leading-relaxed text-slate-700">
                    <span className="font-semibold text-slate-900">{item.actor.name}</span>{" "}
                    {ACTIVITY_LABELS[item.type]}{" "}
                    <span className="font-mono font-semibold text-brand-600">
                      {item.issueKey}
                    </span>
                    {item.fromValue && item.toValue && (
                      <span className="text-slate-500">
                        {" "}
                        ({item.fromValue} → <strong className="text-slate-800">{item.toValue}</strong>)
                      </span>
                    )}
                  </p>
                  <p className="truncate text-[11px] text-slate-500">{item.issueTitle}</p>
                  <span className="mt-0.5 inline-flex items-center gap-1 text-[10px] text-slate-400">
                    <Clock className="h-2.5 w-2.5" />
                    {new Date(item.createdAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </div>
  );
}
