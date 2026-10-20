"use client";

import { useEffect, useRef, useState } from "react";
import { Badge, Button, Drawer, EmptyState, IconButton, Modal, Select, TextArea, TextField, cn, useToast } from "@/components/ui";
import { Markdown, toggleChecklistLine } from "@/lib/markdown";
import { uid, useStore } from "@/lib/store";
import { useSpawnToast } from "./useSpawnToast";
import { dueLabel, formatDue, toggleDonePatch } from "@/lib/taskUtils";
import { REPEAT_LABELS, STATUSES, STATUS_LABELS, type Priority, type Repeat, type Status, type Task } from "@/lib/types";

export interface TaskDrawerProps {
  /** Id of the open task (from `?task=`), or null when closed. */
  taskId: string | null;
  onClose: () => void;
  /** Open another task (e.g. parent / subtask links). */
  onOpenTask?: (id: string) => void;
}

const PRIORITY_OPTIONS: { value: Priority; label: string }[] = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
];
const STATUS_OPTIONS = STATUSES.map((s) => ({ value: s, label: STATUS_LABELS[s] }));
const DEFAULT_TITLE = "New task";

export function TaskDrawer({ taskId, onClose, onOpenTask }: TaskDrawerProps) {
  const { data } = useStore();
  const task = taskId ? data.tasks.find((t) => t.id === taskId) : undefined;

  if (taskId && !task) {
    // Task vanished (deleted elsewhere / stale link): say so instead of crashing.
    return (
      <Drawer open onClose={onClose} title="Task not found">
        <EmptyState
          title="This task no longer exists"
          description="It may have been deleted."
          action={<Button onClick={onClose}>Back to board</Button>}
        />
      </Drawer>
    );
  }
  if (!task) return null;
  return <TaskEditor key={task.id} task={task} onClose={onClose} onOpenTask={onOpenTask} />;
}

