// SPDX-License-Identifier: MIT
import { startWebGameApplicationV1 } from "@sillymaker/web";

import { electronicPetGameApplicationV1 } from "./composition.tsx";
import "./root.css";

if (typeof document !== "undefined") {
  await startWebGameApplicationV1(electronicPetGameApplicationV1);
}
