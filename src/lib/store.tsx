"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { createSeed } from "./seed";
import { loadData, saveData } from "./storage";
import type { AppData, Category, Prefs, Status, Task } from "./types";

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

type Action =
  | { type: "hydrate"; data: AppData }
  | { type: "restore"; data: AppData } // used by undo / import
  | { type: "addTask"; task: Partial<Task> & Pick<Task, "title" | "categoryId"> & { id?: string } }
  | { type: "updateTask"; id: string; patch: Partial<Omit<Task, "id">> }
  | { type: "deleteTask"; id: string }
  | { type: "moveTask"; id: string; status?: Status; categoryId?: string; beforeId?: string | null }
  | { type: "addCategory"; category: Category }
  | { type: "updateCategory"; id: string; patch: Partial<Omit<Category, "id">> }
  | { type: "deleteCategory"; id: string; moveTo: string | null } // moveTo null => delete its tasks
  | { type: "setPrefs"; patch: Partial<Prefs> }
  | { type: "clearSamples" };

function nextOrder(tasks: Task[]) {
  return tasks.reduce((m, t) => Math.max(m, t.order), -1) + 1;
}

function reducer(state: AppData, a: Action): AppData {
  const now = Date.now();
  switch (a.type) {
    case "hydrate":
    case "restore":
      return a.data;
    case "addTask": {
      const task: Task = {
        id: a.task.id ?? uid(),
        notes: "",
        status: "created",
        priority: "medium",
        dueDate: null,
        parentId: null,
        order: nextOrder(state.tasks),
        createdAt: now,
        updatedAt: now,
        ...a.task,
      };
      return { ...state, tasks: [...state.tasks, task] };
    }
    case "updateTask":
      return { ...state, tasks: state.tasks.map((t) => (t.id === a.id ? { ...t, ...a.patch, updatedAt: now } : t)) };
    case "deleteTask": // removes the task and its subtasks
      return { ...state, tasks: state.tasks.filter((t) => t.id !== a.id && t.parentId !== a.id) };
    case "moveTask": {
      const moving = state.tasks.find((t) => t.id === a.id);
      if (!moving) return state;
      const rest = state.tasks.filter((t) => t.id !== a.id);
      const updated: Task = {
        ...moving,
        status: a.status ?? moving.status,
        categoryId: a.categoryId ?? moving.categoryId,
        updatedAt: now,
      };
      const idx = a.beforeId ? rest.findIndex((t) => t.id === a.beforeId) : -1;
      const ordered = idx === -1 ? [...rest, updated] : [...rest.slice(0, idx), updated, ...rest.slice(idx)];
      // `order` follows array position so list order is stable
      return { ...state, tasks: ordered.map((t, i) => ({ ...t, order: i })) };
    }
    case "addCategory":
      return { ...state, categories: [...state.categories, a.category] };
    case "updateCategory":
      return { ...state, categories: state.categories.map((c) => (c.id === a.id ? { ...c, ...a.patch } : c)) };
    case "deleteCategory": {
      const categories = state.categories.filter((c) => c.id !== a.id);
      const tasks =
        a.moveTo === null
          ? state.tasks.filter((t) => t.categoryId !== a.id)
          : state.tasks.map((t) => (t.categoryId === a.id ? { ...t, categoryId: a.moveTo as string } : t));
      return { ...state, categories, tasks };
    }
    case "setPrefs":
      return { ...state, prefs: { ...state.prefs, ...a.patch } };
    case "clearSamples":
      return { ...state, tasks: [], isSample: false };
  }
}

interface Store {
  ready: boolean;
  data: AppData;
  /** Previous visit timestamp, captured at load (for "welcome back"). */
  previousVisit: number | null;
  isFirstVisit: boolean;
  dispatch: (a: Action) => void;
  /** Dispatch and remember the prior state so `undo()` can revert it. */
  dispatchUndoable: (a: Action) => void;
  undo: () => void;
  canUndo: boolean;
  resetAll: () => void;
}

const StoreContext = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [data, rawDispatch] = useReducer(reducer, undefined as unknown as AppData, () => createSeed());
  const [ready, setReady] = useState(false);
  const [isFirstVisit, setFirst] = useState(false);
  const [previousVisit, setPrev] = useState<number | null>(null);
  const [history, setHistory] = useState<AppData[]>([]);
  const dataRef = useRef(data);
  // eslint-disable-next-line react-hooks/refs -- intentional: latest-state ref for undo snapshots
  dataRef.current = data;

  useEffect(() => {
    const saved = loadData();
    /* eslint-disable react-hooks/set-state-in-effect -- one-time hydration from localStorage */
    if (saved) {
      setPrev(saved.prefs.lastVisit);
      rawDispatch({ type: "hydrate", data: { ...saved, prefs: { ...saved.prefs, lastVisit: Date.now() } } });
    } else {
      setFirst(true);
    }
    setReady(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  useEffect(() => {
    if (ready) saveData(data);
  }, [data, ready]);

  const dispatch = useCallback((a: Action) => rawDispatch(a), []);
  const dispatchUndoable = useCallback((a: Action) => {
    setHistory((h) => [...h.slice(-19), dataRef.current]);
    rawDispatch(a);
  }, []);
  const undo = useCallback(() => {
    setHistory((h) => {
      const prev = h[h.length - 1];
      if (prev) rawDispatch({ type: "restore", data: prev });
      return h.slice(0, -1);
    });
  }, []);
  const resetAll = useCallback(() => {
    setHistory([]);
    rawDispatch({ type: "restore", data: createSeed() });
  }, []);

  const value = useMemo<Store>(
    () => ({ ready, data, previousVisit, isFirstVisit, dispatch, dispatchUndoable, undo, canUndo: history.length > 0, resetAll }),
    [ready, data, previousVisit, isFirstVisit, dispatch, dispatchUndoable, undo, history.length, resetAll],
  );
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): Store {
  const s = useContext(StoreContext);
  if (!s) throw new Error("useStore must be used inside <StoreProvider>");
  return s;
}
