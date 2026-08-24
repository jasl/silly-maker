// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";

import { PresentationDataError } from "./presentation-data.ts";
import { createSemanticStageStateV1 } from "./semantic-stage.ts";
import type { SemanticStageStateV1 } from "./semantic-stage.ts";
import { reduceStageMutationsV1 } from "./semantic-stage-reducer.ts";
import type { StageRenderEntryV1 } from "./stage-render-target.ts";
import type { StageTargetChangeV1 } from "./stage-transition.ts";
import type { StageLayerIdV1 } from "./semantic-stage.ts";
import {
  parseSceneDocumentV1,
  sceneAmbientCatalogV1,
  sceneCueTransitionIdV1,
  sceneFromAuthoringRuntimePlanV1,
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

  it("never executes author getters while probing optional keys", () => {
    let zOrderReads = 0;
    const entryDocument = sceneDocumentV1();
    const entry = {
      layerId: "layer.app.characters",
      tag: "tag.villain",
      contentId: "content.app.character.villain",
    };
    Object.defineProperty(entry, "zOrder", {
      get() {
        zOrderReads += 1;
        return 10;
      },
      enumerable: true,
      configurable: true,
    });
    (entryDocument.entries as unknown[]).push(entry);
    expect(reasonOfV1(() => parseSceneDocumentV1(entryDocument))).toBe("data_property_expected");
    expect(zOrderReads).toBe(0);

    let motionReads = 0;
    const cueDocument = sceneDocumentV1();
    const cue = { cueId: "cue.app.opening.villain", kind: "show", tag: "tag.hero" };
    Object.defineProperty(cue, "motionId", {
      get() {
        motionReads += 1;
        return "motion.app.hero-enter";
      },
      enumerable: true,
      configurable: true,
    });
    (cueDocument.cues as unknown[]).push(cue);
    expect(reasonOfV1(() => parseSceneDocumentV1(cueDocument))).toBe("data_property_expected");
    expect(motionReads).toBe(0);

    // An explicit-undefined data property still fails the exact-key check.
    const explicitUndefined = sceneDocumentV1();
    (explicitUndefined.cues as Record<string, unknown>[])[0] = {
      cueId: "cue.app.opening.backdrop",
      kind: "show",
      tag: "tag.backdrop",
      motionId: undefined,
    };
    expect(reasonOfV1(() => parseSceneDocumentV1(explicitUndefined))).toBe("object_keys");
  });

  it("admits two cues binding divergent presentations to one stage edge", () => {
    // Divergent same-edge bindings are legal per-cue declarations resolved
    // through presentation edge context (cue-identity, accepted 2026-08-17).
    const divergent = sceneDocumentV1();
    (divergent.cues as Record<string, unknown>[]).push({
      cueId: "cue.app.opening.hero-re-enters",
      kind: "show",
      tag: "tag.hero",
      motionId: "motion.app.other",
    });
    expect(parseSceneDocumentV1(divergent).cues).toHaveLength(4);
  });

  it("admits explicit cut cues and rejects malformed cut declarations", () => {
    const withCut = sceneDocumentV1();
    (withCut.cues as Record<string, unknown>[]).push({
      cueId: "cue.app.opening.hero-pops",
      kind: "show",
      tag: "tag.hero",
      cut: true,
    });
    const document = parseSceneDocumentV1(withCut);
    expect(document.cues[3]).toMatchObject({ cueId: "cue.app.opening.hero-pops", cut: true });

    const nonTrue = sceneDocumentV1();
    (nonTrue.cues as Record<string, unknown>[]).push({
      cueId: "cue.app.opening.hero-pops",
      kind: "show",
      tag: "tag.hero",
      cut: false,
    });
    expect(reasonOfV1(() => parseSceneDocumentV1(nonTrue))).toBe("scene_cue_cut_invalid");

    const both = sceneDocumentV1();
    (both.cues as Record<string, unknown>[]).push({
      cueId: "cue.app.opening.hero-pops",
      kind: "show",
      tag: "tag.hero",
      motionId: "motion.app.hero-enter",
      cut: true,
    });
    expect(reasonOfV1(() => parseSceneDocumentV1(both))).toBe("scene_cue_cut_motion_conflict");
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

describe("sceneAmbientCatalogV1", () => {
  const layerId = "layer.app.characters" as StageLayerIdV1;
  function ambientDocumentV1(phaseMs?: number): Record<string, unknown> {
    const base = sceneDocumentV1();
    const entries = base.entries as Record<string, unknown>[];
    return {
      ...base,
      entries: [
        entries[0],
        {
          ...entries[1],
          ambient: {
            motionId: "motion.app.breathe",
            ...(phaseMs === undefined ? {} : { phaseMs }),
          },
        },
      ],
    };
  }

  it("admits the ambient binding and leaves cue/open mutations byte-identical", () => {
    const plain = sceneFromDocumentV1(sceneDocumentV1());
    const withAmbient = sceneFromDocumentV1(ambientDocumentV1(250));
    const entry = withAmbient.sceneDocument.entries[1];
    expect(entry?.ambient).toEqual({ motionId: "motion.app.breathe", phaseMs: 250 });
    // Ambient is presentation-only derived data: the authoritative mutation
    // batches do not change by a byte when a document declares it.
    expect(JSON.stringify(withAmbient.openMutations(emptyStageV1()))).toBe(
      JSON.stringify(plain.openMutations(emptyStageV1())),
    );
    expect(
      JSON.stringify(withAmbient.cueMutations("cue.app.opening.hero-enters", emptyStageV1())),
    ).toBe(JSON.stringify(plain.cueMutations("cue.app.opening.hero-enters", emptyStageV1())));
  });

  it("rejects bad ambient declarations at admission", () => {
    const withAmbient = (ambient: unknown) => {
      const base = sceneDocumentV1();
      const entries = base.entries as Record<string, unknown>[];
      return { ...base, entries: [entries[0], { ...entries[1], ambient }] };
    };
    expect(reasonOfV1(() => parseSceneDocumentV1(withAmbient("motion.app.breathe")))).toBe(
      "scene_ambient_invalid",
    );
    expect(reasonOfV1(() => parseSceneDocumentV1(withAmbient({ motionId: "nope" })))).toBe(
      "scene_ambient_motion_id_invalid",
    );
    expect(
      reasonOfV1(() =>
        parseSceneDocumentV1(withAmbient({ motionId: "motion.app.breathe", phaseMs: -1 }))
      ),
    ).toBe("scene_ambient_phase_invalid");
    expect(
      reasonOfV1(() =>
        parseSceneDocumentV1(withAmbient({ motionId: "motion.app.breathe", extra: 1 }))
      ),
    ).toBe("object_keys");
  });

  it("resolves the exact declared entry and falls through otherwise", () => {
    const scene = sceneFromDocumentV1(ambientDocumentV1(250));
    const catalog = sceneAmbientCatalogV1(scene, {
      motions: [motionDocumentV1("motion.app.breathe")],
    });
    const heroEntry = {
      key: "layer.app.characters:tag.hero",
      contentId: "content.app.character.hero",
    } as unknown as StageRenderEntryV1;
    const binding = catalog.resolveAmbient(layerId, heroEntry);
    expect(binding?.motion.motionId).toBe("motion.app.breathe");
    expect(binding?.phaseMs).toBe(250);
    // Different content on the same tag (a gameplay replace) falls through:
    // the loop was authored for the declared content.
    const swapped = {
      key: "layer.app.characters:tag.hero",
      contentId: "content.app.character.other",
    } as unknown as StageRenderEntryV1;
    expect(catalog.resolveAmbient(layerId, swapped)).toBeNull();
    expect(
      catalog.resolveAmbient("layer.app.background" as StageLayerIdV1, heroEntry),
    ).toBeNull();
    // phaseMs defaults to 0 when omitted.
    const defaulted = sceneAmbientCatalogV1(sceneFromDocumentV1(ambientDocumentV1()), {
      motions: [motionDocumentV1("motion.app.breathe")],
    });
    expect(defaulted.resolveAmbient(layerId, heroEntry)?.phaseMs).toBe(0);
  });

  it("rejects uncovered ambient motions and duplicate motion documents", () => {
    const scene = sceneFromDocumentV1(ambientDocumentV1());
    expect(reasonOfV1(() => sceneAmbientCatalogV1(scene, { motions: [] }))).toBe(
      "scene_ambient_motion_missing",
    );
    expect(
      reasonOfV1(() =>
        sceneAmbientCatalogV1(scene, {
          motions: [
            motionDocumentV1("motion.app.breathe"),
            motionDocumentV1("motion.app.breathe"),
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

describe("sceneStageTransitionBindingsV1 edge options", () => {
  it("forwards per-cue edge behavior to the derived motion transition", () => {
    const scene = sceneFromDocumentV1(sceneDocumentV1());
    const bindings = sceneStageTransitionBindingsV1(scene, {
      motions: [motionDocumentV1("motion.app.hero-enter")],
      edges: {
        "cue.app.opening.hero-enters": { inputPolicy: "block", acknowledge: true },
      },
    });
    const definition = bindings.resolveTransitionById(
      "transition.app.opening.hero-enters",
    );
    expect(definition).toMatchObject({
      kind: "motion",
      inputPolicy: "block",
      acknowledge: true,
    });
  });

  it("resolves divergent duplicate edges per-cue and drops them from the fallback", () => {
    const document = sceneDocumentV1();
    (document.cues as Record<string, unknown>[]).push({
      cueId: "cue.app.opening.hero-re-enters",
      kind: "show",
      tag: "tag.hero",
      motionId: "motion.app.hero-enter",
    });
    const scene = sceneFromDocumentV1(document);
    const failures: string[] = [];
    const bindings = sceneStageTransitionBindingsV1(scene, {
      motions: [motionDocumentV1("motion.app.hero-enter")],
      edges: { "cue.app.opening.hero-enters": { inputPolicy: "block", acknowledge: true } },
      reportFailure: (code) => failures.push(code),
    });
    const heroEnter: StageTargetChangeV1 = {
      kind: "enter",
      layerId: "layer.app.characters" as StageTargetChangeV1["layerId"],
      entryKey: "layer.app.characters:tag.hero",
      previous: null,
      next: renderEntryV1("content.app.character.hero"),
    };

    // Each dispatch selects its own cue's effective behavior.
    expect(
      bindings.resolveTransition({
        ...heroEnter,
        dispatches: [{ sceneId: "scene.app.opening", cueId: "cue.app.opening.hero-enters" }],
      }),
    ).toMatchObject({
      transitionId: "transition.app.opening.hero-enters",
      inputPolicy: "block",
      acknowledge: true,
    });
    expect(
      bindings.resolveTransition({
        ...heroEnter,
        dispatches: [{ sceneId: "scene.app.opening", cueId: "cue.app.opening.hero-re-enters" }],
      }),
    ).toMatchObject({
      transitionId: "transition.app.opening.hero-re-enters",
      inputPolicy: "target_active",
      acknowledge: false,
    });

    // Without context the divergent edge declares nothing: null fall-through
    // plus one observational diagnostic.
    expect(bindings.resolveTransition(heroEnter)).toBeNull();
    expect(failures).toEqual(["scene.cue_binding_context_missing"]);
  });

  it("keeps agreeing duplicate edges in the context-free fallback", () => {
    const document = sceneDocumentV1();
    (document.cues as Record<string, unknown>[]).push({
      cueId: "cue.app.opening.hero-re-enters",
      kind: "show",
      tag: "tag.hero",
      motionId: "motion.app.hero-enter",
    });
    const scene = sceneFromDocumentV1(document);
    // An explicit default equals an omitted option after normalization.
    const bindings = sceneStageTransitionBindingsV1(scene, {
      motions: [motionDocumentV1("motion.app.hero-enter")],
      edges: { "cue.app.opening.hero-enters": { acknowledge: false } },
    });
    // Every presentation-bearing cue owns a per-cue definition now.
    expect(bindings.definitions.map((definition) => definition.transitionId)).toEqual([
      "transition.app.opening.hero-enters",
      "transition.app.opening.hero-re-enters",
    ]);
    // Context-free resolution keeps the pre-context behavior: the agreeing
    // edge still resolves (first declaration wins).
    expect(
      bindings.resolveTransition({
        kind: "enter",
        layerId: "layer.app.characters" as StageTargetChangeV1["layerId"],
        entryKey: "layer.app.characters:tag.hero",
        previous: null,
        next: renderEntryV1("content.app.character.hero"),
      })?.transitionId,
    ).toBe("transition.app.opening.hero-enters");
  });

  it("resolves explicit cut cues cue-first and never through the fallback", () => {
    const document = sceneDocumentV1();
    (document.cues as Record<string, unknown>[]).push({
      cueId: "cue.app.opening.hero-pops",
      kind: "show",
      tag: "tag.hero",
      cut: true,
    });
    const scene = sceneFromDocumentV1(document);
    const failures: string[] = [];
    const bindings = sceneStageTransitionBindingsV1(scene, {
      motions: [motionDocumentV1("motion.app.hero-enter")],
      reportFailure: (code) => failures.push(code),
    });
    const heroEnter: StageTargetChangeV1 = {
      kind: "enter",
      layerId: "layer.app.characters" as StageTargetChangeV1["layerId"],
      entryKey: "layer.app.characters:tag.hero",
      previous: null,
      next: renderEntryV1("content.app.character.hero"),
    };

    // The cut dispatch returns a non-null cut definition, suppressing outer
    // catalog rules instead of falling through.
    expect(
      bindings.resolveTransition({
        ...heroEnter,
        dispatches: [{ sceneId: "scene.app.opening", cueId: "cue.app.opening.hero-pops" }],
      }),
    ).toMatchObject({ transitionId: "transition.app.opening.hero-pops", kind: "cut" });
    expect(
      bindings.resolveTransition({
        ...heroEnter,
        dispatches: [{ sceneId: "scene.app.opening", cueId: "cue.app.opening.hero-enters" }],
      }),
    ).toMatchObject({ transitionId: "transition.app.opening.hero-enters", kind: "motion" });
    expect(bindings.resolveTransitionById("transition.app.opening.hero-pops")).toMatchObject({
      kind: "cut",
      durationMs: 0,
    });

    // A motion + cut edge is divergent: context-free resolution declares
    // nothing (the explicit cut never leaks into the fallback).
    expect(bindings.resolveTransition(heroEnter)).toBeNull();
    expect(failures).toEqual(["scene.cue_binding_context_missing"]);
  });

  it("resolves bare-cue dispatches to null instead of inheriting the edge binding", () => {
    // The migration-precheck leak: a deliberately motionless cue on a bound
    // edge previously required forking the stage identity.
    const document = sceneDocumentV1();
    (document.cues as Record<string, unknown>[]).push({
      cueId: "cue.app.opening.hero-appears",
      kind: "show",
      tag: "tag.hero",
    });
    const scene = sceneFromDocumentV1(document);
    const bindings = sceneStageTransitionBindingsV1(scene, {
      motions: [motionDocumentV1("motion.app.hero-enter")],
    });
    const heroEnter: StageTargetChangeV1 = {
      kind: "enter",
      layerId: "layer.app.characters" as StageTargetChangeV1["layerId"],
      entryKey: "layer.app.characters:tag.hero",
      previous: null,
      next: renderEntryV1("content.app.character.hero"),
    };

    // The bare cue declares nothing scene-level: null fall-through, no
    // sibling-motion inheritance.
    expect(
      bindings.resolveTransition({
        ...heroEnter,
        dispatches: [{ sceneId: "scene.app.opening", cueId: "cue.app.opening.hero-appears" }],
      }),
    ).toBeNull();
    // A bare cue does not make the edge divergent: context-free resolution
    // keeps today's single-binding fallback (the documented leak).
    expect(bindings.resolveTransition(heroEnter)?.transitionId).toBe(
      "transition.app.opening.hero-enters",
    );
    // Dispatch context is complete: a change nothing of this scene explains
    // must not be claimed by the edge-tuple fallback (the cross-scene
    // silent override) — whether the dispatches name other scenes'
    // cues, non-matching cues, or a foreign scene's open.
    expect(
      bindings.resolveTransition({
        ...heroEnter,
        dispatches: [
          { sceneId: "scene.app.other", cueId: "cue.app.opening.hero-appears" },
          { sceneId: "scene.app.opening", cueId: "cue.app.opening.hero-leaves" },
        ],
      }),
    ).toBeNull();
    expect(
      bindings.resolveTransition({
        ...heroEnter,
        dispatches: [{ sceneId: "scene.app.other", open: true }],
      }),
    ).toBeNull();
    // An open OF THIS SCENE genuinely produces its declared entries' edges
    // and keeps context-free fallback semantics (owner ruling #2).
    expect(
      bindings.resolveTransition({
        ...heroEnter,
        dispatches: [
          { sceneId: "scene.app.opening", open: true },
          { sceneId: "scene.app.opening", cueId: "cue.app.opening.hero-leaves" },
        ],
      })?.transitionId,
    ).toBe("transition.app.opening.hero-enters");
  });

  it("rejects edge options that name no motion-binding cue", () => {
    const scene = sceneFromDocumentV1(sceneDocumentV1());
    expect(
      reasonOfV1(() =>
        sceneStageTransitionBindingsV1(scene, {
          motions: [motionDocumentV1("motion.app.hero-enter")],
          edges: { "cue.app.opening.ghost": { acknowledge: true } },
        })
      ),
    ).toBe("scene_edge_options_unknown_cue");
    expect(
      reasonOfV1(() =>
        sceneStageTransitionBindingsV1(scene, {
          motions: [motionDocumentV1("motion.app.hero-enter")],
          // The backdrop cue exists but binds no motion.
          edges: { "cue.app.opening.backdrop": { acknowledge: true } },
        })
      ),
    ).toBe("scene_edge_options_unknown_cue");
  });
});

describe("scene.openMutations", () => {
  const scene = sceneFromDocumentV1(sceneDocumentV1());

  function openedStageV1(): SemanticStageStateV1 {
    return applyV1(emptyStageV1(), scene.openMutations(emptyStageV1()));
  }

  it("opens an empty stage in document order and is idempotent", () => {
    const opened = scene.openMutations(emptyStageV1());
    expect(opened.map((mutation) => mutation.kind)).toEqual(["show", "show"]);
    const stage = applyV1(emptyStageV1(), opened);
    expect(stage.layers[0]?.entries[0]?.contentId).toBe("content.app.background.shopfront");
    expect(stage.layers[1]?.entries[0]?.placement).toMatchObject({ x: 920, y: 600 });
    expect(scene.openMutations(stage)).toEqual([]);
  });

  it("hides strangers on declared layers, then corrects drifted placement and appearance", () => {
    const drifted = applyV1(openedStageV1(), [
      {
        kind: "show",
        layerId: "layer.app.characters",
        tag: "tag.stranger",
        contentId: "content.app.character.stranger",
        zOrder: 20,
      },
      {
        kind: "setPlacement",
        layerId: "layer.app.characters",
        tag: "tag.hero",
        placement: { x: 100, y: 200, scalePermille: 900, opacityPermille: 1000, mirrored: true },
      },
      {
        kind: "setAppearance",
        layerId: "layer.app.characters",
        tag: "tag.hero",
        appearance: { expression: "smiling" },
      },
    ]);
    const reopened = scene.openMutations(drifted);
    expect(reopened.map((mutation) => mutation.kind)).toEqual([
      "hide",
      "setPlacement",
      "setAppearance",
    ]);
    expect(reopened[0]).toMatchObject({ tag: "tag.stranger" });
    const settled = applyV1(drifted, reopened);
    const hero = settled.layers[1]?.entries.find((entry) => (entry.tag as string) === "tag.hero");
    expect(hero?.placement).toMatchObject({ x: 920, y: 600, mirrored: false });
    expect(hero?.appearance).toEqual({ expression: "calm" });
    expect(settled.layers[1]?.entries).toHaveLength(1);
    expect(scene.openMutations(settled)).toEqual([]);
  });

  it("replaces drifted content and leaves silent declarations alone", () => {
    const drifted = applyV1(openedStageV1(), [
      {
        kind: "replace",
        layerId: "layer.app.background",
        tag: "tag.backdrop",
        contentId: "content.app.background.backyard",
      },
      {
        kind: "setPlacement",
        layerId: "layer.app.background",
        tag: "tag.backdrop",
        placement: { x: 5, y: 5, scalePermille: 1000, opacityPermille: 1000, mirrored: false },
      },
    ]);
    // The backdrop declares no placement, so only the content corrects.
    const reopened = scene.openMutations(drifted);
    expect(reopened.map((mutation) => mutation.kind)).toEqual(["replace"]);
    const settled = applyV1(drifted, reopened);
    expect(settled.layers[0]?.entries[0]?.contentId).toBe("content.app.background.shopfront");
    expect(settled.layers[0]?.entries[0]?.placement).toMatchObject({ x: 5, y: 5 });
    expect(scene.openMutations(settled)).toEqual([]);
  });

  it("keeps low-level gameplay-owned z-order continuity", () => {
    const drifted = applyV1(openedStageV1(), [
      {
        kind: "setZOrder",
        layerId: "layer.app.characters",
        tag: "tag.hero",
        zOrder: 99,
      },
    ]);
    expect(drifted.layers[1]?.entries[0]?.zOrder).toBe(99);
    expect(scene.openMutations(drifted)).toEqual([]);
  });

  it("never touches layers the document does not declare", () => {
    const wideStage = createSemanticStageStateV1({
      stageId: "stage.app.main",
      layerIds: ["layer.app.background", "layer.app.characters", "layer.app.effects"],
    });
    const withEffect = applyV1(wideStage, [
      {
        kind: "show",
        layerId: "layer.app.effects",
        tag: "tag.rain",
        contentId: "content.app.effect.rain",
      },
    ]);
    const opened = scene.openMutations(withEffect);
    expect(
      opened.every((mutation) =>
        (mutation as { readonly layerId?: string }).layerId !== "layer.app.effects"
      ),
    ).toBe(true);
    const settled = applyV1(withEffect, opened);
    expect(settled.layers[2]?.entries).toHaveLength(1);
    expect(scene.openMutations(settled)).toEqual([]);
  });
});

describe("sceneFromAuthoringRuntimePlanV1", () => {
  const document = parseSceneDocumentV1(sceneDocumentV1());
  const scene = sceneFromAuthoringRuntimePlanV1({
    sourceKind: "authoring_scene",
    sceneDocument: document,
    orderedLayerIds: [
      document.entries[0]!.layerId,
      document.entries[1]!.layerId,
    ],
  });

  it("reconciles authored layer and visible z order without showing hidden cue targets", () => {
    const reversed = createSemanticStageStateV1({
      stageId: "stage.app.main",
      layerIds: ["layer.app.characters", "layer.app.background"],
    });
    const orderingOnly = scene.reconcileOrderingMutations(reversed);
    expect(orderingOnly.map((mutation) => mutation.kind)).toEqual(["setLayerOrder"]);
    const orderedEmpty = applyV1(reversed, orderingOnly);
    expect(orderedEmpty.layers.every((layer) => layer.entries.length === 0)).toBe(true);

    const settled = applyV1(orderedEmpty, scene.openMutations(orderedEmpty));
    expect(settled.layers.map((layer) => layer.layerId)).toEqual([
      "layer.app.background",
      "layer.app.characters",
    ]);

    const drifted = applyV1(settled, [
      {
        kind: "setZOrder",
        layerId: "layer.app.characters",
        tag: "tag.hero",
        zOrder: 99,
      },
    ]);
    expect(scene.reconcileOrderingMutations(drifted)).toEqual([
      {
        kind: "setZOrder",
        layerId: "layer.app.characters",
        tag: "tag.hero",
        zOrder: 10,
      },
    ]);
  });

  it("fails the atomic batch when the authored layer set is incompatible", () => {
    const incompatible = createSemanticStageStateV1({
      stageId: "stage.app.main",
      layerIds: [
        "layer.app.background",
        "layer.app.characters",
        "layer.app.effects",
      ],
    });
    const outcome = reduceStageMutationsV1(
      incompatible,
      scene.reconcileOrderingMutations(incompatible),
    );
    expect(outcome).toMatchObject({
      kind: "rejected",
      rejection: { code: "stage.layer_order_invalid", mutationIndex: 0 },
    });
    expect(incompatible.layers.map((layer) => layer.layerId)).toEqual([
      "layer.app.background",
      "layer.app.characters",
      "layer.app.effects",
    ]);
  });

  it("orders an authored empty layer without claiming its entry membership", () => {
    const withEmptyLayer = sceneFromAuthoringRuntimePlanV1({
      sourceKind: "authoring_scene",
      sceneDocument: document,
      orderedLayerIds: [
        "layer.app.empty" as StageLayerIdV1,
        document.entries[0]!.layerId,
        document.entries[1]!.layerId,
      ],
    });
    const stage = createSemanticStageStateV1({
      stageId: "stage.app.main",
      layerIds: [
        "layer.app.empty",
        "layer.app.background",
        "layer.app.characters",
      ],
    });
    const withStranger = applyV1(stage, [{
      kind: "show",
      layerId: "layer.app.empty",
      tag: "tag.stranger",
      contentId: "content.app.character.stranger",
    }]);

    const opened = withEmptyLayer.openMutations(withStranger);
    const settled = applyV1(withStranger, opened);
    expect(settled.layers[0]?.entries).toMatchObject([{ tag: "tag.stranger" }]);
  });
});
