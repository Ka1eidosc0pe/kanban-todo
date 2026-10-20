"use client";

import { cn } from "@/components/ui";
import type { ViewMode } from "@/lib/types";

const OPTIONS: { value: ViewMode; label: string }[] = [
  { value: "status", label: "Status" },
  { value: "category", label: "Category" },
];

export function ViewSwitcher({ value, onChange }: { value: ViewMode; onChange: (v: ViewMode) => void }) {
  return (
    <div role="group" aria-label="Board view" data-tour="view-switcher" className="inline-flex rounded-lg bg-slate-100 p-0.5">
      {OPTIONS.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "rounded-md px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-indigo-500",
            value === o.value ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
