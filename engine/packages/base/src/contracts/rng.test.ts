// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";

import type { NonZeroUint32 } from "./values.ts";
import { parseNonZeroUint32 } from "./values.ts";
import { createTransactionalRngV1, rngStateV1Schema } from "./rng.ts";

function captureFailureV1(operation: () => unknown): unknown {
  try {
    operation();
  } catch (error) {
    return error;
  }
  throw new TypeError("expected RNG admission to fail");
}

describe("xorshift32-v1", () => {
  it("matches the deterministic vector and resumes exactly", () => {
    const rng = createTransactionalRngV1(parseNonZeroUint32(0x0002_3049));
    expect(
      captureFailureV1(() =>
        rngStateV1Schema.parse({
          algorithm: "xorshift32-v1",
          cursor: 0,
          rawDrawCount: 0,
        })
      ),
    ).toMatchObject({ code: "rng.invalid_state" });
    expect(() =>
      rngStateV1Schema.parse({
        algorithm: "xorshift32-v1",
        cursor: 0x1_0000_0000,
        rawDrawCount: 0,
      })
    ).toThrow();
    expect(
      Array.from(
        { length: 12 },
        () => rng.nextInt({ exclusiveMax: 3, purpose: "demand:offset" }) - 1,
      ),
    ).toEqual(Array(12).fill(0));
    expect([
      rng.nextInt({ exclusiveMax: 6, purpose: "check:die.1" }) + 1,
      rng.nextInt({ exclusiveMax: 6, purpose: "check:die.2" }) + 1,
    ]).toEqual([4, 3]);
    expect(rng.candidateState()).toEqual({
      algorithm: "xorshift32-v1",
      cursor: 0x4e7b_7f2e,
      rawDrawCount: 14,
    });
    expect(rng.attemptedDraws()).toHaveLength(14);
    expect(Object.keys(rng).sort()).toEqual(["attemptedDraws", "candidateState", "nextInt"]);
    const committedState = rng.candidateState();
    const resumed = createTransactionalRngV1(committedState);
    expect(resumed.candidateState()).toEqual(committedState);
    expect(resumed.attemptedDraws()).toEqual([]);
    expect(resumed.nextInt({ exclusiveMax: 17, purpose: "check:resume.probe" })).toBe(
      rng.nextInt({ exclusiveMax: 17, purpose: "check:resume.probe" }),
    );
    expect(resumed.candidateState()).toEqual(rng.candidateState());
  });

  it("rejects zero state through restored and branded numeric inputs", () => {
    expect(
      captureFailureV1(() =>
        rngStateV1Schema.parse({
          algorithm: "xorshift32-v1",
          cursor: 0,
          rawDrawCount: 7,
        })
      ),
    ).toMatchObject({ code: "rng.invalid_state" });
    expect(
      captureFailureV1(() => createTransactionalRngV1(0 as NonZeroUint32)),
    ).toMatchObject({ code: "rng.invalid_state" });
  });
});
