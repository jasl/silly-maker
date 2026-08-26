// SPDX-License-Identifier: MIT
import { startWebGuiApplicationV1 } from "@sillymaker/web/gui-application";

import { sillyOsApplicationV1 } from "./application.tsx";

if (typeof document !== "undefined") {
  document.documentElement.dataset.mode = "light";
  document.documentElement.style.colorScheme = "light";
  await startWebGuiApplicationV1(sillyOsApplicationV1);
}
