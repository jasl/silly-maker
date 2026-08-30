// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";

import { canonicalJsonBytes } from "../contracts/canonical-json.ts";
import { PresentationDataError } from "../contracts/presentation-data.ts";
import { parseSceneDocumentV1 } from "../contracts/scene.ts";
import {
  admitAuthoringSceneDocumentV1,
  admitAuthoringSceneSourceBytesV1,
  compileAuthoringSceneV1,
} from "./scene.ts";

function transformV1(
  overrides: Partial<{
    x: number;
    y: number;
    scalePermille: number;
    opacityPermille: number;
    mirrored: boolean;
  }> = {},
): Record<string, unknown> {
  return {
    x: 0,
    y: 0,
    scalePermille: 1000,
    opacityPermille: 1000,
    mirrored: false,
    ...overrides,
  };
}

function authoringSceneV1(): Record<string, unknown> {
  return {
    format: "sillymaker.authoring-scene",
    version: 1,
    sceneId: "scene.app.opening",
    label: "Opening",
    canvas: { width: 1280, height: 720 },
    layers: [
      {
        layerId: "layer.app.background",
        label: "Background",
        roots: [
          {
            objectId: "tag.background",
            label: "Backdrop",
            visual: { contentId: "content.app.background" },
          },
        ],
      },
      {
        layerId: "layer.app.characters",
        label: "Characters",
        roots: [
          {
            objectId: "tag.group",
            label: "Mirrored group",
            localTransform: transformV1({
              x: 10,
              y: 20,
              scalePermille: 500,
              opacityPermille: 500,
              mirrored: true,
            }),
            bindings: { timelineIds: ["cue.app.group"] },
            children: [
              {
                objectId: "tag.hero",
                label: "Hero",
                localTransform: transformV1({
                  x: 1,
                  y: -1,
                  scalePermille: 1001,
                  opacityPermille: 501,
                }),
                visual: {
                  contentId: "content.app.hero",
                  appearance: { expression: "calm" },
                  ambient: { motionId: "motion.app.breathe", phaseMs: 250 },
                },
              },
              {
                objectId: "tag.ghost",
                label: "Off-canvas transparent ghost",
                localTransform: transformV1({ x: -4000, opacityPermille: 0 }),
                visual: { contentId: "content.app.ghost" },
                bindings: {
                  hitRegionIds: ["left", "right"],
                  motionIds: ["motion.app.wave"],
                  timelineIds: ["cue.app.parallel"],
                  interactions: [{ regionId: "left", intentId: "intent.app.touch" }],
                },
              },
            ],
          },
          {
            objectId: "tag.villain",
            label: "Villain",
            visual: { contentId: "content.app.villain" },
            bindings: {
              hitRegionIds: ["activate"],
              interactions: [{ regionId: "activate", intentId: "intent.app.challenge" }],
            },
          },
        ],
      },
    ],
    cues: [
      {
        cueId: "cue.app.hero.show",
        kind: "show",
        objectId: "tag.hero",
        motionId: "motion.app.enter",
      },
      { cueId: "cue.app.hero.hide", kind: "hide", objectId: "tag.hero", cut: true },
    ],
  };
}

function reverseRecordKeysV1(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(reverseRecordKeysV1);
  if (value === null || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value).toReversed().map(([key, entry]) => [key, reverseRecordKeysV1(entry)]),
  );
}

function reasonV1(run: () => unknown): string {
  try {
    run();
  } catch (error) {
    if (error instanceof PresentationDataError) return error.reason;
    throw error;
  }
  throw new TypeError("expected PresentationDataError");
}

