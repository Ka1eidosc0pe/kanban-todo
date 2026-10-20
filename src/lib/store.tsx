"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { createSeed } from "./seed";
import { STORAGE_KEY, loadData, saveData, stashUnreadable } from "./storage";
import { nextDueDate } from "./taskUtils";
import type { AppData, Category, Prefs, Status, Task } from "./types";

const SAVE_DELAY = 300; // ms; saves are batched (trailing)

export const uid = () => crypto.randomUUID();

type Action =
  | { type: "hydrate"; data: AppData }
  | { type: "restore"; data: AppData } // whole-state replace (reset to sample)
  | { type: "addTask"; task: Partial<Task> & Pick<Task, "title" | "categoryId"> & { id?: string } }
  | { type: "updateTask"; id: string; patch: Partial<Omit<Task, "id">> }
  | { type: "deleteTask"; id: string }
  | { type: "moveTask"; id: string; status?: Status; categoryId?: string; beforeId?: string | null }
  | { type: "addCategory"; category: Category }
  | { type: "updateCategory"; id: string; patch: Partial<Omit<Category, "id">> }
  | { type: "bulkUpdate"; ids: string[]; patch: Pick<Partial<Task>, "status" | "categoryId"> }
  | { type: "bulkDelete"; ids: string[] }
  | { type: "reorderCategories"; ids: string[] }
  | { type: "deleteCategory"; id: string; moveTo: string | null } // moveTo null => delete its tasks
  | { type: "setPrefs"; patch: Partial<Prefs> }
  | { type: "clearSamples" }
  | { type: "applyUndo"; record: UndoRecord };

/** Inverse of one undoable action: only the entities it touched. */
interface UndoRecord {
  full?: AppData; // whole-state snapshot (restore-type actions)
  tasks: ({ kind: "removed"; task: Task; index: number } | { kind: "added"; id: string } | { kind: "patched"; id: string; before: Partial<Task> })[];
  categories: ({ kind: "removed"; category: Category; index: number } | { kind: "added"; id: string } | { kind: "patched"; id: string; before: Partial<Category> })[];
  categoryOrder?: string[]; // category ids in their previous order (reorders have no field diff)
  prefs: Partial<Prefs>;
  isSample?: boolean;
}

/** Changed fields of `a` -> their old values (undefined = field was absent). */
function fieldDiff<T extends object>(a: T, b: T): Partial<T> | null {
  const out: Record<string, unknown> = {};
  let changed = false;
  for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
    const x = (a as Record<string, unknown>)[k];
    if (x !== (b as Record<string, unknown>)[k]) {
      out[k] = x;
      changed = true;
    }
  }
  return changed ? (out as Partial<T>) : null;
}

function diffList<T extends { id: string }>(before: T[], after: T[]) {
  const afterById = new Map(after.map((x) => [x.id, x]));
  const beforeIds = new Set(before.map((x) => x.id));
  const out: ({ kind: "removed"; item: T; index: number } | { kind: "added"; id: string } | { kind: "patched"; id: string; before: Partial<T> })[] = [];
  before.forEach((item, index) => {
    const next = afterById.get(item.id);
    if (!next) return out.push({ kind: "removed", item, index });
    const d = fieldDiff(item, next);
    if (d) out.push({ kind: "patched", id: item.id, before: d });
  });
  for (const x of after) if (!beforeIds.has(x.id)) out.push({ kind: "added", id: x.id });
  return out;
}

function makeRecord(before: AppData, after: AppData, a: Action): UndoRecord {
  if (a.type === "restore" || a.type === "hydrate") return { full: before, tasks: [], categories: [], prefs: {} };
  const tasks = diffList(before.tasks, after.tasks).map((e) => (e.kind === "removed" ? { kind: "removed" as const, task: e.item, index: e.index } : e));
  const categories = diffList(before.categories, after.categories).map((e) =>
    e.kind === "removed" ? { kind: "removed" as const, category: e.item, index: e.index } : e,
  );
  const ids = (l: Category[]) => l.map((c) => c.id);
  const reordered = before.categories.length === after.categories.length && ids(before.categories).join() !== ids(after.categories).join() && !categories.length;
  return {
    tasks,
    categories,
    ...(reordered ? { categoryOrder: ids(before.categories) } : {}),
    prefs: fieldDiff(before.prefs, after.prefs) ?? {},
    ...(before.isSample !== after.isSample ? { isSample: before.isSample } : {}),
  };
}

