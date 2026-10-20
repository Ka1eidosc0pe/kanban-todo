"use client";

import { useEffect, useRef, useState } from "react";
import { Button, IconButton, Modal, Select, TextField, cn, useToast } from "@/components/ui";
import { uid, useStore } from "@/lib/store";
import { CATEGORY_COLORS, type Category } from "@/lib/types";

export type CategoryDialog =
  | null
  | { kind: "new" }
  | { kind: "manage" }
  | { kind: "edit"; id: string }
  | { kind: "delete"; id: string };

export interface CategoryManagerProps {
  dialog: CategoryDialog;
  onDialogChange: (d: CategoryDialog) => void;
}

const COLOR_KEYS = Object.keys(CATEGORY_COLORS);

function ColorPicker({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  return (
    <fieldset className="flex flex-col gap-1">
      <legend className="text-xs font-medium text-slate-600 dark:text-slate-300">Colour</legend>
      <div role="radiogroup" aria-label="Colour" className="flex flex-wrap gap-2">
        {COLOR_KEYS.map((c) => (
          <button
            key={c}
            type="button"
            role="radio"
            aria-checked={value === c}
            aria-label={c}
            title={c}
            onClick={() => onChange(c)}
            className={cn(
              "h-7 w-7 rounded-full ring-offset-2 dark:ring-offset-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 dark:focus-visible:outline-indigo-400",
              CATEGORY_COLORS[c].dot,
              value === c ? "ring-2 ring-slate-900 dark:ring-slate-100" : "ring-0 hover:ring-2 hover:ring-slate-300 dark:hover:ring-slate-500",
            )}
          />
        ))}
      </div>
    </fieldset>
  );
}

function CategoryForm({ initial, onDone, onCancel }: { initial?: Category; onDone: () => void; onCancel: () => void }) {
  const { data, dispatch } = useStore();
  const [name, setName] = useState(initial?.name ?? "");
  const [color, setColor] = useState(initial?.color ?? COLOR_KEYS[data.categories.length % COLOR_KEYS.length]);
  const [error, setError] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return setError("Give the category a name.");
    if (data.categories.some((c) => c.id !== initial?.id && c.name.toLowerCase() === trimmed.toLowerCase()))
      return setError("A category with this name already exists.");
    if (initial) dispatch({ type: "updateCategory", id: initial.id, patch: { name: trimmed, color } });
    else dispatch({ type: "addCategory", category: { id: uid(), name: trimmed, color } });
    onDone();
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <TextField
        label="Name"
        value={name}
        maxLength={30}
        data-autofocus
        error={error}
        placeholder="e.g. Health"
        onChange={(e) => {
          setName(e.target.value);
          setError("");
        }}
      />
      <ColorPicker value={color} onChange={setColor} />
      <div className="flex justify-end gap-2 pt-1">
        <Button onClick={onCancel}>Cancel</Button>
        <Button type="submit" variant="primary">{initial ? "Save" : "Create category"}</Button>
      </div>
    </form>
  );
}

function DeleteForm({ category, onClose }: { category: Category; onClose: () => void }) {
  const { data, dispatchUndoable, undo } = useStore();
  const { toast } = useToast();
  const others = data.categories.filter((c) => c.id !== category.id);
  const count = data.tasks.filter((t) => t.categoryId === category.id).length;
  const [mode, setMode] = useState<"move" | "delete">("move");
  const [target, setTarget] = useState(others[0]?.id ?? "");

  const confirm = () => {
    const id = dispatchUndoable({ type: "deleteCategory", id: category.id, moveTo: mode === "move" ? target : null });
    toast({
      message: mode === "move" ? `Deleted “${category.name}”, moved ${count} task${count === 1 ? "" : "s"}` : `Deleted “${category.name}” and its tasks`,
      action: { label: "Undo", onClick: () => undo(id) },
    });
    onClose();
  };

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-slate-600 dark:text-slate-300">
        “{category.name}” has {count} task{count === 1 ? "" : "s"}. What should happen to {count === 1 ? "it" : "them"}?
      </p>
      <div className="flex flex-col gap-3" role="radiogroup" aria-label="What to do with its tasks">
        <label className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-200">
          <input type="radio" name="del-mode" checked={mode === "move"} onChange={() => setMode("move")} className="mt-1 accent-indigo-600 dark:accent-indigo-400" />
          <span className="flex flex-1 flex-col gap-2">
            Move tasks to another category
            <Select
              label="Move tasks to"
              hideLabel
              value={target}
              disabled={mode !== "move"}
              onChange={(e) => setTarget(e.target.value)}
              options={others.map((c) => ({ value: c.id, label: c.name }))}
            />
          </span>
        </label>
        <label className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-200">
          <input type="radio" name="del-mode" checked={mode === "delete"} onChange={() => setMode("delete")} className="mt-1 accent-rose-600 dark:accent-rose-400" />
          <span>Delete its tasks too <span className="text-slate-400">(you can undo)</span></span>
        </label>
      </div>
      <div className="flex justify-end gap-2 pt-1">
        <Button onClick={onClose}>Cancel</Button>
        <Button variant={mode === "delete" ? "danger" : "primary"} onClick={confirm}>
          {mode === "delete" ? "Delete category and tasks" : "Move tasks and delete"}
        </Button>
      </div>
    </div>
  );
}

