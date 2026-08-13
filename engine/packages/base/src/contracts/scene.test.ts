// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";

import { PresentationDataError } from "./presentation-data.ts";
import { createSemanticStageStateV1 } from "./semantic-stage.ts";
import type { SemanticStageStateV1 } from "./semantic-stage.ts";
import { reduceStageMutationsV1 } from "./semantic-stage-reducer.ts";
import type { StageRenderEntryV1 } from "./stage-render-target.ts";
import type { StageTargetChangeV1 } from "./stage-transition.ts";
import {
  parseSceneDocumentV1,
  sceneCueTransitionIdV1,
  sceneFromDocumentV1,
  sceneSettledMutationsV1,
  sceneStageTransitionBindingsV1,
} from "./scene.ts";

function sceneDocumentV1(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    format: "sillymaker.scene",
    version: 1,
    sceneId: "scene.app.opening",
    label: "开场",
    canvas: { width: 1280, height: 720 },
    entries: [
      {
        layerId: "layer.app.background",
        tag: "tag.backdrop",
        contentId: "content.app.background.shopfront",
        zOrder: 0,
      },
      {
        layerId: "layer.app.characters",
        tag: "tag.hero",
        contentId: "content.app.character.hero",
        zOrder: 10,
        placement: { x: 920, y: 600, scalePermille: 1000, opacityPermille: 1000, mirrored: false },
        appearance: { expression: "calm" },
      },
    ],
    cues: [
      { cueId: "cue.app.opening.backdrop", kind: "show", tag: "tag.backdrop" },
      {
        cueId: "cue.app.opening.hero-enters",
        kind: "show",
        tag: "tag.hero",
        motionId: "motion.app.hero-enter",
      },
      { cueId: "cue.app.opening.hero-leaves", kind: "hide", tag: "tag.hero" },
    ],
    ...overrides,
  };
}

function motionDocumentV1(motionId: string): Record<string, unknown> {
  return {
    format: "sillymaker.motion",
    version: 1,
    motionId,
    label: "enter",
    durationMs: 360,
    delayMs: 0,
    tracks: [
      {
        channel: "offsetY",
        keyframes: [{ atPermille: 0, value: 120 }, { atPermille: 1000, value: 0 }],
      },
    ],
  };
}

function emptyStageV1(): SemanticStageStateV1 {
  return createSemanticStageStateV1({
    stageId: "stage.app.main",
    layerIds: ["layer.app.background", "layer.app.characters"],
  });
}

function applyV1(
  stage: SemanticStageStateV1,
  mutations: readonly unknown[],
): SemanticStageStateV1 {
  const outcome = reduceStageMutationsV1(stage, mutations);
  if (outcome.kind !== "applied") throw new TypeError(JSON.stringify(outcome.rejection));
  return outcome.state;
}

function reasonOfV1(run: () => unknown): string {
  try {
    run();
  } catch (error) {
    if (error instanceof PresentationDataError) return error.reason;
    throw error;
  }
  throw new TypeError("expected a PresentationDataError");
}

function renderEntryV1(contentId: string): StageRenderEntryV1 {
  return { contentId } as unknown as StageRenderEntryV1;
}

