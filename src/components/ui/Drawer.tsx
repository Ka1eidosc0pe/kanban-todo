"use client";

import { useId } from "react";
import { cn } from "./cn";
import { IconButton } from "./IconButton";
import { useOverlay } from "./useOverlay";

export interface DrawerProps {
  open: boolean;
  onClose: () => void;
  /** Accessible title (shown in the header unless `header` is supplied). */
  title: string;
  /** Replace the default title row, e.g. with a breadcrumb. The close button is always rendered. */
  header?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}

export function Drawer({ open, onClose, title, header, children, footer, className }: DrawerProps) {
  const ref = useOverlay(open, onClose);
  const titleId = useId();
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40">
      <div className="absolute inset-0 bg-slate-900/30 dark:bg-black/60" onClick={onClose} aria-hidden />
      <aside
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={cn(
          "drawer-in absolute inset-y-0 right-0 flex w-full max-w-md flex-col bg-white shadow-2xl dark:border-l dark:border-slate-800 dark:bg-slate-900 outline-none sm:w-[28rem]",
          className,
        )}
      >
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 px-5 py-3">
          <div className="min-w-0 flex-1">
            <span id={titleId} className={header ? "sr-only" : "block truncate text-sm font-semibold text-slate-900 dark:text-slate-100"}>
              {title}
            </span>
            {header}
          </div>
          <IconButton label="Close panel" onClick={onClose}>
            <span aria-hidden>✕</span>
          </IconButton>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="border-t border-slate-100 dark:border-slate-800 px-5 py-3">{footer}</div>}
      </aside>
    </div>
  );
}
