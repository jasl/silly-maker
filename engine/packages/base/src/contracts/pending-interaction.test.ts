// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";

import { canonicalJsonBytes } from "./canonical-json.ts";
import { PresentationDataError } from "./presentation-data.ts";
import {
  evaluateInteractionResolutionV1,
  interactionOccurrenceIdV1,
  parseInteractionResolutionV1,
  parsePendingInteractionV1,
} from "./pending-interaction.ts";
import type { PendingInteractionV1 } from "./pending-interaction.ts";
import { applyElapsedToHoldV1 } from "./time-tick.ts";

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
        // A mid-hold Save shape: partial progress already committed.
        kind: "hold",
        definitionId: "interaction.test.hold",
        seenRevision: 1,
        occurrenceId: interactionOccurrenceIdV1(10),
        totalMs: 7833,
        remainingMs: 833,
        skippable: false,
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
    }
  });

  it("admits a choice menu with more than sixteen options", () => {
    const options = Array.from({ length: 17 }, (_, index) => {
      const token = String(index + 1).padStart(2, "0");
      return {
        choiceId: `choice.test.opt${token}`,
        textId: `text.test.opt${token}`,
      };
    });
    const pending = parsePendingInteractionV1({
      kind: "choice",
      definitionId: "interaction.test.wide-menu",
      seenRevision: 1,
      occurrenceId: interactionOccurrenceIdV1(6),
      promptTextId: "text.test.prompt",
      options,
    });
    if (pending.kind !== "choice") throw new Error("expected choice");
    expect(pending.options).toHaveLength(17);
    expect(
      evaluateInteractionResolutionV1(
        pending,
        pending.occurrenceId,
        parseInteractionResolutionV1({ kind: "choose", choiceId: "choice.test.opt17" }),
      ),
    ).toEqual({ kind: "accepted" });
  });

  it("still rejects an empty choice list", () => {
    expect(() =>
      parsePendingInteractionV1({
        kind: "choice",
        definitionId: "interaction.test.empty-menu",
        seenRevision: 1,
        occurrenceId: interactionOccurrenceIdV1(6),
        promptTextId: "text.test.prompt",
        options: [],
      })
    ).toThrow("choice_options_invalid");
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

  it("detaches custom JSON while preserving canonical dangerous keys", () => {
    const dangerousRecordV1 = () =>
      Object.fromEntries(
        [
          ["__proto__", { safe: 1 }],
          ["constructor", { safe: 2 }],
          ["prototype", { safe: 3 }],
        ] as const,
      );
    const resolutionRawNested = dangerousRecordV1();
    const pendingRawNested = dangerousRecordV1();
    const resolution = parseInteractionResolutionV1({
      kind: "custom",
      payload: { nested: resolutionRawNested },
    });
    if (resolution.kind !== "custom") throw new Error("expected custom resolution");
    const pending = parsePendingInteractionV1({
      kind: "custom",
      definitionId: "interaction.test.dangerous-keys",
      seenRevision: 1,
      occurrenceId: interactionOccurrenceIdV1(9),
      surfaceId: "surface.test.dangerous-keys",
      params: { nested: pendingRawNested },
    });
    if (pending.kind !== "custom") throw new Error("expected custom interaction");

    const expectedBytes =
      '{"nested":{"__proto__":{"safe":1},"constructor":{"safe":2},"prototype":{"safe":3}}}';
    expect(resolution.payload.nested).not.toBe(resolutionRawNested);
    expect(pending.params.nested).not.toBe(pendingRawNested);
    expect(Object.keys(resolution.payload.nested as object)).toEqual([
      "__proto__",
      "constructor",
      "prototype",
    ]);
    expect(new TextDecoder().decode(canonicalJsonBytes(resolution.payload))).toBe(expectedBytes);
    expect(new TextDecoder().decode(canonicalJsonBytes(pending.params))).toBe(expectedBytes);
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

  it("admits holds strictly and rejects every input resolution against a hold", () => {
    const holdRawV1 = {
      kind: "hold",
      definitionId: "interaction.test.commute-hold",
      seenRevision: 1,
      occurrenceId: interactionOccurrenceIdV1(11),
      totalMs: 1500,
      remainingMs: 1500,
      skippable: false,
    };
    const hold = parsePendingInteractionV1(holdRawV1);
    if (hold.kind !== "hold") throw new Error("expected hold");

    // remainingMs may never exceed the total, and a zero remainder cannot
    // be saved: the tick reaching zero expires the boundary in-commit.
    expect(() => parsePendingInteractionV1({ ...holdRawV1, remainingMs: 1501 })).toThrow(
      "hold_remaining_invalid",
    );
    expect(() => parsePendingInteractionV1({ ...holdRawV1, remainingMs: 0 })).toThrow(
      "duration_invalid",
    );
    expect(() => parsePendingInteractionV1({ ...holdRawV1, totalMs: 0 })).toThrow(
      "duration_invalid",
    );

    // The merged verbs stay deleted from the resolution vocabulary: neither
    // `resume` (pause era) nor `hold_tick` (pre-merge era) parses. Holds are
    // settled by the session-level time verb, never by an input resolution.
    expect(() => parseInteractionResolutionV1({ kind: "resume" })).toThrow(
      "resolution_kind_invalid",
    );
    expect(() => parseInteractionResolutionV1({ kind: "hold_tick", elapsedMs: 500 })).toThrow(
      "resolution_kind_invalid",
    );
    expect(
      evaluateInteractionResolutionV1(
        hold,
        interactionOccurrenceIdV1(99),
        parseInteractionResolutionV1({ kind: "advance" }),
      ),
    ).toEqual({ kind: "rejected", code: "interaction.occurrence_mismatch" });
    for (
      const resolution of [
        parseInteractionResolutionV1({ kind: "advance" }),
        parseInteractionResolutionV1({ kind: "choose", choiceId: "choice.test.basic" }),
        parseInteractionResolutionV1({ kind: "custom", payload: { value: 1 } }),
      ]
    ) {
      expect(
        evaluateInteractionResolutionV1(hold, hold.occurrenceId, resolution),
      ).toEqual({ kind: "rejected", code: "interaction.kind_mismatch" });
    }
  });

  it("admits the optional block-declared tick cadence and keeps it across partial ticks", () => {
    const cadencedRawV1 = {
      kind: "hold",
      definitionId: "interaction.test.commute-hold",
      seenRevision: 1,
      occurrenceId: interactionOccurrenceIdV1(12),
      totalMs: 1500,
      remainingMs: 1500,
      skippable: false,
      tickQuantumMs: 250,
    };
    const cadenced = parsePendingInteractionV1(cadencedRawV1);
    if (cadenced.kind !== "hold") throw new Error("expected hold");
    expect(cadenced.tickQuantumMs).toBe(250);
    // The canonical shape omits the member entirely when absent, so an
    // M1-era hold without a cadence stays byte-identical.
    const { tickQuantumMs: _omitted, ...plainRawV1 } = cadencedRawV1;
    const plain = parsePendingInteractionV1(plainRawV1);
    if (plain.kind !== "hold") throw new Error("expected hold");
    expect(Object.hasOwn(plain, "tickQuantumMs")).toBe(false);

    for (const tickQuantumMs of [0, -1, 0.5, "250", null, 600_001]) {
      expect(() => parsePendingInteractionV1({ ...cadencedRawV1, tickQuantumMs })).toThrow(
        "duration_invalid",
      );
    }

    // The runner arithmetic ignores the cadence but preserves the member
    // across partial ticks, so a mid-hold Save keeps the block's rhythm.
    const afterPartial = applyElapsedToHoldV1(cadenced, 250);
    if (afterPartial.kind !== "holding") throw new Error("expected holding");
    expect(afterPartial.pending.tickQuantumMs).toBe(250);
    expect(afterPartial.pending.remainingMs).toBe(1250);
  });

  it("admits the optional pace hint and keeps it across partial ticks", () => {
    const realtimeRawV1 = {
      kind: "hold",
      definitionId: "interaction.test.reaction-window",
      seenRevision: 1,
      occurrenceId: interactionOccurrenceIdV1(13),
      totalMs: 900,
      remainingMs: 900,
      skippable: true,
      pace: "realtime",
    };
    const realtime = parsePendingInteractionV1(realtimeRawV1);
    if (realtime.kind !== "hold") throw new Error("expected hold");
    expect(realtime.pace).toBe("realtime");
    expect(
      (() => {
        const explicit = parsePendingInteractionV1({ ...realtimeRawV1, pace: "cinematic" });
        return explicit.kind === "hold" ? explicit.pace : null;
      })(),
    ).toBe("cinematic");
    // The canonical shape omits the member when the block does not declare
    // a pace, so earlier holds stay byte-identical (cinematic by absence).
    const { pace: _omitted, ...plainRawV1 } = realtimeRawV1;
    const plain = parsePendingInteractionV1(plainRawV1);
    if (plain.kind !== "hold") throw new Error("expected hold");
    expect(Object.hasOwn(plain, "pace")).toBe(false);

    for (const pace of ["fast", "", 1, null, true]) {
      expect(() => parsePendingInteractionV1({ ...realtimeRawV1, pace })).toThrow(
        "pace_invalid",
      );
    }

    // The hint is Host vocabulary: hold arithmetic ignores it but carries
    // it across partial ticks so mid-window Saves keep the declaration.
    const afterPartial = applyElapsedToHoldV1(realtime, 300);
    if (afterPartial.kind !== "holding") throw new Error("expected holding");
    expect(afterPartial.pending.pace).toBe("realtime");
    expect(afterPartial.pending.remainingMs).toBe(600);
  });

  it("admits the optional stage-input hint on say/choice/hold/custom and rejects it on barriers", () => {
    const declaredRawsV1 = [
      {
        kind: "say",
        definitionId: "interaction.test.free-look-line",
        seenRevision: 1,
        occurrenceId: interactionOccurrenceIdV1(21),
        speakerTextId: null,
        textId: "text.test.line",
        advancePolicy: "confirm",
        stageInput: "shared",
      },
      {
        kind: "choice",
        definitionId: "interaction.test.night-menu",
        seenRevision: 1,
        occurrenceId: interactionOccurrenceIdV1(22),
        promptTextId: "text.test.prompt",
        options: [{ choiceId: "choice.test.zone", textId: "text.test.zone" }],
        stageInput: "shared",
      },
      {
        kind: "hold",
        definitionId: "interaction.test.touch-bar",
        seenRevision: 1,
        occurrenceId: interactionOccurrenceIdV1(23),
        totalMs: 8000,
        remainingMs: 8000,
        skippable: false,
        stageInput: "shared",
      },
      {
        kind: "custom",
        definitionId: "interaction.test.map",
        seenRevision: 1,
        occurrenceId: interactionOccurrenceIdV1(24),
        surfaceId: "surface.test.map",
        params: {},
        stageInput: "shared",
      },
    ] as const;
    for (const raw of declaredRawsV1) {
      const shared = parsePendingInteractionV1(raw);
      if (shared.kind === "presentation_barrier") throw new Error("unexpected barrier");
      expect(shared.stageInput).toBe("shared");
      // Explicit "isolated" is admitted and kept, like an explicit
      // "cinematic" pace.
      const explicit = parsePendingInteractionV1({ ...raw, stageInput: "isolated" });
      if (explicit.kind === "presentation_barrier") throw new Error("unexpected barrier");
      expect(explicit.stageInput).toBe("isolated");
      // The canonical shape omits the member when the block does not
      // declare it, so earlier pendings stay byte-identical (isolated by
      // absence).
      const { stageInput: _omitted, ...plainRawV1 } = raw;
      const plain = parsePendingInteractionV1(plainRawV1);
      expect(Object.hasOwn(plain, "stageInput")).toBe(false);
      expect(canonicalJsonBytes(plain)).not.toEqual(canonicalJsonBytes(shared));

      for (const stageInput of ["exclusive", "", 1, null, true]) {
        expect(() => parsePendingInteractionV1({ ...raw, stageInput })).toThrow(
          "stage_input_invalid",
        );
      }
    }

    // Barriers are auto-acknowledged settlement boundaries with no user
    // input to share: exact-key admission rejects the member outright.
    expect(() =>
      parsePendingInteractionV1({
        kind: "presentation_barrier",
        definitionId: "interaction.test.flash",
        seenRevision: 1,
        occurrenceId: interactionOccurrenceIdV1(25),
        expectedTransitionId: "transition.test.fade",
        loadRecovery: "settle",
        stageInput: "shared",
      })
    ).toThrow(PresentationDataError);

    // The hint is Host vocabulary: hold arithmetic ignores it but carries
    // it across partial ticks so mid-bar Saves keep the declaration.
    const sharedHold = parsePendingInteractionV1(declaredRawsV1[2]);
    if (sharedHold.kind !== "hold") throw new Error("expected hold");
    const afterPartial = applyElapsedToHoldV1(sharedHold, 500);
    if (afterPartial.kind !== "holding") throw new Error("expected holding");
    expect(afterPartial.pending.stageInput).toBe("shared");
    expect(afterPartial.pending.remainingMs).toBe(7500);
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
