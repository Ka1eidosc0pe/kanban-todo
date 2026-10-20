"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { Button } from "./Button";

export interface ToastOptions {
  message: string;
  /** Optional action button, e.g. { label: "Undo", onClick: undo }. */
  action?: { label: string; onClick: () => void };
  /** ms before auto-dismiss (default 6000; 0 = sticky). */
  duration?: number;
}
interface ToastItem extends ToastOptions {
  id: number;
}
interface ToastApi {
  toast: (o: ToastOptions | string) => number;
  dismiss: (id: number) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => setItems((l) => l.filter((t) => t.id !== id)), []);
  const toast = useCallback(
    (o: ToastOptions | string) => {
      const opts = typeof o === "string" ? { message: o } : o;
      const id = nextId.current++;
      setItems((l) => [...l.slice(-3), { ...opts, id }]);
      const ms = opts.duration ?? 6000;
      if (ms > 0) setTimeout(() => dismiss(id), ms);
      return id;
    },
    [dismiss],
  );
  const api = useMemo(() => ({ toast, dismiss }), [toast, dismiss]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex flex-col items-center gap-2 px-4"
      >
        {items.map((t) => (
          <div
            key={t.id}
            className="toast-in pointer-events-auto flex items-center gap-3 rounded-xl bg-slate-900 py-2 pl-4 pr-2 text-sm text-white shadow-lg"
          >
            <span>{t.message}</span>
            {t.action && (
              <Button
                size="sm"
                variant="ghost"
                className="text-indigo-300 hover:bg-white/10 hover:text-white"
                onClick={() => {
                  t.action?.onClick();
                  dismiss(t.id);
                }}
              >
                {t.action.label}
              </Button>
            )}
            <button
              type="button"
              aria-label="Dismiss"
              onClick={() => dismiss(t.id)}
              className="rounded-md px-2 py-1 text-slate-400 hover:text-white"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const c = useContext(ToastContext);
  if (!c) throw new Error("useToast must be used inside <ToastProvider>");
  return c;
}
