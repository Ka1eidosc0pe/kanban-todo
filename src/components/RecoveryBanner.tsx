"use client";

import { useState } from "react";
import { IconButton } from "@/components/ui";
import { useStore } from "@/lib/store";

/** Shown when saved data couldn't be read; the old data is kept in browser storage. */
export function RecoveryBanner() {
  const { loadedUnreadable } = useStore();
  const [dismissed, setDismissed] = useState(false);
  if (!loadedUnreadable || dismissed) return null;

  return (
    <section aria-label="Saved data notice" className="border-b border-amber-200 bg-amber-50">
      <div className="mx-auto flex max-w-[1600px] items-center gap-x-3 px-4 py-1.5 sm:px-6">
        <p className="flex-1 text-sm text-amber-900">
          We couldn&apos;t read your saved board, so we started a fresh one. Your old data was kept in browser storage and hasn&apos;t been deleted.
        </p>
        <IconButton label="Dismiss notice" size="sm" onClick={() => setDismissed(true)}>
          <span aria-hidden>✕</span>
        </IconButton>
      </div>
    </section>
  );
}