function patchBack<T extends object>(item: T, before: Partial<T>): T {
  const next = { ...item, ...before } as Record<string, unknown>;
  for (const k of Object.keys(before)) if (next[k] === undefined) delete next[k];
  return next as T;
}

function applyUndo(state: AppData, r: UndoRecord): AppData {
  if (r.full) return r.full;
  let tasks = state.tasks;
  for (const e of r.tasks) {
    if (e.kind === "added") tasks = tasks.filter((t) => t.id !== e.id);
    else if (e.kind === "patched") tasks = tasks.map((t) => (t.id === e.id ? patchBack(t, e.before) : t));
    else if (!tasks.some((t) => t.id === e.task.id)) tasks = [...tasks.slice(0, e.index), e.task, ...tasks.slice(e.index)];
  }
  // restored tasks keep their old `order`; re-sort (stable) and renumber
  tasks = [...tasks].sort((x, y) => x.order - y.order).map((t, i) => (t.order === i ? t : { ...t, order: i }));
  let categories = state.categories;
  for (const e of r.categories) {
    if (e.kind === "added") categories = categories.filter((c) => c.id !== e.id);
    else if (e.kind === "patched") categories = categories.map((c) => (c.id === e.id ? patchBack(c, e.before) : c));
    else if (!categories.some((c) => c.id === e.category.id)) categories = [...categories.slice(0, e.index), e.category, ...categories.slice(e.index)];
  }
  if (r.categoryOrder) {
    const rank = new Map(r.categoryOrder.map((id, i) => [id, i]));
    categories = [...categories].sort((a, b) => (rank.get(a.id) ?? Infinity) - (rank.get(b.id) ?? Infinity));
  }
  return {
    ...state,
    tasks,
    categories,
    prefs: { ...state.prefs, ...r.prefs },
    isSample: r.isSample ?? state.isSample,
  };
}

function nextOrder(tasks: Task[]) {
  return tasks.reduce((m, t) => Math.max(m, t.order), -1) + 1;
}

/** Keeps `completedAt` in step with status: stamped on completing, kept while archived, cleared once reopened. */
function stampCompletion(prev: Task, cur: Task, now: number): Task {
  if (cur.status === "completed" && prev.status !== "completed") return { ...cur, completedAt: now };
  if (cur.status !== "completed" && cur.status !== "archived" && cur.completedAt !== undefined) {
    const next = { ...cur };
    delete next.completedAt;
    return next;
  }
  return cur;
}

/**
 * When a recurring main task has just become completed, append its next occurrence (fresh "created" copies of
 * its subtasks too) and mark it spawned. Ids are derived, not random, so the reducer stays pure (it also runs
 * outside React to build undo records) and undoing the completion cleanly removes the copies.
 */
function spawnNext(tasks: Task[], prev: Task, cur: Task, now: number): Task[] {
  if (prev.status === "completed" || cur.status !== "completed" || cur.parentId || !cur.repeat || !cur.dueDate || cur.spawnedNext) return tasks;
  const dueDate = nextDueDate(cur.dueDate, cur.repeat);
  const base = cur.id.startsWith("r-") ? cur.id.slice(2, 10) : cur.id.slice(0, 8); // stable series prefix
  let id = `r-${base}-${dueDate}`;
  while (tasks.some((t) => t.id === id)) id += "x";
  let order = nextOrder(tasks);
  const copy: Task = { id, title: cur.title, notes: cur.notes, status: "created", categoryId: cur.categoryId, priority: cur.priority, dueDate, parentId: null, repeat: cur.repeat, order: order++, createdAt: now, updatedAt: now };
  const subs = tasks
    .filter((t) => t.parentId === cur.id)
    .map((s, i): Task => ({ id: `${id}~${i}`, title: s.title, notes: s.notes, status: "created", categoryId: cur.categoryId, priority: s.priority, dueDate: s.dueDate ? nextDueDate(s.dueDate, cur.repeat!) : null, parentId: id, order: order++, createdAt: now, updatedAt: now }));
  return [...tasks.map((t) => (t.id === cur.id ? { ...t, spawnedNext: true } : t)), copy, ...subs];
}