describe("parseSceneDocumentV1", () => {
  it("admits a canonical document and freezes it", () => {
    const document = parseSceneDocumentV1(sceneDocumentV1());
    expect(document.sceneId).toBe("scene.app.opening");
    expect(document.entries).toHaveLength(2);
    expect(document.cues).toHaveLength(3);
    expect(Object.isFrozen(document)).toBe(true);
    expect(Object.isFrozen(document.entries[1]?.placement)).toBe(true);
  });

  it("rejects format, version, id, label, and canvas violations", () => {
    expect(reasonOfV1(() => parseSceneDocumentV1(sceneDocumentV1({ format: "sillymaker.motion" }))))
      .toBe("scene_format_invalid");
    expect(reasonOfV1(() => parseSceneDocumentV1(sceneDocumentV1({ version: 2 })))).toBe(
      "scene_version_unsupported",
    );
    expect(reasonOfV1(() => parseSceneDocumentV1(sceneDocumentV1({ sceneId: "opening" })))).toBe(
      "scene_id_invalid",
    );
    expect(reasonOfV1(() => parseSceneDocumentV1(sceneDocumentV1({ label: "" })))).toBe(
      "scene_label_invalid",
    );
    expect(
      reasonOfV1(() =>
        parseSceneDocumentV1(sceneDocumentV1({ canvas: { width: 0, height: 720 } }))
      ),
    ).toBe("scene_canvas_invalid");
  });

  it("rejects duplicate tags, duplicate cue ids, unknown cue tags, and bad kinds", () => {
    const duplicateTag = sceneDocumentV1();
    (duplicateTag.entries as Record<string, unknown>[])[1] = {
      ...(duplicateTag.entries as Record<string, unknown>[])[1],
      tag: "tag.backdrop",
    };
    expect(reasonOfV1(() => parseSceneDocumentV1(duplicateTag))).toBe("scene_entry_tag_duplicate");

    const duplicateCue = sceneDocumentV1();
    (duplicateCue.cues as Record<string, unknown>[])[1] = {
      ...(duplicateCue.cues as Record<string, unknown>[])[1],
      cueId: "cue.app.opening.backdrop",
    };
    expect(reasonOfV1(() => parseSceneDocumentV1(duplicateCue))).toBe("scene_cue_id_duplicate");

    const unknownTag = sceneDocumentV1();
    (unknownTag.cues as Record<string, unknown>[])[0] = {
      cueId: "cue.app.opening.ghost",
      kind: "show",
      tag: "tag.ghost",
    };
    expect(reasonOfV1(() => parseSceneDocumentV1(unknownTag))).toBe("scene_cue_tag_unknown");

    const badKind = sceneDocumentV1();
    (badKind.cues as Record<string, unknown>[])[0] = {
      cueId: "cue.app.opening.backdrop",
      kind: "replace",
      tag: "tag.backdrop",
    };
    expect(reasonOfV1(() => parseSceneDocumentV1(badKind))).toBe("scene_cue_kind_invalid");
  });

  it("rejects two cues binding different motions to one stage edge", () => {
    const ambiguous = sceneDocumentV1();
    (ambiguous.cues as Record<string, unknown>[]).push({
      cueId: "cue.app.opening.hero-re-enters",
      kind: "show",
      tag: "tag.hero",
      motionId: "motion.app.other",
    });
    expect(reasonOfV1(() => parseSceneDocumentV1(ambiguous))).toBe("scene_cue_binding_ambiguous");

    const agreeing = sceneDocumentV1();
    (agreeing.cues as Record<string, unknown>[]).push({
      cueId: "cue.app.opening.hero-re-enters",
      kind: "show",
      tag: "tag.hero",
      motionId: "motion.app.hero-enter",
    });
    expect(parseSceneDocumentV1(agreeing).cues).toHaveLength(4);
  });
});

describe("sceneFromDocumentV1", () => {
  const scene = sceneFromDocumentV1(sceneDocumentV1());

  it("exposes cue ids, mayShow, per-cue mayShow, and motion ids", () => {
    expect(scene.cueIds).toEqual([
      "cue.app.opening.backdrop",
      "cue.app.opening.hero-enters",
      "cue.app.opening.hero-leaves",
    ]);
    expect(scene.mayShow).toEqual([
      "content.app.background.shopfront",
      "content.app.character.hero",
    ]);
    expect(scene.cueMayShow("cue.app.opening.hero-enters")).toEqual([
      "content.app.character.hero",
    ]);
    expect(scene.cueMayShow("cue.app.opening.hero-leaves")).toEqual([]);
    expect(scene.cueMotionId("cue.app.opening.hero-enters")).toBe("motion.app.hero-enter");
    expect(scene.cueMotionId("cue.app.opening.backdrop")).toBeNull();
    expect(reasonOfV1(() => scene.cueMutations("cue.app.opening.missing", emptyStageV1()))).toBe(
      "scene_cue_unknown",
    );
  });

  it("shows an absent entry with its declared zOrder, placement, and appearance", () => {
    expect(scene.cueMutations("cue.app.opening.hero-enters", emptyStageV1())).toEqual([
      {
        kind: "show",
        layerId: "layer.app.characters",
        tag: "tag.hero",
        contentId: "content.app.character.hero",
        zOrder: 10,
        placement: { x: 920, y: 600, scalePermille: 1000, opacityPermille: 1000, mirrored: false },
        appearance: { expression: "calm" },
      },
    ]);
  });

  it("is idempotent: same content present yields no mutations", () => {
    const stage = applyV1(
      emptyStageV1(),
      scene.cueMutations("cue.app.opening.hero-enters", emptyStageV1()),
    );
    expect(scene.cueMutations("cue.app.opening.hero-enters", stage)).toEqual([]);
  });

  it("content-replaces without overriding placement or appearance continuity", () => {
    const stage = applyV1(emptyStageV1(), [
      {
        kind: "show",
        layerId: "layer.app.background",
        tag: "tag.backdrop",
        contentId: "content.app.background.backyard",
        zOrder: 0,
      },
    ]);
    expect(scene.cueMutations("cue.app.opening.backdrop", stage)).toEqual([
      {
        kind: "replace",
        layerId: "layer.app.background",
        tag: "tag.backdrop",
        contentId: "content.app.background.shopfront",
      },
    ]);
  });

  it("hides only when the entry is present", () => {
    expect(scene.cueMutations("cue.app.opening.hero-leaves", emptyStageV1())).toEqual([]);
    const stage = applyV1(
      emptyStageV1(),
      scene.cueMutations("cue.app.opening.hero-enters", emptyStageV1()),
    );
    expect(scene.cueMutations("cue.app.opening.hero-leaves", stage)).toEqual([
      { kind: "hide", layerId: "layer.app.characters", tag: "tag.hero" },
    ]);
  });
});

