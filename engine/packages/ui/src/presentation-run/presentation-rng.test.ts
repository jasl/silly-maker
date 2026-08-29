// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";

import { createPresentationRngStreamV1, derivePresentationSeedV1 } from "./presentation-rng.ts";

describe("derivePresentationSeedV1", () => {
  it("type-tags and delimits committed-stable seed parts", () => {
    const seed = derivePresentationSeedV1(["occ.window.7", "word_effect", 3]);

    expect(seed).toBe(derivePresentationSeedV1(["occ.window.7", "word_effect", 3]));
    expect(seed).toBeGreaterThanOrEqual(1);
    expect(seed).toBeLessThanOrEqual(0xffff_ffff);
    expect(derivePresentationSeedV1(["a", 1])).not.toBe(
      derivePresentationSeedV1(["a", "1"]),
    );
    expect(derivePresentationSeedV1(["a", 1])).not.toBe(derivePresentationSeedV1(["a1"]));
    expect(derivePresentationSeedV1(["a", "b"])).not.toBe(
      derivePresentationSeedV1(["a\u001fstring:1:b"]),
    );
  });

  it("locks the seed encoding and xorshift32 sequence to stable vectors", () => {
    const seed = derivePresentationSeedV1(["occ.sound-check.12", "blink", 4]);
    const stream = createPresentationRngStreamV1(seed);

    expect(seed).toBe(3_480_416_910);
    expect(Array.from({ length: 6 }, () => stream.nextUint32())).toEqual([
      3_041_671_679,
      2_081_150_982,
      3_865_603_043,
      2_308_682_569,
      28_277_424,
      836_285_516,
    ]);
  });

  it("rejects seed parts outside the committed-stable value contract", () => {
    expect(() => derivePresentationSeedV1([])).toThrow("ui.presentation_rng_seed_parts_empty");
    expect(() => derivePresentationSeedV1([Number.NaN])).toThrow(
      "ui.presentation_rng_seed_part_not_finite",
    );
    expect(() => derivePresentationSeedV1([Number.POSITIVE_INFINITY])).toThrow(
      "ui.presentation_rng_seed_part_not_finite",
    );
    expect(() => derivePresentationSeedV1([true] as unknown as readonly (string | number)[]))
      .toThrow("ui.presentation_rng_seed_part_invalid");
  });
});

