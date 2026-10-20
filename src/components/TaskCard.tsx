"use client";

import { forwardRef, memo } from "react";
import { Badge, cn } from "@/components/ui";
import { todayISO, dueLabel, isDueToday, isOverdue } from "@/lib/taskUtils";
import { CATEGORY_COLORS, STATUS_LABELS, type Category, type Status, type Task, type Priority, type ViewMode } from "@/lib/types";

const STATUS_TONE = { created: "neutral", planned: "sky", in_progress: "amber", completed: "green", archived: "neutral" } as const;
const PRIORITY: Record<Priority, { label: string; cls: string }> = {
  high: { label: "High", cls: "bg-rose-500" },
  medium: { label: "Medium", cls: "bg-amber-400" },
  low: { label: "Low", cls: "bg-slate-300" },
};

export interface TaskCardProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onClick"> {
  task: Task;
  category?: Category;
  parent?: Task;
  /** Subtask progress for main tasks. */
  progress?: { done: number; total: number } | null;
  view: ViewMode;
  onOpen?: (id: string) => void;
  /** Subtask checkbox toggle. */
  onToggleDone?: (task: Task) => void;
  dragging?: boolean;
  overlay?: boolean;
}

export const TaskCard = memo(forwardRef<HTMLDivElement, TaskCardProps>(function TaskCard(
  { task, category, parent, progress, view, onOpen, onToggleDone, dragging, overlay, className, onKeyDown, ...rest },
  ref,
) {
  const isSub = task.parentId !== null;
  const done = task.status === "completed";
  const today = todayISO();
  const overdue = isOverdue(task, today);
  const dueToday = isDueToday(task, today);

  const handleKey = (e: React.KeyboardEvent<HTMLDivElement>) => {
    onKeyDown?.(e);
    if (e.key === "Enter" && !e.defaultPrevented && e.target === e.currentTarget) onOpen?.(task.id);
  };

  const shared = {
    ref,
    role: "button" as const,
    tabIndex: 0,
    onClick: () => onOpen?.(task.id),
    onKeyDown: handleKey,
    "aria-label": `${isSub ? "Subtask" : "Task"}: ${task.title}`,
    "data-variant": isSub ? "subtask" : "main",
    ...rest,
  };

  if (isSub) {
    return (
      <div
        {...shared}
        className={cn(
          "group flex cursor-grab touch-manipulation select-none items-start gap-2 rounded-lg border border-dashed border-slate-300 bg-slate-50/70 px-2.5 py-2 outline-none transition-colors hover:border-indigo-300 hover:bg-white focus-visible:ring-2 focus-visible:ring-indigo-500",
          dragging && "opacity-40",
          overlay && "cursor-grabbing rotate-1 border-solid bg-white shadow-lg",
          className,
        )}
      >
        <button
          type="button"
          role="checkbox"
          aria-checked={done}
          aria-label={done ? "Mark subtask not done" : "Mark subtask done"}
          onPointerDown={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()} // keep the checkbox from starting a drag
          onTouchStart={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onToggleDone?.(task);
          }}
          className={cn(
            "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border text-[10px] leading-none transition-colors focus-visible:outline-2 focus-visible:outline-indigo-500",
            done ? "border-emerald-500 bg-emerald-500 text-white" : "border-slate-400 bg-white hover:border-indigo-500",
          )}
        >
          {done && <span aria-hidden>✓</span>}
        </button>
        <div className="min-w-0 flex-1">
          <p className={cn("text-xs font-medium leading-snug text-slate-700", done && "text-slate-400 line-through")}>{task.title}</p>
          <div className="mt-1 flex flex-wrap items-center gap-1">
            {parent && (
              <Badge tone="indigo" className="max-w-[10rem] text-[10px]" title={`Subtask of ${parent.title}`}>
                <span aria-hidden>↳</span> {parent.title}
              </Badge>
            )}
            {view === "category" && <Badge tone={STATUS_TONE[task.status]} className="text-[10px]">{STATUS_LABELS[task.status]}</Badge>}
            {task.dueDate && (
              <span className={cn("text-[10px]", overdue ? "font-semibold text-rose-600" : dueToday ? "font-semibold text-amber-600" : "text-slate-400")}>{dueLabel(task.dueDate, today)}</span>
            )}
          </div>
        </div>
      </div>
    );
  }

  const pr = PRIORITY[task.priority];
  return (
    <div
      {...shared}
      className={cn(
        "cursor-grab touch-manipulation select-none rounded-xl border border-slate-200 bg-white p-3 shadow-sm outline-none transition-shadow hover:shadow-md focus-visible:ring-2 focus-visible:ring-indigo-500",
        overdue && "border-l-4 border-l-rose-400",
        dueToday && "border-l-4 border-l-amber-400",
        dragging && "opacity-40",
        overlay && "cursor-grabbing rotate-2 shadow-xl",
        className,
      )}
    >
      <p className={cn("text-sm font-semibold leading-snug text-slate-900", done && "text-slate-500 line-through")}>{task.title}</p>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {view === "category" ? (
          <Badge tone={STATUS_TONE[task.status]}>{STATUS_LABELS[task.status as Status]}</Badge>
        ) : (
          category && (
            <Badge colorClass={CATEGORY_COLORS[category.color]?.chip ?? CATEGORY_COLORS.slate.chip}>
              <span className={cn("h-1.5 w-1.5 rounded-full", CATEGORY_COLORS[category.color]?.dot ?? CATEGORY_COLORS.slate.dot)} aria-hidden />
              {category.name}
            </Badge>
          )
        )}
        <span className="inline-flex items-center gap-1 text-[11px] text-slate-500" title={`${pr.label} priority`}>
          <span className={cn("h-2 w-2 rounded-full", pr.cls)} aria-hidden />
          {pr.label}
        </span>
      </div>
      {(task.dueDate || progress) && (
        <div className="mt-2 flex items-center justify-between gap-2 text-[11px]">
          {task.dueDate ? (
            <span className={cn("inline-flex items-center gap-1", overdue ? "font-semibold text-rose-600" : dueToday ? "font-semibold text-amber-700" : "text-slate-500")}>
              <span aria-hidden>📅</span>
              {dueLabel(task.dueDate, today)}
              {overdue && <span className="rounded bg-rose-50 px-1 text-[10px] uppercase tracking-wide">Overdue</span>}
              {dueToday && <span className="rounded bg-amber-50 px-1 text-[10px] uppercase tracking-wide">Due today</span>}
            </span>
          ) : (
            <span />
          )}
          {progress && (
            <span className="inline-flex items-center gap-1.5 text-slate-500" title={`${progress.done} of ${progress.total} subtasks done`}>
              <span className="h-1 w-10 overflow-hidden rounded-full bg-slate-200" aria-hidden>
                <span className="block h-full bg-emerald-500" style={{ width: `${(progress.done / progress.total) * 100}%` }} />
              </span>
              {progress.done}/{progress.total}
            </span>
          )}
        </div>
      )}
    </div>
  );
}));
