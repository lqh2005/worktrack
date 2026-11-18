"use client";

import { useEffect, useRef, useState } from "react";
import type { IssueStatus } from "@prisma/client";
import { ArrowRight, ChevronDown, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { apiClient, ClientApiError } from "@/lib/api/client";
import { getAllowedTransitions, STATUS_LABELS } from "@/lib/constants";
import { StatusBadge } from "@/components/ui/badges";
import type { Issue } from "@/types/api";
import { cn } from "@/lib/utils";

interface QuickStatusMenuProps {
  issue: Issue;
  onUpdated: (updated: Issue) => void;
  size?: "xs" | "sm";
}

export function QuickStatusMenu({ issue, onUpdated, size = "sm" }: QuickStatusMenuProps) {
  const [open, setOpen] = useState(false);
  const [loadingTo, setLoadingTo] = useState<IssueStatus | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const allowed = issue.allowedTransitions?.length
    ? issue.allowedTransitions
    : getAllowedTransitions(issue.status);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  async function handleTransition(nextStatus: IssueStatus) {
    if (loadingTo) return;
    setLoadingTo(nextStatus);
    try {
      const res = await apiClient.issues.transitionStatus(issue.id, nextStatus);
      toast.success(`${issue.key} moved to ${STATUS_LABELS[nextStatus]}`);
      onUpdated(res.data);
      setOpen(false);
    } catch (err) {
      const message =
        err instanceof ClientApiError ? err.message : "Failed to update issue status";
      toast.error(message);
    } finally {
      setLoadingTo(null);
    }
  }

  return (
    <div ref={containerRef} className="relative inline-block text-left">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((prev) => !prev);
        }}
        disabled={loadingTo !== null}
        title="Quick status transition"
        className={cn(
          "group inline-flex items-center gap-1 rounded-full transition hover:brightness-95 focus:outline-none focus:ring-2 focus:ring-brand-500/40",
          loadingTo && "opacity-60",
        )}
      >
        <StatusBadge status={issue.status} size={size} />
        <span className="-ml-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-slate-200/70 text-slate-600 transition group-hover:bg-slate-300/80">
          {loadingTo ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <ChevronDown className="h-3 w-3" />
          )}
        </span>
      </button>

      {open && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute left-0 z-30 mt-1.5 w-52 origin-top-left animate-scale-in rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl"
        >
          <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Allowed Transitions
          </div>
          {allowed.map((target) => (
            <button
              key={target}
              type="button"
              disabled={loadingTo !== null}
              onClick={() => handleTransition(target)}
              className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-xs font-medium text-slate-700 transition hover:bg-slate-100 disabled:opacity-50"
            >
              <span className="inline-flex items-center gap-1.5">
                <ArrowRight className="h-3 w-3 text-slate-400" />
                Move to
              </span>
              <StatusBadge status={target} size="xs" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
