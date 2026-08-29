// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";

import { createPresentationRngStreamV1, derivePresentationSeedV1 } from "./presentation-rng.ts";

describe("derivePresentationSeedV1", () => {
  it("derives a stable non-zero uint32 from committed identifiers", () => {
    const seed = derivePresentationSeedV1(["occ.window.7", "word_effect", 3]);
    expect(seed).toBe(derivePresentationSeedV1(["occ.window.7", "word_effect", 3]));
    expect(Number.isSafeInteger(seed)).toBe(true);
    expect(seed).toBeGreaterThanOrEqual(1);
    expect(seed).toBeLessThanOrEqual(0xffff_ffff);
  });

  it("type-tags and separates parts so nearby inputs derive distinct seeds", () => {
    const base = derivePresentationSeedV1(["a", 1]);
    expect(derivePresentationSeedV1(["a1"])).not.toBe(base);
    expect(derivePresentationSeedV1(["a", "1"])).not.toBe(base);
    expect(derivePresentationSeedV1([1, "a"])).not.toBe(base);
    expect(derivePresentationSeedV1(["a", 1, ""])).not.toBe(base);
  });

  it("rejects empty part lists and non-finite numbers", () => {
    expect(() => derivePresentationSeedV1([])).toThrow(
      "ui.presentation_rng_seed_parts_empty",
    );
    expect(() => derivePresentationSeedV1([Number.NaN])).toThrow(
      "ui.presentation_rng_seed_part_not_finite",
    );
    expect(() => derivePresentationSeedV1([Number.POSITIVE_INFINITY])).toThrow(
      "ui.presentation_rng_seed_part_not_finite",
    );
  });
});

describe("createPresentationRngStreamV1", () => {
  it("replays the identical sequence for one seed", () => {
    const first = createPresentationRngStreamV1(20260829);
    const second = createPresentationRngStreamV1(20260829);
    const draws = Array.from({ length: 16 }, () => first.nextUint32());
    expect(Array.from({ length: 16 }, () => second.nextUint32())).toEqual(draws);
    for (const draw of draws) {
      expect(draw).toBeGreaterThanOrEqual(0);
      expect(draw).toBeLessThanOrEqual(0xffff_ffff);
    }
  });

  it("resumes exactly from a serialized state snapshot", () => {
    const stream = createPresentationRngStreamV1(
      derivePresentationSeedV1(["occ.bath.window.12", "scatter"]),
    );
    stream.nextInt(100);
    stream.nextInt(100);
    const snapshot = stream.state();
    // The snapshot is plain serializable data.
    const restored = createPresentationRngStreamV1(
      JSON.parse(JSON.stringify(snapshot)) as typeof snapshot,
    );
    const expected = Array.from({ length: 8 }, () => stream.nextIntInRange(-40, 40));
    expect(Array.from({ length: 8 }, () => restored.nextIntInRange(-40, 40))).toEqual(
      expected,
    );
  });

  it("draws unbiased integers inside the requested bounds", () => {
    const stream = createPresentationRngStreamV1(0xdead_beef);
    for (let index = 0; index < 200; index += 1) {
      const value = stream.nextInt(7);
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(7);
    }
    for (let index = 0; index < 200; index += 1) {
      const value = stream.nextIntInRange(-16, 16);
      expect(value).toBeGreaterThanOrEqual(-16);
      expect(value).toBeLessThanOrEqual(16);
    }
    // Degenerate single-value range is legal (a pinned scatter slot).
    expect(stream.nextIntInRange(5, 5)).toBe(5);
  });

  it("rejects invalid seeds, states, and draw requests", () => {
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
        { algorithm: "other" } as unknown as { algorithm: "xorshift32-v1"; cursor: number },
      )
    ).toThrow("ui.presentation_rng_state_invalid");
    const stream = createPresentationRngStreamV1(7);
    expect(() => stream.nextInt(0)).toThrow("ui.presentation_rng_exclusive_max_invalid");
    expect(() => stream.nextIntInRange(3, 2)).toThrow("ui.presentation_rng_range_invalid");
  });

  it("matches the authoritative xorshift32 step (one audited generator)", () => {
    // First step from seed 1: 1 ^ (1<<13) = 0x2001; ^ (>>>17) = 0x2001;
    // ^ (<<5) = 0x2001 ^ 0x40020 = 0x42021.
    const stream = createPresentationRngStreamV1(1);
    expect(stream.nextUint32()).toBe(0x42021);
  });
});
