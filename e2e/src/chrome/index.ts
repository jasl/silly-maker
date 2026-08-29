// SPDX-License-Identifier: MIT
// The drill chrome-layout package (authorable-chrome-layout M3 conformance):
// `drill.chrome-layout.json` declares the intent widget and hold-progress
// meter the Lab HUD mounts over the shared tripwire hold. The document owns
// geometry and the widget triples only — availability, the intent-id →
// fenced-command mapping, and every legality rule stay in Story code.
import { parseChromeLayoutDocument } from "@sillymaker/base/story";
import type { ChromeLayoutDocument } from "@sillymaker/base/story";

import drillChromeLayoutJsonV1 from "./drill.chrome-layout.json" with { type: "json" };

/** The intent id the engage widget reports; the HUD maps it to the fenced write. */
export const labDrillEngageIntentIdV1 = "lab.intent.engage_collector";
export const labDrillEngageWidgetNameV1 = "drill.engage";
export const labDrillProgressWidgetNameV1 = "drill.progress";

export const labDrillChromeLayoutV1: ChromeLayoutDocument = parseChromeLayoutDocument(
  drillChromeLayoutJsonV1,
);

// Required widgets fail loudly at module admission (same discipline as
// missing text ids): the running Lab never sees a half-wired layout.
for (const widgetName of [labDrillEngageWidgetNameV1, labDrillProgressWidgetNameV1]) {
  if (labDrillChromeLayoutV1.widgets?.[widgetName] === undefined) {
    throw new TypeError(`e2e.chrome_widget_missing:${widgetName}`);
  }
}
