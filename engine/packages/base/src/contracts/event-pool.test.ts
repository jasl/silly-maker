// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";

import { createTransactionalRngV1 } from "./rng.ts";
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

  it("rejects malformed shapes, excess depth, and branch explosions", () => {
    expect(() => parseEventConditionV1({ kind: "number", key: "", op: "eq", value: 1 })).toThrow(
      expect.objectContaining({ code: "event_pool.condition_invalid" }),
    );
    expect(() => parseEventConditionV1({ kind: "number", key: "a", op: "like", value: 1 })).toThrow(
      expect.objectContaining({ code: "event_pool.condition_invalid" }),
    );

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
});
