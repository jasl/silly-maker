// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";

import {
  evaluateDeterminismSaveSummaryProjectionV1,
  saveMetadataCompactExpectedV1,
} from "./determinism-vectors.ts";

describe("DET4 determinism vector facade", () => {
  it("synchronously normalizes one synthetic Save summary projection", () => {
    const state = Object.freeze({ checkpoint: 7, scene: "Neutral scene" });
    const sourceSummary = ["Checkpoint 7", "Neutral scene"];
    let callbackCount = 0;
    let receivedState: typeof state | undefined;

    const actual = evaluateDeterminismSaveSummaryProjectionV1({
      state,
      summarizeSave(currentState) {
        callbackCount += 1;
        receivedState = currentState;
        return sourceSummary;
      },
    });

    sourceSummary[0] = "mutated after projection";

    expect(callbackCount).toBe(1);
    expect(receivedState).toBe(state);
    expect(actual).toEqual(saveMetadataCompactExpectedV1.summaries.valid);
    expect(Object.isFrozen(actual)).toBe(true);
  });
});