describe("sceneStageTransitionBindingsV1", () => {
  const scene = sceneFromDocumentV1(sceneDocumentV1());
  const bindings = sceneStageTransitionBindingsV1(scene, {
    motions: [motionDocumentV1("motion.app.hero-enter")],
  });

  it("derives one exact enter binding with the cue-derived transition id", () => {
    expect(sceneCueTransitionIdV1("cue.app.opening.hero-enters")).toBe(
      "transition.app.opening.hero-enters",
    );
    expect(bindings.definitions.map((definition) => definition.transitionId)).toEqual([
      "transition.app.opening.hero-enters",
    ]);
    expect(bindings.definitions[0]?.kind).toBe("motion");
    expect(bindings.resolveTransitionById("transition.app.opening.hero-enters")).toBe(
      bindings.definitions[0],
    );
  });

  it("resolves only the bound edge; everything else falls through as null", () => {
    const heroEnter: StageTargetChangeV1 = {
      kind: "enter",
      layerId: "layer.app.characters" as StageTargetChangeV1["layerId"],
      entryKey: "layer.app.characters:tag.hero",
      previous: null,
      next: renderEntryV1("content.app.character.hero"),
    };
    expect(bindings.resolveTransition(heroEnter)?.transitionId).toBe(
      "transition.app.opening.hero-enters",
    );
    expect(
      bindings.resolveTransition({
        ...heroEnter,
        entryKey: "layer.app.background:tag.backdrop",
        layerId: "layer.app.background" as StageTargetChangeV1["layerId"],
        next: renderEntryV1("content.app.background.shopfront"),
      }),
    ).toBeNull();
    expect(
      bindings.resolveTransition({
        ...heroEnter,
        kind: "replace",
        previous: renderEntryV1("content.app.character.hero"),
      }),
    ).toBeNull();
    expect(
      bindings.resolveTransition({
        ...heroEnter,
        kind: "exit",
        previous: renderEntryV1("content.app.character.hero"),
        next: null,
      }),
    ).toBeNull();
  });

  it("rejects uncovered cue motions and duplicate motion documents", () => {
    expect(reasonOfV1(() => sceneStageTransitionBindingsV1(scene, { motions: [] }))).toBe(
      "scene_cue_motion_missing",
    );
    expect(
      reasonOfV1(() =>
        sceneStageTransitionBindingsV1(scene, {
          motions: [
            motionDocumentV1("motion.app.hero-enter"),
            motionDocumentV1("motion.app.hero-enter"),
          ],
        })
      ),
    ).toBe("scene_motion_duplicate");
  });
});

describe("sceneSettledMutationsV1", () => {
  const scene = sceneFromDocumentV1(sceneDocumentV1());

  it("replays cue order into one reducible batch", () => {
    const mutations = sceneSettledMutationsV1(scene);
    expect(mutations.map((mutation) => mutation.kind)).toEqual(["show", "show", "hide"]);
    const settled = applyV1(emptyStageV1(), mutations);
    expect(settled.layers[0]?.entries).toHaveLength(1);
    expect(settled.layers[1]?.entries).toHaveLength(0);
  });

  it("stops after the requested cue and validates the id", () => {
    const mutations = sceneSettledMutationsV1(scene, {
      throughCueId: "cue.app.opening.hero-enters",
    });
    expect(mutations.map((mutation) => mutation.kind)).toEqual(["show", "show"]);
    const settled = applyV1(emptyStageV1(), mutations);
    expect(settled.layers[1]?.entries[0]?.contentId).toBe("content.app.character.hero");
    expect(reasonOfV1(() => sceneSettledMutationsV1(scene, { throughCueId: "cue.app.nope" })))
      .toBe("scene_cue_unknown");
  });
});
