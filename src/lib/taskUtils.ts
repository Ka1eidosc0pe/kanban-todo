import type { DueFilter, Filters, Priority, Repeat, SortMode, Task, ViewMode } from "./types";

/** Patch for the done checkbox: remembers the prior status and restores it on uncheck. */
export function toggleDonePatch(t: Task): Partial<Task> {
  if (t.status !== "completed") return { status: "completed", statusBeforeDone: t.status };
  return { status: t.statusBeforeDone && t.statusBeforeDone !== "completed" ? t.statusBeforeDone : "created", statusBeforeDone: undefined };
}

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

const dayNum = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return Date.UTC(y, m - 1, d) / 86400000;
};

/** "Today", "Tomorrow", "Yesterday", a weekday ("Fri") within the next 6 days, else formatDue(). */
export function dueLabel(dueDate: string, today = todayISO()): string {
  const diff = dayNum(dueDate) - dayNum(today);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff === -1) return "Yesterday";
  if (diff > 1 && diff <= 6) {
    const [y, m, d] = dueDate.split("-").map(Number);
    return new Date(y, m - 1, d).toLocaleDateString("en-US", { weekday: "short" });
  }
  return formatDue(dueDate);
}

/** Open task due today (styled amber, distinct from overdue). */
export function isDueToday(task: Task, today = todayISO()): boolean {
  return task.dueDate === today && task.status !== "completed" && task.status !== "archived";
}

/** Done/total subtask counts per parent id, computed in one pass. */
export function subtaskProgressMap(tasks: Task[]): Map<string, { done: number; total: number }> {
  const m = new Map<string, { done: number; total: number }>();
  for (const t of tasks) {
    if (!t.parentId) continue;
    const p = m.get(t.parentId) ?? { done: 0, total: 0 };
    p.total++;
    if (t.status === "completed") p.done++;
    m.set(t.parentId, p);
  }
  return m;
}

export function matchesQuery(task: Task, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return task.title.toLowerCase().includes(q) || task.notes.toLowerCase().includes(q);
}

const isOpen = (t: Task) => t.status !== "completed" && t.status !== "archived";

/** Local-date yyyy-mm-dd, `days` from today (negative = past). */
export function addDaysISO(days: number): string {
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

export const DUE_FILTER_LABELS: Record<DueFilter, string> = {
  any: "Any time",
  overdue: "Overdue",
  today: "Due today",
  week: "Due this week",
  none: "No due date",
};
export const SORT_LABELS: Record<SortMode, string> = { manual: "Manual", due: "Due date", priority: "Priority" };

/** Category filtering applies everywhere except Category view (there the columns are the categories). */
export function activeFilterCount(f: Filters, view: ViewMode): number {
  return (f.priorities.length ? 1 : 0) + (view !== "category" && f.categoryIds.length ? 1 : 0) + (f.due !== "any" ? 1 : 0);
}

export function matchesFilters(task: Task, f: Filters, view: ViewMode, today = todayISO()): boolean {
  if (f.priorities.length && !f.priorities.includes(task.priority)) return false;
  if (view !== "category" && f.categoryIds.length && !f.categoryIds.includes(task.categoryId)) return false;
  switch (f.due) {
    case "overdue":
      return isOverdue(task, today);
    case "today":
      return task.dueDate === today;
    case "week": // today through the next 6 days
      return !!task.dueDate && task.dueDate >= today && task.dueDate <= addDaysISO(6);
    case "none":
      return !task.dueDate;
    default:
      return true;
  }
}

const PRIORITY_RANK: Record<Priority, number> = { high: 0, medium: 1, low: 2 };

/** Stable sort (ties keep manual order); "manual" returns the list unchanged. */
export function sortTasks(tasks: Task[], sort: SortMode): Task[] {
  if (sort === "manual") return tasks;
  const key = (t: Task) => (sort === "priority" ? PRIORITY_RANK[t.priority] : 0);
  return [...tasks].sort((a, b) => {
    if (sort === "due") {
      if (a.dueDate !== b.dueDate) return !a.dueDate ? 1 : !b.dueDate ? -1 : a.dueDate < b.dueDate ? -1 : 1; // no date last
      return 0;
    }
    return key(a) - key(b);
  });
}

export type AgendaGroup = "overdue" | "today" | "tomorrow" | "week" | "later" | "none";
export const AGENDA_GROUPS: { key: AgendaGroup; label: string }[] = [
  { key: "overdue", label: "Overdue" },
  { key: "today", label: "Today" },
  { key: "tomorrow", label: "Tomorrow" },
  { key: "week", label: "This week" },
  { key: "later", label: "Later" },
  { key: "none", label: "No due date" },
];

/** Which agenda bucket an open task belongs to ("This week" = 2 to 6 days out). */
export function agendaGroup(task: Task, today = todayISO()): AgendaGroup {
  if (!task.dueDate) return "none";
  const diff = dayNum(task.dueDate) - dayNum(today);
  return diff < 0 ? "overdue" : diff === 0 ? "today" : diff === 1 ? "tomorrow" : diff <= 6 ? "week" : "later";
}

/** Open tasks bucketed for the agenda; within a bucket: due date, then priority, then manual order. Empty buckets are omitted. */
export function groupAgenda(tasks: Task[], today = todayISO()): { key: AgendaGroup; label: string; tasks: Task[] }[] {
  const due = (t: Task) => t.dueDate ?? "9999-99-99";
  const open = tasks.filter(isOpen).sort((a, b) => due(a).localeCompare(due(b)) || PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] || a.order - b.order);
  return AGENDA_GROUPS.map((g) => ({ ...g, tasks: open.filter((t) => agendaGroup(t, today) === g.key) })).filter((g) => g.tasks.length);
}

/** Next due date (yyyy-mm-dd) for a recurring task, advanced from `due`. Weekdays skips Sat/Sun; monthly clamps to month end. */
export function nextDueDate(due: string, rule: Repeat): string {
  const [y, m, d] = due.split("-").map(Number);
  const fmt = (dt: Date) => `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`;
  if (rule === "monthly") {
    const last = new Date(Date.UTC(y, m + 1, 0)).getUTCDate(); // days in the next month
    return fmt(new Date(Date.UTC(y, m, Math.min(d, last))));
  }
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + (rule === "weekly" ? 7 : 1));
  if (rule === "weekdays") while (dt.getUTCDay() === 0 || dt.getUTCDay() === 6) dt.setUTCDate(dt.getUTCDate() + 1);
  return fmt(dt);
}

const DAY_MS = 86400000;

/** When a completed task was completed (legacy tasks without `completedAt` fall back to `updatedAt`). */
export const completedTime = (t: Task) => t.completedAt ?? t.updatedAt;

/** Completed main tasks whose completion is older than `days` days (candidates for auto-archive). */
export function staleCompletedIds(tasks: Task[], days: number, now = Date.now()): string[] {
  return tasks.filter((t) => t.status === "completed" && !t.parentId && completedTime(t) < now - days * DAY_MS).map((t) => t.id);
}
