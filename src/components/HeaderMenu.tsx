"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Button, IconButton, Modal, useToast } from "@/components/ui";
import { createSeed } from "@/lib/seed";
import { useStore } from "@/lib/store";
import type { Theme } from "@/lib/types";

type Confirm = null | { kind: "reset" };
const THEME_OPTIONS: { value: Theme; label: string }[] = [
  { value: "system", label: "System" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];
const ARCHIVE_OPTIONS: { value: number | null; label: string }[] = [
  { value: null, label: "Off" },
  ...[1, 3, 7, 14, 30].map((d) => ({ value: d, label: `After ${d} day${d === 1 ? "" : "s"}` })),
];

export function HeaderMenu({ onShowShortcuts }: { onShowShortcuts?: () => void }) {
  const { data, dispatch, dispatchUndoable, undo } = useStore();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState<Confirm>(null);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    const items = () => Array.from(wrapRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"], [role="menuitemradio"]') ?? []);
    items()[0]?.focus();
    const onDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        setOpen(false);
        btnRef.current?.focus();
        return;
      }
      const list = items();
      const idx = list.indexOf(document.activeElement as HTMLElement);
      if (e.key === "ArrowDown") {
        e.preventDefault();
        list[(idx + 1) % list.length]?.focus();
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        list[(idx - 1 + list.length) % list.length]?.focus();
      } else if (e.key === "Home") {
        e.preventDefault();
        list[0]?.focus();
      } else if (e.key === "End") {
        e.preventDefault();
        list[list.length - 1]?.focus();
      } else if (e.key === "Tab") {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const doConfirm = () => {
    if (!confirm) return;
    const seed = createSeed();
    const id = dispatchUndoable({
      type: "restore",
      data: { ...seed, prefs: { ...seed.prefs, tourDone: data.prefs.tourDone, autoArchiveDays: data.prefs.autoArchiveDays, theme: data.prefs.theme, lastVisit: data.prefs.lastVisit } },
    });
    toast({ message: "Board reset to sample data", action: { label: "Undo", onClick: () => undo(id) } });
    setConfirm(null);
  };

  const item =
    "flex w-full items-center rounded-md px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 focus-visible:bg-slate-100 focus-visible:outline-none";

  const run = (fn: () => void) => {
    setOpen(false);
    fn();
  };

  return (
    <div ref={wrapRef} className="relative">
      <IconButton
        ref={btnRef}
        label="Menu"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" && !open) {
            e.preventDefault();
            setOpen(true);
          }
        }}
      >
        <span aria-hidden className="text-lg leading-none">⋯</span>
      </IconButton>
      {open && (
        <div id={menuId} role="menu" aria-label="App menu" className="absolute right-0 top-full z-40 mt-1 w-56 rounded-xl bg-white p-1 shadow-lg ring-1 ring-slate-200">
          <button role="menuitem" type="button" className={item} onClick={() => run(() => onShowShortcuts?.())}>Keyboard shortcuts</button>
          <button role="menuitem" type="button" className={item} onClick={() => run(() => dispatch({ type: "setPrefs", patch: { tourDone: false } }))}>Replay tour</button>
          <button role="menuitem" type="button" className={item} onClick={() => run(() => setArchiveOpen(true))}>Auto-archive completed…</button>
          <div role="separator" className="my-1 h-px bg-slate-100" />
          <div role="group" aria-labelledby={`${menuId}-theme`}>
            <div id={`${menuId}-theme`} className="px-3 pb-1 pt-1.5 text-xs font-medium uppercase tracking-wide text-slate-500">Theme</div>
            {THEME_OPTIONS.map((o) => {
              const checked = data.prefs.theme === o.value;
              return (
                <button
                  key={o.value}
                  role="menuitemradio"
                  aria-checked={checked}
                  type="button"
                  className={item + " justify-between"}
                  onClick={() => dispatch({ type: "setPrefs", patch: { theme: o.value } })}
                >
                  {o.label}
                  <span aria-hidden className="text-indigo-600">{checked ? "✓" : ""}</span>
                </button>
              );
            })}
          </div>
          <div role="separator" className="my-1 h-px bg-slate-100" />
          <button role="menuitem" type="button" className={item + " text-rose-700"} onClick={() => run(() => setConfirm({ kind: "reset" }))}>Reset to sample data…</button>
        </div>
      )}

      <Modal
        open={archiveOpen}
        onClose={() => setArchiveOpen(false)}
        title="Auto-archive completed tasks"
        description="Completed tasks (and their subtasks) move to Archived once they are this old. Checked on load and hourly; you can undo."
        footer={<Button variant="primary" onClick={() => setArchiveOpen(false)}>Done</Button>}
      >
        <fieldset className="flex flex-col gap-2">
          <legend className="sr-only">Auto-archive completed tasks</legend>
          {ARCHIVE_OPTIONS.map((o) => (
            <label key={o.label} className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
              <input
                type="radio"
                name="auto-archive"
                className="accent-indigo-600"
                checked={data.prefs.autoArchiveDays === o.value}
                onChange={() => dispatch({ type: "setPrefs", patch: { autoArchiveDays: o.value } })}
              />
              {o.label}
            </label>
          ))}
        </fieldset>
      </Modal>
      <Modal
        open={confirm?.kind === "reset"}
        onClose={() => setConfirm(null)}
        title="Reset to sample data?"
        description="Your tasks and categories will be replaced by the sample board. You can undo this."
        footer={
          <>
            <Button onClick={() => setConfirm(null)}>Cancel</Button>
            <Button variant="danger" onClick={doConfirm}>Reset board</Button>
          </>
        }
      >
        <span className="sr-only">Confirm reset</span>
      </Modal>
    </div>
  );
}
