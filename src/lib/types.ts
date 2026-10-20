export const STATUSES = ["created", "planned", "in_progress", "completed", "archived"] as const;
export type Status = (typeof STATUSES)[number];

export const STATUS_LABELS: Record<Status, string> = {
  created: "Created",
  planned: "Planned",
  in_progress: "In progress",
  completed: "Completed",
  archived: "Archived",
};

export type Priority = "low" | "medium" | "high";
export type ViewMode = "status" | "category" | "agenda";
/** Views that are dnd column boards (agenda is a plain list). */
export type BoardView = Exclude<ViewMode, "agenda">;

export type Repeat = "daily" | "weekdays" | "weekly" | "monthly";
export const REPEAT_LABELS: Record<Repeat, string> = { daily: "Daily", weekdays: "Weekdays", weekly: "Weekly", monthly: "Monthly" };

export interface Category {
  id: string;
  name: string;
  color: string; // key of CATEGORY_COLORS
}

export interface Task {
  id: string;
  title: string;
  notes: string;
  status: Status;
  categoryId: string;
  priority: Priority;
  dueDate: string | null; // yyyy-mm-dd
  parentId: string | null; // non-null => subtask
  statusBeforeDone?: Status; // status to restore when a checkbox-completed task is unchecked
  completedAt?: number; // when it last became completed (kept while archived; absent on tasks completed before this existed)
  repeat?: Repeat; // main tasks with a due date only: completing spawns the next occurrence
  spawnedNext?: boolean; // set on a completed recurring task once its next occurrence exists (never spawn twice)
  order: number; // position within its list (lower first)
  createdAt: number;
  updatedAt: number;
}

export type DueFilter = "any" | "overdue" | "today" | "week" | "none";
export type SortMode = "manual" | "due" | "priority";

export interface Filters {
  priorities: Priority[]; // empty = any
  categoryIds: string[]; // empty = any (Status view only)
  due: DueFilter;
}
export const DEFAULT_FILTERS: Filters = { priorities: [], categoryIds: [], due: "any" };

export type Theme = "system" | "light" | "dark";

export interface Prefs {
  view: ViewMode;
  showArchived: boolean;
  query: string;
  filters: Filters;
  sort: SortMode;
  collapsed: Record<BoardView, string[]>; // collapsed column keys per view
  wipLimit: number | null; // limit for the Status view's "In progress" column (null = none)
  autoArchiveDays: number | null; // archive completed tasks after this many days (null = off)
  theme: Theme;
  tourDone: boolean;
  lastVisit: number | null;
}

export interface AppData {
  version: 1;
  categories: Category[];
  tasks: Task[];
  prefs: Prefs;
  isSample: boolean; // true while the board still contains seeded sample data
}

export const CATEGORY_COLORS: Record<string, { dot: string; chip: string }> = {
  blue: { dot: "bg-blue-500", chip: "bg-blue-50 dark:bg-blue-500/15 text-blue-700 dark:text-blue-300 ring-blue-200 dark:ring-blue-500/30" },
  green: { dot: "bg-emerald-500", chip: "bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 ring-emerald-200 dark:ring-emerald-500/30" },
  amber: { dot: "bg-amber-500", chip: "bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300 ring-amber-200 dark:ring-amber-500/30" },
  rose: { dot: "bg-rose-500", chip: "bg-rose-50 dark:bg-rose-500/15 text-rose-700 dark:text-rose-300 ring-rose-200 dark:ring-rose-500/30" },
  violet: { dot: "bg-violet-500", chip: "bg-violet-50 dark:bg-violet-500/15 text-violet-700 dark:text-violet-300 ring-violet-200 dark:ring-violet-500/30" },
  slate: { dot: "bg-slate-500", chip: "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 ring-slate-200 dark:ring-slate-800" },
};
