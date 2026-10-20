"use client";

import { useMemo } from "react";
import { useStore } from "@/lib/store";
import { completionStreak, doneThisWeek } from "@/lib/taskUtils";

/** Quiet "done this week" and streak line; hidden on the sample/empty board and until something has been completed. */
export function ProgressStrip() {
  const { data } = useStore();
  const { done, streak } = useMemo(() => ({ done: doneThisWeek(data.tasks), streak: completionStreak(data.tasks) }), [data.tasks]);
  if (data.isSample || data.tasks.length === 0 || (done === 0 && streak === 0)) return null;
  return (
    <p className="flex flex-wrap items-center gap-x-3 text-xs text-slate-500" aria-label="Progress">
      <span><span aria-hidden>✓</span> {done} done this week</span>
      {streak > 0 && <span><span aria-hidden>🔥</span> {streak}-day streak</span>}
    </p>
  );
}