export function CategoryManager({ dialog, onDialogChange }: CategoryManagerProps) {
  const { data, dispatchUndoable, undo } = useStore();
  const { toast } = useToast();
  const close = () => onDialogChange(null);
  const backToManage = () => onDialogChange({ kind: "manage" });

  const editing = dialog?.kind === "edit" ? data.categories.find((c) => c.id === dialog.id) : undefined;
  const deleting = dialog?.kind === "delete" ? data.categories.find((c) => c.id === dialog.id) : undefined;

  // If the target vanished (e.g. undo), fall back gracefully.
  useEffect(() => {
    if ((dialog?.kind === "edit" && !editing) || (dialog?.kind === "delete" && !deleting)) onDialogChange({ kind: "manage" });
  }, [dialog, editing, deleting, onDialogChange]);

  const countFor = (id: string) => data.tasks.filter((t) => t.categoryId === id).length;
  const lastOne = data.categories.length <= 1;

  // Move a category one step; keep focus on the same button (the row re-renders in a new place).
  const moved = useRef<string | null>(null);
  const move = (index: number, dir: -1 | 1) => {
    const ids = data.categories.map((c) => c.id);
    const j = index + dir;
    if (j < 0 || j >= ids.length) return;
    [ids[index], ids[j]] = [ids[j], ids[index]];
    moved.current = `${ids[j]}:${dir}`;
    dispatchUndoable({ type: "reorderCategories", ids });
  };
  useEffect(() => {
    if (!moved.current) return;
    const [id, dir] = moved.current.split(":");
    moved.current = null;
    const btn = document.querySelector<HTMLButtonElement>(`[data-move="${id}:${dir}"]`);
    (btn && !btn.disabled ? btn : document.querySelector<HTMLButtonElement>(`[data-move="${id}:${dir === "1" ? "-1" : "1"}"]`))?.focus();
  }, [data.categories]);

  const requestDelete = (c: Category) => {
    if (lastOne) return;
    if (countFor(c.id) === 0) {
      const id = dispatchUndoable({ type: "deleteCategory", id: c.id, moveTo: null });
      toast({ message: `Deleted “${c.name}”`, action: { label: "Undo", onClick: () => undo(id) } });
    } else {
      onDialogChange({ kind: "delete", id: c.id });
    }
  };

  return (
    <>
      <Modal open={dialog?.kind === "new"} onClose={close} title="New category" description="Categories group your tasks in Category view.">
        {dialog?.kind === "new" && <CategoryForm onDone={close} onCancel={close} />}
      </Modal>

      <Modal open={dialog?.kind === "edit" && !!editing} onClose={backToManage} title="Edit category">
        {editing && <CategoryForm key={editing.id} initial={editing} onDone={backToManage} onCancel={backToManage} />}
      </Modal>

      <Modal open={dialog?.kind === "delete" && !!deleting} onClose={backToManage} title="Delete category">
        {deleting && <DeleteForm key={deleting.id} category={deleting} onClose={backToManage} />}
      </Modal>

      <Modal
        open={dialog?.kind === "manage"}
        onClose={close}
        title="Manage categories"
        description="Rename, recolour, reorder or delete categories."
        footer={
          <>
            <Button onClick={() => onDialogChange({ kind: "new" })}><span aria-hidden>+</span> New category</Button>
            <Button variant="primary" onClick={close}>Done</Button>
          </>
        }
      >
        <ul className="flex flex-col divide-y divide-slate-100 dark:divide-slate-800">
          {data.categories.map((c, i) => {
            const n = countFor(c.id);
            return (
              <li key={c.id} className="flex items-center gap-3 py-2">
                <span className={cn("h-3 w-3 shrink-0 rounded-full", CATEGORY_COLORS[c.color]?.dot ?? CATEGORY_COLORS.slate.dot)} aria-hidden />
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-800 dark:text-slate-100">{c.name}</span>
                <span className="text-xs text-slate-400">{n} task{n === 1 ? "" : "s"}</span>
                <div className="flex">
                  <IconButton label={`Move ${c.name} up`} size="sm" disabled={i === 0} data-move={`${c.id}:-1`} onClick={() => move(i, -1)}>
                    <span aria-hidden>↑</span>
                  </IconButton>
                  <IconButton label={`Move ${c.name} down`} size="sm" disabled={i === data.categories.length - 1} data-move={`${c.id}:1`} onClick={() => move(i, 1)}>
                    <span aria-hidden>↓</span>
                  </IconButton>
                </div>
                <Button size="sm" aria-label={`Edit ${c.name}`} onClick={() => onDialogChange({ kind: "edit", id: c.id })}>Edit</Button>
                <IconButton
                  label={lastOne ? "Can't delete the last category" : `Delete ${c.name}`}
                  size="sm"
                  disabled={lastOne}
                  onClick={() => requestDelete(c)}
                  className="hover:text-rose-600 dark:hover:text-rose-400"
                >
                  <span aria-hidden>🗑</span>
                </IconButton>
              </li>
            );
          })}
        </ul>
        {lastOne && <p className="mt-2 text-xs text-slate-400">At least one category is required.</p>}
      </Modal>
    </>
  );
}