function TaskEditor({ task, onClose, onOpenTask }: { task: Task; onClose: () => void; onOpenTask?: (id: string) => void }) {
  const { data, dispatch, dispatchUndoable, undo } = useStore();
  const { toast } = useToast();
  const [title, setTitle] = useState(task.title);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);
  const notesRef = useRef<HTMLTextAreaElement>(null);
  const [editingNotes, setEditingNotes] = useState(false);
  const showRendered = !editingNotes && task.notes.trim() !== ""; // empty notes go straight to the textarea
  useEffect(() => {
    if (editingNotes) notesRef.current?.focus();
  }, [editingNotes]);

  const isSub = task.parentId !== null;
  const parent = isSub ? data.tasks.find((t) => t.id === task.parentId) : undefined;
  const category = data.categories.find((c) => c.id === task.categoryId);
  const subtasks = data.tasks.filter((t) => t.parentId === task.id);
  const doneCount = subtasks.filter((t) => t.status === "completed").length;
  const announceSpawn = useSpawnToast();
  const patch = (p: Partial<Omit<Task, "id">>) => {
    if (p.status === "completed" && task.repeat) announceSpawn(dispatchUndoable({ type: "updateTask", id: task.id, patch: p }));
    else dispatch({ type: "updateTask", id: task.id, patch: p });
  };

  const commitTitle = (value: string) => {
    setTitle(value);
    if (value.trim()) patch({ title: value.trim() });
  };
  const blurTitle = () => {
    if (!title.trim()) {
      setTitle(DEFAULT_TITLE);
      patch({ title: DEFAULT_TITLE });
    }
  };

  const toggleSub = (sub: Task) => {
    const completing = sub.status !== "completed";
    dispatch({ type: "updateTask", id: sub.id, patch: toggleDonePatch(sub) });
    const remaining = subtasks.filter((s) => s.id !== sub.id && s.status !== "completed").length;
    if (completing && remaining === 0 && task.status !== "completed") {
      toast({
        message: "All subtasks done. Complete parent task?",
        action: { label: "Complete parent", onClick: () => patch({ status: "completed" }) },
      });
    }
  };

  const archive = () => {
    const id = dispatchUndoable({ type: "updateTask", id: task.id, patch: { status: "archived" } });
    const n = subtasks.filter((s) => s.status !== "archived").length;
    toast({ message: `Archived "${task.title}"${n ? ` and ${n} subtask${n > 1 ? "s" : ""}` : ""}`, action: { label: "Undo", onClick: () => undo(id) } });
    onClose();
  };

  const remove = () => {
    setConfirmDelete(false);
    const id = dispatchUndoable({ type: "deleteTask", id: task.id });
    toast({
      message: subtasks.length ? `Deleted "${task.title}" and ${subtasks.length} subtask${subtasks.length > 1 ? "s" : ""}` : `Deleted "${task.title}"`,
      action: { label: "Undo", onClick: () => undo(id) },
    });
    onClose();
  };

  const crumb = "rounded px-1 hover:bg-slate-100 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white focus-visible:outline-2 focus-visible:outline-indigo-500 dark:focus-visible:outline-indigo-400";
  const header = (
    <nav aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-x-1 text-xs text-slate-500 dark:text-slate-400">
        <li>
          <button type="button" className={crumb} onClick={onClose}>Board</button>
        </li>
        <li aria-hidden>›</li>
        <li className="truncate">{category?.name ?? "No category"}</li>
        {isSub && (
          <>
            <li aria-hidden>›</li>
            <li className="min-w-0 truncate">
              {parent ? (
                <button type="button" className={cn(crumb, "max-w-[9rem] truncate align-bottom")} onClick={() => onOpenTask?.(parent.id)}>
                  {parent.title}
                </button>
              ) : (
                "Parent"
              )}
            </li>
          </>
        )}
        <li aria-hidden>›</li>
        <li aria-current="page" className="max-w-[10rem] truncate font-medium text-slate-900 dark:text-slate-100">{title || DEFAULT_TITLE}</li>
      </ol>
    </nav>
  );

  const footer = (
    <div className="flex items-center justify-between gap-2">
      <Button variant="secondary" size="sm" onClick={archive} disabled={task.status === "archived"}>
        {task.status === "archived" ? "Archived" : "Archive"}
      </Button>
      <Button variant="danger" size="sm" onClick={() => setConfirmDelete(true)}>Delete</Button>
    </div>
  );

  return (
    <>
      <Drawer open onClose={confirmDelete ? () => {} : onClose} title={task.title || DEFAULT_TITLE} header={header} footer={footer}>
        <div className="flex flex-col gap-4">
          {isSub && parent && (
            <Badge tone="indigo" className="self-start">
              <span aria-hidden>↳</span> Subtask of{" "}
              <button type="button" className="underline" onClick={() => onOpenTask?.(parent.id)}>{parent.title}</button>
            </Badge>
          )}
          <TextField
            ref={titleRef}
            label="Title"
            value={title}
            onChange={(e) => commitTitle(e.target.value)}
            onBlur={blurTitle}
            onFocus={(e) => title === DEFAULT_TITLE && e.currentTarget.select()}
            data-autofocus
            autoFocus={!task.title.trim() || task.title === DEFAULT_TITLE}
            className="text-base font-semibold"
            error={title.trim() ? undefined : "A title is required"}
          />
          {showRendered ? (
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span id="notes-label" className="text-xs font-medium text-slate-600 dark:text-slate-300">Notes</span>
                <Button size="sm" variant="ghost" onClick={() => setEditingNotes(true)}>Edit</Button>
              </div>
              <div
                tabIndex={0}
                aria-labelledby="notes-label"
                title="Click to edit"
                onClick={(e) => !(e.target as HTMLElement).closest("a,button") && setEditingNotes(true)}
                onKeyDown={(e) => e.key === "Enter" && e.target === e.currentTarget && setEditingNotes(true)}
                className="min-h-24 cursor-text rounded-lg bg-white dark:bg-slate-800 px-3 py-2 ring-1 ring-inset ring-slate-300 dark:ring-slate-600 hover:ring-slate-400 dark:hover:ring-slate-500 focus-visible:outline-2 focus-visible:outline-indigo-500 dark:focus-visible:outline-indigo-400"
              >
                <Markdown source={task.notes} onToggle={(line) => patch({ notes: toggleChecklistLine(task.notes, line) })} />
              </div>
            </div>
          ) : (
            <TextArea
              ref={notesRef}
              label="Notes"
              value={task.notes}
              onChange={(e) => patch({ notes: e.target.value })}
              onFocus={() => setEditingNotes(true)} // keeps the textarea up while typing the first characters
              onBlur={() => setEditingNotes(false)}
              placeholder="Add details…"
              hint="Supports **bold**, *italic*, lists, - [ ] checklists, links"
            />
          )}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Select
              label="Category"
              value={task.categoryId}
              onChange={(e) => patch({ categoryId: e.target.value })}
              options={data.categories.map((c) => ({ value: c.id, label: c.name }))}
              disabled={isSub}
              hint={isSub ? "Follows the parent task" : undefined}
            />
            <Select label="Status" value={task.status} onChange={(e) => patch({ status: e.target.value as Status })} options={STATUS_OPTIONS} />
            <Select label="Priority" value={task.priority} onChange={(e) => patch({ priority: e.target.value as Priority })} options={PRIORITY_OPTIONS} />
            <TextField label="Due date" type="date" hint={task.dueDate && dueLabel(task.dueDate) !== formatDue(task.dueDate) ? dueLabel(task.dueDate) : undefined} value={task.dueDate ?? ""} onChange={(e) => patch(e.target.value ? { dueDate: e.target.value } : { dueDate: null, repeat: undefined })} />
            {!isSub && (
              <Select
                label="Repeat"
                value={task.dueDate ? (task.repeat ?? "") : ""}
                onChange={(e) => patch({ repeat: (e.target.value || undefined) as Repeat | undefined })}
                options={[{ value: "", label: "None" }, ...(Object.keys(REPEAT_LABELS) as Repeat[]).map((r) => ({ value: r, label: REPEAT_LABELS[r] }))]}
                disabled={!task.dueDate}
                hint={task.dueDate ? undefined : "Set a due date to repeat"}
              />
            )}
          </div>

          {!isSub && (
            <Subtasks
              parent={task}
              subtasks={subtasks}
              doneCount={doneCount}
              onToggle={toggleSub}
              onOpen={(id) => onOpenTask?.(id)}
            />
          )}
        </div>
      </Drawer>
      <Modal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="Delete this task?"
        description={
          subtasks.length
            ? `"${task.title}" and its ${subtasks.length} subtask${subtasks.length > 1 ? "s" : ""} will be deleted. You can undo right after.`
            : `"${task.title}" will be deleted. You can undo right after.`
        }
        footer={
          <>
            <Button onClick={() => setConfirmDelete(false)}>Cancel</Button>
            <Button variant="danger" onClick={remove}>Delete</Button>
          </>
        }
      >
        <span className="sr-only">Confirm deletion</span>
      </Modal>
    </>
  );
}