describe("Authoring Scene admission", () => {
  it("admits bounded source bytes once and rejects invalid JSON before schema admission", () => {
    const encoder = new TextEncoder();
    const admitted = admitAuthoringSceneSourceBytesV1(
      encoder.encode(JSON.stringify(authoringSceneV1())),
    );
    expect(admitted.document.sceneId).toBe("scene.app.opening");
    expect(
      reasonV1(() =>
        admitAuthoringSceneSourceBytesV1(
          encoder.encode('{"format":"sillymaker.authoring-scene","format":"duplicate"}'),
        )
      ),
    ).toBe("authoring_scene_json_invalid");
  });

  it("normalizes optional transform/children/appearance and retains pointer provenance", () => {
    const admitted = admitAuthoringSceneDocumentV1(authoringSceneV1());
    const background = admitted.document.layers[0]?.roots[0];

    expect(background?.localTransform).toEqual({
      x: 0,
      y: 0,
      scalePermille: 1000,
      opacityPermille: 1000,
      mirrored: false,
    });
    expect(background?.children).toEqual([]);
    expect(background?.visual?.appearance).toEqual({});
    expect(admitted.sourceMap.objects.map((source) => [source.objectId, source.jsonPointer]))
      .toEqual([
        ["tag.background", "/layers/0/roots/0"],
        ["tag.group", "/layers/1/roots/0"],
        ["tag.hero", "/layers/1/roots/0/children/0"],
        ["tag.ghost", "/layers/1/roots/0/children/1"],
        ["tag.villain", "/layers/1/roots/1"],
      ]);
    const ghost = admitted.document.layers[1]?.roots[0]?.children[1];
    expect(ghost?.bindings).toEqual({
      hitRegionIds: ["left", "right"],
      motionIds: ["motion.app.wave"],
      timelineIds: ["cue.app.parallel"],
      interactions: [{ regionId: "left", intentId: "intent.app.touch" }],
      guiControls: [],
    });
    const villain = admitted.document.layers[1]?.roots[1];
    expect(villain?.bindings).toMatchObject({ motionIds: [], timelineIds: [] });
  });

  it("admits and compiles large generated scene collections without semantic count caps", () => {
    const layerCount = 300;
    const cueCount = 600;
    const scene = authoringSceneV1();
    scene.layers = Array.from({ length: layerCount }, (_, index) => ({
      layerId: `layer.scale.${String(index)}`,
      label: `Layer ${String(index)}`,
      roots: [{
        objectId: `tag.scale.${String(index)}`,
        label: `Object ${String(index)}`,
        visual: { contentId: `content.scale.${String(index)}` },
      }],
    }));
    scene.cues = Array.from({ length: cueCount }, (_, index) => ({
      cueId: `cue.scale.${String(index)}`,
      kind: "show",
      objectId: `tag.scale.${String(index % layerCount)}`,
    }));

    const admitted = admitAuthoringSceneSourceBytesV1(
      new TextEncoder().encode(JSON.stringify(scene)),
    );
    const compiled = compileAuthoringSceneV1(admitted);
    expect(compiled.runtimePlan.orderedLayerIds).toHaveLength(layerCount);
    expect(compiled.runtimePlan.sceneDocument.entries).toHaveLength(layerCount);
    expect(compiled.runtimePlan.sceneDocument.cues).toHaveLength(cueCount);
    expect(compiled.runtimePlan.sceneDocument.cues.at(-1)?.cueId).toBe("cue.scale.599");
  });

  it("retains large generated binding collections without truncation", () => {
    const bindingCount = 300;
    const scene = authoringSceneV1();
    const layers = scene.layers as Record<string, unknown>[];
    const background = (layers[0]!.roots as Record<string, unknown>[])[0]!;
    background.bindings = {
      hitRegionIds: Array.from(
        { length: bindingCount },
        (_, index) => `zone-generated-${String(index)}`,
      ),
      motionIds: Array.from(
        { length: bindingCount },
        (_, index) => `motion.scale.${String(index)}`,
      ),
      timelineIds: Array.from(
        { length: bindingCount },
        (_, index) => `cue.scale.timeline.${String(index)}`,
      ),
      interactions: Array.from({ length: bindingCount }, (_, index) => ({
        regionId: `zone-generated-${String(index)}`,
        intentId: `intent.scale.${String(index)}`,
      })),
      guiControls: Array.from({ length: bindingCount }, (_, index) => ({
        controlId: `control.scale.${String(index)}`,
        intentId: `intent.scale.control.${String(index)}`,
      })),
    };

    const compiled = compileAuthoringSceneV1(admitAuthoringSceneDocumentV1(scene));
    const forBackground = <T extends { readonly objectId: unknown }>(entries: readonly T[]) =>
      entries.filter((entry) => entry.objectId === "tag.background");
    expect(forBackground(compiled.bindings.hitRegions)).toHaveLength(bindingCount);
    expect(forBackground(compiled.bindings.motions)).toHaveLength(bindingCount);
    expect(forBackground(compiled.bindings.timelines)).toHaveLength(bindingCount);
    expect(forBackground(compiled.bindings.interactions)).toHaveLength(bindingCount);
    expect(forBackground(compiled.bindings.guiControls)).toHaveLength(bindingCount);
  });

  it("keeps source resource bounds separate from trusted direct-object admission", () => {
    const scene = authoringSceneV1();
    const layers = scene.layers as Record<string, unknown>[];
    const background = (layers[0]!.roots as Record<string, unknown>[])[0]!;
    const appearance = Object.fromEntries(
      Array.from({ length: 129 }, (_, index) => [`tone${String(index)}`, "plain"]),
    );
    background.visual = { contentId: "content.app.background", appearance };

    const admitted = admitAuthoringSceneDocumentV1(scene);
    expect(Object.keys(admitted.document.layers[0]!.roots[0]!.visual!.appearance)).toHaveLength(
      129,
    );
    expect(
      reasonV1(() =>
        admitAuthoringSceneSourceBytesV1(new TextEncoder().encode(JSON.stringify(scene)))
      ),
    ).toBe("authoring_scene_json_invalid");
  });

  it("retains the recursive direct-object depth resource bound", () => {
    let nested: Record<string, unknown> = {
      objectId: "tag.depth.65",
      label: "Depth 65",
    };
    for (let depth = 64; depth >= 0; depth -= 1) {
      nested = {
        objectId: `tag.depth.${String(depth)}`,
        label: `Depth ${String(depth)}`,
        children: [nested],
      };
    }
    const scene = authoringSceneV1();
    scene.layers = [{ layerId: "layer.depth", label: "Depth", roots: [nested] }];
    scene.cues = [];

    expect(reasonV1(() => admitAuthoringSceneDocumentV1(scene))).toBe(
      "authoring_scene_object_depth_invalid",
    );
  });

  it("rejects extra fields, duplicate identities, non-visual cue targets, and open bindings", () => {
    expect(reasonV1(() => admitAuthoringSceneDocumentV1({ ...authoringSceneV1(), extra: true })))
      .toBe("authoring_scene_object_keys_invalid");

    expect(
      reasonV1(() => admitAuthoringSceneDocumentV1({ ...authoringSceneV1(), layers: [] })),
    ).toBe("authoring_scene_layers_required");

    const duplicateObject = authoringSceneV1();
    const layers = duplicateObject.layers as Record<string, unknown>[];
    const characterRoots = layers[1]?.roots as Record<string, unknown>[];
    characterRoots.push({
      objectId: "tag.hero",
      label: "Duplicate",
      visual: { contentId: "content.app.duplicate" },
    });
    expect(reasonV1(() => admitAuthoringSceneDocumentV1(duplicateObject))).toBe(
      "authoring_scene_object_id_duplicate",
    );

    const groupCue = authoringSceneV1();
    (groupCue.cues as Record<string, unknown>[])[0] = {
      cueId: "cue.app.group.show",
      kind: "show",
      objectId: "tag.group",
    };
    expect(reasonV1(() => admitAuthoringSceneDocumentV1(groupCue))).toBe(
      "authoring_scene_cue_object_not_visual",
    );

    const openBindings = authoringSceneV1();
    const openLayers = openBindings.layers as Record<string, unknown>[];
    const roots = openLayers[0]?.roots as Record<string, unknown>[];
    roots[0] = {
      ...roots[0],
      bindings: {
        hitRegionIds: [],
        motionIds: [],
        timelineIds: [],
        interactions: [],
        arbitrary: "rule",
      },
    };
    expect(reasonV1(() => admitAuthoringSceneDocumentV1(openBindings))).toBe(
      "authoring_scene_object_keys_invalid",
    );
  });

  it("rejects cycles and interaction references outside the object's declared regions", () => {
    const cycle = authoringSceneV1();
    const layers = cycle.layers as Record<string, unknown>[];
    const roots = layers[0]?.roots as Record<string, unknown>[];
    const cyclicObject = roots[0]!;
    cyclicObject.children = [cyclicObject];
    expect(reasonV1(() => admitAuthoringSceneDocumentV1(cycle))).toBe(
      "authoring_scene_object_cycle",
    );

    const badInteraction = authoringSceneV1();
    const badLayers = badInteraction.layers as Record<string, unknown>[];
    const group = (badLayers[1]!.roots as Record<string, unknown>[])[0]!;
    const ghost = (group.children as Record<string, unknown>[])[1]!;
    ghost.bindings = {
      hitRegionIds: ["left"],
      motionIds: [],
      timelineIds: [],
      interactions: [{ regionId: "right", intentId: "intent.app.touch" }],
    };
    expect(reasonV1(() => admitAuthoringSceneDocumentV1(badInteraction))).toBe(
      "authoring_scene_interaction_region_unknown",
    );
  });
});

