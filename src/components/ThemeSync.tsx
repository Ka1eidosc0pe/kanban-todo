"use client";

import { useLayoutEffect } from "react";
import { useStore } from "@/lib/store";

/** Keeps the `dark` class and color-scheme on <html> in sync with prefs.theme and the OS scheme.
 *  (The inline script in the root layout handles first paint; this handles changes after load.) */
export function ThemeSync() {
  const { ready, data } = useStore();
  const theme = data.prefs.theme;

  useLayoutEffect(() => {
    // Before hydration from storage, the store holds defaults; don't override what the inline script set.
    if (!ready) return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      const dark = theme === "dark" || (theme === "system" && mq.matches);
      const el = document.documentElement;
      el.classList.toggle("dark", dark);
      el.style.colorScheme = dark ? "dark" : "light";
    };
    apply();
    if (theme !== "system") return;
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [ready, theme]);

  return null;
}
