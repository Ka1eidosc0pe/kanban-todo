"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Board } from "./Board";
import { CoachTour } from "./CoachTour";
import { Header } from "./Header";
import { HeaderMenu } from "./HeaderMenu";
import { SampleBanner } from "./SampleBanner";
import { TaskDrawer } from "./TaskDrawer";
import { WelcomeBack } from "./WelcomeBack";
import type { QuickFilter } from "@/lib/taskUtils";
import { uid, useStore } from "@/lib/store";
import { useToast } from "@/components/ui";
import type { Status, ViewMode } from "@/lib/types";

const isView = (v: string | null): v is ViewMode => v === "status" || v === "category";

export function BoardPage() {
  const { ready, data, dispatch, syncTick } = useStore();
  const { toast } = useToast();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [quick, setQuick] = useState<QuickFilter | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

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
      dispatch({ type: "addTask", task: { id, title: "New task", categoryId, ...(target.status ? { status: target.status } : {}) } });
      openTask(id);
    },
    [data.categories, dispatch, openTask, toast],
  );

  // "N" opens a new task unless the user is typing or an overlay is open.
  const addRef = useRef(addTask);
  useEffect(() => {
    addRef.current = addTask;
  });
  const overlayOpen = !!selectedTaskId;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== "n" || e.metaKey || e.ctrlKey || e.altKey || e.defaultPrevented) return;
      const el = e.target as HTMLElement | null;
      if (el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))) return;
      if (overlayOpen || document.querySelector('[aria-modal="true"]')) return;
      e.preventDefault();
      addRef.current();
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
        menuSlot={<HeaderMenu />}
        searchRef={searchRef}
      />
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
        <CoachTour paused={!!selectedTaskId} onDone={() => dispatch({ type: "setPrefs", patch: { tourDone: true } })} />
      )}
      <TaskDrawer taskId={selectedTaskId} onClose={closeTask} onOpenTask={openTask} />
    </div>
  );
}
