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
