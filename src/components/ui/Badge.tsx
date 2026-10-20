import { cn } from "./cn";

export type BadgeTone = "neutral" | "indigo" | "green" | "amber" | "rose" | "sky";

const tones: Record<BadgeTone, string> = {
  neutral: "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 ring-slate-200 dark:ring-slate-800",
  indigo: "bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 ring-indigo-200 dark:ring-indigo-500/30",
  green: "bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 ring-emerald-200 dark:ring-emerald-500/30",
  amber: "bg-amber-50 dark:bg-amber-500/15 text-amber-800 dark:text-amber-300 ring-amber-200 dark:ring-amber-500/30",
  rose: "bg-rose-50 dark:bg-rose-500/15 text-rose-700 dark:text-rose-300 ring-rose-200 dark:ring-rose-500/30",
  sky: "bg-sky-50 dark:bg-sky-500/15 text-sky-700 dark:text-sky-300 ring-sky-200 dark:ring-sky-500/30",
};

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
  /** Custom class string (e.g. CATEGORY_COLORS[x].chip) replacing the tone colors. */
  colorClass?: string;
}

export function Badge({ tone = "neutral", colorClass, className, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center gap-1 truncate rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset",
        colorClass ?? tones[tone],
        className,
      )}
      {...props}
    />
  );
}
