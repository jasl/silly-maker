// SPDX-License-Identifier: MIT
import { startWebGameApplicationV1 } from "@sillymaker/web";

import { osGameApplicationV1 } from "./composition.tsx";

if (typeof document !== "undefined") {
  await startWebGameApplicationV1(osGameApplicationV1);
}
