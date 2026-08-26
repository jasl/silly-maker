// SPDX-License-Identifier: MIT
import type { WebGuiApplicationV1 } from "@sillymaker/web/gui-application";

import { createBrowserProgramRepositoryV1 } from "../product/browser-program-repository.ts";
import { createCreatorControllerV1 } from "../product/creator-controller.ts";
import { createDeterministicFakeCreatorV1 } from "../product/fake-creator.ts";
import { SillyOsAppV1 } from "../ui/silly-os-app.tsx";

/** Browser and Deno Desktop share the same GUI-only SillyOS product entry. */
export const sillyOsApplicationV1: WebGuiApplicationV1 = {
  applicationId: "example-silly-os",
  viewport: {
    canvas: { width: 1440, height: 900 },
    mode: "fluid",
    fallbackSize: { width: 1440, height: 900 },
  },
  ui: ({ reportFailure }) => {
    const controller = createCreatorControllerV1({
      creator: createDeterministicFakeCreatorV1(),
      createRepository: createBrowserProgramRepositoryV1,
    });
    return {
      content: <SillyOsAppV1 controller={controller} reportFailure={reportFailure} />,
      dispose: () => void controller.dispose(),
    };
  },
};