function Subtasks({
  parent,
  subtasks,
  doneCount,
  onToggle,
  onOpen,
}: {
  parent: Task;
  subtasks: Task[];
  doneCount: number;
  onToggle: (t: Task) => void;
  onOpen: (id: string) => void;
}) {
  const { dispatch, dispatchUndoable, undo } = useStore();
  const { toast } = useToast();
  const [draft, setDraft] = useState("");
  const pct = subtasks.length ? Math.round((doneCount / subtasks.length) * 100) : 0;

  const add = () => {
    const t = draft.trim();
    if (!t) return;
    dispatch({ type: "addTask", task: { id: uid(), title: t, categoryId: parent.categoryId, status: "created", parentId: parent.id } });
    setDraft("");
  };
  const remove = (s: Task) => {
    const id = dispatchUndoable({ type: "deleteTask", id: s.id });
    toast({ message: `Deleted subtask "${s.title}"`, action: { label: "Undo", onClick: () => undo(id) } });
  };

  return (
    <section aria-labelledby="subtasks-h" className="flex flex-col gap-2 border-t border-slate-100 dark:border-slate-800 pt-4">
      <div className="flex items-center justify-between">
        <h3 id="subtasks-h" className="text-sm font-semibold text-slate-900 dark:text-slate-100">Subtasks</h3>
        {subtasks.length > 0 && <span className="text-xs text-slate-500 dark:text-slate-400">{doneCount}/{subtasks.length} done</span>}
      </div>
      {subtasks.length > 0 && (
        <div
          role="progressbar"
          aria-label="Subtask progress"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={pct}
          className="h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700"
        >
          <div className="h-full bg-emerald-500 transition-all" style={{ width: `${pct}%` }} />
        </div>
      )}
      <ul className="flex flex-col gap-1.5">
        {subtasks.map((s) => (
          <SubtaskRow
            key={s.id}
            sub={s}
            onToggle={() => onToggle(s)}
            onRename={(title) => dispatch({ type: "updateTask", id: s.id, patch: { title } })}
            onOpen={() => onOpen(s.id)}
            onDelete={() => remove(s)}
          />
        ))}
      </ul>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          add();
        }}
        className="flex items-end gap-2"
      >
        <div className="flex-1">
          <TextField label="Add subtask" hideLabel placeholder="Add subtask and press Enter" value={draft} onChange={(e) => setDraft(e.target.value)} />
        </div>
        <Button type="submit" size="md" disabled={!draft.trim()}>Add</Button>
      </form>
    </section>
  );
}

