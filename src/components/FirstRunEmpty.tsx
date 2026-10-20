"use client";

import { Button, EmptyState } from "@/components/ui";

const SUGGESTIONS = ["Plan my week", "Write down 3 goals", "Tidy my inbox"];

export interface FirstRunEmptyProps {
  onAddTask: () => void;
  /** Create a real task with this title. */
  onQuickAdd: (title: string) => void;
}

/** Shown when the board has no tasks at all (after clearing samples, or a fresh import). */
export function FirstRunEmpty({ onAddTask, onQuickAdd }: FirstRunEmptyProps) {
  return (
    <div className="mx-auto w-full max-w-[1600px] px-4 pt-2 sm:px-6">
      <EmptyState
        icon={<span className="text-3xl">📝</span>}
        title="Your board is empty. Let's add your first task."
        description="Tasks you add show up in the lists below. Press N any time to add another."
        className="rounded-2xl bg-white dark:bg-slate-900 py-8 ring-1 ring-slate-200 dark:ring-slate-800"
        action={
          <div className="flex flex-col items-center gap-4">
            <Button variant="primary" size="lg" onClick={onAddTask}>
              <span aria-hidden>+</span> Add your first task
            </Button>
            <div className="flex flex-wrap items-center justify-center gap-2" role="group" aria-label="Quick-start suggestions">
              <span className="text-xs text-slate-400">Or start with:</span>
              {SUGGESTIONS.map((s) => (
                <Button key={s} size="sm" onClick={() => onQuickAdd(s)}>
                  <span aria-hidden>+</span> {s}
                </Button>
              ))}
            </div>
          </div>
        }
      />
    </div>
  );
}
