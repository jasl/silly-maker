// SPDX-License-Identifier: MIT
import type { ChromeLayoutDocument } from "@sillymaker/base/story";
import { parseChromeLayoutDocument } from "@sillymaker/base/story";

import drillChromeLayoutJsonV1 from "./drill.chrome-layout.json" with { type: "json" };

export const labDrillEngageIntentIdV1 = "lab.intent.engage_collector";
export const labDrillChromeLayoutV1: ChromeLayoutDocument = parseChromeLayoutDocument(
  drillChromeLayoutJsonV1,
  "/chrome/drill",
);
