// SPDX-License-Identifier: MIT
import { startWebGameApplicationV1 } from "@sillymaker/web";

import { installLabGameApplicationHmrV1, labGameApplicationV1 } from "./composition.tsx";

// The whole Engine Lab web entry: one declaration, one start call. Session,
// persistence, diagnostics, input, automation, and page lifecycle come from
// the Web composer. In Vite development the composition module owns a literal
// self-accept boundary and hands admitted R2 successors back to that composer.
if (typeof document !== "undefined") {
  const application = new URLSearchParams(globalThis.location.search).get("content_orientation") ===
      "landscape-only"
    ? {
      ...labGameApplicationV1,
      viewport: { ...labGameApplicationV1.viewport, contentOrientation: "landscape-only" as const },
    }
    : labGameApplicationV1;
  const started = await startWebGameApplicationV1(application);
  if (import.meta.hot !== undefined) {
    installLabGameApplicationHmrV1(started, { currentApplication: application });
  }
}
