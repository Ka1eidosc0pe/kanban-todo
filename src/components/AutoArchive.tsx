"use client";

import { useEffect, useRef } from "react";
import { useToast } from "@/components/ui";
import { useStore } from "@/lib/store";
import { staleCompletedIds } from "@/lib/taskUtils";

const SWEEP_EVERY = 60 * 60 * 1000; // hourly while the app is open

/** Renders nothing: archives completed tasks older than the auto-archive setting, on load, on change and hourly. */
export function AutoArchive() {
  const { ready, data, dispatchUndoable, undo } = useStore();
  const { toast } = useToast();
  const days = data.prefs.autoArchiveDays;
  const tasksRef = useRef(data.tasks);
  const skip = useRef(new Set<string>()); // tasks the user just un-archived: leave them alone this session
  useEffect(() => {
    tasksRef.current = data.tasks;
  });

  useEffect(() => {
    if (!ready || days === null) return;
    const sweep = () => {
      const ids = staleCompletedIds(tasksRef.current, days).filter((t) => !skip.current.has(t));
      if (!ids.length) return;
      const id = dispatchUndoable({ type: "bulkUpdate", ids, patch: { status: "archived" } });
      toast({ message: `Auto-archived ${ids.length} completed task${ids.length === 1 ? "" : "s"}`, action: {
          label: "Undo",
          onClick: () => {
            ids.forEach((t) => skip.current.add(t));
            undo(id);
          },
        },
      });
      tasksRef.current = tasksRef.current.map((t) => (ids.includes(t.id) ? { ...t, status: "archived" as const } : t)); // don't re-sweep before the next render
    };
    sweep();
    const h = setInterval(sweep, SWEEP_EVERY);
    return () => clearInterval(h);
  }, [ready, days, dispatchUndoable, undo, toast]);

  return null;
}
