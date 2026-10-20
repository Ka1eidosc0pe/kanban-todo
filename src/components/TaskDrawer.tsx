"use client";

import { Drawer } from "@/components/ui";
import { useStore } from "@/lib/store";

export interface TaskDrawerProps {
  /** Id of the open task (from `?task=`), or null when closed. */
  taskId: string | null;
  onClose: () => void;
  /** Open another task (e.g. parent / subtask links). */
  onOpenTask?: (id: string) => void;
}

/**
 * EXTENSION POINT: the full task editor (title, notes, category, status, due, priority,
 * subtasks, delete). Placeholder shows the title only.
 */
export function TaskDrawer({ taskId, onClose }: TaskDrawerProps) {
  const { data } = useStore();
  const task = taskId ? data.tasks.find((t) => t.id === taskId) : undefined;
  return (
    <Drawer open={!!task} onClose={onClose} title="Task">
      <h2 className="text-lg font-semibold text-slate-900">{task?.title}</h2>
    </Drawer>
  );
}
