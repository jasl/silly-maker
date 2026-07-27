// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";

import { PresentationDataError } from "./presentation-data.js";
import {
  evaluateInteractionResolutionV2,
  interactionOccurrenceIdV2,
  parseInteractionResolutionV2,
  parsePendingInteractionV2,
} from "./pending-interaction.js";
import type { PendingInteractionV2 } from "./pending-interaction.js";

function choiceFixtureV1(): PendingInteractionV2 {
  return parsePendingInteractionV2({
    kind: "choice",
    definitionId: "interaction.test.approach",
    seenRevision: 1,
    occurrenceId: interactionOccurrenceIdV2(3),
    promptTextId: "text.test.prompt",
    options: [
      { choiceId: "choice.test.basic", textId: "text.test.basic" },
      { choiceId: "choice.test.precise", textId: "text.test.precise" },
    ],
  });
}

describe("PendingInteractionV2", () => {
  it("round-trips every interaction kind through plain JSON", () => {
    const interactions = [
      {
        kind: "say",
        definitionId: "interaction.test.intro",
        seenRevision: 2,
        occurrenceId: interactionOccurrenceIdV2(1),
        speakerTextId: "text.test.speaker",
        textId: "text.test.line",
        advancePolicy: "confirm",
      },
      {
        kind: "pause",
        definitionId: "interaction.test.hold",
        seenRevision: 1,
        occurrenceId: interactionOccurrenceIdV2(2),
        durationMs: 400,
        skippable: true,
      },
      {
        kind: "presentation_barrier",
        definitionId: "interaction.test.flash",
        seenRevision: 1,
        occurrenceId: interactionOccurrenceIdV2(4),
        expectedTransitionId: "transition.test.fade",
        loadRecovery: "settle",
      },
      {
        kind: "custom",
        definitionId: "interaction.test.dial",
        seenRevision: 1,
        occurrenceId: interactionOccurrenceIdV2(5),
        surfaceId: "surface.test.calibration",
        params: { min: 1, max: 3, labels: ["低", "中", "高"] },
      },
    ];
    for (const interaction of interactions) {
      const parsed = parsePendingInteractionV2(interaction);
      expect(parsePendingInteractionV2(JSON.parse(JSON.stringify(parsed)))).toEqual(parsed);
      expect(Object.isFrozen(parsed)).toBe(true);
    }
  });

  it("rejects functions, floats, duplicate choices, and unknown kinds", () => {
    expect(() =>
      parsePendingInteractionV2({
        kind: "custom",
        definitionId: "interaction.test.dial",
        seenRevision: 1,
        occurrenceId: interactionOccurrenceIdV2(1),
        surfaceId: "surface.test.calibration",
        params: { callback: () => {} },
      }),
    ).toThrow(PresentationDataError);
    expect(() =>
      parsePendingInteractionV2({
        kind: "custom",
        definitionId: "interaction.test.dial",
        seenRevision: 1,
        occurrenceId: interactionOccurrenceIdV2(1),
        surfaceId: "surface.test.calibration",
        params: { scale: 0.5 },
      }),
    ).toThrow("interaction_json_integer_expected");
    expect(() =>
      parsePendingInteractionV2({
        ...JSON.parse(JSON.stringify(choiceFixtureV1())),
        options: [
          { choiceId: "choice.test.basic", textId: "text.test.basic" },
          { choiceId: "choice.test.basic", textId: "text.test.copy" },
        ],
      }),
    ).toThrow("choice_id_duplicate");
    expect(() => parsePendingInteractionV2({ kind: "teleport" })).toThrow(
      "interaction_kind_invalid",
    );
  });

  it("evaluates resolutions with one shared occurrence-fenced evaluator", () => {
    const pending = choiceFixtureV1();
    const okay = evaluateInteractionResolutionV2(
      pending,
      pending.occurrenceId,
      parseInteractionResolutionV2({ kind: "choose", choiceId: "choice.test.basic" }),
    );
    expect(okay).toEqual({ kind: "accepted" });

    expect(
      evaluateInteractionResolutionV2(
        null,
        pending.occurrenceId,
        parseInteractionResolutionV2({ kind: "advance" }),
      ),
    ).toEqual({ kind: "rejected", code: "interaction.none_pending" });

    expect(
      evaluateInteractionResolutionV2(
        pending,
        interactionOccurrenceIdV2(99),
        parseInteractionResolutionV2({ kind: "choose", choiceId: "choice.test.basic" }),
      ),
    ).toEqual({ kind: "rejected", code: "interaction.occurrence_mismatch" });

    expect(
      evaluateInteractionResolutionV2(
        pending,
        pending.occurrenceId,
        parseInteractionResolutionV2({ kind: "advance" }),
      ),
    ).toEqual({ kind: "rejected", code: "interaction.kind_mismatch" });

    expect(
      evaluateInteractionResolutionV2(
        pending,
        pending.occurrenceId,
        parseInteractionResolutionV2({ kind: "choose", choiceId: "choice.test.ghost" }),
      ),
    ).toEqual({ kind: "rejected", code: "interaction.choice_unknown" });

    expect(
      evaluateInteractionResolutionV2(
        pending,
        pending.occurrenceId,
        parseInteractionResolutionV2({ kind: "choose", choiceId: "choice.test.precise" }),
        { isChoiceEnabled: (choiceId) => choiceId !== "choice.test.precise" },
      ),
    ).toEqual({ kind: "rejected", code: "interaction.choice_disabled" });
  });

  it("fences barriers by transition identity and customs by payload schema", () => {
    const barrier = parsePendingInteractionV2({
      kind: "presentation_barrier",
      definitionId: "interaction.test.flash",
      seenRevision: 1,
      occurrenceId: interactionOccurrenceIdV2(7),
      expectedTransitionId: "transition.test.fade",
      loadRecovery: "replay",
    });
    expect(
      evaluateInteractionResolutionV2(
        barrier,
        barrier.occurrenceId,
        parseInteractionResolutionV2({
          kind: "barrier_completed",
          transitionId: "transition.test.slide",
        }),
      ),
    ).toEqual({ kind: "rejected", code: "interaction.barrier_mismatch" });
    expect(
      evaluateInteractionResolutionV2(
        barrier,
        barrier.occurrenceId,
        parseInteractionResolutionV2({
          kind: "barrier_completed",
          transitionId: "transition.test.fade",
        }),
      ),
    ).toEqual({ kind: "accepted" });

    const custom = parsePendingInteractionV2({
      kind: "custom",
      definitionId: "interaction.test.dial",
      seenRevision: 1,
      occurrenceId: interactionOccurrenceIdV2(8),
      surfaceId: "surface.test.calibration",
      params: { min: 1, max: 3 },
    });
    const validate = {
      isCustomPayloadValid: (surfaceId: string, payload: Readonly<Record<string, unknown>>) =>
        surfaceId === "surface.test.calibration" &&
        typeof payload.value === "number" &&
        payload.value >= 1 &&
        payload.value <= 3,
    };
    expect(
      evaluateInteractionResolutionV2(
        custom,
        custom.occurrenceId,
        parseInteractionResolutionV2({ kind: "custom", payload: { value: 9 } }),
        validate,
      ),
    ).toEqual({ kind: "rejected", code: "interaction.payload_invalid" });
    expect(
      evaluateInteractionResolutionV2(
        custom,
        custom.occurrenceId,
        parseInteractionResolutionV2({ kind: "custom", payload: { value: 2 } }),
        validate,
      ),
    ).toEqual({ kind: "accepted" });
  });
});
