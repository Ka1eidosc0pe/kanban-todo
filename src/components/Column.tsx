"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Button, EmptyState, IconButton, TextField, cn } from "@/components/ui";

export interface ColumnProps {
  /** Droppable id; Board uses `col:<key>`. */
  id: string;
  title: string;
  /** Tailwind bg class for the colored dot. */
  dotClass?: string;
  taskIds: string[];
  /** Header "+": create a task and open the drawer. */
  onAdd?: () => void;
  /** Footer: create a task with this title in this column (inline input). */
  onQuickAdd?: (title: string) => void;
  emptyText?: string;
  /** False while the board is sorted: no reordering within the column. */
  reorderable?: boolean;
  /** Category reordering: sortable node ref/style from Board's SortableColumn, and the drag-handle props. */
  sortableRef?: (node: HTMLElement | null) => void;
  sortableStyle?: React.CSSProperties;
  handleProps?: React.HTMLAttributes<HTMLButtonElement>;
  dragging?: boolean;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  /** Providing `onWipChange` makes the count chip a WIP-limit control (null = no limit). */
  wipLimit?: number | null;
  onWipChange?: (limit: number | null) => void;
  /** Card count used for the WIP limit (the real count, not just the cards matching filters). */
  wipCount?: number;
  children: React.ReactNode;
}

/** Sorting strategy that never shifts siblings (drop positions are meaningless when sorted). */
const noShift = () => null;

