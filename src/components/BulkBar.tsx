"use client";

import { Button, Select } from "@/components/ui";
import { STATUSES, STATUS_LABELS, type Category, type Status } from "@/lib/types";

export interface BulkBarProps {
  count: number;
  categories: Category[];
  onStatus: (s: Status) => void;
  onCategory: (id: string) => void;
  onArchive: () => void;
  onDelete: () => void;
  onClear: () => void;
}

/** Floating action bar for the selected cards (sits above the toast area). */
export function BulkBar({ count, categories, onStatus, onCategory, onArchive, onDelete, onClear }: BulkBarProps) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-20 z-40 flex justify-center px-4">
      <div
        role="toolbar"
        aria-label="Bulk actions"
        className="pointer-events-auto flex max-w-full flex-wrap items-center gap-2 rounded-2xl bg-white p-2 shadow-xl ring-1 ring-slate-200"
      >
        <span className="px-2 text-sm font-medium text-slate-800" role="status">{count} selected</span>
        {/* value stays "" so picking the same option again still fires */}
        <Select
          label="Move to status"
          hideLabel
          value=""
          onChange={(e) => e.target.value && onStatus(e.target.value as Status)}
          options={[{ value: "", label: "Move to status…" }, ...STATUSES.map((s) => ({ value: s, label: STATUS_LABELS[s] }))]}
          className="h-8 w-40 text-xs"
        />
        <Select
          label="Move to category"
          hideLabel
          value=""
          onChange={(e) => e.target.value && onCategory(e.target.value)}
          options={[{ value: "", label: "Move to category…" }, ...categories.map((c) => ({ value: c.id, label: c.name }))]}
          className="h-8 w-40 text-xs"
        />
        <Button size="sm" onClick={onArchive}>Archive</Button>
        <Button size="sm" variant="danger" onClick={onDelete}>Delete</Button>
        <Button size="sm" variant="ghost" onClick={onClear}>Clear selection</Button>
      </div>
    </div>
  );
}
