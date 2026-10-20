"use client";

import { Button, useToast } from "@/components/ui";
import { useStore } from "@/lib/store";

/** Slim banner shown while the board still holds the seeded sample data. */
export function SampleBanner() {
  const { data, dispatchUndoable, undo } = useStore();
  const { toast } = useToast();
  if (!data.isSample) return null;

  const clear = () => {
    const id = dispatchUndoable({ type: "clearSamples" });
    toast({ message: "Sample tasks cleared", action: { label: "Undo", onClick: () => undo(id) } });
  };

  return (
    <div className="border-b border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/15">
      <div className="mx-auto flex max-w-[1600px] flex-wrap items-center gap-x-3 gap-y-1 px-4 py-1.5 sm:px-6">
        <p className="flex-1 text-sm text-amber-900 dark:text-amber-200">
          <strong className="font-semibold">Sample board</strong> — explore, then clear the samples to start fresh.
        </p>
        <Button size="sm" onClick={clear}>Clear samples &amp; start fresh</Button>
      </div>
    </div>
  );
}