describe("Authoring Scene compiler", () => {
  it("lowers ordered DFS visuals with direct object tags and signed half-away transforms", () => {
    const compiled = compileAuthoringSceneV1(admitAuthoringSceneDocumentV1(authoringSceneV1()));

    expect(compiled.runtimePlan.orderedLayerIds).toEqual([
      "layer.app.background",
      "layer.app.characters",
    ]);
    expect(compiled.runtimePlan.sceneDocument.entries.map((entry) => [
      entry.layerId,
      entry.tag,
      entry.zOrder,
    ])).toEqual([
      ["layer.app.background", "tag.background", 0],
      ["layer.app.characters", "tag.hero", 0],
      ["layer.app.characters", "tag.ghost", 1],
      ["layer.app.characters", "tag.villain", 2],
    ]);
    const hero = compiled.runtimePlan.sceneDocument.entries[1];
    expect(hero?.placement).toEqual({
      x: 9,
      y: 19,
      scalePermille: 501,
      opacityPermille: 251,
      mirrored: true,
    });
    expect(compiled.objectTargets.find((entry) => entry.objectId === "tag.hero")?.target).toEqual({
      kind: "entry",
      layerId: "layer.app.characters",
      tag: "tag.hero",
    });
    expect(compiled.objectTargets.some((entry) => entry.objectId === "tag.group")).toBe(false);
    expect(compiled.runtimePlan.sceneDocument.cues[0]).toEqual({
      cueId: "cue.app.hero.show",
      kind: "show",
      tag: "tag.hero",
      motionId: "motion.app.enter",
    });
    expect(() => parseSceneDocumentV1(compiled.runtimePlan.sceneDocument)).not.toThrow();
  });

  it("keeps transparent/off-canvas/group objects and external bindings inspectable", () => {
    const compiled = compileAuthoringSceneV1(admitAuthoringSceneDocumentV1(authoringSceneV1()));
    const group = compiled.inspection.objects.find((entry) => entry.objectId === "tag.group");
    const ghost = compiled.inspection.objects.find((entry) => entry.objectId === "tag.ghost");

    expect(group).toMatchObject({ runtimeTarget: null, visual: null, depth: 0 });
    expect(ghost).toMatchObject({
      jsonPointer: "/layers/1/roots/0/children/1",
      visual: { transparent: true, anchorOutsideCanvas: true, zOrder: 1 },
    });
    expect(
      compiled.inspection.objects.find((entry) => entry.objectId === "tag.hero")?.visual,
    ).toMatchObject({ ambient: { motionId: "motion.app.breathe", phaseMs: 250 } });
    expect(compiled.bindings.timelines).toEqual([
      { objectId: "tag.group", id: "cue.app.group", status: "unresolved" },
      { objectId: "tag.ghost", id: "cue.app.parallel", status: "external" },
    ]);
    expect(compiled.bindings.motions).toEqual([
      { objectId: "tag.hero", id: "motion.app.breathe", status: "external" },
      { objectId: "tag.ghost", id: "motion.app.wave", status: "external" },
      { objectId: "tag.hero", id: "motion.app.enter", status: "external" },
    ]);
    expect(
      compiled.inspection.objects.find((entry) => entry.objectId === "tag.hero")?.cues,
    ).toEqual([
      {
        cueId: "cue.app.hero.show",
        kind: "show",
        jsonPointer: "/cues/0",
        motionId: "motion.app.enter",
        cut: false,
      },
      {
        cueId: "cue.app.hero.hide",
        kind: "hide",
        jsonPointer: "/cues/1",
        motionId: null,
        cut: true,
      },
    ]);
    expect(compiled.bindings.interactions).toEqual([
      {
        objectId: "tag.ghost",
        regionId: "left",
        intentId: "intent.app.touch",
        status: "external",
      },
      {
        objectId: "tag.villain",
        regionId: "activate",
        intentId: "intent.app.challenge",
        status: "external",
      },
    ]);
  });

  it("admits a long ambient phase without an authoring-only ceiling", () => {
    const raw = authoringSceneV1();
    const layers = raw.layers as Array<Record<string, unknown>>;
    const characterRoots = layers[1]?.roots as Array<Record<string, unknown>>;
    const children = characterRoots[0]?.children as Array<Record<string, unknown>>;
    const visual = children[0]?.visual as Record<string, unknown>;
    visual.ambient = { motionId: "motion.app.breathe", phaseMs: 120_000 };

    const document = admitAuthoringSceneDocumentV1(raw);
    expect(document.document.layers[1]?.roots[0]?.children[0]?.visual?.ambient?.phaseMs).toBe(
      120_000,
    );
  });

  it("produces canonical-identical runtime bytes under source property-order perturbation", () => {
    const ordinary = compileAuthoringSceneV1(
      admitAuthoringSceneDocumentV1(authoringSceneV1()),
    );
    const reordered = compileAuthoringSceneV1(
      admitAuthoringSceneDocumentV1(reverseRecordKeysV1(authoringSceneV1())),
    );

    expect(canonicalJsonBytes(reordered.runtimePlan)).toEqual(
      canonicalJsonBytes(ordinary.runtimePlan),
    );
    expect(reordered.inspection.objects.map((entry) => entry.objectId)).toEqual(
      ordinary.inspection.objects.map((entry) => entry.objectId),
    );
  });

  it("keeps authoring metadata out of the runtime document and rejects invalid composed bounds", () => {
    const compiled = compileAuthoringSceneV1(admitAuthoringSceneDocumentV1(authoringSceneV1()));
    const runtimeText = new TextDecoder().decode(canonicalJsonBytes(compiled.runtimePlan));
    expect(runtimeText).not.toContain("Mirrored group");
    expect(runtimeText).not.toContain("jsonPointer");
    expect(runtimeText).not.toContain("hitRegionIds");
    expect(runtimeText).not.toContain("intent.app.touch");

    const invalidWorld = authoringSceneV1();
    const layers = invalidWorld.layers as Record<string, unknown>[];
    const group = (layers[1]!.roots as Record<string, unknown>[])[0]!;
    group.localTransform = transformV1({ scalePermille: 1 });
    const hero = (group.children as Record<string, unknown>[])[0]!;
    hero.localTransform = transformV1({ scalePermille: 1 });
    expect(reasonV1(() => compileAuthoringSceneV1(admitAuthoringSceneDocumentV1(invalidWorld))))
      .toBe("authoring_scene_world_transform_invalid");
  });
});