function reducer(state: AppData, a: Action): AppData {
  const now = Date.now();
  switch (a.type) {
    case "hydrate":
    case "restore":
      return a.data;
    case "addTask": {
      const parent = a.task.parentId ? state.tasks.find((t) => t.id === a.task.parentId) : undefined;
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
        ...(parent ? { categoryId: parent.categoryId } : {}), // subtasks follow their parent
      };
      return { ...state, tasks: [...state.tasks, task] };
    }
    case "updateTask": {
      const target = state.tasks.find((t) => t.id === a.id);
      if (!target) return state;
      const { categoryId, ...rest } = a.patch;
      if (target.parentId !== null) delete rest.repeat; // subtasks never repeat
      // category: subtasks can't change it; a parent's change cascades to its subtasks
      const cat = target.parentId === null ? categoryId : undefined;
      const archiveSubs = target.parentId === null && rest.status === "archived" && target.status !== "archived";
      const updated = stampCompletion(target, { ...target, ...rest, ...(cat ? { categoryId: cat } : {}), updatedAt: now }, now);
      const tasks = state.tasks.map((t) => {
        if (t.id === a.id) return updated;
        if (t.parentId !== a.id) return t;
        const sub = { ...t, ...(cat && t.categoryId !== cat ? { categoryId: cat } : {}), ...(archiveSubs ? { status: "archived" as const } : {}) };
        return sub.categoryId !== t.categoryId || sub.status !== t.status ? { ...sub, updatedAt: now } : t;
      });
      return { ...state, tasks: spawnNext(tasks, target, updated, now) };
    }
    case "bulkUpdate": // same rules as updateTask per task (subtasks follow their parent's category, archiving cascades)
      return a.ids.reduce((s, id) => reducer(s, { type: "updateTask", id, patch: a.patch }), state);
    case "bulkDelete": {
      const ids = new Set(a.ids);
      return { ...state, tasks: state.tasks.filter((t) => !ids.has(t.id) && !(t.parentId && ids.has(t.parentId))) };
    }
    case "deleteTask": // removes the task and its subtasks
      return { ...state, tasks: state.tasks.filter((t) => t.id !== a.id && t.parentId !== a.id) };
    case "moveTask": {
      const moving = state.tasks.find((t) => t.id === a.id);
      if (!moving) return state;
      const rest = state.tasks.filter((t) => t.id !== a.id);
      const updated = stampCompletion(
        moving,
        {
          ...moving,
          status: a.status ?? moving.status,
          categoryId: moving.parentId ? moving.categoryId : (a.categoryId ?? moving.categoryId), // subtasks keep their parent's
          updatedAt: now,
        },
        now,
      );
      const cascade = !moving.parentId && updated.categoryId !== moving.categoryId;
      const archiveSubs = !moving.parentId && updated.status === "archived" && moving.status !== "archived";
      const idx = a.beforeId ? rest.findIndex((t) => t.id === a.beforeId) : -1;
      const ordered = idx === -1 ? [...rest, updated] : [...rest.slice(0, idx), updated, ...rest.slice(idx)];
      // `order` follows array position so list order is stable
      return {
        ...state,
        tasks: spawnNext(ordered.map((t, i) => ({
          ...(t.parentId === a.id && (cascade || (archiveSubs && t.status !== "archived"))
            ? { ...t, ...(cascade ? { categoryId: updated.categoryId } : {}), ...(archiveSubs ? { status: "archived" as const } : {}), updatedAt: now }
            : t),
          order: i,
        })), moving, updated, now),
      };
    }
    case "addCategory":
      return { ...state, categories: [...state.categories, a.category] };
    case "updateCategory":
      return { ...state, categories: state.categories.map((c) => (c.id === a.id ? { ...c, ...a.patch } : c)) };
    case "reorderCategories": {
      const byId = new Map(state.categories.map((c) => [c.id, c]));
      const seen = new Set(a.ids.filter((id) => byId.has(id)));
      // unknown ids are dropped; categories missing from `ids` keep their relative order at the end
      return { ...state, categories: [...[...seen].map((id) => byId.get(id)!), ...state.categories.filter((c) => !seen.has(c.id))] };
    }
    case "deleteCategory": {
      const categories = state.categories.filter((c) => c.id !== a.id);
      const tasks =
        a.moveTo === null
          ? state.tasks.filter((t) => {
              if (t.categoryId === a.id) return false;
              // also drop subtasks whose parent is being deleted
              const parent = t.parentId ? state.tasks.find((p) => p.id === t.parentId) : undefined;
              return parent?.categoryId !== a.id;
            })
          : state.tasks.map((t) => (t.categoryId === a.id ? { ...t, categoryId: a.moveTo as string } : t));
      return { ...state, categories, tasks };
    }
    case "setPrefs":
      return { ...state, prefs: { ...state.prefs, ...a.patch } };
    case "clearSamples":
      return { ...state, tasks: [], isSample: false };
    case "applyUndo":
      return applyUndo(state, a.record);
  }
}

