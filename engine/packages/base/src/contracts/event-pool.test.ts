// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";

import { canonicalJsonBytes } from "./canonical-json.ts";
import { digestBytes } from "./digest.ts";
import { createTransactionalRngV1 } from "./rng.ts";
import type { RuleRngV1 } from "./rng.ts";
import { parseNonZeroUint32 } from "./values.ts";
import {
  drawFromEventPoolV1,
  evaluateEventConditionV1,
  parseEventConditionV1,
} from "./event-pool.ts";
import type { EventPoolCandidateV1, EventPoolContextV1 } from "./event-pool.ts";

const contextV1: EventPoolContextV1 = Object.freeze({
  numbers: Object.freeze({ trust: 42, week: 3 }),
  flags: Object.freeze(["flag.named"]),
  labels: Object.freeze({ slot: "dusk" }),
});

function rngV1(seed = 7) {
  return createTransactionalRngV1(
    createTransactionalRngV1(parseNonZeroUint32(seed)).candidateState(),
  );
}

function countingRngV1(seed = 7) {
  const delegate = rngV1(seed);
  let nextIntCalls = 0;
  const rng: RuleRngV1 = Object.freeze({
    nextInt(request: Parameters<RuleRngV1["nextInt"]>[0]) {
      nextIntCalls += 1;
      return delegate.nextInt(request);
    },
    candidateState: () => delegate.candidateState(),
    attemptedDraws: () => delegate.attemptedDraws(),
  });
  return Object.freeze({ rng, nextIntCalls: () => nextIntCalls });
}

const invalidContextNumberCasesV1 = [
  ["fractional", 1.5, "gt", 1],
  ["positive infinity", Number.POSITIVE_INFINITY, "gt", 0],
  ["negative infinity", Number.NEGATIVE_INFINITY, "lt", 0],
  ["NaN", Number.NaN, "ne", 0],
  ["unsafe integer", Number.MAX_SAFE_INTEGER + 1, "gt", 0],
  ["negative zero", -0, "eq", 0],
] as const satisfies readonly (
  readonly [string, number, "eq" | "ne" | "lt" | "lte" | "gt" | "gte", number]
)[];

describe("event condition language", () => {
  it("parses, evaluates, and treats missing keys as false", () => {
    const condition = parseEventConditionV1({
      kind: "all",
      conditions: [
        { kind: "number", key: "trust", op: "gte", value: 40 },
        { kind: "label", key: "slot", anyOf: ["dusk", "night"] },
        { kind: "flag", flag: "flag.named", present: true },
        { kind: "not", condition: { kind: "flag", flag: "flag.rival", present: true } },
      ],
    });
    expect(evaluateEventConditionV1(condition, contextV1)).toBe(true);
    expect(
      evaluateEventConditionV1(
        parseEventConditionV1({ kind: "number", key: "missing", op: "eq", value: 0 }),
        contextV1,
      ),
    ).toBe(false);
    expect(
      evaluateEventConditionV1(
        parseEventConditionV1({ kind: "label", key: "missing", anyOf: ["x"] }),
        contextV1,
      ),
    ).toBe(false);
  });

  it("rejects malformed shapes, bounded numeric violations, excess depth, and branch explosions", () => {
    expect(() => parseEventConditionV1({ kind: "number", key: "", op: "eq", value: 1 })).toThrow(
      expect.objectContaining({ code: "event_pool.condition_invalid" }),
    );
    expect(() => parseEventConditionV1({ kind: "number", key: "a", op: "like", value: 1 })).toThrow(
      expect.objectContaining({ code: "event_pool.condition_invalid" }),
    );
    for (
      const value of [1.5, Number.POSITIVE_INFINITY, Number.NaN, Number.MAX_SAFE_INTEGER + 1, -0]
    ) {
      expect(() => parseEventConditionV1({ kind: "number", key: "a", op: "eq", value })).toThrow(
        expect.objectContaining({ code: "event_pool.condition_invalid" }),
      );
    }

    let nested: unknown = { kind: "flag", flag: "a", present: true };
    for (let index = 0; index < 9; index += 1) nested = { kind: "not", condition: nested };
    expect(() => parseEventConditionV1(nested)).toThrow(
      expect.objectContaining({ code: "event_pool.condition_too_deep" }),
    );

    expect(() =>
      parseEventConditionV1({
        kind: "any",
        conditions: Array.from({ length: 33 }, () => ({
          kind: "flag",
          flag: "a",
          present: true,
        })),
      })
    ).toThrow(expect.objectContaining({ code: "event_pool.condition_branches" }));
  });

  it.each(invalidContextNumberCasesV1)(
    "rejects a %s context number before evaluation",
    (_, value, op, operand) => {
      const condition = parseEventConditionV1({
        kind: "number",
        key: "observed",
        op,
        value: operand,
      });
      const context = {
        numbers: { observed: value },
        flags: [],
        labels: {},
      } as const satisfies EventPoolContextV1;

      expect(() => evaluateEventConditionV1(condition, context)).toThrow(
        expect.objectContaining({
          code: "event_pool.context_number_invalid",
          path: "/context/numbers/observed",
        }),
      );
    },
  );

  it("captures each own context number once before evaluation", () => {
    let reads = 0;
    const numbers = Object.defineProperty({}, "observed", {
      enumerable: true,
      get() {
        reads += 1;
        return reads === 1 ? 1 : 1.5;
      },
    }) as Readonly<Record<string, number>>;
    const condition = parseEventConditionV1({
      kind: "number",
      key: "observed",
      op: "eq",
      value: 1,
    });

    expect(evaluateEventConditionV1(condition, { numbers, flags: [], labels: {} })).toBe(true);
    expect(reads).toBe(1);
  });

  it("treats inherited context numbers as missing", () => {
    const numbers = Object.create({ observed: 1.5 }) as Readonly<Record<string, number>>;
    const condition = parseEventConditionV1({
      kind: "number",
      key: "observed",
      op: "gte",
      value: 1,
    });

    expect(evaluateEventConditionV1(condition, { numbers, flags: [], labels: {} })).toBe(false);
  });
});

