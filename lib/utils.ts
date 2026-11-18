import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatIssueKey(projectKey: string, issueNumber: number) {
  return `${projectKey}-${issueNumber}`;
}

export function isOverdue(dueDate: string | Date | null | undefined, status: string) {
  if (!dueDate || status === "DONE") return false;
  const due = new Date(dueDate);
  const now = new Date();
  const todayUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return due.getTime() < todayUtc;
}

export function toDateInputValue(value: string | Date | null | undefined) {
  if (!value) return "";
  return new Date(value).toISOString().slice(0, 10);
}
