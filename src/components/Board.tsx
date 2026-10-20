"use client";

import { useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button, useToast } from "@/components/ui";
import { Column } from "./Column";
import { TaskCard } from "./TaskCard";
import { matchesQuery, subtaskProgress } from "@/lib/taskUtils";
import { uid, useStore } from "@/lib/store";
import { CATEGORY_COLORS, STATUSES, STATUS_LABELS, type Status, type Task } from "@/lib/types";

const STATUS_DOT: Record<Status, string> = {
  created: "bg-slate-400",
  planned: "bg-sky-500",
  in_progress: "bg-amber-500",
  completed: "bg-emerald-500",
  archived: "bg-slate-300",
};
const COL = "col:";

export interface BoardProps {
  onOpenTask: (id: string) => void;
  /** Create a task in the given column (status in Status view, categoryId in Category view). */
  onAddTask: (target: { status?: Status; categoryId?: string }) => void;
}

interface ColumnDef {
  key: string;
  title: string;
  dot: string;
  target: { status?: Status; categoryId?: string };
  tasks: Task[];
}

function SortableCard({ task, children }: { task: Task; children: (p: React.ComponentProps<typeof TaskCard>) => React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });
  return (
    <>
      {children({
        task,
        ref: setNodeRef,
        style: { transform: CSS.Transform.toString(transform), transition },
        dragging: isDragging,
        ...attributes,
        ...listeners,
      } as React.ComponentProps<typeof TaskCard>)}
    </>
  );
}

export function Board({ onOpenTask, onAddTask }: BoardProps) {
  const { data, dispatch, dispatchUndoable, undo } = useStore();
  const { toast } = useToast();
  const { view, query, showArchived } = data.prefs;
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates, keyboardCodes: { start: ["Space"], cancel: ["Escape"], end: ["Space"] } }),
  );

  const byId = useMemo(() => new Map(data.tasks.map((t) => [t.id, t])), [data.tasks]);
  const catById = useMemo(() => new Map(data.categories.map((c) => [c.id, c])), [data.categories]);

  const columns = useMemo<ColumnDef[]>(() => {
    const visible = data.tasks
      .filter((t) => matchesQuery(t, query) && (showArchived || t.status !== "archived"))
      .sort((a, b) => a.order - b.order);
    if (view === "status") {
      return STATUSES.filter((s) => s !== "archived" || showArchived).map((s) => ({
        key: s,
        title: STATUS_LABELS[s],
        dot: STATUS_DOT[s],
        target: { status: s },
        tasks: visible.filter((t) => t.status === s),
      }));
    }
    return data.categories.map((c) => ({
      key: c.id,
      title: c.name,
      dot: CATEGORY_COLORS[c.color]?.dot ?? CATEGORY_COLORS.slate.dot,
      target: { categoryId: c.id },
      tasks: visible.filter((t) => t.categoryId === c.id),
    }));
  }, [data.tasks, data.categories, view, query, showArchived]);

  const columnOf = (t: Task) => (view === "status" ? t.status : t.categoryId);
  const active = activeId ? byId.get(activeId) : undefined;

  const onDragStart = (e: DragStartEvent) => setActiveId(String(e.active.id));

  const onDragEnd = (e: DragEndEvent) => {
    setActiveId(null);
    const { active: a, over } = e;
    if (!over) return;
    const moving = byId.get(String(a.id));
    if (!moving) return;
    const overId = String(over.id);

    let colKey: string;
    let beforeId: string | null = null;
    if (overId.startsWith(COL)) {
      colKey = overId.slice(COL.length);
    } else {
      const overTask = byId.get(overId);
      if (!overTask) return;
      if (overTask.id === moving.id) return;
      colKey = columnOf(overTask);
      const list = columns.find((c) => c.key === colKey)?.tasks ?? [];
      const overIdx = list.findIndex((t) => t.id === overTask.id);
      const fromIdx = list.findIndex((t) => t.id === moving.id);
      // moving down inside the same column lands after the hovered card
      beforeId = fromIdx !== -1 && fromIdx < overIdx ? (list[overIdx + 1]?.id ?? null) : overTask.id;
    }

    const col = columns.find((c) => c.key === colKey);
    if (!col) return;
    const changed = columnOf(moving) !== colKey;
    const action = { type: "moveTask" as const, id: moving.id, beforeId, ...col.target };
    if (changed) {
      dispatchUndoable(action);
      toast({ message: `Moved to ${col.title}`, action: { label: "Undo", onClick: undo } });
    } else {
      dispatch(action);
    }
  };

  const toggleDone = (t: Task) =>
    dispatch({ type: "updateTask", id: t.id, patch: { status: t.status === "completed" ? "created" : "completed" } });

  const addCategory = () => {
    const colors = Object.keys(CATEGORY_COLORS);
    dispatch({ type: "addCategory", category: { id: uid(), name: "New category", color: colors[data.categories.length % colors.length] } });
  };

  const renderCard = (t: Task, extra?: React.ComponentProps<typeof TaskCard>) => (
    <TaskCard
      task={t}
      view={view}
      category={catById.get(t.categoryId)}
      parent={t.parentId ? byId.get(t.parentId) : undefined}
      progress={t.parentId ? null : subtaskProgress(t.id, data.tasks)}
      onOpen={onOpenTask}
      onToggleDone={toggleDone}
      {...extra}
    />
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="mx-auto flex w-full max-w-[1600px] items-center justify-between gap-3 px-4 pb-2 pt-4 sm:px-6">
        <p className="text-sm text-slate-500">
          {view === "status" ? "Drag cards to change their status." : "Drag cards to change their category."}
        </p>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={showArchived}
            onChange={(e) => dispatch({ type: "setPrefs", patch: { showArchived: e.target.checked } })}
            className="h-4 w-4 rounded border-slate-300 accent-indigo-600"
          />
          Show archived
        </label>
      </div>
      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={onDragStart} onDragEnd={onDragEnd} onDragCancel={() => setActiveId(null)}>
        <div className="flex min-h-0 flex-1 snap-x gap-4 overflow-x-auto px-4 pb-6 pt-2 sm:px-6" style={{ minHeight: "60vh" }}>
          {columns.map((c) => (
            <Column
              key={c.key}
              id={COL + c.key}
              title={c.title}
              dotClass={c.dot}
              taskIds={c.tasks.map((t) => t.id)}
              onAdd={() => onAddTask(c.target)}
              emptyText={query ? "No matching cards" : "Drop a card here"}
            >
              {c.tasks.map((t) => (
                <SortableCard key={t.id} task={t}>
                  {(p) => renderCard(t, p)}
                </SortableCard>
              ))}
            </Column>
          ))}
          {view === "category" && (
            // EXTENSION POINT: replace with the category manager entry point.
            <div className="w-[18rem] shrink-0 sm:w-72">
              <Button variant="secondary" className="w-full border-dashed" onClick={addCategory}>
                <span aria-hidden>+</span> New category
              </Button>
            </div>
          )}
        </div>
        <DragOverlay>{active ? renderCard(active, { overlay: true } as React.ComponentProps<typeof TaskCard>) : null}</DragOverlay>
      </DndContext>
    </div>
  );
}
