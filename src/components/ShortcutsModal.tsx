"use client";

import { Button, Modal } from "@/components/ui";

const GROUPS: { title: string; rows: { keys: string[]; label: string }[] }[] = [
  {
    title: "Board",
    rows: [
      { keys: ["N"], label: "New task" },
      { keys: ["/"], label: "Search" },
      { keys: ["⌘/Ctrl", "Z"], label: "Undo last change" },
      { keys: ["?"], label: "Show this list" },
      { keys: ["Esc"], label: "Close dialog or clear selection" },
    ],
  },
  {
    title: "Dragging with the keyboard",
    rows: [
      { keys: ["Space"], label: "Pick up or drop a focused card" },
      { keys: ["←", "↑", "→", "↓"], label: "Move the picked-up card" },
      { keys: ["Esc"], label: "Cancel the drag" },
    ],
  },
];

export function ShortcutsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal open={open} onClose={onClose} title="Keyboard shortcuts" footer={<Button variant="primary" onClick={onClose}>Done</Button>}>
      <div className="flex flex-col gap-4">
        {GROUPS.map((g) => (
          <section key={g.title} aria-label={g.title}>
            <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{g.title}</h3>
            <dl className="divide-y divide-slate-100 dark:divide-slate-800">
              {g.rows.map((r) => (
                <div key={r.label} className="flex items-center justify-between gap-4 py-2 text-sm">
                  <dt className="text-slate-700 dark:text-slate-200">{r.label}</dt>
                  <dd className="flex gap-1">
                    {r.keys.map((k) => (
                      <kbd key={k} className="rounded bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 text-xs font-semibold text-slate-700 dark:text-slate-200 ring-1 ring-inset ring-slate-200 dark:ring-slate-700">{k}</kbd>
                    ))}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </div>
    </Modal>
  );
}
