"use client";

import { Button } from "@/components/ui";
import { ViewSwitcher } from "./ViewSwitcher";
import type { ViewMode } from "@/lib/types";

export interface HeaderProps {
  view: ViewMode;
  onViewChange: (v: ViewMode) => void;
  query: string;
  onQueryChange: (q: string) => void;
  onAddTask: () => void;
  /** Slot at the far right (the menu button). */
  menuSlot?: React.ReactNode;
  searchRef?: React.Ref<HTMLInputElement>;
}

export function Header({ view, onViewChange, query, onQueryChange, onAddTask, menuSlot, searchRef }: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-[1600px] flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-sm font-bold text-white" aria-hidden>
            ✓
          </span>
          <h1 className="text-base font-semibold tracking-tight text-slate-900">Kanban To-Do</h1>
        </div>

        <ViewSwitcher value={view} onChange={onViewChange} />

        <div className="order-last w-full sm:order-none sm:ml-auto sm:w-64">
          <label htmlFor="search" className="sr-only">Search tasks</label>
          <input
            ref={searchRef}
            id="search"
            type="search"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Search tasks…"
            className="h-9 w-full rounded-lg border-0 bg-slate-100 px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="ml-auto flex items-center gap-2 sm:ml-0">
          <Button variant="primary" onClick={onAddTask} data-tour="add-task" aria-keyshortcuts="N">
            <span aria-hidden>+</span> Add task
            <kbd className="hidden rounded bg-white/20 px-1.5 text-[10px] font-semibold sm:inline">N</kbd>
          </Button>
          {menuSlot}
        </div>
      </div>
    </header>
  );
}
