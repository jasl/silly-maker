// SPDX-License-Identifier: MIT
import fc from "fast-check";
import { describe, expect, it } from "vitest";

import {
  createSemanticStageStateV1,
  digestSemanticStageStateV1,
  parseSemanticStageStateV1,
} from "./semantic-stage.js";
import type { SemanticStageStateV1 } from "./semantic-stage.js";
import { reduceStageMutationsV1 } from "./semantic-stage-reducer.js";

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
