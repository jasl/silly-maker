// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";

import { engineStateTunerMaxLeavesV1, flattenStateTunerLeavesV1 } from "./state-tuner.ts";

describe("flattenStateTunerLeavesV1", () => {
  it("flattens existing primitive leaves in sorted path order", () => {
    const result = flattenStateTunerLeavesV1({
      simulation: {
        cat: { trust: 10, named: true },
        shop: { money: 50, motto: "open" },
      },
      flags: [null, "a"],
    });
    expect(result.truncated).toBe(false);
    expect(result.leaves.map((leaf) => leaf.pathLabel)).toEqual([
      "flags.0",
      "flags.1",
      "simulation.cat.named",
      "simulation.cat.trust",
      "simulation.shop.money",
      "simulation.shop.motto",
    ]);
    expect(result.leaves[3]).toMatchObject({
      kind: "number",
      value: 10,
      path: ["simulation", "cat", "trust"],
    });
  });

  it("caps the row count and reports truncation", () => {
    const wide: Record<string, number> = {};
    for (let index = 0; index < engineStateTunerMaxLeavesV1 + 8; index += 1) {
      wide[`k${String(index).padStart(4, "0")}`] = index;
    }
    const result = flattenStateTunerLeavesV1(wide);
    expect(result.truncated).toBe(true);
    expect(result.leaves).toHaveLength(engineStateTunerMaxLeavesV1);
  });

  it("applies the row cap after the path filter so late leaves stay reachable", () => {
    const wide: Record<string, number> = {};
    for (let index = 0; index < engineStateTunerMaxLeavesV1 + 8; index += 1) {
      wide[`k${String(index).padStart(4, "0")}`] = index;
    }
    const result = flattenStateTunerLeavesV1(wide, { filter: "k0519" });
    expect(result.truncated).toBe(false);
    expect(result.leaves).toEqual([
      expect.objectContaining({ pathLabel: "k0519", value: 519 }),
    ]);
  });
});
