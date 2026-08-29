// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";

import { parseNonNegativeSafeInteger } from "@sillymaker/base";
import type { CoreRollbackPortV1 } from "@sillymaker/base/runtime";
import type { HeldInputPortV1 } from "@sillymaker/ui";

import { createDefaultVnPlayerV1 } from "./index.ts";

const heldInputV1: HeldInputPortV1 = {
  state: {
    getCurrent: () => ({ heldActionIds: new Set() }),
    subscribe: () => () => undefined,
  },
};

const rollbackV1: CoreRollbackPortV1 = {
  available: () => ({
    steps: parseNonNegativeSafeInteger(0),
    forwardSteps: parseNonNegativeSafeInteger(0),
  }),
  toPrevious: async () => ({ kind: "rejected", code: "rollback_unavailable" }),
  toNext: async () => ({ kind: "rejected", code: "rollforward_unavailable" }),
  subscribe: () => () => undefined,
};

describe("official VN preset", () => {
  it("is a thin static composition of core input, UI, and focused History", () => {
    const player = createDefaultVnPlayerV1({ heldInput: heldInputV1, rollback: rollbackV1 });

    expect(player.renderer).toBeTypeOf("function");
    expect(player.history.renderer).toBeTypeOf("function");
    expect(player.input.keyboard.Enter).toBe("narrative.advance");
    expect(player.input.held.Control).toBe("player.fast_forward");
  });
});
