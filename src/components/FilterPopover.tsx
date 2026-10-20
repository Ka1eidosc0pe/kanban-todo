"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Button, cn } from "@/components/ui";
import { DUE_FILTER_LABELS, activeFilterCount } from "@/lib/taskUtils";
import { DEFAULT_FILTERS, type Category, type DueFilter, type Filters, type Priority, type ViewMode } from "@/lib/types";

const PRIORITIES: Priority[] = ["high", "medium", "low"];
const cap = (s: string) => s[0].toUpperCase() + s.slice(1);

const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

export function FilterPopover({ view, categories, filters, onChange }: { view: ViewMode; categories: Category[]; filters: Filters; onChange: (f: Filters) => void }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();
  const count = activeFilterCount(filters, view);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopPropagation();
      setOpen(false);
      btnRef.current?.focus();
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const check = "h-4 w-4 rounded border-slate-300 dark:border-slate-600 accent-indigo-600 dark:accent-indigo-400";
  return (
    <div ref={wrapRef} className="relative">
      <Button ref={btnRef} size="sm" aria-haspopup="dialog" aria-expanded={open} aria-controls={open ? panelId : undefined} onClick={() => setOpen((o) => !o)}>
        Filters
        {count > 0 && <span className="rounded-full bg-indigo-600 px-1.5 text-[10px] font-semibold text-white" aria-label={`${count} active`}>{count}</span>}
      </Button>
      {open && (
        <div id={panelId} role="dialog" aria-label="Filters" data-popover className="absolute right-0 top-full z-40 mt-1 flex w-64 flex-col gap-3 rounded-xl bg-white dark:bg-slate-800 p-3 shadow-lg ring-1 ring-slate-200 dark:ring-slate-700">
          <fieldset className="flex flex-col gap-1.5">
            <legend className="mb-1 text-xs font-medium text-slate-600 dark:text-slate-300">Priority</legend>
            {PRIORITIES.map((p) => (
              <label key={p} className="flex cursor-pointer items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
                <input type="checkbox" className={check} checked={filters.priorities.includes(p)} onChange={() => onChange({ ...filters, priorities: toggle(filters.priorities, p) })} />
                {cap(p)}
              </label>
            ))}
          </fieldset>
          {view !== "category" && (
            <fieldset className="flex flex-col gap-1.5">
              <legend className="mb-1 text-xs font-medium text-slate-600 dark:text-slate-300">Category</legend>
              <div className="flex max-h-32 flex-col gap-1.5 overflow-y-auto">
                {categories.map((c) => (
                  <label key={c.id} className="flex cursor-pointer items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
                    <input type="checkbox" className={check} checked={filters.categoryIds.includes(c.id)} onChange={() => onChange({ ...filters, categoryIds: toggle(filters.categoryIds, c.id) })} />
                    <span className="truncate">{c.name}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          )}
          <fieldset className="flex flex-col gap-1.5">
            <legend className="mb-1 text-xs font-medium text-slate-600 dark:text-slate-300">Due</legend>
            {(Object.keys(DUE_FILTER_LABELS) as DueFilter[]).map((d) => (
              <label key={d} className={cn("flex cursor-pointer items-center gap-2 text-sm text-slate-700 dark:text-slate-200")}>
                <input type="radio" name={`${panelId}-due`} className="accent-indigo-600 dark:accent-indigo-400" checked={filters.due === d} onChange={() => onChange({ ...filters, due: d })} />
                {DUE_FILTER_LABELS[d]}
              </label>
            ))}
          </fieldset>
          <div className="flex justify-end">
            <Button size="sm" variant="ghost" disabled={count === 0} onClick={() => onChange(DEFAULT_FILTERS)}>Reset</Button>
          </div>
        </div>
      )}
    </div>
  );
}
