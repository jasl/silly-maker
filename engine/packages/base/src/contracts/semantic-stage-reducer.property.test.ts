// SPDX-License-Identifier: MIT
import fc from "fast-check";
import { describe, expect, it } from "vitest";

import {
  createSemanticStageStateV1,
  digestSemanticStageStateV1,
  parseSemanticStageStateV1,
} from "./semantic-stage.ts";
import type { SemanticStageStateV1 } from "./semantic-stage.ts";
import { reduceStageMutationsV1 } from "./semantic-stage-reducer.ts";

const layerIdsV1 = ["layer.background", "layer.characters", "layer.props"] as const;
const tagsV1 = ["tag.alpha", "tag.beta", "tag.crate", "tag.extra"] as const;
const contentIdsV1 = [
  "content.bg.lab",
  "content.bg.storeroom",
  "content.char.alpha",
  "content.char.beta",
  "content.prop.crate",
] as const;

function emptyStageV1(): SemanticStageStateV1 {
  return createSemanticStageStateV1({ stageId: "stage.test.lab", layerIds: [...layerIdsV1] });
}

const placementArbitraryV1 = fc.record({
  x: fc.integer({ min: -2000, max: 2000 }),
  y: fc.integer({ min: -2000, max: 2000 }),
  scalePermille: fc.integer({ min: 250, max: 2000 }),
  opacityPermille: fc.integer({ min: 0, max: 1000 }),
  mirrored: fc.boolean(),
});

const appearanceArbitraryV1 = fc
  .dictionary(
    fc.constantFrom("pose", "expression", "outfit"),
    fc.constantFrom("standing", "sitting", "smile", "neutral", "coat"),
    { maxKeys: 3 },
  )
  .map((appearance) => ({ ...appearance }));

const showArbitraryV1 = fc.record({
  kind: fc.constant("show" as const),
  layerId: fc.constantFrom(...layerIdsV1),
  tag: fc.constantFrom(...tagsV1),
  contentId: fc.constantFrom(...contentIdsV1),
  zOrder: fc.integer({ min: -10, max: 10 }),
  placement: placementArbitraryV1,
  appearance: appearanceArbitraryV1,
});

const mutationArbitraryV1 = fc.oneof(
  showArbitraryV1,
  fc.record({
    kind: fc.constant("replace" as const),
    layerId: fc.constantFrom(...layerIdsV1),
    tag: fc.constantFrom(...tagsV1),
    contentId: fc.constantFrom(...contentIdsV1),
  }),
  fc.record({
    kind: fc.constant("hide" as const),
    layerId: fc.constantFrom(...layerIdsV1),
    tag: fc.constantFrom(...tagsV1),
  }),
  fc.record({
    kind: fc.constant("setPlacement" as const),
    layerId: fc.constantFrom(...layerIdsV1),
    tag: fc.constantFrom(...tagsV1),
    placement: placementArbitraryV1,
  }),
  fc.record({
    kind: fc.constant("setAppearance" as const),
    layerId: fc.constantFrom(...layerIdsV1),
    tag: fc.constantFrom(...tagsV1),
    appearance: appearanceArbitraryV1,
  }),
  fc.record({
    kind: fc.constant("setZOrder" as const),
    layerId: fc.constantFrom(...layerIdsV1),
    tag: fc.constantFrom(...tagsV1),
    zOrder: fc.integer({ min: -10, max: 10 }),
  }),
  fc.record({
    kind: fc.constant("setLayerOrder" as const),
    layerIds: fc.shuffledSubarray([...layerIdsV1], {
      minLength: layerIdsV1.length,
      maxLength: layerIdsV1.length,
    }),
  }),
  fc.record({ kind: fc.constant("clearLayer" as const), layerId: fc.constantFrom(...layerIdsV1) }),
  fc.record({ kind: fc.constant("clearStage" as const) }),
  fc.record({
    kind: fc.constant("setCamera" as const),
    camera: fc.record({
      x: fc.integer({ min: -500, max: 500 }),
      y: fc.integer({ min: -500, max: 500 }),
      zoomPermille: fc.integer({ min: 500, max: 4000 }),
    }),
  }),
);