describe("createPresentationRngStreamV1", () => {
  it("continues the exact next draw from plain serialized state", () => {
    const stream = createPresentationRngStreamV1(
      derivePresentationSeedV1(["occ.rooftop.8", "dust-scatter"]),
    );
    stream.nextInt(11);
    stream.nextIntInRange(-4, 4);

    const continuation = stream.state();
    expect(Object.isFrozen(continuation)).toBe(false);
    const restored = createPresentationRngStreamV1(
      JSON.parse(JSON.stringify(continuation)) as typeof continuation,
    );

    const expected = Array.from({ length: 12 }, () => stream.nextIntInRange(-40, 40));
    expect(Array.from({ length: 12 }, () => restored.nextIntInRange(-40, 40))).toEqual(
      expected,
    );
  });

  it("uses rejection sampling for bounded integers and includes range endpoints", () => {
    const stream = createPresentationRngStreamV1(0xdead_beef);
    const bounded = Array.from({ length: 128 }, () => stream.nextInt(7));
    expect(bounded.every((value) => value >= 0 && value < 7)).toBe(true);

    const ranged = Array.from({ length: 128 }, () => stream.nextIntInRange(-16, 16));
    expect(ranged.every((value) => value >= -16 && value <= 16)).toBe(true);
    expect(stream.nextIntInRange(5, 5)).toBe(5);

    const fullWidth = createPresentationRngStreamV1(1);
    expect(fullWidth.nextInt(0xffff_ffff)).toBe(0x42020);
    // This seed is the xorshift32 predecessor of raw draw 1. Normalizing the
    // non-zero state space makes bounded zero reachable at maximum width.
    expect(createPresentationRngStreamV1(0xf2b5_8529).nextInt(0xffff_ffff)).toBe(0);

    // The first four raw draws from this seed exceed the acceptance limit for
    // 2^31 + 1. The bounded draw must reject them instead of applying modulo.
    const rejection = createPresentationRngStreamV1(0x8000_0000);
    expect(rejection.nextInt(0x8000_0001)).toBe(1_756_881_984);
    expect(rejection.state().cursor).toBe(1_756_881_985);
  });

  it("keeps inclusive ranges safe at both safe-integer boundaries", () => {
    const upper = createPresentationRngStreamV1(0x1234_5678);
    const upperValues = Array.from(
      { length: 32 },
      () => upper.nextIntInRange(Number.MAX_SAFE_INTEGER - 1, Number.MAX_SAFE_INTEGER),
    );
    expect(
      upperValues.every((value) =>
        Number.isSafeInteger(value) && value >= Number.MAX_SAFE_INTEGER - 1 &&
        value <= Number.MAX_SAFE_INTEGER
      ),
    ).toBe(true);

    const lower = createPresentationRngStreamV1(0x8765_4321);
    const lowerValues = Array.from(
      { length: 32 },
      () => lower.nextIntInRange(Number.MIN_SAFE_INTEGER, Number.MIN_SAFE_INTEGER + 1),
    );
    expect(
      lowerValues.every((value) =>
        Number.isSafeInteger(value) && value >= Number.MIN_SAFE_INTEGER &&
        value <= Number.MIN_SAFE_INTEGER + 1
      ),
    ).toBe(true);

    expect(
      createPresentationRngStreamV1(1).nextIntInRange(
        Number.MAX_SAFE_INTEGER,
        Number.MAX_SAFE_INTEGER,
      ),
    ).toBe(Number.MAX_SAFE_INTEGER);
    expect(
      createPresentationRngStreamV1(1).nextIntInRange(
        Number.MIN_SAFE_INTEGER,
        Number.MIN_SAFE_INTEGER,
      ),
    ).toBe(Number.MIN_SAFE_INTEGER);

    const fullWidthValue = createPresentationRngStreamV1(1).nextIntInRange(
      Number.MAX_SAFE_INTEGER - 0xffff_fffe,
      Number.MAX_SAFE_INTEGER,
    );
    expect(Number.isSafeInteger(fullWidthValue)).toBe(true);
    expect(fullWidthValue).toBeGreaterThanOrEqual(Number.MAX_SAFE_INTEGER - 0xffff_fffe);
    expect(fullWidthValue).toBeLessThanOrEqual(Number.MAX_SAFE_INTEGER);
  });

  it("rejects zero cursors and invalid bounded draw requests", () => {
    expect(() => createPresentationRngStreamV1(0)).toThrow(
      "ui.presentation_rng_cursor_invalid",
    );
    expect(() => createPresentationRngStreamV1(1.5)).toThrow(
      "ui.presentation_rng_cursor_invalid",
    );
    expect(() =>
      createPresentationRngStreamV1({ algorithm: "xorshift32-v1", cursor: 0x1_0000_0000 })
    ).toThrow("ui.presentation_rng_cursor_invalid");
    expect(() =>
      createPresentationRngStreamV1(
        { algorithm: "other", cursor: 1 } as unknown as {
          algorithm: "xorshift32-v1";
          cursor: number;
        },
      )
    ).toThrow("ui.presentation_rng_state_invalid");

    const stream = createPresentationRngStreamV1(7);
    expect(() => stream.nextInt(0)).toThrow("ui.presentation_rng_exclusive_max_invalid");
    expect(() => stream.nextInt(1.5)).toThrow("ui.presentation_rng_exclusive_max_invalid");
    expect(() => stream.nextInt(0x1_0000_0000)).toThrow(
      "ui.presentation_rng_exclusive_max_invalid",
    );
    expect(() => stream.nextInt(0x1_0000_0001)).toThrow(
      "ui.presentation_rng_exclusive_max_invalid",
    );
    expect(() => stream.nextIntInRange(3, 2)).toThrow("ui.presentation_rng_range_invalid");
    expect(() => stream.nextIntInRange(0.5, 2)).toThrow("ui.presentation_rng_range_invalid");
    expect(() => stream.nextIntInRange(0, 0x1_0000_0000)).toThrow(
      "ui.presentation_rng_range_invalid",
    );
    expect(() =>
      stream.nextIntInRange(
        Number.MAX_SAFE_INTEGER - 0x1_0000_0000,
        Number.MAX_SAFE_INTEGER,
      )
    ).toThrow("ui.presentation_rng_range_invalid");
    expect(() => stream.nextIntInRange(Number.MIN_SAFE_INTEGER - 1, 0)).toThrow(
      "ui.presentation_rng_range_invalid",
    );
    expect(() => stream.nextIntInRange(0, Number.MAX_SAFE_INTEGER + 1)).toThrow(
      "ui.presentation_rng_range_invalid",
    );
  });
});
