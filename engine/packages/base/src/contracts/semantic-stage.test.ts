// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";

import { PresentationDataError } from "./presentation-data.ts";
import {
  createSemanticStageStateV1,
  digestSemanticStageStateV1,
  parseSemanticStageStateV1,
} from "./semantic-stage.ts";
import { reduceStageMutationsV1 } from "./semantic-stage-reducer.ts";

function playableStageV1() {
  const empty = createSemanticStageStateV1({
    stageId: "stage.test.lab",
    layerIds: ["layer.background", "layer.characters", "layer.props"],
  });
  const outcome = reduceStageMutationsV1(empty, [
    { kind: "show", layerId: "layer.background", tag: "tag.bg", contentId: "content.bg.lab" },
    {
      kind: "show",
      layerId: "layer.characters",
      tag: "tag.alpha",
      contentId: "content.char.alpha",
      zOrder: 10,
      placement: {
        x: 400,
        y: 900,
        scalePermille: 1000,
        opacityPermille: 1000,
        mirrored: false,
      },
      appearance: { pose: "standing", expression: "neutral" },
    },
    {
      kind: "show",
      layerId: "layer.props",
      tag: "tag.crate",
      contentId: "content.prop.crate",
      placement: {
        x: 1200,
        y: 950,
        scalePermille: 800,
        opacityPermille: 750,
        mirrored: true,
      },
    },
  ]);
  if (outcome.kind !== "applied") throw new Error("fixture stage must apply");
  return outcome.state;
}

describe("SemanticStageStateV1", () => {
  it("creates an empty declared-layer stage", () => {
    const state = createSemanticStageStateV1({
      stageId: "stage.test.lab",
      layerIds: ["layer.background", "layer.characters"],
    });
    expect(state.layers.map((layer) => layer.layerId)).toEqual([
      "layer.background",
      "layer.characters",
    ]);
  });

  it("round-trips canonically through plain JSON with a stable digest", () => {
    const state = playableStageV1();
    const roundTripped = parseSemanticStageStateV1(JSON.parse(JSON.stringify(state)));
    expect(roundTripped).toEqual(state);
    expect(digestSemanticStageStateV1(roundTripped)).toBe(digestSemanticStageStateV1(state));

    // Appearance key order does not change the canonical digest.
    const reordered = JSON.parse(JSON.stringify(state)) as {
      layers: { entries: { appearance: Record<string, string> }[] }[];
    };
    const appearance = reordered.layers[1]?.entries[0]?.appearance;
    if (appearance === undefined) throw new Error("fixture appearance missing");
    const flipped = Object.fromEntries(Object.entries(appearance).toReversed());
    reordered.layers[1]!.entries[0]!.appearance = flipped;
    expect(digestSemanticStageStateV1(parseSemanticStageStateV1(reordered))).toBe(
      digestSemanticStageStateV1(state),
    );
  });

  it("rejects renderer-flavored or non-plain content structurally", () => {
    const state = playableStageV1();

    // No renderer/asset/accessibility/function-flavored KEYS anywhere in the
    // authoritative stage data (values like layer IDs may spell anything).
    const forbiddenKeys = new Set([
      "rendererId",
      "assetIds",
      "assetUrl",
      "url",
      "accessibleName",
      "props",
    ]);
    const collectKeys = (value: unknown, keys: string[] = []): string[] => {
      if (value === null || typeof value !== "object") return keys;
      for (const [key, child] of Object.entries(value)) {
        keys.push(key);
        expect(typeof child, `value at key ${key} must be data`).not.toBe("function");
        collectKeys(child, keys);
      }
      return keys;
    };
    for (const key of collectKeys(state)) {
      expect(forbiddenKeys.has(key), `forbidden key "${key}" in stage state`).toBe(false);
    }

    const withExtraKey = JSON.parse(JSON.stringify(state)) as Record<string, unknown>;
    withExtraKey.rendererId = "renderer.sneaky";
    expect(() => parseSemanticStageStateV1(withExtraKey)).toThrow(PresentationDataError);

    const entryWithExtra = JSON.parse(JSON.stringify(state)) as {
      layers: { entries: Record<string, unknown>[] }[];
    };
    entryWithExtra.layers[0]!.entries[0]!.assetUrl = "https://example.invalid/bg.png";
    expect(() => parseSemanticStageStateV1(entryWithExtra)).toThrow(PresentationDataError);
  });

  it("requires the full five-key placement including opacityPermille", () => {
    const state = JSON.parse(JSON.stringify(playableStageV1())) as {
      layers: { entries: { placement: Record<string, unknown> }[] }[];
    };
    const placement = state.layers[1]!.entries[0]!.placement;

    // A four-key placement (pre-opacity shape) is not valid data.
    const missingOpacity = JSON.parse(JSON.stringify(state)) as typeof state;
    delete missingOpacity.layers[1]!.entries[0]!.placement.opacityPermille;
    expect(() => parseSemanticStageStateV1(missingOpacity)).toThrow(PresentationDataError);

    // Opacity is an integer permille inside [0, 1000].
    for (const invalid of [-1, 1001, 500.5, "800"]) {
      const outOfRange = JSON.parse(JSON.stringify(state)) as typeof state;
      outOfRange.layers[1]!.entries[0]!.placement.opacityPermille = invalid;
      expect(() => parseSemanticStageStateV1(outOfRange)).toThrow("stage_opacity_permille_invalid");
    }

    // Zero (fully transparent) is a legal settled target.
    const transparent = JSON.parse(JSON.stringify(state)) as typeof state;
    transparent.layers[1]!.entries[0]!.placement.opacityPermille = 0;
    const parsed = parseSemanticStageStateV1(transparent);
    expect(parsed.layers[1]!.entries[0]!.placement.opacityPermille).toBe(0);
    expect(placement.opacityPermille).toBe(1000);
  });

  it("rejects duplicate tags, duplicate layers, and non-canonical z-order", () => {
    const state = JSON.parse(JSON.stringify(playableStageV1())) as {
      layers: { layerId: string; entries: { tag: string; zOrder: number }[] }[];
    };

    const duplicateTag = JSON.parse(JSON.stringify(state)) as typeof state;
    const background = duplicateTag.layers[0]!;
    background.entries.push(JSON.parse(JSON.stringify(background.entries[0])));
    expect(() => parseSemanticStageStateV1(duplicateTag)).toThrow("stage_tag_duplicate");

    const duplicateLayer = JSON.parse(JSON.stringify(state)) as typeof state;
    duplicateLayer.layers.push(JSON.parse(JSON.stringify(duplicateLayer.layers[0])));
    expect(() => parseSemanticStageStateV1(duplicateLayer)).toThrow("stage_layer_duplicate");

    const badOrder = JSON.parse(JSON.stringify(state)) as typeof state;
    const characters = badOrder.layers[1]!;
    characters.entries.push({
      ...JSON.parse(JSON.stringify(characters.entries[0])),
      tag: "tag.beta",
      zOrder: -5,
    });
    expect(() => parseSemanticStageStateV1(badOrder)).toThrow("z_order_not_canonical");
  });
});
