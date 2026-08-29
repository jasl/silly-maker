// SPDX-License-Identifier: MIT
// The HUD chrome-layout package: `hud.chrome-layout.json` is the single
// authoring authority for where the HUD strip sits on the logical canvas
// (authorable chrome layout V1). The checked data/code path owns edits and
// runtime admission; the document owns geometry only — behavior, visibility
// rules, and intent wiring stay in code.
import { parseChromeLayoutDocument } from "@sillymaker/base/story";
import type { ChromeLayoutDocument } from "@sillymaker/base/story";

import hudChromeLayoutJsonV1 from "./hud.chrome-layout.json" with { type: "json" };

/** The box the HUD strip reads; renaming it in the document is a break. */
export const templateHudBoxNameV1 = "status-strip";

export const templateHudChromeLayoutV1: ChromeLayoutDocument = parseChromeLayoutDocument(
  hudChromeLayoutJsonV1,
);

// Required boxes fail loudly at module admission (same discipline as
// missing text ids): the running game never sees a half-wired layout.
if (templateHudChromeLayoutV1.boxes[templateHudBoxNameV1] === undefined) {
  throw new TypeError(`template.chrome_box_missing:${templateHudBoxNameV1}`);
}
