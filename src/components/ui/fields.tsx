import { forwardRef, useId } from "react";
import { cn } from "./cn";

const control =
  "w-full rounded-lg border-0 bg-white dark:bg-slate-800 px-3 text-sm text-slate-900 dark:text-slate-100 ring-1 ring-inset ring-slate-300 dark:ring-slate-600 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 disabled:bg-slate-50 dark:disabled:bg-slate-800/50";

export interface FieldProps {
  label: string;
  hint?: string;
  error?: string;
  hideLabel?: boolean;
}

function Field({ label, hint, error, hideLabel, id, children }: FieldProps & { id: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className={cn("text-xs font-medium text-slate-600 dark:text-slate-300", hideLabel && "sr-only")}>
        {label}
      </label>
      {children}
      {error ? (
        <p className="text-xs text-rose-600 dark:text-rose-400">{error}</p>
      ) : (
        hint && <p className="text-xs text-slate-400">{hint}</p>
      )}
    </div>
  );
}

export const TextField = forwardRef<HTMLInputElement, FieldProps & React.InputHTMLAttributes<HTMLInputElement>>(
  function TextField({ label, hint, error, hideLabel, className, id, ...props }, ref) {
    const auto = useId();
    const fid = id ?? auto;
    return (
      <Field label={label} hint={hint} error={error} hideLabel={hideLabel} id={fid}>
        <input ref={ref} id={fid} aria-invalid={!!error} className={cn(control, "h-9", className)} {...props} />
      </Field>
    );
  },
);

export const TextArea = forwardRef<HTMLTextAreaElement, FieldProps & React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function TextArea({ label, hint, error, hideLabel, className, id, ...props }, ref) {
    const auto = useId();
    const fid = id ?? auto;
    return (
      <Field label={label} hint={hint} error={error} hideLabel={hideLabel} id={fid}>
        <textarea ref={ref} id={fid} aria-invalid={!!error} className={cn(control, "min-h-24 py-2", className)} {...props} />
      </Field>
    );
  },
);

export interface SelectOption {
  value: string;
  label: string;
}

export const Select = forwardRef<
  HTMLSelectElement,
  FieldProps & React.SelectHTMLAttributes<HTMLSelectElement> & { options: SelectOption[] }
>(function Select({ label, hint, error, hideLabel, options, className, id, ...props }, ref) {
  const auto = useId();
  const fid = id ?? auto;
  return (
    <Field label={label} hint={hint} error={error} hideLabel={hideLabel} id={fid}>
      <select ref={ref} id={fid} aria-invalid={!!error} className={cn(control, "h-9 pr-8", className)} {...props}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </Field>
  );
});
