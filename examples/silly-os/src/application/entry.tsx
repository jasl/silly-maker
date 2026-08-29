// SPDX-License-Identifier: MIT
import { startWebGuiApplicationV1 } from "@sillymaker/web/gui-application";

import { sillyOsApplicationV1 } from "./application.tsx";

if (typeof document !== "undefined") {
  // SillyOS exclusively owns this document and selects light native chrome
  // before the application-scoped theme boundary can mount.
  document.documentElement.style.colorScheme = "light";
  await startWebGuiApplicationV1(sillyOsApplicationV1);
}
