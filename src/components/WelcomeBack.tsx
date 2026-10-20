"use client";

import { useState } from "react";
import { IconButton } from "@/components/ui";
import { useStore } from "@/lib/store";
import { isDueSoon, isOverdue, timeAgo, type QuickFilter } from "@/lib/taskUtils";

const DISMISS_KEY = "kanban-todo:welcome-dismissed";

export interface WelcomeBackProps {
  active: QuickFilter | null;
  onPick: (f: QuickFilter | null) => void;
}

/** Summary strip for returning visitors; dismissible for the current browser session. */
export function WelcomeBack({ active, onPick }: WelcomeBackProps) {
  const { data, previousVisit, isFirstVisit, ready } = useStore();
  const [dismissed, setDismissed] = useState(() => {
    try {
      return typeof window !== "undefined" && window.sessionStorage.getItem(DISMISS_KEY) === "1";
    } catch {
      return false;
    }
  });
  if (!ready || isFirstVisit || previousVisit == null || dismissed) return null;

  const overdue = data.tasks.filter((t) => isOverdue(t)).length;
  const soon = data.tasks.filter((t) => isDueSoon(t)).length;
  const progress = data.tasks.filter((t) => t.status === "in_progress").length;

  const dismiss = () => {
    try {
      window.sessionStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* ignore */
    }
    onPick(null);
    setDismissed(true);
  };

  const stats: { key: QuickFilter; count: number; label: string; tone: string }[] = [
    { key: "overdue", count: overdue, label: "overdue", tone: "text-rose-700" },
    { key: "soon", count: soon, label: "due within 3 days", tone: "text-amber-700" },
    { key: "progress", count: progress, label: "in progress", tone: "text-sky-700" },
  ];

  return (
    <section aria-label="Welcome back" className="border-b border-indigo-100 bg-indigo-50/60">
      <div className="mx-auto flex max-w-[1600px] flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2 sm:px-6">
        <p className="text-sm text-slate-700">
          <strong className="font-semibold text-slate-900">Welcome back.</strong>{" "}
          <span className="text-slate-500">Last visit {timeAgo(previousVisit)}.</span>
        </p>
        <ul className="flex flex-1 flex-wrap items-center gap-2">
          {stats.map((s) => (
            <li key={s.key}>
              <button
                type="button"
                aria-pressed={active === s.key}
                disabled={s.count === 0}
                onClick={() => onPick(active === s.key ? null : s.key)}
                className={
                  "rounded-full px-3 py-1 text-sm ring-1 ring-inset transition-colors focus-visible:outline-2 focus-visible:outline-indigo-500 disabled:cursor-default disabled:opacity-60 " +
                  (active === s.key ? "bg-white ring-indigo-400" : "bg-white/70 ring-slate-200 hover:bg-white")
                }
              >
                <strong className={s.tone}>{s.count}</strong> <span className="text-slate-600">{s.label}</span>
              </button>
            </li>
          ))}
        </ul>
        <IconButton label="Dismiss welcome back" size="sm" onClick={dismiss}>
          <span aria-hidden>✕</span>
        </IconButton>
      </div>
    </section>
  );
}
