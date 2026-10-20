"use client";

import { useCallback } from "react";
import { useToast } from "@/components/ui";
import { useStore } from "@/lib/store";
import { dueLabel } from "@/lib/taskUtils";

/** Returns a function to call right after a dispatch: toasts "Next one due Fri" if a recurring task just spawned one. */
export function useSpawnToast() {
  const { takeSpawned, undo } = useStore();
  const { toast } = useToast();
  return useCallback(
    (undoId?: number) => {
      const next = takeSpawned();
      if (!next?.dueDate) return;
      toast({
        message: `Next one due ${dueLabel(next.dueDate)}`,
        ...(undoId !== undefined ? { action: { label: "Undo", onClick: () => undo(undoId) } } : {}),
      });
    },
    [takeSpawned, toast, undo],
  );
}
