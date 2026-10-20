import type { AppData } from "./types";

export const STORAGE_KEY = "kanban-todo:v1";

export function loadData(): AppData | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AppData;
    return parsed?.version === 1 && Array.isArray(parsed.tasks) ? parsed : null;
  } catch {
    return null;
  }
}

export function saveData(data: AppData): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    /* storage full or unavailable: keep working in memory */
  }
}
