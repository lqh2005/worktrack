"use client";

import type { IssuePriority, IssueStatus } from "@prisma/client";
import {
  AlertOctagon,
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Calendar,
  CheckCircle2,
  Circle,
  Clock,
  Eye,
  Flame,
} from "lucide-react";
import { PRIORITY_LABELS, STATUS_LABELS } from "@/lib/constants";
import { TEAM_MEMBERS } from "@/lib/demo/constants";
import { cn, isOverdue } from "@/lib/utils";

const STATUS_STYLES: Record<
  IssueStatus,
  { bg: string; text: string; ring: string; dot: string; Icon: typeof Circle }
> = {
  TODO: {
    bg: "bg-slate-100",
    text: "text-slate-700",
    ring: "ring-slate-300/80",
    dot: "bg-slate-400",
    Icon: Circle,
  },
  IN_PROGRESS: {
    bg: "bg-blue-50",
    text: "text-blue-700",
    ring: "ring-blue-200",
    dot: "bg-blue-500",
    Icon: Clock,
  },
  IN_REVIEW: {
    bg: "bg-purple-50",
    text: "text-purple-700",
    ring: "ring-purple-200",
    dot: "bg-purple-500",
    Icon: Eye,
  },
  DONE: {
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    ring: "ring-emerald-200",
    dot: "bg-emerald-500",
    Icon: CheckCircle2,
  },
};

const PRIORITY_STYLES: Record<
  IssuePriority,
  { bg: string; text: string; ring: string; Icon: typeof ArrowDown }
> = {
  LOW: {
    bg: "bg-slate-100",
    text: "text-slate-600",
    ring: "ring-slate-200",
    Icon: ArrowDown,
  },
  MEDIUM: {
    bg: "bg-sky-50",
    text: "text-sky-700",
    ring: "ring-sky-200",
    Icon: ArrowUp,
  },
  HIGH: {
    bg: "bg-amber-50",
    text: "text-amber-700",
    ring: "ring-amber-200",
    Icon: AlertTriangle,
  },
  CRITICAL: {
    bg: "bg-rose-50",
    text: "text-rose-700",
    ring: "ring-rose-200",
    Icon: AlertOctagon,
  },
};

export function StatusBadge({
  status,
  size = "sm",
  className,
}: {
  status: IssueStatus;
  size?: "xs" | "sm";
  className?: string;
}) {
  const style = STATUS_STYLES[status];
  const Icon = style.Icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full font-medium ring-1 ring-inset",
        size === "xs" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-0.5 text-xs",
        style.bg,
        style.text,
        style.ring,
        className,
      )}
    >
      <Icon className="h-3 w-3 shrink-0" />
      {STATUS_LABELS[status]}
    </span>
  );
}

export function PriorityBadge({
  priority,
  size = "sm",
  className,
}: {
  priority: IssuePriority;
  size?: "xs" | "sm";
  className?: string;
}) {
  const style = PRIORITY_STYLES[priority];
  const Icon = style.Icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md font-medium ring-1 ring-inset",
        size === "xs" ? "px-1.5 py-0.5 text-[11px]" : "px-2 py-0.5 text-xs",
        style.bg,
        style.text,
        style.ring,
        className,
      )}
    >
      <Icon className="h-3 w-3 shrink-0" />
      {PRIORITY_LABELS[priority]}
    </span>
  );
}

export function StoryPointsBadge({
  points,
  className,
}: {
  points: number;
  className?: string;
}) {
  return (
    <span
      title={`${points} Story Point${points > 1 ? "s" : ""}`}
      className={cn(
        "inline-flex items-center gap-1 rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-700 ring-1 ring-inset ring-indigo-200/80",
        className,
      )}
    >
      <Flame className="h-3 w-3 text-indigo-500" />
      {points} {points === 1 ? "pt" : "pts"}
    </span>
  );
}

export function DueDateBadge({
  dueDate,
  status,
  className,
}: {
  dueDate: string | Date | null | undefined;
  status: IssueStatus;
  className?: string;
}) {
  if (!dueDate) {
    return <span className="text-xs text-slate-400">No due date</span>;
  }

  const overdue = isOverdue(dueDate, status);
  const formatted = new Date(dueDate).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium",
        overdue
          ? "bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-200"
          : "bg-slate-100 text-slate-600",
        className,
      )}
    >
      <Calendar className="h-3 w-3 shrink-0" />
      {formatted}
      {overdue && <span className="ml-0.5 font-semibold">(Overdue)</span>}
    </span>
  );
}

function getInitials(name: string): string {
  const matched = TEAM_MEMBERS.find((m) => m.name === name);
  if (matched) return matched.initials;
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[parts.length - 2][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

function getMemberColor(name: string): string {
  const matched = TEAM_MEMBERS.find((m) => m.name === name);
  return matched?.color ?? "#6366f1";
}

export function MemberBadge({
  name,
  compact = false,
  className,
}: {
  name: string;
  compact?: boolean;
  className?: string;
}) {
  const initials = getInitials(name);
  const color = getMemberColor(name);

  return (
    <span
      title={name}
      className={cn("inline-flex items-center gap-1.5 text-xs text-slate-700", className)}
    >
      <span
        style={{ backgroundColor: color }}
        className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
      >
        {initials}
      </span>
      {!compact && <span className="truncate font-medium">{name}</span>}
    </span>
  );
}
