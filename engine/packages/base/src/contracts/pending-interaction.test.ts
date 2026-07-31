// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";

import { PresentationDataError } from "./presentation-data.ts";
import {
  evaluateInteractionResolutionV1,
  interactionOccurrenceIdV1,
  parseInteractionResolutionV1,
  parsePendingInteractionV1,
} from "./pending-interaction.ts";
import type { PendingInteractionV1 } from "./pending-interaction.ts";

function choiceFixtureV1(): PendingInteractionV1 {
  return parsePendingInteractionV1({
    kind: "choice",
    definitionId: "interaction.test.approach",
    seenRevision: 1,
    occurrenceId: interactionOccurrenceIdV1(3),
    promptTextId: "text.test.prompt",
    options: [
      { choiceId: "choice.test.basic", textId: "text.test.basic" },
      { choiceId: "choice.test.precise", textId: "text.test.precise" },
    ],
  });
}

describe("PendingInteractionV1", () => {
  it("round-trips every interaction kind through plain JSON", () => {
    const interactions = [
      {
        kind: "say",
        definitionId: "interaction.test.intro",
        seenRevision: 2,
        occurrenceId: interactionOccurrenceIdV1(1),
        speakerTextId: "text.test.speaker",
        textId: "text.test.line",
        advancePolicy: "confirm",
      },
      {
        kind: "pause",
        definitionId: "interaction.test.hold",
        seenRevision: 1,
        occurrenceId: interactionOccurrenceIdV1(2),
        durationMs: 400,
        skippable: true,
      },
      {
        kind: "presentation_barrier",
        definitionId: "interaction.test.flash",
        seenRevision: 1,
        occurrenceId: interactionOccurrenceIdV1(4),
        expectedTransitionId: "transition.test.fade",
        loadRecovery: "settle",
      },
      {
        kind: "custom",
        definitionId: "interaction.test.dial",
        seenRevision: 1,
        occurrenceId: interactionOccurrenceIdV1(5),
        surfaceId: "surface.test.calibration",
        params: { min: 1, max: 3, labels: ["低", "中", "高"] },
      },
    ];
    for (const interaction of interactions) {
      const parsed = parsePendingInteractionV1(interaction);
      expect(parsePendingInteractionV1(JSON.parse(JSON.stringify(parsed)))).toEqual(parsed);
      expect(Object.isFrozen(parsed)).toBe(true);
    }
  });

  it("rejects functions, floats, duplicate choices, and unknown kinds", () => {
    expect(() =>
      parsePendingInteractionV1({
        kind: "custom",
        definitionId: "interaction.test.dial",
        seenRevision: 1,
        occurrenceId: interactionOccurrenceIdV1(1),
        surfaceId: "surface.test.calibration",
        params: { callback: () => {} },
      })
    ).toThrow(PresentationDataError);
    expect(() =>
      parsePendingInteractionV1({
        kind: "custom",
        definitionId: "interaction.test.dial",
        seenRevision: 1,
        occurrenceId: interactionOccurrenceIdV1(1),
        surfaceId: "surface.test.calibration",
        params: { scale: 0.5 },
      })
    ).toThrow("interaction_json_integer_expected");
    expect(() =>
      parsePendingInteractionV1({
        ...JSON.parse(JSON.stringify(choiceFixtureV1())),
        options: [
          { choiceId: "choice.test.basic", textId: "text.test.basic" },
          { choiceId: "choice.test.basic", textId: "text.test.copy" },
        ],
      })
    ).toThrow("choice_id_duplicate");
    expect(() => parsePendingInteractionV1({ kind: "teleport" })).toThrow(
      "interaction_kind_invalid",
    );
  });

  it("evaluates resolutions with one shared occurrence-fenced evaluator", () => {
    const pending = choiceFixtureV1();
    const okay = evaluateInteractionResolutionV1(
      pending,
      pending.occurrenceId,
      parseInteractionResolutionV1({ kind: "choose", choiceId: "choice.test.basic" }),
    );
    expect(okay).toEqual({ kind: "accepted" });

    expect(
      evaluateInteractionResolutionV1(
        null,
        pending.occurrenceId,
        parseInteractionResolutionV1({ kind: "advance" }),
      ),
    ).toEqual({ kind: "rejected", code: "interaction.none_pending" });

    expect(
      evaluateInteractionResolutionV1(
        pending,
        interactionOccurrenceIdV1(99),
        parseInteractionResolutionV1({ kind: "choose", choiceId: "choice.test.basic" }),
      ),
    ).toEqual({ kind: "rejected", code: "interaction.occurrence_mismatch" });

    expect(
      evaluateInteractionResolutionV1(
        pending,
        pending.occurrenceId,
        parseInteractionResolutionV1({ kind: "advance" }),
      ),
    ).toEqual({ kind: "rejected", code: "interaction.kind_mismatch" });

    expect(
      evaluateInteractionResolutionV1(
        pending,
        pending.occurrenceId,
        parseInteractionResolutionV1({ kind: "choose", choiceId: "choice.test.ghost" }),
      ),
    ).toEqual({ kind: "rejected", code: "interaction.choice_unknown" });

    expect(
      evaluateInteractionResolutionV1(
        pending,
        pending.occurrenceId,
        parseInteractionResolutionV1({ kind: "choose", choiceId: "choice.test.precise" }),
        { isChoiceEnabled: (choiceId) => choiceId !== "choice.test.precise" },
      ),
    ).toEqual({ kind: "rejected", code: "interaction.choice_disabled" });
  });

  it("fences barriers by transition identity and customs by payload schema", () => {
    const barrier = parsePendingInteractionV1({
      kind: "presentation_barrier",
      definitionId: "interaction.test.flash",
      seenRevision: 1,
      occurrenceId: interactionOccurrenceIdV1(7),
      expectedTransitionId: "transition.test.fade",
      loadRecovery: "replay",
    });
    expect(
      evaluateInteractionResolutionV1(
        barrier,
        barrier.occurrenceId,
        parseInteractionResolutionV1({
          kind: "barrier_completed",
          transitionId: "transition.test.slide",
        }),
      ),
    ).toEqual({ kind: "rejected", code: "interaction.barrier_mismatch" });
    expect(
      evaluateInteractionResolutionV1(
        barrier,
        barrier.occurrenceId,
        parseInteractionResolutionV1({
          kind: "barrier_completed",
          transitionId: "transition.test.fade",
        }),
      ),
    ).toEqual({ kind: "accepted" });

    const custom = parsePendingInteractionV1({
      kind: "custom",
      definitionId: "interaction.test.dial",
      seenRevision: 1,
      occurrenceId: interactionOccurrenceIdV1(8),
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
      evaluateInteractionResolutionV1(
        custom,
        custom.occurrenceId,
        parseInteractionResolutionV1({ kind: "custom", payload: { value: 9 } }),
        validate,
      ),
    ).toEqual({ kind: "rejected", code: "interaction.payload_invalid" });
    expect(
      evaluateInteractionResolutionV1(
        custom,
        custom.occurrenceId,
        parseInteractionResolutionV1({ kind: "custom", payload: { value: 2 } }),
        validate,
      ),
    ).toEqual({ kind: "accepted" });
  });
});
