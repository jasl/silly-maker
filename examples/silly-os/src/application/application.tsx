// SPDX-License-Identifier: MIT
import type { WebGuiApplicationV1 } from "@sillymaker/web/gui-application";

import { SillyOsAppV1 } from "../ui/silly-os-app.tsx";

/** Browser and Deno Desktop share the same GUI-only SillyOS product entry. */
export const sillyOsApplicationV1: WebGuiApplicationV1 = {
  applicationId: "example-silly-os",
  viewport: {
    canvas: { width: 1440, height: 900 },
    mode: "fluid",
    fallbackSize: { width: 1440, height: 900 },
  },
  ui: ({ reportFailure }) => ({
    content: <SillyOsAppV1 reportFailure={reportFailure} />,
  }),
};