interface Store {
  ready: boolean;
  data: AppData;
  /** Previous visit timestamp, captured at load (for "welcome back"). */
  previousVisit: number | null;
  isFirstVisit: boolean;
  dispatch: (a: Action) => void;
  /** Dispatch and remember how to revert just this action; returns the id to pass to `undo()`. */
  dispatchUndoable: (a: Action) => number;
  /** Revert one undoable action (default: the latest) without touching unrelated changes. */
  undo: (id?: number) => void;
  canUndo: boolean;
  /** The recurring-task occurrence spawned by the latest dispatch (cleared on read), for "next one due" toasts. */
  takeSpawned: () => Task | null;
  resetAll: () => void;
  /** Increments each time another tab's changes were loaded. */
  syncTick: number;
  /** True while the latest save failed (e.g. storage full). */
  saveFailed: boolean;
  /** True when saved data couldn't be read at load (a copy was kept; a fresh board was started). */
  loadedUnreadable: boolean;
}

const StoreContext = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [data, rawDispatch] = useReducer(reducer, undefined as unknown as AppData, () => createSeed());
  const [ready, setReady] = useState(false);
  const [isFirstVisit, setFirst] = useState(false);
  const [previousVisit, setPrev] = useState<number | null>(null);
  const [historyLen, setHistoryLen] = useState(0);
  const [syncTick, setSyncTick] = useState(0);
  const [saveFailed, setSaveFailed] = useState(false);
  const [unreadable, setUnreadable] = useState(false);
  const externalRef = useRef<AppData | null>(null); // data just loaded from another tab: don't write it back
  const pendingRef = useRef<AppData | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Write the latest pending data now (skipping data that just came from another tab).
  const flush = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    const d = pendingRef.current;
    pendingRef.current = null;
    if (d && d !== externalRef.current) setSaveFailed(!saveData(d));
  }, []);
  const history = useRef<{ id: number; record: UndoRecord }[]>([]);
  const nextUndoId = useRef(1);
  const dataRef = useRef(data);
  // eslint-disable-next-line react-hooks/refs -- intentional: latest-state ref for computing undo records
  dataRef.current = data;

  useEffect(() => {
    const res = loadData();
    /* eslint-disable react-hooks/set-state-in-effect -- one-time hydration from localStorage */
    if (res.kind === "ok") {
      const saved = res.data;
      setPrev(saved.prefs.lastVisit);
      rawDispatch({ type: "hydrate", data: { ...saved, prefs: { ...saved.prefs, lastVisit: Date.now() } } });
    } else {
      if (res.kind === "unreadable") {
        stashUnreadable(res.raw); // before any save can overwrite it
        setUnreadable(true);
      }
      setFirst(true);
      rawDispatch({ type: "setPrefs", patch: { lastVisit: Date.now() } }); // so the next visit has a "last visit"
    }
    setReady(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  useEffect(() => {
    if (!ready) return;
    pendingRef.current = data;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(flush, SAVE_DELAY);
  }, [data, ready, flush]);

  // Never lose a pending write when the page goes away.
  useEffect(() => {
    const onHide = () => document.visibilityState === "hidden" && flush();
    window.addEventListener("pagehide", flush);
    window.addEventListener("beforeunload", flush);
    document.addEventListener("visibilitychange", onHide);
    return () => {
      window.removeEventListener("pagehide", flush);
      window.removeEventListener("beforeunload", flush);
      document.removeEventListener("visibilitychange", onHide);
      flush();
    };
  }, [flush]);

  // Another tab wrote the board: adopt it (stale undo records are unsafe, so drop them).
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY || e.storageArea !== window.localStorage) return;
      const res = loadData();
      if (res.kind !== "ok") return; // ignore empty/unreadable payloads
      const next = res.data;
      history.current = [];
      setHistoryLen(0);
      externalRef.current = next;
      dataRef.current = next;
      rawDispatch({ type: "hydrate", data: next });
      setSyncTick((n) => n + 1);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const spawned = useRef<Task | null>(null);
  const noteSpawn = (before: AppData, after: AppData) => {
    const known = new Set(before.tasks.map((t) => t.id));
    spawned.current = after.tasks.length > before.tasks.length ? (after.tasks.find((t) => !known.has(t.id) && !t.parentId && t.repeat) ?? null) : null;
  };
  const takeSpawned = useCallback(() => {
    const t = spawned.current;
    spawned.current = null;
    return t;
  }, []);
  const dispatch = useCallback((a: Action) => {
    const before = dataRef.current;
    dataRef.current = reducer(before, a); // keep the ref current for same-tick dispatches
    noteSpawn(before, dataRef.current);
    rawDispatch(a);
  }, []);
  const dispatchUndoable = useCallback((a: Action) => {
    const before = dataRef.current;
    const after = reducer(before, a);
    dataRef.current = after;
    noteSpawn(before, after);
    const id = nextUndoId.current++;
    history.current = [...history.current.slice(-19), { id, record: makeRecord(before, after, a) }];
    setHistoryLen(history.current.length);
    rawDispatch(a);
    return id;
  }, []);
  const undo = useCallback((id?: number) => {
    const i = id === undefined ? history.current.length - 1 : history.current.findIndex((h) => h.id === id);
    const entry = history.current[i];
    if (!entry) return;
    history.current = history.current.filter((_, j) => j !== i);
    setHistoryLen(history.current.length);
    dataRef.current = applyUndo(dataRef.current, entry.record);
    rawDispatch({ type: "applyUndo", record: entry.record });
  }, []);
  const resetAll = useCallback(() => {
    history.current = [];
    setHistoryLen(0);
    rawDispatch({ type: "restore", data: createSeed() });
  }, []);

  const value = useMemo<Store>(
    () => ({ ready, data, previousVisit, isFirstVisit, dispatch, dispatchUndoable, undo, canUndo: historyLen > 0, takeSpawned, resetAll, syncTick, saveFailed, loadedUnreadable: unreadable }),
    [ready, data, previousVisit, isFirstVisit, dispatch, dispatchUndoable, undo, historyLen, takeSpawned, resetAll, syncTick, saveFailed, unreadable],
  );
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): Store {
  const s = useContext(StoreContext);
  if (!s) throw new Error("useStore must be used inside <StoreProvider>");
  return s;
}
