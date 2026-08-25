// SPDX-License-Identifier: MIT
import { startWebGuiApplicationV1 } from "@sillymaker/web/gui-application";

import { cardsWebApplicationV1 } from "./cards-app.tsx";

if (typeof document !== "undefined") {
  await startWebGuiApplicationV1(cardsWebApplicationV1);
}
