// SPDX-License-Identifier: MIT
import { startWebGameApplicationV1 } from "@sillymaker/web";

import { templateReferenceGameApplicationV1 } from "./reference-composition.tsx";

if (typeof document !== "undefined") {
  await startWebGameApplicationV1(templateReferenceGameApplicationV1);
}
