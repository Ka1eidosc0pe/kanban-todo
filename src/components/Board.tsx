"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCorners,
  type CollisionDetection,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, horizontalListSortingStrategy, sortableKeyboardCoordinates, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Badge, Button, Modal, Select, useToast } from "@/components/ui";
import { AgendaView } from "./AgendaView";
import { BulkBar } from "./BulkBar";
import { CategoryManager, type CategoryDialog } from "./CategoryManager";
import { Column, type ColumnProps } from "./Column";
import { FilterPopover } from "./FilterPopover";
import { FirstRunEmpty } from "./FirstRunEmpty";
import { ProgressStrip } from "./ProgressStrip";
import { TaskCard } from "./TaskCard";
import { useSpawnToast } from "./useSpawnToast";
import { DUE_FILTER_LABELS, QUICK_FILTER_LABELS, SORT_LABELS, activeFilterCount, matchesFilters, matchesQuery, matchesQuick, sortTasks, subtaskProgressMap, toggleDonePatch, type QuickFilter } from "@/lib/taskUtils";
import { uid, useStore } from "@/lib/store";
import { CATEGORY_COLORS, DEFAULT_FILTERS, STATUSES, STATUS_LABELS, type BoardView, type SortMode, type Status, type Task } from "@/lib/types";

const STATUS_DOT: Record<Status, string> = {
  created: "bg-slate-400 dark:bg-slate-500",
  planned: "bg-sky-500",
  in_progress: "bg-amber-500",
  completed: "bg-emerald-500",
  archived: "bg-slate-300 dark:bg-slate-600",
};
const COL = "col:";
const CATCOL = "catcol:"; // sortable id of a category column (its header is the drag handle)

// Column drags only consider other columns; card drags ignore the column sortables.
const collision: CollisionDetection = (args) => {
  const isCol = String(args.active.id).startsWith(CATCOL);
  return closestCorners({ ...args, droppableContainers: args.droppableContainers.filter((d) => String(d.id).startsWith(CATCOL) === isCol) });
};

export interface BoardProps {
  onOpenTask: (id: string) => void;
  /** Create a task in the given column (status in Status view, categoryId in Category view). */
  onAddTask: (target: { status?: Status; categoryId?: string }) => void;
  /** Quick filter from the "welcome back" strip (not persisted). */
  quickFilter?: QuickFilter | null;
  onQuickFilterChange?: (f: QuickFilter | null) => void;
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
  const t = CSS.Transform.toString(transform);
  const style = useMemo(() => ({ transform: t, transition }), [t, transition]); // stable so memoized cards can skip renders
  return (
    <>
      {children({
        task,
        ref: setNodeRef,
        style,
        dragging: isDragging,
        ...attributes,
        ...listeners,
      } as React.ComponentProps<typeof TaskCard>)}
    </>
  );
}

function SortableColumn({ sortKey, sortable, ...props }: ColumnProps & { sortKey: string; sortable: boolean }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: CATCOL + sortKey, disabled: !sortable });
  return (
    <Column
      {...props}
      {...(sortable
        ? {
            sortableRef: setNodeRef,
            sortableStyle: { transform: CSS.Translate.toString(transform), transition },
            handleProps: { ...attributes, ...listeners } as React.HTMLAttributes<HTMLButtonElement>,
            dragging: isDragging,
          }
        : {})}
    />
  );
}

