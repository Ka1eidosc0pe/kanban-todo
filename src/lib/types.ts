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
export type ViewMode = "status" | "category";

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
  order: number; // position within its list (lower first)
  createdAt: number;
  updatedAt: number;
}

export interface Prefs {
  view: ViewMode;
  showArchived: boolean;
  query: string;
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
  blue: { dot: "bg-blue-500", chip: "bg-blue-50 text-blue-700 ring-blue-200" },
  green: { dot: "bg-emerald-500", chip: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
  amber: { dot: "bg-amber-500", chip: "bg-amber-50 text-amber-700 ring-amber-200" },
  rose: { dot: "bg-rose-500", chip: "bg-rose-50 text-rose-700 ring-rose-200" },
  violet: { dot: "bg-violet-500", chip: "bg-violet-50 text-violet-700 ring-violet-200" },
  slate: { dot: "bg-slate-500", chip: "bg-slate-100 text-slate-700 ring-slate-200" },
};
