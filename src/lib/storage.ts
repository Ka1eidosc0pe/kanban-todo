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

/** Returns false when the write failed (storage full or unavailable); the app keeps working in memory. */
export function saveData(data: AppData): boolean {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}
