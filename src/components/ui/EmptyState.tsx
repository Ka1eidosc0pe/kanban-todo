import { cn } from "./cn";

export interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  /** Compact variant for use inside board columns. */
  compact?: boolean;
  className?: string;
}

export function EmptyState({ title, description, icon, action, compact, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 dark:border-slate-600 text-center text-slate-500 dark:text-slate-400",
        compact ? "gap-1 px-3 py-6" : "gap-2 px-6 py-12",
        className,
      )}
    >
      {icon && <div className="text-2xl text-slate-400" aria-hidden>{icon}</div>}
      <p className={cn("font-medium text-slate-600 dark:text-slate-300", compact ? "text-sm" : "text-base")}>{title}</p>
      {description && <p className="text-xs text-slate-400">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
