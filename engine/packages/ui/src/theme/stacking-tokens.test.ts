// SPDX-License-Identifier: MIT
// The stacking contract: paint order is a published token scale, not a
// collection of magic numbers. Stage layers (--silly-stage-z-*) must match
// the stageLayerIdsV1 order exactly, and the within-layer surface scale
// (--silly-surface-z-*) must be strictly increasing. This test exists
// because the two once disagreed with the DOM contract and a dialog opened
// underneath the title screen.
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { stageLayerIdsV1 } from "../shell/game-stage.tsx";

async function readTokensV1(): Promise<Map<string, number>> {
  const css = await readFile(
    resolve(import.meta.dirname, "tokens.css"),
    "utf8",
  );
  const tokens = new Map<string, number>();
  for (const match of css.matchAll(/--(silly-[a-z-]+):\s*(-?\d+)\s*;/gu)) {
    tokens.set(match[1] as string, Number(match[2]));
  }
  return tokens;
}

describe("stacking token contract", () => {
  it("stage z tokens follow the published stage layer order", async () => {
    const tokens = await readTokensV1();
    const values = stageLayerIdsV1.map((layerId) => {
      const token = `silly-stage-z-${layerId.replaceAll("_", "-")}`;
      const value = tokens.get(token);
      expect(value, token).toBeDefined();
      return value as number;
    });
    const sorted = [...values].sort((left, right) => left - right);
    expect(values).toEqual(sorted);
    expect(new Set(values).size).toBe(values.length);
    expect(tokens.get("silly-stage-z-whole-canvas")).toBe(45);
  });

  it("the within-layer surface scale is strictly increasing", async () => {
    const tokens = await readTokensV1();
    const scale = [
      "silly-surface-z-base",
      "silly-surface-z-raised",
      "silly-surface-z-front-door",
      "silly-surface-z-splash",
      "silly-surface-z-dialog-backdrop",
      "silly-surface-z-dialog",
      "silly-surface-z-confirm-backdrop",
      "silly-surface-z-confirm",
    ];
    const values = scale.map((token) => {
      const value = tokens.get(token);
      expect(value, token).toBeDefined();
      return value as number;
    });
    for (let index = 1; index < values.length; index += 1) {
      expect(values[index], scale[index]).toBeGreaterThan(
        values[index - 1] as number,
      );
    }
  });

  it("engine sources use the scale instead of raw z-index numbers", async () => {
    // Component-internal ordinals (overlay stack depth data attributes,
    // stage entry zOrder from authoritative state) are exempt: they are
    // single-source by construction.
    const files = [
      "../system/title-screen.tsx",
      "../system/title-screen.module.css",
      "../system/boot-splash.tsx",
      "../overlays/overlay-host.module.css",
      "../debug/dev-dock.module.css",
      "../debug/story-debug-dock.module.css",
      "../system/instance-lease-banner.module.css",
      "../shell/game-stage.module.css",
    ];
    for (const file of files) {
      const source = await readFile(resolve(import.meta.dirname, file), "utf8");
      const raw = [
        ...source.matchAll(/z-index:\s*(\d+)|zIndex:\s*(\d+)/gu),
      ].filter((match) => {
        const value = Number(match[1] ?? match[2]);
        // The overlay stack depth ladder (0..4) keyed by data attributes
        // stays numeric on purpose.
        return !(source.includes("data-overlay-depth") && value <= 4);
      });
      expect(raw, file).toEqual([]);
    }
  });
});
