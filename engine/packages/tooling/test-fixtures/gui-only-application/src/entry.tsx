// SPDX-License-Identifier: MIT
import {
  startWebGuiApplicationV1,
  type WebGuiApplicationV1,
} from "@sillymaker/web/gui-application";

const applicationV1: WebGuiApplicationV1 = {
  applicationId: "conformance-gui-only",
  viewport: {
    canvas: { width: 480, height: 272 },
    mode: "fluid",
    fallbackSize: { width: 480, height: 272 },
  },
  ui: () => ({ content: <main aria-label="GUI-only conformance">Ready</main> }),
};

if (typeof document !== "undefined") {
  await startWebGuiApplicationV1(applicationV1);
}