/** fast-check builds null-prototype records; states are plain JSON data. */
function plainV1<TValue>(value: TValue): TValue {
  return JSON.parse(JSON.stringify(value)) as TValue;
}

function applyOrKeepV1(
  state: SemanticStageStateV1,
  mutations: readonly unknown[],
): SemanticStageStateV1 {
  const outcome = reduceStageMutationsV1(state, plainV1(mutations));
  return outcome.kind === "applied" ? outcome.state : state;
}

describe("reduceStageMutationsV1 properties", () => {
  it("returns the identical state for an empty batch", () => {
    fc.assert(
      fc.property(fc.array(mutationArbitraryV1, { maxLength: 12 }), (mutations) => {
        const state = mutations.reduce<SemanticStageStateV1>(
          (current, mutation) => applyOrKeepV1(current, [mutation]),
          emptyStageV1(),
        );
        const outcome = reduceStageMutationsV1(state, []);
        expect(outcome.kind).toBe("applied");
        if (outcome.kind === "applied") expect(outcome.state).toBe(state);
      }),
    );
  });

  it("keeps layer entries ordered by non-decreasing z-order", () => {
    fc.assert(
      fc.property(fc.array(mutationArbitraryV1, { maxLength: 24 }), (mutations) => {
        const state = mutations.reduce<SemanticStageStateV1>(
          (current, mutation) => applyOrKeepV1(current, [mutation]),
          emptyStageV1(),
        );
        for (const layer of state.layers) {
          for (let index = 1; index < layer.entries.length; index += 1) {
            expect(layer.entries[index]!.zOrder).toBeGreaterThanOrEqual(
              layer.entries[index - 1]!.zOrder,
            );
          }
        }
      }),
    );
  });

  it("equal z-order shows keep insertion order", () => {
    fc.assert(
      fc.property(
        fc.uniqueArray(fc.constantFrom(...tagsV1), { minLength: 2, maxLength: 4 }),
        (tags) => {
          const outcome = reduceStageMutationsV1(
            emptyStageV1(),
            plainV1(
              tags.map((tag) => ({
                kind: "show",
                layerId: "layer.characters",
                tag,
                contentId: "content.char.alpha",
                zOrder: 5,
              })),
            ),
          );
          expect(outcome.kind).toBe("applied");
          if (outcome.kind !== "applied") return;
          const layer = outcome.state.layers.find(
            (candidate) => candidate.layerId === "layer.characters",
          );
          expect(layer?.entries.map((entry) => entry.tag)).toEqual(tags);
        },
      ),
    );
  });

  it("setZOrder reinserts atomically after existing equal-z peers and preserves entry data", () => {
    const shown = reduceStageMutationsV1(emptyStageV1(), [
      {
        kind: "show",
        layerId: "layer.characters",
        tag: "tag.alpha",
        contentId: "content.char.alpha",
        zOrder: 0,
        placement: {
          x: 12,
          y: 34,
          scalePermille: 900,
          opacityPermille: 800,
          mirrored: true,
        },
        appearance: { pose: "standing" },
      },
      {
        kind: "show",
        layerId: "layer.characters",
        tag: "tag.beta",
        contentId: "content.char.beta",
        zOrder: 5,
      },
      {
        kind: "show",
        layerId: "layer.characters",
        tag: "tag.crate",
        contentId: "content.prop.crate",
        zOrder: 5,
      },
      {
        kind: "show",
        layerId: "layer.characters",
        tag: "tag.extra",
        contentId: "content.bg.lab",
        zOrder: 10,
      },
    ]);
    expect(shown.kind).toBe("applied");
    if (shown.kind !== "applied") return;

    const moved = reduceStageMutationsV1(shown.state, [
      { kind: "setZOrder", layerId: "layer.characters", tag: "tag.alpha", zOrder: 5 },
    ]);
    expect(moved.kind).toBe("applied");
    if (moved.kind !== "applied") return;

    const entries = moved.state.layers.find(
      (candidate) => candidate.layerId === "layer.characters",
    )?.entries;
    expect(entries?.map((entry) => [entry.tag, entry.zOrder])).toEqual([
      ["tag.beta", 5],
      ["tag.crate", 5],
      ["tag.alpha", 5],
      ["tag.extra", 10],
    ]);
    expect(entries?.[2]).toMatchObject({
      tag: "tag.alpha",
      contentId: "content.char.alpha",
      placement: {
        x: 12,
        y: 34,
        scalePermille: 900,
        opacityPermille: 800,
        mirrored: true,
      },
      appearance: { pose: "standing" },
    });

    const unchangedZ = reduceStageMutationsV1(moved.state, [
      { kind: "setZOrder", layerId: "layer.characters", tag: "tag.beta", zOrder: 5 },
    ]);
    expect(unchangedZ.kind).toBe("applied");
    if (unchangedZ.kind === "applied") {
      const stableEntries = unchangedZ.state.layers.find(
        (candidate) => candidate.layerId === "layer.characters",
      )?.entries;
      expect(stableEntries?.map((entry) => entry.tag)).toEqual([
        "tag.beta",
        "tag.crate",
        "tag.alpha",
        "tag.extra",
      ]);
    }
  });

  it("does not publish a setZOrder when a later mutation in the batch fails", () => {
    const shown = reduceStageMutationsV1(emptyStageV1(), [
      {
        kind: "show",
        layerId: "layer.characters",
        tag: "tag.alpha",
        contentId: "content.char.alpha",
        zOrder: 0,
      },
      {
        kind: "show",
        layerId: "layer.characters",
        tag: "tag.beta",
        contentId: "content.char.beta",
        zOrder: 10,
      },
    ]);
    expect(shown.kind).toBe("applied");
    if (shown.kind !== "applied") return;
    const beforeDigest = digestSemanticStageStateV1(shown.state);

    const rejected = reduceStageMutationsV1(shown.state, [
      { kind: "setZOrder", layerId: "layer.characters", tag: "tag.alpha", zOrder: 20 },
      { kind: "hide", layerId: "layer.characters", tag: "tag.never-shown" },
    ]);
    expect(rejected).toMatchObject({
      kind: "rejected",
      rejection: { code: "stage.tag_unknown", mutationIndex: 1 },
    });
    expect(digestSemanticStageStateV1(shown.state)).toBe(beforeDigest);
    const entries = shown.state.layers.find(
      (candidate) => candidate.layerId === "layer.characters",
    )?.entries;
    expect(entries?.map((entry) => [entry.tag, entry.zOrder])).toEqual([
      ["tag.alpha", 0],
      ["tag.beta", 10],
    ]);
  });

  it("setLayerOrder applies an exact same-set permutation", () => {
    const outcome = reduceStageMutationsV1(emptyStageV1(), [
      {
        kind: "setLayerOrder",
        layerIds: ["layer.props", "layer.background", "layer.characters"],
      },
    ]);
    expect(outcome.kind).toBe("applied");
    if (outcome.kind === "applied") {
      expect(outcome.state.layers.map((layer) => layer.layerId)).toEqual([
        "layer.props",
        "layer.background",
        "layer.characters",
      ]);
    }
  });

  it.each([
    ["duplicate", ["layer.background", "layer.characters", "layer.characters"]],
    ["missing", ["layer.background", "layer.characters"]],
    ["extra", [...layerIdsV1, "layer.extra"]],
  ])(
    "rejects a %s layer permutation without publishing earlier batch mutations",
    (_case, layerIds) => {
      const base = emptyStageV1();
      const beforeDigest = digestSemanticStageStateV1(base);
      const outcome = reduceStageMutationsV1(base, [
        { kind: "setLayerOrder", layerIds: [...layerIdsV1].toReversed() },
        { kind: "setLayerOrder", layerIds },
      ]);

      expect(outcome).toMatchObject({
        kind: "rejected",
        rejection: {
          code: "stage.layer_order_invalid",
          mutationIndex: 1,
          pointer: "/mutations/1/layerIds",
        },
      });
      expect(digestSemanticStageStateV1(base)).toBe(beforeDigest);
      expect(base.layers.map((layer) => layer.layerId)).toEqual(layerIdsV1);
    },
  );

  it("replace keeps identity, order position, placement, and appearance continuity", () => {
    fc.assert(
      fc.property(
        placementArbitraryV1,
        appearanceArbitraryV1,
        fc.constantFrom(...contentIdsV1),
        (placement, appearance, nextContent) => {
          const shown = reduceStageMutationsV1(
            emptyStageV1(),
            plainV1([
              {
                kind: "show",
                layerId: "layer.characters",
                tag: "tag.alpha",
                contentId: "content.char.alpha",
                zOrder: 1,
              },
              {
                kind: "show",
                layerId: "layer.characters",
                tag: "tag.beta",
                contentId: "content.char.beta",
                zOrder: 1,
                placement,
                appearance,
              },
              {
                kind: "show",
                layerId: "layer.characters",
                tag: "tag.extra",
                contentId: "content.prop.crate",
                zOrder: 1,
              },
            ]),
          );
          expect(shown.kind).toBe("applied");
          if (shown.kind !== "applied") return;

          const replaced = reduceStageMutationsV1(shown.state, [
            {
              kind: "replace",
              layerId: "layer.characters",
              tag: "tag.beta",
              contentId: nextContent,
            },
          ]);
          expect(replaced.kind).toBe("applied");
          if (replaced.kind !== "applied") return;
          const layer = replaced.state.layers.find(
            (candidate) => candidate.layerId === "layer.characters",
          );
          expect(layer?.entries.map((entry) => entry.tag)).toEqual([
            "tag.alpha",
            "tag.beta",
            "tag.extra",
          ]);
          const entry = layer?.entries[1];
          expect(entry?.contentId).toBe(nextContent);
          expect(entry?.placement).toEqual(plainV1(placement));
          expect(entry?.appearance).toEqual(plainV1(appearance));
        },
      ),
    );
  });

  it("an invalid mutation anywhere rejects the whole batch and leaves state untouched", () => {
    const invalidArbitraryV1 = fc.oneof(
      fc.constant({
        kind: "show",
        layerId: "layer.unknown",
        tag: "tag.alpha",
        contentId: "content.bg.lab",
      }),
      fc.constant({ kind: "hide", layerId: "layer.characters", tag: "tag.never-shown" }),
      fc.constant({
        kind: "replace",
        layerId: "layer.characters",
        tag: "tag.never-shown",
        contentId: "content.bg.lab",
      }),
      fc.constant({
        kind: "show",
        layerId: "layer.props",
        tag: "tag.crate",
        contentId: "content.prop.crate",
        zOrder: Number.NaN,
      }),
      fc.constant({ kind: "teleport" }),
      fc.constant(null),
    );
    fc.assert(
      fc.property(
        fc.array(showArbitraryV1, { maxLength: 4 }),
        invalidArbitraryV1,
        (validPrefix, invalid) => {
          const base = validPrefix.reduce<SemanticStageStateV1>(
            (current, mutation) => applyOrKeepV1(current, [mutation]),
            emptyStageV1(),
          );
          const before = JSON.parse(JSON.stringify(base)) as unknown;
          const beforeDigest = digestSemanticStageStateV1(base);

          const outcome = reduceStageMutationsV1(base, [
            { kind: "setCamera", camera: { x: 1, y: 2, zoomPermille: 2000 } },
            plainV1(invalid),
          ]);
          expect(outcome.kind).toBe("rejected");
          if (outcome.kind === "rejected") {
            expect(outcome.rejection.mutationIndex).toBe(1);
            expect(outcome.rejection.code).toMatch(/^stage\./u);
          }
          // The input state is untouched: same content, same digest, and the
          // partial camera write never leaked.
          expect(JSON.parse(JSON.stringify(base))).toEqual(before);
          expect(digestSemanticStageStateV1(base)).toBe(beforeDigest);
          expect(base.camera.zoomPermille).not.toBe(2000);
        },
      ),
    );
  });

  it("applied states always survive a canonical parse round-trip", () => {
    fc.assert(
      fc.property(fc.array(mutationArbitraryV1, { maxLength: 20 }), (mutations) => {
        const state = mutations.reduce<SemanticStageStateV1>(
          (current, mutation) => applyOrKeepV1(current, [mutation]),
          emptyStageV1(),
        );
        const reparsed = parseSemanticStageStateV1(JSON.parse(JSON.stringify(state)));
        expect(reparsed).toEqual(state);
        expect(digestSemanticStageStateV1(reparsed)).toBe(digestSemanticStageStateV1(state));
      }),
    );
  });
});
