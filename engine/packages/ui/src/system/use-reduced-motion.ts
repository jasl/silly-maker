// SPDX-License-Identifier: MIT
import { useSyncExternalStore } from "react";

/** Live `prefers-reduced-motion` — every decorative animation gates on it. */
export function useReducedMotionV1(): boolean {
  return useSyncExternalStore(
    (listener) => {
      if (typeof matchMedia !== "function") return () => {};
      const query = matchMedia("(prefers-reduced-motion: reduce)");
      query.addEventListener("change", listener);
      return () => query.removeEventListener("change", listener);
    },
    () =>
      typeof matchMedia === "function"
        ? matchMedia("(prefers-reduced-motion: reduce)").matches
        : false,
    () => false,
  );
}
