import { createSeed } from "./seed";
import { DEFAULT_FILTERS, type AppData, type Task } from "./types";

export const STORAGE_KEY = "kanban-todo:v1";

export const CURRENT_VERSION = 1;
const UNREADABLE_KEY = "kanban-todo:v1:unreadable";

export type LoadResult = { kind: "empty" } | { kind: "ok"; data: AppData } | { kind: "unreadable"; raw: string };

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

/** Upgrade saved data to the current shape (filling missing optional fields); null if it can't be understood. */
function migrate(parsed: unknown): AppData | null {
  if (!isObj(parsed) || typeof parsed.version !== "number" || parsed.version > CURRENT_VERSION) return null;
  // (older versions would be upgraded stepwise here; only v1 exists today)
  const { tasks, categories } = parsed;
  if (!Array.isArray(tasks) || !Array.isArray(categories)) return null;
  if (!tasks.every((t) => isObj(t) && typeof t.id === "string" && typeof t.title === "string")) return null;
  if (!categories.every((c) => isObj(c) && typeof c.id === "string" && typeof c.name === "string")) return null;
  const prefs = isObj(parsed.prefs) ? parsed.prefs : {};
  const now = Date.now();
  return {
    version: 1,
    categories: categories as unknown as AppData["categories"],
    tasks: (tasks as Partial<Task>[]).map((t, i) => ({
      notes: "",
      status: "created",
      priority: "medium",
      dueDate: null,
      parentId: null,
      order: i,
      createdAt: now,
      updatedAt: now,
      ...t,
    }) as Task),
    prefs: {
      ...createSeed().prefs,
      ...prefs,
      filters: { ...DEFAULT_FILTERS, ...(isObj(prefs.filters) ? prefs.filters : {}) },
      collapsed: {
        status: isObj(prefs.collapsed) && Array.isArray(prefs.collapsed.status) ? prefs.collapsed.status : [],
        category: isObj(prefs.collapsed) && Array.isArray(prefs.collapsed.category) ? prefs.collapsed.category : [],
      },
      autoArchiveDays: typeof prefs.autoArchiveDays === "number" && prefs.autoArchiveDays > 0 ? Math.floor(prefs.autoArchiveDays) : null,
      wipLimit: typeof prefs.wipLimit === "number" && prefs.wipLimit > 0 ? Math.floor(prefs.wipLimit) : null,
    },
    isSample: parsed.isSample === true,
  };
}

export function loadData(): LoadResult {
  if (typeof window === "undefined") return { kind: "empty" };
  let raw: string | null;
  try {
    raw = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return { kind: "empty" };
  }
  if (raw === null) return { kind: "empty" };
  try {
    const data = migrate(JSON.parse(raw));
    return data ? { kind: "ok", data } : { kind: "unreadable", raw };
  } catch {
    return { kind: "unreadable", raw };
  }
}

/** Keep a copy of data we couldn't read so the next save doesn't destroy it. */
export function stashUnreadable(raw: string): void {
  try {
    const ls = window.localStorage;
    const existing = ls.getItem(UNREADABLE_KEY);
    if (existing === raw) return;
    ls.setItem(existing === null ? UNREADABLE_KEY : `kanban-todo:unreadable:${Date.now()}`, raw);
  } catch {
    /* nothing more we can do */
  }
}

/** Returns false when the write failed (storage full or unavailable); the app keeps working in memory. */
export function saveData(data: AppData): boolean {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}
