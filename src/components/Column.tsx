"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Button, EmptyState, IconButton, cn } from "@/components/ui";

export interface ColumnProps {
  /** Droppable id; Board uses `col:<key>`. */
  id: string;
  title: string;
  /** Tailwind bg class for the colored dot. */
  dotClass?: string;
  taskIds: string[];
  onAdd?: () => void;
  emptyText?: string;
  children: React.ReactNode;
}

export function Column({ id, title, dotClass = "bg-slate-400", taskIds, onAdd, emptyText = "Drop a card here", children }: ColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id });
  const headingId = `${id}-heading`;
  return (
    <section
      aria-labelledby={headingId}
      className="flex max-h-full w-[18rem] shrink-0 snap-start flex-col rounded-2xl bg-slate-100/80 ring-1 ring-slate-200/70 sm:w-72"
    >
      <div className="flex items-center gap-2 px-3 pb-2 pt-3">
        <span className={cn("h-2.5 w-2.5 rounded-full", dotClass)} aria-hidden />
        <h2 id={headingId} className="flex-1 truncate text-sm font-semibold text-slate-800">{title}</h2>
        <span className="rounded-full bg-white px-2 py-0.5 text-xs font-medium text-slate-500" aria-label={`${taskIds.length} cards`}>
          {taskIds.length}
        </span>
        {onAdd && (
          <IconButton label={`Add task to ${title}`} size="sm" onClick={onAdd}>
            <span aria-hidden className="text-base leading-none">+</span>
          </IconButton>
        )}
      </div>
      <div
        ref={setNodeRef}
        className={cn("flex min-h-24 flex-1 flex-col gap-2 overflow-y-auto px-2 pb-2 transition-colors", isOver && "rounded-xl bg-indigo-50/70")}
      >
        <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
          {taskIds.length === 0 ? <EmptyState compact title={emptyText} icon="⇣" className="bg-white/50" /> : children}
        </SortableContext>
      </div>
      {onAdd && (
        <div className="px-2 pb-2">
          <Button variant="ghost" size="sm" className="w-full justify-start text-slate-500" onClick={onAdd}>
            <span aria-hidden>+</span> Add task
          </Button>
        </div>
      )}
    </section>
  );
}
