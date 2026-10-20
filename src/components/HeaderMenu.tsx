"use client";

import { IconButton } from "@/components/ui";

/**
 * EXTENSION POINT: the app menu (export / import / reset / replay tour).
 * Rendered in the Header's `menuSlot`. Replace this placeholder with the real menu.
 */
export function HeaderMenu() {
  return (
    <IconButton label="Menu" disabled>
      <span aria-hidden className="text-lg leading-none">⋯</span>
    </IconButton>
  );
}
