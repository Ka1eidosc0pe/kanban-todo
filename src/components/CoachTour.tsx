"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Button } from "@/components/ui";
import type { ViewMode } from "@/lib/types";

interface Step {
  selector: string;
  title: string;
  body: string;
}

const STEPS: Step[] = [
  { selector: '[data-variant="main"]', title: "Drag a card", body: "Drag any card to another list. In Status view it changes the status; in Category view, the category. Keyboard: focus a card, press Space, then arrow keys." },
  { selector: '[data-tour="add-task"]', title: "Add a task", body: "Click here or press N to add a task. Fill in notes, a due date and priority." },
  { selector: '[data-variant="main"]', title: "Open a card for subtasks", body: "Click a card to open its details. Subtasks you add there show up on the board as their own cards." },
  { selector: '[data-tour="view-switcher"]', title: "Switch views", body: "Group your board by status or by category, or see everything open as a dated Agenda. You can also manage your own categories in Category view." },
];

const POP_W = 320;

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

// Agenda has no draggable cards: point at its rows instead.
const AGENDA_STEPS: Record<number, Partial<Step>> = {
  0: { selector: "[data-agenda-row]", title: "Your open tasks", body: "Tasks are grouped by when they are due. Tick the box to finish one; recurring tasks come back on their own." },
  2: { selector: "[data-agenda-row]" },
};

export interface CoachTourProps {
  view?: ViewMode;
  /** Hide while another overlay is in front. */
  paused?: boolean;
  onDone: () => void;
}

export function CoachTour({ view, paused, onDone }: CoachTourProps) {
  const [i, setI] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const step = { ...STEPS[i], ...(view === "agenda" ? AGENDA_STEPS[i] : {}) };
  const last = i === STEPS.length - 1;

  const measure = useCallback(() => {
    const el = document.querySelector<HTMLElement>(step.selector);
    if (!el) return setRect(null);
    const r = el.getBoundingClientRect();
    setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
  }, [step.selector]);

  useLayoutEffect(() => {
    const el = document.querySelector<HTMLElement>(step.selector);
    el?.scrollIntoView({ block: "nearest", inline: "nearest" });
    // eslint-disable-next-line react-hooks/set-state-in-effect -- measuring DOM after layout
    measure();
  }, [step.selector, measure, paused]);

  useEffect(() => {
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    const t = window.setInterval(measure, 500); // cards may move (drag, load)
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
      window.clearInterval(t);
    };
  }, [measure]);

  useEffect(() => {
    if (!paused) nextRef.current?.focus();
  }, [i, paused]);

  useEffect(() => {
    if (paused) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !document.querySelector('[aria-modal="true"]')) onDone();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [paused, onDone]);

  if (paused) return null;

  const vw = typeof window === "undefined" ? 1024 : window.innerWidth;
  const vh = typeof window === "undefined" ? 768 : window.innerHeight;
  const w = Math.min(POP_W, vw - 16);
  let style: React.CSSProperties;
  if (rect) {
    const below = rect.top + rect.height + 190 < vh;
    const left = Math.max(8, Math.min(rect.left + rect.width / 2 - w / 2, vw - w - 8));
    style = below ? { top: rect.top + rect.height + 12, left, width: w } : { bottom: vh - rect.top + 12, left, width: w };
  } else {
    style = { top: "30%", left: Math.max(8, (vw - w) / 2), width: w };
  }

  return (
    <>
      {rect && (
        <div
          aria-hidden
          className="pointer-events-none fixed z-40 rounded-xl ring-4 ring-indigo-500/60"
          style={{ top: rect.top - 4, left: rect.left - 4, width: rect.width + 8, height: rect.height + 8 }}
        />
      )}
      <div
        role="dialog"
        aria-label={`Tour step ${i + 1} of ${STEPS.length}: ${step.title}`}
        className="fixed z-40 rounded-2xl bg-white dark:bg-slate-800 p-4 shadow-xl ring-1 ring-slate-200 dark:ring-slate-700"
        style={style}
      >
        <p className="text-xs font-medium text-indigo-600 dark:text-indigo-400">Step {i + 1} of {STEPS.length}</p>
        <h2 className="mt-0.5 text-sm font-semibold text-slate-900 dark:text-slate-100">{step.title}</h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{step.body}</p>
        <div className="mt-3 flex items-center justify-between gap-2">
          <Button size="sm" variant="ghost" onClick={onDone}>Skip tour</Button>
          <div className="flex gap-2">
            {i > 0 && <Button size="sm" onClick={() => setI(i - 1)}>Back</Button>}
            <Button ref={nextRef} size="sm" variant="primary" onClick={() => (last ? onDone() : setI(i + 1))}>
              {last ? "Done" : "Next"}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