export function Board({ onOpenTask, onAddTask, quickFilter = null, onQuickFilterChange }: BoardProps) {
  const { data, dispatch, dispatchUndoable, undo } = useStore();
  const { toast } = useToast();
  const announceSpawn = useSpawnToast();
  const { view, query, showArchived, filters, sort, collapsed, wipLimit } = data.prefs;
  const [activeId, setActiveId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [catDialog, setCatDialog] = useState<CategoryDialog>(null);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 6 } }), // long-press to drag; swiping scrolls
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates, keyboardCodes: { start: ["Space"], cancel: ["Escape"], end: ["Space"] } }),
  );

  const byId = useMemo(() => new Map(data.tasks.map((t) => [t.id, t])), [data.tasks]);
  const progressById = useMemo(() => subtaskProgressMap(data.tasks), [data.tasks]);
  const catById = useMemo(() => new Map(data.categories.map((c) => [c.id, c])), [data.categories]);

  const agenda = view === "agenda";
  const visible = useMemo(
    () =>
      sortTasks(
        data.tasks
          .filter((t) => matchesQuery(t, query) && matchesQuick(t, quickFilter) && matchesFilters(t, filters, view) && (showArchived || agenda || t.status !== "archived"))
          .sort((a, b) => a.order - b.order),
        sort,
      ),
    [data.tasks, view, agenda, query, quickFilter, showArchived, filters, sort],
  );

  const columns = useMemo<ColumnDef[]>(() => {
    if (agenda) return [];
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
  }, [data.categories, view, agenda, visible, showArchived]);

  // selection only counts cards that are still on screen (filters, deletes and undo can change that)
  const selIds = useMemo(() => {
    const visible = new Set(columns.flatMap((c) => c.tasks.map((t) => t.id)));
    return [...selected].filter((id) => visible.has(id));
  }, [selected, columns]);
  const handleOpen = useCallback(
    (id: string, mods?: { shiftKey: boolean; metaKey: boolean; ctrlKey: boolean }) => {
      if (mods && (mods.shiftKey || mods.metaKey || mods.ctrlKey)) {
        setSelected((s) => {
          const n = new Set(s);
          if (!n.delete(id)) n.add(id);
          return n;
        });
      } else onOpenTask(id);
    },
    [onOpenTask],
  );
  const clearSelection = useCallback(() => setSelected(new Set()), []);

  // Esc clears the selection unless something else (drag, dialog, menu, text field) owns it
  const hasSel = selIds.length > 0;
  useEffect(() => {
    if (!hasSel || activeId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || e.defaultPrevented) return;
      const el = e.target as HTMLElement | null;
      if (el && (el.isContentEditable || /^(INPUT|TEXTAREA)$/.test(el.tagName))) return;
      if (document.querySelector('[aria-modal="true"],[role="menu"],[data-popover]')) return;
      clearSelection();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [hasSel, activeId, clearSelection]);

  const undoToast = (message: string, id: number) => toast({ message, action: { label: "Undo", onClick: () => undo(id) } });
  const plural = (n: number) => `${n} task${n === 1 ? "" : "s"}`;
  const bulkStatus = (status: Status) => {
    const id = dispatchUndoable({ type: "bulkUpdate", ids: selIds, patch: { status } });
    undoToast(`Moved ${plural(selIds.length)} to ${STATUS_LABELS[status]}`, id);
    announceSpawn(id);
    clearSelection();
  };
  const bulkCategory = (categoryId: string) => {
    const n = selIds.filter((i) => !byId.get(i)?.parentId).length; // subtasks follow their parent
    if (n === 0) return toast("Subtasks follow their parent's category");
    const id = dispatchUndoable({ type: "bulkUpdate", ids: selIds, patch: { categoryId } });
    undoToast(`Moved ${plural(n)} to ${catById.get(categoryId)?.name ?? "category"}`, id);
    clearSelection();
  };
  const bulkArchive = () => bulkStatus("archived");
  const deleteCount = useMemo(() => {
    const ids = new Set(selIds);
    return data.tasks.filter((t) => ids.has(t.id) || (t.parentId && ids.has(t.parentId))).length;
  }, [selIds, data.tasks]);
  const doBulkDelete = () => {
    const id = dispatchUndoable({ type: "bulkDelete", ids: selIds });
    undoToast(`Deleted ${plural(deleteCount)}`, id);
    setConfirmDelete(false);
    clearSelection();
  };

  const columnOf = (t: Task) => (view === "status" ? t.status : t.categoryId);
  const active = activeId ? byId.get(activeId) : undefined;

  const onDragStart = (e: DragStartEvent) => setActiveId(String(e.active.id));

  const onDragEnd = (e: DragEndEvent) => {
    setActiveId(null);
    const { active: a, over } = e;
    if (!over) return;
    if (String(a.id).startsWith(CATCOL)) {
      // category column reorder
      const ids = data.categories.map((c) => c.id);
      const from = ids.indexOf(String(a.id).slice(CATCOL.length));
      const to = ids.indexOf(String(over.id).slice(CATCOL.length));
      if (from === -1 || to === -1 || from === to) return;
      const id = dispatchUndoable({ type: "reorderCategories", ids: arrayMove(ids, from, to) });
      toast({ message: "Categories reordered", action: { label: "Undo", onClick: () => undo(id) } });
      return;
    }
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
      if (sort !== "manual") {
        // sorted display: no reordering within a column; cross-column drops just append
        if (colKey === columnOf(moving)) return;
      } else {
        const list = columns.find((c) => c.key === colKey)?.tasks ?? [];
        const overIdx = list.findIndex((t) => t.id === overTask.id);
        const fromIdx = list.findIndex((t) => t.id === moving.id);
        // moving down inside the same column lands after the hovered card
        beforeId = fromIdx !== -1 && fromIdx < overIdx ? (list[overIdx + 1]?.id ?? null) : overTask.id;
      }
    }

    const col = columns.find((c) => c.key === colKey);
    if (!col) return;
    const changed = columnOf(moving) !== colKey;
    if (!changed && sort !== "manual") return;
    if (changed && view === "category" && moving.parentId) {
      toast("Subtasks follow their parent's category");
      return;
    }
    const action = { type: "moveTask" as const, id: moving.id, beforeId, ...col.target };
    if (changed) {
      const id = dispatchUndoable(action);
      const n = col.target.status === "archived" && !moving.parentId ? data.tasks.filter((t) => t.parentId === moving.id && t.status !== "archived").length : 0;
      toast({ message: `Moved to ${col.title}${n ? ` with ${n} subtask${n > 1 ? "s" : ""}` : ""}`, action: { label: "Undo", onClick: () => undo(id) } });
      announceSpawn(id);
    } else {
      dispatch(action);
    }
  };

  const toggleDone = useCallback(
    (t: Task) => {
      const action = { type: "updateTask" as const, id: t.id, patch: toggleDonePatch(t) };
      if (t.repeat && t.status !== "completed") announceSpawn(dispatchUndoable(action)); // may spawn the next occurrence: offer undo
      else dispatch(action);
    },
    [dispatch, dispatchUndoable, announceSpawn],
  );

  // Inline add: lands at the end of its column; not registered as "fresh", so it is never auto-discarded.
  const addInline = (target: { status?: Status; categoryId?: string }, title: string) => {
    const categoryId = target.categoryId ?? data.categories[0]?.id;
    if (!categoryId) return;
    const task = { id: uid(), title, categoryId, ...(target.status ? { status: target.status } : {}) };
    dispatch({ type: "addTask", task });
    // a brand-new task has default fields, so check it against the active search/filters
    const probe: Task = { notes: "", status: "created", priority: "medium", dueDate: null, parentId: null, order: 0, createdAt: 0, updatedAt: 0, ...task };
    if (!(matchesQuery(probe, query) && matchesQuick(probe, quickFilter) && matchesFilters(probe, filters, view))) {
      toast({ message: "Added — hidden by current filters", action: { label: "Clear filters", onClick: clearFilters } });
    }
  };

  const clearFilters = () => {
    onQuickFilterChange?.(null);
    dispatch({ type: "setPrefs", patch: { query: "", filters: DEFAULT_FILTERS } });
  };

  const quickAdd = (title: string) => {
    const categoryId = data.categories[0]?.id;
    if (categoryId) dispatch({ type: "addTask", task: { title, categoryId } });
  };
  const boardView: BoardView = agenda ? "status" : view; // collapsed state only exists for column views
  const collapsedKeys = collapsed[boardView];
  const toggleCollapsed = (key: string) =>
    dispatch({
      type: "setPrefs",
      patch: { collapsed: { ...collapsed, [boardView]: collapsedKeys.includes(key) ? collapsedKeys.filter((k) => k !== key) : [...collapsedKeys, key] } },
    });
  const filterCount = activeFilterCount(filters, view);
  const filtered = !!query.trim() || !!quickFilter || filterCount > 0;

  const renderCard = (t: Task, extra?: React.ComponentProps<typeof TaskCard>) => (
    <TaskCard
      task={t}
      view={view}
      category={catById.get(t.categoryId)}
      parent={t.parentId ? byId.get(t.parentId) : undefined}
      progress={t.parentId ? null : (progressById.get(t.id) ?? null)}
      selected={selected.has(t.id)}
      onOpen={handleOpen}
      onToggleDone={toggleDone}
      {...extra}
    />
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="mx-auto flex w-full max-w-[1600px] items-center justify-between gap-3 px-4 pb-2 pt-4 sm:px-6">
        <div className="flex flex-col gap-0.5">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {agenda ? "Open tasks, grouped by when they are due." : view === "status" ? "Drag cards to change their status." : "Drag cards to change their category."}
          {!agenda && sort !== "manual" && ` Sorted by ${SORT_LABELS[sort].toLowerCase()}: reordering within a column is off (switch to Manual to reorder).`}
        </p>
        <ProgressStrip />
        </div>
        <div className="flex items-center gap-3">
        {view === "category" && (
          <Button size="sm" onClick={() => setCatDialog({ kind: "manage" })}>Manage categories</Button>
        )}
        {!agenda && (
        <Select
          label="Sort"
          hideLabel
          value={sort}
          onChange={(e) => dispatch({ type: "setPrefs", patch: { sort: e.target.value as SortMode } })}
          options={(Object.keys(SORT_LABELS) as SortMode[]).map((m) => ({ value: m, label: `Sort: ${SORT_LABELS[m]}` }))}
          className="h-8 w-36 text-xs"
        />
        )}
        <FilterPopover view={view} categories={data.categories} filters={filters} onChange={(f) => dispatch({ type: "setPrefs", patch: { filters: f } })} />
        {!agenda && (
        <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
          <input
            type="checkbox"
            checked={showArchived}
            onChange={(e) => dispatch({ type: "setPrefs", patch: { showArchived: e.target.checked } })}
            className="h-4 w-4 rounded border-slate-300 dark:border-slate-600 accent-indigo-600 dark:accent-indigo-400"
          />
          Show archived
        </label>
        )}
        </div>
      </div>
      {filtered && (
        <div className="mx-auto flex w-full max-w-[1600px] flex-wrap items-center gap-2 px-4 pb-1 sm:px-6" role="status">
          <span className="text-sm text-slate-500 dark:text-slate-400">Filtered:</span>
          {quickFilter && <Badge tone="indigo">{QUICK_FILTER_LABELS[quickFilter]}</Badge>}
          {query.trim() && <Badge tone="indigo">“{query.trim()}”</Badge>}
          {filters.priorities.length > 0 && <Badge tone="indigo">Priority: {filters.priorities.join(", ")}</Badge>}
          {view !== "category" && filters.categoryIds.length > 0 && (
            <Badge tone="indigo">Category: {filters.categoryIds.map((id) => catById.get(id)?.name ?? "?").join(", ")}</Badge>
          )}
          {filters.due !== "any" && <Badge tone="indigo">{DUE_FILTER_LABELS[filters.due]}</Badge>}
          <Button
            size="sm"
            variant="ghost"
            onClick={clearFilters}
          >
            Clear filters
          </Button>
        </div>
      )}
      {data.tasks.length === 0 && (
        <FirstRunEmpty onAddTask={() => onAddTask({})} onQuickAdd={quickAdd} />
      )}
      {agenda ? (
        <AgendaView tasks={visible} byId={byId} catById={catById} filtered={filtered} onOpen={onOpenTask} onToggleDone={toggleDone} />
      ) : (
      <DndContext sensors={sensors} collisionDetection={collision} onDragStart={onDragStart} onDragEnd={onDragEnd} onDragCancel={() => setActiveId(null)}>
        <div className="flex min-h-0 flex-1 snap-x gap-4 overflow-x-auto px-4 pb-6 pt-2 sm:px-6" style={{ minHeight: "60vh" }}>
          <SortableContext items={columns.map((c) => CATCOL + c.key)} strategy={horizontalListSortingStrategy}>
          {columns.map((c) => (
            <SortableColumn
              key={c.key}
              sortKey={c.key}
              sortable={view === "category"}
              id={COL + c.key}
              title={c.title}
              dotClass={c.dot}
              taskIds={c.tasks.map((t) => t.id)}
              onAdd={() => onAddTask(c.target)}
              onQuickAdd={(title) => addInline(c.target, title)}
              reorderable={sort === "manual"}
              collapsed={collapsedKeys.includes(c.key)}
              onToggleCollapse={() => toggleCollapsed(c.key)}
              {...(c.key === "in_progress" && view === "status"
                ? {
                    wipLimit,
                    wipCount: data.tasks.filter((t) => t.status === "in_progress").length,
                    onWipChange: (n: number | null) => dispatch({ type: "setPrefs", patch: { wipLimit: n } }),
                  }
                : {})}
              emptyText={filtered ? "No matching cards" : "Drop a card here"}
            >
              {c.tasks.map((t) => (
                <SortableCard key={t.id} task={t}>
                  {(p) => renderCard(t, p)}
                </SortableCard>
              ))}
            </SortableColumn>
          ))}
          </SortableContext>
          {view === "category" && (
            <div className="w-[18rem] shrink-0 sm:w-72">
              <Button variant="secondary" className="w-full border-dashed" onClick={() => setCatDialog({ kind: "new" })}>
                <span aria-hidden>+</span> New category
              </Button>
            </div>
          )}
        </div>
        <DragOverlay>{active ? renderCard(active, { overlay: true } as React.ComponentProps<typeof TaskCard>) : null}</DragOverlay>
      </DndContext>
      )}
      {selIds.length > 0 && (
        <BulkBar
          count={selIds.length}
          categories={data.categories}
          onStatus={bulkStatus}
          onCategory={bulkCategory}
          onArchive={bulkArchive}
          onDelete={() => setConfirmDelete(true)}
          onClear={clearSelection}
        />
      )}
      <Modal
        open={confirmDelete && selIds.length > 0}
        onClose={() => setConfirmDelete(false)}
        title={`Delete ${plural(deleteCount)}?`}
        description={
          deleteCount > selIds.length
            ? `This includes ${deleteCount - selIds.length} subtask${deleteCount - selIds.length === 1 ? "" : "s"} of the selected tasks. You can undo this.`
            : "You can undo this."
        }
        footer={
          <>
            <Button onClick={() => setConfirmDelete(false)}>Cancel</Button>
            <Button variant="danger" onClick={doBulkDelete}>Delete</Button>
          </>
        }
      >
        <span className="sr-only">Confirm delete</span>
      </Modal>
      <CategoryManager dialog={catDialog} onDialogChange={setCatDialog} />
    </div>
  );
}