describe("event pool draws", () => {
  const candidatesV1: readonly EventPoolCandidateV1[] = Object.freeze([
    Object.freeze({
      eventId: "event.a",
      weight: 1,
      condition: parseEventConditionV1({ kind: "number", key: "trust", op: "gte", value: 100 }),
    }),
    Object.freeze({ eventId: "event.b", weight: 2, condition: null }),
    Object.freeze({ eventId: "event.c", weight: 6, condition: null }),
  ]);

  it("filters eligibility, draws by weight, and explains the outcome", () => {
    const result = drawFromEventPoolV1({
      candidates: candidatesV1,
      context: contextV1,
      rng: rngV1(),
      purpose: "check:test.pool",
    });
    expect(result.kind).toBe("drawn");
    expect(result.explanation.considered).toBe(3);
    expect(result.explanation.eligible.map((entry) => entry.eventId)).toEqual([
      "event.b",
      "event.c",
    ]);
    expect(result.explanation.totalWeight).toBe(8);
    expect(result.explanation.forced).toBe(false);
    const roll = result.explanation.roll ?? -1;
    expect(result.kind === "drawn" && result.eventId).toBe(roll < 2 ? "event.b" : "event.c");
  });

  it("is deterministic for one RNG state and follows the roll on replay", () => {
    const first = drawFromEventPoolV1({
      candidates: candidatesV1,
      context: contextV1,
      rng: rngV1(),
      purpose: "check:test.pool",
    });
    const second = drawFromEventPoolV1({
      candidates: candidatesV1,
      context: contextV1,
      rng: rngV1(),
      purpose: "check:test.pool",
    });
    expect(second).toEqual(first);
  });

  it.each(
    [
      [
        "ordinary",
        undefined,
        555,
        "sha256:5f8cdbfda5b0a0d3cff93d72b2452719abe245e5a939ed22084cca19a49f7d2f",
      ],
      [
        "forced",
        "event.b",
        343,
        "sha256:f480dfedc7b9419a9f8087672d3671b230d9aab31c204a107c7f7630bafa51ce",
      ],
    ] as const,
  )("preserves the valid %s draw byte vector", (_, force, byteLength, bytesDigest) => {
    const rng = rngV1();
    const before = rng.candidateState();
    const result = drawFromEventPoolV1({
      candidates: candidatesV1,
      context: contextV1,
      rng,
      purpose: "check:test.pool",
      ...(force === undefined ? {} : { force }),
    });
    const bytes = canonicalJsonBytes({
      before,
      result,
      after: rng.candidateState(),
      draws: rng.attemptedDraws(),
    });

    expect(bytes.byteLength).toBe(byteLength);
    expect(digestBytes(bytes)).toBe(bytesDigest);
  });

  it("returns empty with a full explanation when nothing qualifies", () => {
    const result = drawFromEventPoolV1({
      candidates: [candidatesV1[0] as EventPoolCandidateV1],
      context: contextV1,
      rng: rngV1(),
      purpose: "check:test.pool",
    });
    expect(result.kind).toBe("empty");
    expect(result.explanation).toEqual({
      considered: 1,
      eligible: [],
      totalWeight: 0,
      roll: null,
      forced: false,
    });
  });

  it("forces only eligible candidates and spends no draw", () => {
    const rng = rngV1();
    const before = rng.attemptedDraws().length;
    const forced = drawFromEventPoolV1({
      candidates: candidatesV1,
      context: contextV1,
      rng,
      purpose: "check:test.pool",
      force: "event.b",
    });
    expect(forced).toMatchObject({ kind: "drawn", eventId: "event.b" });
    expect(forced.explanation).toMatchObject({ roll: null, forced: true });
    expect(rng.attemptedDraws().length).toBe(before);

    expect(() =>
      drawFromEventPoolV1({
        candidates: candidatesV1,
        context: contextV1,
        rng: rngV1(),
        purpose: "check:test.pool",
        force: "event.a",
      })
    ).toThrow(expect.objectContaining({ code: "event_pool.force_ineligible" }));
  });

  it("rejects duplicate ids and non-positive weights", () => {
    expect(() =>
      drawFromEventPoolV1({
        candidates: [
          { eventId: "event.x", weight: 1, condition: null },
          { eventId: "event.x", weight: 1, condition: null },
        ],
        context: contextV1,
        rng: rngV1(),
        purpose: "check:test.pool",
      })
    ).toThrow(expect.objectContaining({ code: "event_pool.candidate_invalid" }));
    expect(() =>
      drawFromEventPoolV1({
        candidates: [{ eventId: "event.x", weight: 0, condition: null }],
        context: contextV1,
        rng: rngV1(),
        purpose: "check:test.pool",
      })
    ).toThrow(expect.objectContaining({ code: "event_pool.weight_invalid" }));
  });

  it("keeps candidate validation ahead of context admission", () => {
    const counted = countingRngV1();
    expect(() =>
      drawFromEventPoolV1({
        candidates: [{ eventId: "event.invalid", weight: 0, condition: null }],
        context: { numbers: { invalid: 1.5 }, flags: [], labels: {} },
        rng: counted.rng,
        purpose: "check:test.precedence",
      })
    ).toThrow(
      expect.objectContaining({
        code: "event_pool.weight_invalid",
        path: "/candidates/event.invalid",
      }),
    );
    expect(counted.nextIntCalls()).toBe(0);
  });

  it("captures candidate scalar fields once before using the admitted projection", () => {
    const propertyReads = { eventId: 0, weight: 0, condition: 0 };
    const condition = parseEventConditionV1({
      kind: "number",
      key: "observed",
      op: "eq",
      value: 1,
    });
    const candidate = new Proxy<EventPoolCandidateV1>(
      { eventId: "event.captured", weight: 1, condition },
      {
        get(target, property, receiver) {
          if (property === "eventId" || property === "weight" || property === "condition") {
            propertyReads[property] += 1;
          }
          if (property === "weight" && propertyReads.weight > 1) return 1.5;
          return Reflect.get(target, property, receiver);
        },
      },
    );
    const counted = countingRngV1();

    const result = drawFromEventPoolV1({
      candidates: [candidate],
      context: { numbers: { observed: 1 }, flags: [], labels: {} },
      rng: counted.rng,
      purpose: "check:test.captured-candidate",
      force: "event.captured",
    });

    expect(result).toMatchObject({
      kind: "drawn",
      eventId: "event.captured",
      explanation: {
        eligible: [{ eventId: "event.captured", weight: 1 }],
        totalWeight: 1,
        roll: null,
        forced: true,
      },
    });
    expect(propertyReads).toEqual({ eventId: 1, weight: 1, condition: 1 });
    expect(counted.nextIntCalls()).toBe(0);
  });

  it.each(["ordinary", "forced"] as const)(
    "does not admit an inherited context number during an %s draw",
    (mode) => {
      const condition = parseEventConditionV1({
        kind: "number",
        key: "observed",
        op: "gte",
        value: 1,
      });
      const numbers = Object.create({ observed: 1.5 }) as Readonly<Record<string, number>>;
      const counted = countingRngV1();
      const draw = () =>
        drawFromEventPoolV1({
          candidates: [{ eventId: "event.own-only", weight: 1, condition }],
          context: { numbers, flags: [], labels: {} },
          rng: counted.rng,
          purpose: "check:test.own-context",
          ...(mode === "forced" ? { force: "event.own-only" } : {}),
        });

      if (mode === "forced") {
        expect(draw).toThrow(
          expect.objectContaining({
            code: "event_pool.force_ineligible",
            path: "/candidates/event.own-only",
          }),
        );
      } else {
        expect(draw()).toMatchObject({
          kind: "empty",
          explanation: { eligible: [], totalWeight: 0, roll: null, forced: false },
        });
      }
      expect(counted.nextIntCalls()).toBe(0);
    },
  );

  it("accepts one legal eligible weight and spends one bounded draw", () => {
    const counted = countingRngV1();
    const result = drawFromEventPoolV1({
      candidates: [
        { eventId: "event.single", weight: 7, condition: null },
      ],
      context: contextV1,
      rng: counted.rng,
      purpose: "check:test.maximum",
    });

    expect(result).toMatchObject({
      kind: "drawn",
      eventId: "event.single",
      explanation: { totalWeight: 7, forced: false },
    });
    expect(counted.nextIntCalls()).toBe(1);
  });

  it.each(["ordinary", "forced"] as const)(
    "rejects incremental total-weight overflow before an %s result or RNG call",
    (mode) => {
      const counted = countingRngV1();
      const before = counted.rng.candidateState();

      expect(() =>
        drawFromEventPoolV1({
          candidates: [
            {
              eventId: "event.large-a",
              weight: Number.MAX_SAFE_INTEGER - 1,
              condition: null,
            },
            { eventId: "event.large-b", weight: 1, condition: null },
            { eventId: "event.overflow", weight: 1, condition: null },
          ],
          context: contextV1,
          rng: counted.rng,
          purpose: "check:test.overflow",
          ...(mode === "forced" ? { force: "event.large-a" } : {}),
        })
      ).toThrow(
        expect.objectContaining({
          code: "event_pool.total_weight_overflow",
          path: "/candidates/2/weight",
        }),
      );
      expect(counted.nextIntCalls()).toBe(0);
      expect(counted.rng.candidateState()).toEqual(before);
      expect(counted.rng.attemptedDraws()).toEqual([]);
    },
  );

  it.each(invalidContextNumberCasesV1)(
    "rejects a %s context number through ordinary and forced draws before RNG",
    (_, value, op, operand) => {
      const candidates = [
        {
          eventId: "event.invalid-context",
          weight: 1,
          condition: parseEventConditionV1({
            kind: "number",
            key: "observed",
            op,
            value: operand,
          }),
        },
      ] as const;
      const context = {
        numbers: { observed: value },
        flags: [],
        labels: {},
      } as const satisfies EventPoolContextV1;
      const ordinary = countingRngV1();
      const forced = countingRngV1();

      expect(() =>
        drawFromEventPoolV1({
          candidates,
          context,
          rng: ordinary.rng,
          purpose: "check:test.invalid-context",
        })
      ).toThrow(expect.objectContaining({ code: "event_pool.context_number_invalid" }));
      expect(ordinary.nextIntCalls()).toBe(0);
      expect(() =>
        drawFromEventPoolV1({
          candidates,
          context,
          rng: forced.rng,
          purpose: "check:test.invalid-context",
          force: "event.invalid-context",
        })
      ).toThrow(expect.objectContaining({ code: "event_pool.context_number_invalid" }));
      expect(forced.nextIntCalls()).toBe(0);
    },
  );

  it("admits every context number before evaluating candidate conditions", () => {
    const counted = countingRngV1();
    expect(() =>
      drawFromEventPoolV1({
        candidates: [{ eventId: "event.unconditional", weight: 1, condition: null }],
        context: {
          numbers: { "unused/~": 1.5 },
          flags: [],
          labels: {},
        },
        rng: counted.rng,
        purpose: "check:test.invalid-unused-context",
      })
    ).toThrow(
      expect.objectContaining({
        code: "event_pool.context_number_invalid",
        path: "/context/numbers/unused~1~0",
      }),
    );
    expect(counted.nextIntCalls()).toBe(0);
  });
});
