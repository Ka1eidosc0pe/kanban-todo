"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Board } from "./Board";
import { CoachTour } from "./CoachTour";
import { Header } from "./Header";
import { HeaderMenu } from "./HeaderMenu";
import { RecoveryBanner } from "./RecoveryBanner";
import { SampleBanner } from "./SampleBanner";
import { TaskDrawer } from "./TaskDrawer";
import { ShortcutsModal } from "./ShortcutsModal";
import { WelcomeBack } from "./WelcomeBack";
import type { QuickFilter } from "@/lib/taskUtils";
import { uid, useStore } from "@/lib/store";
import { useToast } from "@/components/ui";
import type { Status, ViewMode } from "@/lib/types";

const isView = (v: string | null): v is ViewMode => v === "status" || v === "category" || v === "agenda";

export function BoardPage() {
  const { ready, data, dispatch, syncTick, saveFailed, undo, canUndo } = useStore();
  const { toast, dismiss } = useToast();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [quick, setQuick] = useState<QuickFilter | null>(null);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  // Freshly created tasks (id -> defaults) so an untouched one is discarded when the drawer closes.
  const fresh = useRef(new Map<string, { status: Status; categoryId: string }>());
  const prevSelected = useRef<string | null>(null);
  const dataRef = useRef(data);
  useEffect(() => {
    dataRef.current = data;
  });

  const urlView = params.get("view");
  const view: ViewMode = isView(urlView) ? urlView : data.prefs.view;
  const taskParam = params.get("task");
  const selectedTaskId = taskParam && data.tasks.some((t) => t.id === taskParam) ? taskParam : null;

  const buildUrl = useCallback(
    (v: ViewMode, task: string | null) => `${pathname}?view=${v}${task ? `&task=${encodeURIComponent(task)}` : ""}`,
    [pathname],
  );

  // URL wins on load; otherwise write the stored view into the URL.
  useEffect(() => {
    if (!ready) return;
    if (isView(urlView)) {
      if (urlView !== data.prefs.view) dispatch({ type: "setPrefs", patch: { view: urlView } });
    } else {
      router.replace(buildUrl(data.prefs.view, taskParam), { scroll: false });
    }
  }, [ready, urlView, data.prefs.view, taskParam, dispatch, router, buildUrl]);

  // Drop a stale ?task= pointing at a task that no longer exists.
  useEffect(() => {
    if (ready && taskParam && !selectedTaskId) router.replace(buildUrl(view, null), { scroll: false });
  }, [ready, taskParam, selectedTaskId, view, router, buildUrl]);

  useEffect(() => {
    if (syncTick > 0) toast("Board updated from another tab");
  }, [syncTick, toast]);

  useEffect(() => {
    const prev = prevSelected.current;
    prevSelected.current = selectedTaskId;
    const init = prev && prev !== selectedTaskId ? fresh.current.get(prev) : undefined;
    if (!prev || !init) return;
    fresh.current.delete(prev);
    const { tasks } = dataRef.current;
    const t = tasks.find((x) => x.id === prev);
    if (!t) return;
    const untouched =
      t.title === "New task" && t.notes === "" && t.dueDate === null && t.priority === "medium" && t.parentId === null &&
      t.status === init.status && t.categoryId === init.categoryId && !tasks.some((x) => x.parentId === prev);
    if (untouched) dispatch({ type: "deleteTask", id: prev });
  }, [selectedTaskId, dispatch]);

  // Sticky storage-full notice: once per failure streak, cleared when a save succeeds.
  const fullToast = useRef<number | null>(null);
  useEffect(() => {
    if (saveFailed && fullToast.current === null) {
      fullToast.current = toast({ message: "Your browser's storage is full — recent changes may not be saved.", duration: 0 });
    } else if (!saveFailed && fullToast.current !== null) {
      dismiss(fullToast.current);
      fullToast.current = null;
    }
  }, [saveFailed, toast, dismiss]);

  const changeView = (v: ViewMode) => {
    dispatch({ type: "setPrefs", patch: { view: v } });
    router.replace(buildUrl(v, selectedTaskId), { scroll: false });
  };
  const openTask = useCallback((id: string) => router.push(buildUrl(view, id), { scroll: false }), [router, buildUrl, view]);
  const closeTask = useCallback(() => router.replace(buildUrl(view, null), { scroll: false }), [router, buildUrl, view]);

  const addTask = useCallback(
    (target: { status?: Status; categoryId?: string } = {}) => {
      const categoryId = target.categoryId ?? data.categories[0]?.id;
      if (!categoryId) {
        toast("Create a category first.");
        return;
      }
      const id = uid();
      fresh.current.set(id, { status: target.status ?? "created", categoryId });
      dispatch({ type: "addTask", task: { id, title: "New task", categoryId, ...(target.status ? { status: target.status } : {}) } });
      openTask(id);
    },
    [data.categories, dispatch, openTask, toast],
  );

  // Global shortcuts (N new task, / search, ⌘Z undo, ? help) unless the user is typing or an overlay is open.
  const keysRef = useRef({ addTask, undo, canUndo, toast });
  useEffect(() => {
    keysRef.current = { addTask, undo, canUndo, toast };
  });
  const overlayOpen = !!selectedTaskId || shortcutsOpen;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.altKey) return;
      const el = e.target as HTMLElement | null;
      if (el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))) return;
      if (overlayOpen || document.querySelector('[aria-modal="true"]')) return;
      const k = e.key.toLowerCase();
      const mod = e.metaKey || e.ctrlKey;
      const { addTask: add, undo: doUndo, canUndo: can, toast: say } = keysRef.current;
      if (mod && k === "z" && !e.shiftKey) {
        e.preventDefault();
        if (can) {
          doUndo();
          say("Undone");
        }
      } else if (mod) {
        return;
      } else if (k === "n") {
        e.preventDefault();
        add();
      } else if (e.key === "/") {
        e.preventDefault();
        searchRef.current?.focus();
        searchRef.current?.select();
      } else if (e.key === "?") {
        e.preventDefault();
        setShortcutsOpen(true);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [overlayOpen]);

  return (
    <div className="flex min-h-screen flex-col">
      <Header
        view={view}
        onViewChange={changeView}
        query={data.prefs.query}
        onQueryChange={(q) => dispatch({ type: "setPrefs", patch: { query: q } })}
        onAddTask={() => addTask()}
        menuSlot={<HeaderMenu onShowShortcuts={() => setShortcutsOpen(true)} />}
        searchRef={searchRef}
      />
      {ready && <RecoveryBanner />}
      {ready && <SampleBanner />}
      {ready && <WelcomeBack active={quick} onPick={setQuick} />}
      <main className="flex min-h-0 flex-1 flex-col">
        {ready ? (
          <Board onOpenTask={openTask} onAddTask={addTask} quickFilter={quick} onQuickFilterChange={setQuick} />
        ) : (
          <p className="p-8 text-sm text-slate-400" role="status">Loading your board…</p>
        )}
      </main>
      {ready && !data.prefs.tourDone && (
        <CoachTour view={view} paused={!!selectedTaskId} onDone={() => dispatch({ type: "setPrefs", patch: { tourDone: true } })} />
      )}
      <ShortcutsModal open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
      <TaskDrawer taskId={selectedTaskId} onClose={closeTask} onOpenTask={openTask} />
    </div>
  );
}
