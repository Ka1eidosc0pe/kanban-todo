"use client";

import { useEffect } from "react";

// Registers the offline service worker. Production builds only, so dev
// (HMR, changing chunks) never serves stale cached assets.
export function RegisterSW() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker.register("/sw.js").catch((error) => {
      console.error("Service worker registration failed:", error);
    });
  }, []);

  return null;
}
