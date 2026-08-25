// SPDX-License-Identifier: MIT
import type { WebGuiApplicationV1 } from "@sillymaker/web/gui-application";

import {
  cardsActivateActionV1,
  cardsFocusNextActionV1,
  cardsFocusPreviousActionV1,
} from "../gui/input.ts";
import { CardsRootV1 } from "./cards-root.tsx";

/** Browser and Deno Desktop share this GUI-only application declaration. */
export const cardsWebApplicationV1: WebGuiApplicationV1 = {
  applicationId: "example-cards",
  viewport: {
    canvas: { width: 480, height: 272 },
    mode: "fluid",
    fallbackSize: { width: 480, height: 272 },
  },
  ui: ({ reportFailure }) => ({
    content: <CardsRootV1 reportFailure={reportFailure} />,
    input: {
      keyboard: {
        ArrowLeft: cardsFocusPreviousActionV1,
        ArrowRight: cardsFocusNextActionV1,
        KeyZ: cardsActivateActionV1,
      },
      gamepad: {
        0: cardsActivateActionV1,
        14: cardsFocusPreviousActionV1,
        15: cardsFocusNextActionV1,
      },
    },
  }),
};
