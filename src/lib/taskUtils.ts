import type { Task } from "./types";

const pad = (n: number) => String(n).padStart(2, "0");

export function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function isOverdue(task: Task, today = todayISO()): boolean {
  return !!task.dueDate && task.dueDate < today && task.status !== "completed" && task.status !== "archived";
}

/** "Oct 22" (adds the year when it is not the current year). */
export function formatDue(dueDate: string): string {
  const [y, m, d] = dueDate.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const sameYear = y === new Date().getFullYear();
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", ...(sameYear ? {} : { year: "numeric" }) });
}

export function subtaskProgress(taskId: string, tasks: Task[]): { done: number; total: number } | null {
  const subs = tasks.filter((t) => t.parentId === taskId);
  if (subs.length === 0) return null;
  return { done: subs.filter((t) => t.status === "completed").length, total: subs.length };
}

export function matchesQuery(task: Task, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return task.title.toLowerCase().includes(q) || task.notes.toLowerCase().includes(q);
}

const isOpen = (t: Task) => t.status !== "completed" && t.status !== "archived";

function addDaysISO(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Due today through the next `days` days (overdue tasks are excluded). */
export function isDueSoon(task: Task, days = 3): boolean {
  return !!task.dueDate && isOpen(task) && task.dueDate >= todayISO() && task.dueDate <= addDaysISO(days);
}

export type QuickFilter = "overdue" | "soon" | "progress";

export const QUICK_FILTER_LABELS: Record<QuickFilter, string> = {
  overdue: "Overdue",
  soon: "Due within 3 days",
  progress: "In progress",
};

export function matchesQuick(task: Task, filter: QuickFilter | null): boolean {
  if (!filter) return true;
  if (filter === "overdue") return isOverdue(task);
  if (filter === "soon") return isDueSoon(task);
  return task.status === "in_progress";
}

/** "just now", "5 minutes ago", "3 days ago". */
export function timeAgo(ts: number, now = Date.now()): string {
  const s = Math.max(0, Math.round((now - ts) / 1000));
  if (s < 60) return "just now";
  const units: [number, string][] = [
    [86400, "day"],
    [3600, "hour"],
    [60, "minute"],
  ];
  for (const [sec, name] of units) {
    if (s >= sec) {
      const n = Math.floor(s / sec);
      return `${n} ${name}${n === 1 ? "" : "s"} ago`;
    }
  }
  return "just now";
}
