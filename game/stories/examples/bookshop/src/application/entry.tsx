// SPDX-License-Identifier: MIT
import { startWebGameApplicationV1 } from "@sillymaker/web";

import { bookshopWebApplicationV1 } from "./web-application.js";

// The whole web entry: one declaration, one start call. Session,
// persistence, diagnostics, input, automation, and page lifecycle come
// from the Web composer; dev-time module changes fall back to a reload.
if (typeof document !== "undefined") {
  await startWebGameApplicationV1(bookshopWebApplicationV1);
}
