// SPDX-License-Identifier: MIT
import { startWebGameApplicationV1 } from "@sillymaker/web";

import { catcafeGameApplicationV1, installCatcafeGameApplicationHmrV1 } from "./composition.tsx";

// The whole web entry: one declaration, one start call. Session,
// persistence, diagnostics, input, automation, and page lifecycle come
// from the Web composer; the development-only Story boundary delegates
// authoritative R2 handoff and successor ownership back to that composer.
if (typeof document !== "undefined") {
  const started = await startWebGameApplicationV1(catcafeGameApplicationV1);
  if (import.meta.hot !== undefined) installCatcafeGameApplicationHmrV1(started);
}