function SubtaskRow({
  sub,
  onToggle,
  onRename,
  onOpen,
  onDelete,
}: {
  sub: Task;
  onToggle: () => void;
  onRename: (title: string) => void;
  onOpen: () => void;
  onDelete: () => void;
}) {
  const [value, setValue] = useState(sub.title);
  const done = sub.status === "completed";
  return (
    <li className="flex items-center gap-2 rounded-lg border border-dashed border-slate-300 dark:border-slate-600 bg-slate-50/70 dark:bg-slate-800 px-2 py-1">
      <button
        type="button"
        role="checkbox"
        aria-checked={done}
        aria-label={done ? `Mark "${sub.title}" not done` : `Mark "${sub.title}" done`}
        onClick={onToggle}
        className={cn(
          "flex h-4 w-4 shrink-0 items-center justify-center rounded border text-[10px] leading-none focus-visible:outline-2 focus-visible:outline-indigo-500 dark:focus-visible:outline-indigo-400",
          done ? "border-emerald-500 bg-emerald-500 text-white" : "border-slate-400 dark:border-slate-500 bg-white dark:bg-slate-800 hover:border-indigo-500 dark:hover:border-indigo-400",
        )}
      >
        {done && <span aria-hidden>✓</span>}
      </button>
      <input
        aria-label={`Rename subtask ${sub.title}`}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={() => {
          const t = value.trim();
          if (t && t !== sub.title) onRename(t);
          else setValue(sub.title);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
          if (e.key === "Escape" && value !== sub.title) {
            e.stopPropagation();
            setValue(sub.title);
          }
        }}
        className={cn(
          "min-w-0 flex-1 rounded bg-transparent px-1 py-1 text-sm focus:bg-white dark:focus:bg-slate-800 focus:outline-2 focus:outline-indigo-500 dark:focus:outline-indigo-400",
          done ? "text-slate-400 line-through" : "text-slate-800 dark:text-slate-100",
        )}
      />
      <IconButton size="sm" label={`Open subtask ${sub.title}`} onClick={onOpen}>
        <span aria-hidden>↗</span>
      </IconButton>
      <IconButton size="sm" label={`Delete subtask ${sub.title}`} onClick={onDelete}>
        <span aria-hidden>🗑</span>
      </IconButton>
    </li>
  );
}