export function Column({ id, title, dotClass = "bg-slate-400 dark:bg-slate-500", taskIds, onAdd, onQuickAdd, emptyText = "Drop a card here", reorderable = true, sortableRef, sortableStyle, handleProps, dragging, collapsed = false, onToggleCollapse, wipLimit = null, onWipChange, wipCount, children }: ColumnProps) {
  const { setNodeRef: setDropRef, isOver } = useDroppable({ id });
  const headingId = `${id}-heading`;
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (adding) inputRef.current?.focus();
  }, [adding]);
  const closeAdd = () => {
    setAdding(false);
    setDraft("");
  };
  const setNodeRef = useCallback(
    (node: HTMLElement | null) => {
      setDropRef(node);
      sortableRef?.(node);
    },
    [setDropRef, sortableRef],
  );
  const [wipOpen, setWipOpen] = useState(false);
  const wipRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!wipOpen) return;
    const onDown = (e: MouseEvent) => {
      if (!wipRef.current?.contains(e.target as Node)) setWipOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopPropagation();
      setWipOpen(false);
      wipRef.current?.querySelector<HTMLElement>("button")?.focus();
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [wipOpen]);

  const count = wipLimit !== null && wipCount !== undefined ? wipCount : taskIds.length;
  const over = wipLimit !== null && count > wipLimit;
  const chipText = wipLimit !== null ? `${count}/${wipLimit}` : String(count);
  const chipLabel = wipLimit !== null ? `${count} of ${wipLimit} cards (limit)` : `${count} cards`;
  const chipCls = cn("rounded-full px-2 py-0.5 text-xs font-medium", over ? "bg-rose-100 dark:bg-rose-500/25 text-rose-700 dark:text-rose-300 ring-1 ring-inset ring-rose-300 dark:ring-rose-500/40" : "bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400");

  if (collapsed) {
    return (
      <section
        ref={setNodeRef}
        style={sortableStyle}
        aria-labelledby={headingId}
        className={cn(
          dragging && "relative z-10 opacity-70",
          "flex max-h-full w-12 shrink-0 snap-start flex-col items-center gap-2 rounded-2xl bg-slate-100/80 dark:bg-slate-900/80 py-3 ring-1 ring-slate-200/70 dark:ring-slate-800 transition-colors",
          isOver && "bg-indigo-100 dark:bg-indigo-500/25",
        )}
      >
        <IconButton label={`Expand ${title}`} size="sm" aria-expanded={false} onClick={onToggleCollapse}>
          <span aria-hidden>▸</span>
        </IconButton>
        <span className={chipCls} aria-label={chipLabel} title={over ? `Over limit (${count}/${wipLimit})` : undefined}>{chipText}</span>
        <span className={cn("h-2.5 w-2.5 rounded-full", dotClass)} aria-hidden />
        <h2 id={headingId} style={{ writingMode: "vertical-rl" }} className="min-h-0 flex-1 truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{title}</h2>
      </section>
    );
  }

  return (
    <section
      ref={sortableRef}
      style={sortableStyle}
      aria-labelledby={headingId}
      className={cn(
        "flex max-h-full w-[18rem] shrink-0 snap-start flex-col rounded-2xl bg-slate-100/80 dark:bg-slate-900/80 ring-1 ring-slate-200/70 dark:ring-slate-800 sm:w-72",
        dragging && "relative z-10 opacity-70 shadow-xl",
      )}
    >
      <div className="relative flex items-center gap-2 px-3 pb-2 pt-3">
        {handleProps && (
          <button
            type="button"
            {...handleProps}
            aria-label={`Reorder ${title} (Space to pick up, arrow keys to move)`}
            title="Drag to reorder"
            className="-ml-1 flex h-6 w-4 shrink-0 cursor-grab touch-none items-center justify-center rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-100 focus-visible:outline-2 focus-visible:outline-indigo-500 dark:focus-visible:outline-indigo-400"
          >
            <span aria-hidden className="text-xs leading-none">⋮⋮</span>
          </button>
        )}
        <span className={cn("h-2.5 w-2.5 rounded-full", dotClass)} aria-hidden />
        <h2 id={headingId} className="flex-1 truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{title}</h2>
        {onWipChange ? (
          <div ref={wipRef}>
            <button
              type="button"
              className={cn(chipCls, "hover:ring-1 hover:ring-slate-300 dark:hover:ring-slate-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 dark:focus-visible:outline-indigo-400")}
              aria-label={`${chipLabel}. Set WIP limit`}
              aria-haspopup="dialog"
              aria-expanded={wipOpen}
              title="Set WIP limit"
              onClick={() => setWipOpen((o) => !o)}
            >
              {chipText}
            </button>
            {wipOpen && (
              <div role="dialog" aria-label="WIP limit" data-popover className="absolute right-3 top-full z-30 mt-1 flex w-52 flex-col gap-2 rounded-xl bg-white dark:bg-slate-800 p-3 shadow-lg ring-1 ring-slate-200 dark:ring-slate-700">
                <TextField
                  label="WIP limit"
                  hint="Leave empty for no limit."
                  type="number"
                  min={1}
                  inputMode="numeric"
                  placeholder="No limit"
                  data-autofocus
                  autoFocus
                  value={wipLimit ?? ""}
                  onChange={(e) => {
                    const n = Math.floor(Number(e.target.value));
                    onWipChange(e.target.value !== "" && n > 0 ? n : null);
                  }}
                  onKeyDown={(e) => e.key === "Enter" && setWipOpen(false)}
                />
                <div className="flex justify-end">
                  <Button size="sm" variant="ghost" disabled={wipLimit === null} onClick={() => onWipChange(null)}>Clear</Button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <span className={chipCls} aria-label={chipLabel}>{chipText}</span>
        )}
        {onToggleCollapse && (
          <IconButton label={`Collapse ${title}`} size="sm" aria-expanded onClick={() => { closeAdd(); onToggleCollapse(); }}>
            <span aria-hidden>◂</span>
          </IconButton>
        )}
        {onAdd && (
          <IconButton label={`Add task to ${title}`} size="sm" onClick={onAdd}>
            <span aria-hidden className="text-base leading-none">+</span>
          </IconButton>
        )}
      </div>
      {over && <p className="px-3 pb-2 text-[11px] font-medium text-rose-600 dark:text-rose-400" role="status">Over limit ({count}/{wipLimit})</p>}
      <div
        ref={setDropRef}
        className={cn("flex min-h-24 flex-1 flex-col gap-2 overflow-y-auto px-2 pb-2 transition-colors", isOver && "rounded-xl bg-indigo-50/70 dark:bg-indigo-500/10")}
      >
        <SortableContext items={taskIds} strategy={reorderable ? verticalListSortingStrategy : noShift}>
          {taskIds.length === 0 ? <EmptyState compact title={emptyText} icon="⇣" className="bg-white/50 dark:bg-slate-800/50" /> : children}
        </SortableContext>
      </div>
      {onQuickAdd && (
        <div className="flex flex-col gap-1 px-2 pb-2">
          {adding && (
            <>
              <input
                ref={inputRef}
                value={draft}
                maxLength={200}
                aria-label={`New task title in ${title}`}
                placeholder="Task title, Enter to add"
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    e.preventDefault();
                    e.stopPropagation();
                    closeAdd();
                  } else if (e.key === "Enter" && !e.nativeEvent.isComposing) {
                    e.preventDefault();
                    const t = draft.trim();
                    if (!t) return;
                    onQuickAdd(t);
                    setDraft("");
                  }
                }}
                onBlur={() => !draft.trim() && closeAdd()}
                className="h-9 w-full rounded-lg border-0 bg-white dark:bg-slate-800 px-3 text-sm text-slate-900 dark:text-slate-100 ring-1 ring-inset ring-slate-300 dark:ring-slate-600 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400"
              />
              <p className="px-1 text-[11px] text-slate-400">Enter adds and keeps going · Esc closes</p>
            </>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-slate-500 dark:text-slate-400"
            aria-expanded={adding}
            onMouseDown={(e) => adding && e.preventDefault()} // don't blur the input first, or the click would re-open it
            onClick={() => (adding ? closeAdd() : setAdding(true))}
          >
            <span aria-hidden>{adding ? "×" : "+"}</span> {adding ? "Done adding" : "Add task"}
          </Button>
        </div>
      )}
    </section>
  );
}
