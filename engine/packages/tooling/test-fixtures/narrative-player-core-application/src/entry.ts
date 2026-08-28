// SPDX-License-Identifier: MIT
import { parseNonNegativeSafeInteger } from "@sillymaker/base/values";
import type { InputActionIdV1 } from "@sillymaker/ui/input";
import { createDefaultVnPlayerCoreV1 } from "@sillymaker/ui/narrative-player/core";

const zeroV1 = parseNonNegativeSafeInteger(0);
const emptyHeldActionsV1: ReadonlySet<InputActionIdV1> = new Set();
const playerV1 = createDefaultVnPlayerCoreV1({
  heldInput: {
    state: {
      getCurrent: () => ({ heldActionIds: emptyHeldActionsV1 }),
      subscribe: () => () => {},
    },
  },
  rollback: {
    available: () => ({ steps: zeroV1, forwardSteps: zeroV1 }),
    toPrevious: () => Promise.resolve({ kind: "rejected", code: "rollback_unavailable" }),
    toNext: () => Promise.resolve({ kind: "rejected", code: "rollforward_unavailable" }),
    subscribe: () => () => {},
  },
});

const rootV1 = document.querySelector<HTMLElement>("#root");
if (rootV1 === null) throw new TypeError("Narrative Player core fixture root is missing");
rootV1.dataset.playerRenderer = playerV1.renderer.name;
rootV1.dataset.keyboardBindings = String(Object.keys(playerV1.input.keyboard).length);
