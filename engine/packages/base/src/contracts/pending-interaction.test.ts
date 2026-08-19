// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";

import { canonicalJsonBytes } from "./canonical-json.ts";
import { PresentationDataError } from "./presentation-data.ts";
import {
  applyHoldTickV1,
  countHoldTickCrossingsV1,
  evaluateInteractionResolutionV1,
  interactionOccurrenceIdV1,
  parseInteractionResolutionV1,
  parsePendingInteractionV1,
} from "./pending-interaction.ts";
import type { HoldPendingInteractionV1, PendingInteractionV1 } from "./pending-interaction.ts";

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
      expect(Object.isFrozen(parsed)).toBe(true);
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

  it("projects dangerous custom JSON keys as exact frozen own data without legacy setters", () => {
    const legacyProtoDescriptor = Object.getOwnPropertyDescriptor(
      Object.prototype,
      "__proto__",
    );
    if (legacyProtoDescriptor === undefined || legacyProtoDescriptor.configurable !== true) {
      throw new Error("expected configurable Object.prototype.__proto__ accessor");
    }

    const dangerousRecordV1 = () => {
      const record: Record<string, unknown> = {};
      for (
        const [key, value] of [
          ["__proto__", { safe: 1 }],
          ["constructor", { safe: 2 }],
          ["prototype", { safe: 3 }],
        ] as const
      ) {
        Object.defineProperty(record, key, {
          value,
          writable: true,
          enumerable: true,
          configurable: true,
        });
      }
      return record;
    };
    const resolutionRawNested = dangerousRecordV1();
    const pendingRawNested = dangerousRecordV1();
    let legacySetterCalls = 0;

    // oxlint-disable-next-line no-extend-native -- characterizes the legacy setter boundary
    Object.defineProperty(Object.prototype, "__proto__", {
      ...legacyProtoDescriptor,
      set(_value: unknown) {
        legacySetterCalls += 1;
      },
    });
    try {
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

      expect(legacySetterCalls).toBe(0);
      const expectedBytes =
        '{"nested":{"__proto__":{"safe":1},"constructor":{"safe":2},"prototype":{"safe":3}}}';
      for (
        const [projected, raw] of [
          [resolution.payload.nested, resolutionRawNested],
          [pending.params.nested, pendingRawNested],
        ] as const
      ) {
        expect(projected).not.toBe(raw);
        expect(Object.getPrototypeOf(projected)).toBe(Object.prototype);
        expect(Reflect.ownKeys(projected as object)).toEqual([
          "__proto__",
          "constructor",
          "prototype",
        ]);
        expect(Object.isFrozen(projected)).toBe(true);
        for (
          const [key, value] of [
            ["__proto__", { safe: 1 }],
            ["constructor", { safe: 2 }],
            ["prototype", { safe: 3 }],
          ] as const
        ) {
          const descriptor = Object.getOwnPropertyDescriptor(projected, key);
          expect(descriptor).toEqual({
            value,
            writable: false,
            enumerable: true,
            configurable: false,
          });
          expect(Object.isFrozen(descriptor?.value)).toBe(true);
        }
      }
      expect(new TextDecoder().decode(canonicalJsonBytes(resolution.payload))).toBe(expectedBytes);
      expect(new TextDecoder().decode(canonicalJsonBytes(pending.params))).toBe(expectedBytes);
    } finally {
      // oxlint-disable-next-line no-extend-native -- restores the exact intrinsic descriptor
      Object.defineProperty(Object.prototype, "__proto__", legacyProtoDescriptor);
    }
  });

  it("uses captured projection intrinsics across payload getter reentry", () => {
    const defineProperty = Object.defineProperty;
    const freeze = Object.freeze;
    const payload: Record<string, unknown> = {};
    let getterCalls = 0;
    defineProperty(payload, "a", {
      enumerable: true,
      configurable: true,
      get() {
        getterCalls += 1;
        Object.defineProperty = ((_target: object) => _target) as typeof Object.defineProperty;
        Object.freeze = ((value: object) => value) as typeof Object.freeze;
        return 1;
      },
    });
    defineProperty(payload, "b", {
      enumerable: true,
      configurable: true,
      writable: true,
      value: [2],
    });

    let resolution;
    try {
      resolution = parseInteractionResolutionV1({ kind: "custom", payload });
    } finally {
      Object.defineProperty = defineProperty;
      Object.freeze = freeze;
    }
    if (resolution.kind !== "custom") throw new Error("expected custom resolution");
    const projected = resolution.payload;

    expect(getterCalls).toBe(1);
    expect(Object.isFrozen(resolution)).toBe(true);
    expect(Reflect.ownKeys(projected)).toEqual(["a", "b"]);
    expect(Object.isFrozen(projected)).toBe(true);
    expect(Object.getOwnPropertyDescriptor(projected, "a")).toEqual({
      value: 1,
      writable: false,
      enumerable: true,
      configurable: false,
    });
    expect(Object.getOwnPropertyDescriptor(projected, "b")).toEqual({
      value: [2],
      writable: false,
      enumerable: true,
      configurable: false,
    });
    expect(Object.isFrozen(projected.b)).toBe(true);
    expect(new TextDecoder().decode(canonicalJsonBytes(projected))).toBe('{"a":1,"b":[2]}');
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

  it("admits holds strictly and fences hold_tick by occurrence and kind", () => {
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

    for (const elapsedMs of [0, -1, 0.5, Number.NaN, Number.MAX_SAFE_INTEGER + 2]) {
      expect(() => parseInteractionResolutionV1({ kind: "hold_tick", elapsedMs })).toThrow(
        "hold_elapsed_invalid",
      );
    }

    expect(
      evaluateInteractionResolutionV1(
        hold,
        hold.occurrenceId,
        parseInteractionResolutionV1({ kind: "hold_tick", elapsedMs: 500 }),
      ),
    ).toEqual({ kind: "accepted" });
    expect(
      evaluateInteractionResolutionV1(
        hold,
        interactionOccurrenceIdV1(99),
        parseInteractionResolutionV1({ kind: "hold_tick", elapsedMs: 500 }),
      ),
    ).toEqual({ kind: "rejected", code: "interaction.occurrence_mismatch" });
    // The deleted pause vocabulary stays deleted: `resume` no longer parses.
    expect(() => parseInteractionResolutionV1({ kind: "resume" })).toThrow(
      "resolution_kind_invalid",
    );
    expect(
      evaluateInteractionResolutionV1(
        hold,
        hold.occurrenceId,
        parseInteractionResolutionV1({ kind: "advance" }),
      ),
    ).toEqual({ kind: "rejected", code: "interaction.kind_mismatch" });
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
    const afterPartial = applyHoldTickV1(cadenced, 250);
    if (afterPartial.kind !== "holding") throw new Error("expected holding");
    expect(afterPartial.pending.tickQuantumMs).toBe(250);
    expect(afterPartial.pending.remainingMs).toBe(1250);
  });

  it("settles tick-effect crossings identically for any batch split of the same sum", () => {
    const totalMs = 1500;
    const everyMs = 400;
    const settle = (elapsedBatches: readonly number[]): number => {
      let remainingMs = totalMs;
      let crossings = 0;
      for (const elapsedMs of elapsedBatches) {
        const beforeRemainingMs = remainingMs;
        remainingMs = Math.max(0, remainingMs - elapsedMs);
        crossings += countHoldTickCrossingsV1({
          totalMs,
          beforeRemainingMs,
          afterRemainingMs: remainingMs,
          everyMs,
        });
      }
      return crossings;
    };

    // {500,500,500} ≡ {1500} ≡ any other split: 400/800/1200 crossed 3 times.
    expect(settle([1500])).toBe(3);
    expect(settle([500, 500, 500])).toBe(3);
    expect(settle([100, 299, 1, 700, 400])).toBe(3);
    expect(settle([1499, 1])).toBe(3);

    // A multiple landing exactly on expiry belongs to the zero-reaching
    // tick: every 500 over 1500 settles 3 crossings, the last at expiry.
    expect(
      countHoldTickCrossingsV1({
        totalMs: 1500,
        beforeRemainingMs: 500,
        afterRemainingMs: 0,
        everyMs: 500,
      }),
    ).toBe(1);

    // No progress, no crossing; sub-threshold progress, no crossing.
    expect(
      countHoldTickCrossingsV1({
        totalMs: 1500,
        beforeRemainingMs: 1500,
        afterRemainingMs: 1101,
        everyMs: 400,
      }),
    ).toBe(0);

    expect(() =>
      countHoldTickCrossingsV1({
        totalMs: 1500,
        beforeRemainingMs: 100,
        afterRemainingMs: 200,
        everyMs: 400,
      })
    ).toThrow(TypeError);
    expect(() =>
      countHoldTickCrossingsV1({
        totalMs: 1500,
        beforeRemainingMs: 1500,
        afterRemainingMs: 1000,
        everyMs: 0,
      })
    ).toThrow(TypeError);
  });

  it("keeps the boundary occurrence across partial ticks and expires on the zero-reaching tick", () => {
    const hold = parsePendingInteractionV1({
      kind: "hold",
      definitionId: "interaction.test.commute-hold",
      seenRevision: 1,
      occurrenceId: interactionOccurrenceIdV1(12),
      totalMs: 1500,
      remainingMs: 1500,
      skippable: false,
    }) as HoldPendingInteractionV1;

    const afterFirst = applyHoldTickV1(hold, 500);
    if (afterFirst.kind !== "holding") throw new Error("expected holding");
    expect(afterFirst.pending.remainingMs).toBe(1000);
    expect(afterFirst.pending.totalMs).toBe(1500);
    expect(afterFirst.pending.occurrenceId).toBe(hold.occurrenceId);
    expect(afterFirst.pending.definitionId).toBe(hold.definitionId);
    expect(Object.isFrozen(afterFirst.pending)).toBe(true);

    const afterSecond = applyHoldTickV1(afterFirst.pending, 500);
    if (afterSecond.kind !== "holding") throw new Error("expected holding");
    expect(afterSecond.pending.remainingMs).toBe(500);
    expect(afterSecond.pending.occurrenceId).toBe(hold.occurrenceId);

    // The zero-reaching tick expires in the same application: there is no
    // separate hold_expire step.
    expect(applyHoldTickV1(afterSecond.pending, 500)).toEqual({ kind: "expired" });

    // Overshoot clamps instead of rejecting (frame hitches, skip folds).
    expect(applyHoldTickV1(afterSecond.pending, 900_000)).toEqual({ kind: "expired" });

    expect(() => applyHoldTickV1(hold, 0)).toThrow(TypeError);
    expect(() => applyHoldTickV1(hold, 16.7)).toThrow(TypeError);
  });

  it("reaches the same terminal state for any batch split with the same millisecond sum", () => {
    const hold = parsePendingInteractionV1({
      kind: "hold",
      definitionId: "interaction.test.commute-hold",
      seenRevision: 1,
      occurrenceId: interactionOccurrenceIdV1(13),
      totalMs: 1500,
      remainingMs: 1500,
      skippable: false,
    }) as HoldPendingInteractionV1;

    const runBatches = (batches: readonly number[]) => {
      let pending: HoldPendingInteractionV1 | null = hold;
      const trace: (number | "expired")[] = [];
      for (const elapsedMs of batches) {
        if (pending === null) throw new Error("ticked past expiry");
        const outcome = applyHoldTickV1(pending, elapsedMs);
        if (outcome.kind === "expired") {
          pending = null;
          trace.push("expired");
        } else {
          pending = outcome.pending;
          trace.push(outcome.pending.remainingMs);
        }
      }
      return { pending, trace };
    };

    const fine = runBatches([500, 500, 500]);
    const coarse = runBatches([1500]);
    const uneven = runBatches([1, 1498, 1]);
    expect(fine.pending).toBeNull();
    expect(coarse.pending).toBeNull();
    expect(uneven.pending).toBeNull();
    expect(fine.trace).toEqual([1000, 500, "expired"]);
    expect(uneven.trace).toEqual([1499, 1, "expired"]);

    // Equal prefix sums produce byte-identical pendings (Save shape).
    const viaTwo = runBatches([300, 700]);
    const viaOne = runBatches([1000]);
    expect(viaTwo.pending).not.toBeNull();
    expect(canonicalJsonBytes(viaTwo.pending)).toEqual(canonicalJsonBytes(viaOne.pending));
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
