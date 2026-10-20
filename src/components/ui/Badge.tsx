import { cn } from "./cn";

export type BadgeTone = "neutral" | "indigo" | "green" | "amber" | "rose" | "sky";

const tones: Record<BadgeTone, string> = {
  neutral: "bg-slate-100 text-slate-700 ring-slate-200",
  indigo: "bg-indigo-50 text-indigo-700 ring-indigo-200",
  green: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  amber: "bg-amber-50 text-amber-800 ring-amber-200",
  rose: "bg-rose-50 text-rose-700 ring-rose-200",
  sky: "bg-sky-50 text-sky-700 ring-sky-200",
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
