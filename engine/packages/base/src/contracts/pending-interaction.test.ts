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
