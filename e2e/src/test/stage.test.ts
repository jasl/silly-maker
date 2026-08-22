// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";

import type { SemanticStageStateV1 } from "@sillymaker/base";
import {
  digestSemanticStageStateV1,
  parseSemanticStageStateV1,
  projectStageRenderTargetV1,
  stageFallbackRendererIdV1,
} from "@sillymaker/base";
import { createGameHarnessV1 } from "@sillymaker/base/testkit";

import type { LabActionIdV1, LabGameStateV1, LabInvocationV1 } from "../index.ts";
import {
  labSemanticAdapterV1,
  labStageContentCatalogV1,
  labStageContentIdsV1,
  labStageMutationsForBeginV1,
  labStageTagsV1,
  labStoryEntryV1,
} from "../index.ts";
import { labProcedureSceneV1 } from "../scenes/procedure/index.ts";

function createLabHarnessV1(seed = 61213) {
  return createGameHarnessV1({
    entry: labStoryEntryV1,
    semantic: labSemanticAdapterV1,
    seed,
  });
}

function invoke(actionId: LabActionIdV1): LabInvocationV1 {
  return Object.freeze({ kind: "invoke" as const, actionId });
}

type LabHarnessV1 = Awaited<ReturnType<typeof createLabHarnessV1>>;

function stageOfV1(harness: LabHarnessV1): SemanticStageStateV1 {
  const state = harness.admin.inspectForTest().snapshot.state as LabGameStateV1;
  return state.simulation.stage;
}

function entriesOfV1(stage: SemanticStageStateV1, layerId: string) {
  const layer = stage.layers.find((candidate) => candidate.layerId === layerId);
  if (layer === undefined) throw new Error(`layer ${layerId} missing`);
  return layer.entries;
}

async function dispatchCommittedV1(harness: LabHarnessV1, actionId: LabActionIdV1) {
  const result = await harness.dispatch(invoke(actionId));
  expect(result).toMatchObject({ kind: "committed" });
}

describe("Engine Lab semantic stage", () => {
  it("drives backgrounds, characters, and the prop through gameplay commands", async () => {
    const harness = await createLabHarnessV1();

    // Opening: lab background only.
    const opening = stageOfV1(harness);
    expect(entriesOfV1(opening, "layer.e2e.background")).toMatchObject([
      { tag: labStageTagsV1.background, contentId: labStageContentIdsV1.backgroundLab },
    ]);
    expect(entriesOfV1(opening, "layer.e2e.characters")).toEqual([]);
    expect(entriesOfV1(opening, "layer.e2e.props")).toEqual([]);

    // Collecting reveals the crate exactly once.
    await dispatchCommittedV1(harness, "lab.collect_sample");
    await dispatchCommittedV1(harness, "lab.collect_sample");
    const collected = stageOfV1(harness);
    expect(entriesOfV1(collected, "layer.e2e.props")).toMatchObject([
      { tag: labStageTagsV1.crate, contentId: labStageContentIdsV1.propCrate },
    ]);

    // Beginning the procedure is the whole-scene open derived from the one
    // real authoring document; the undeclared props layer remains untouched.
    expect(labStageMutationsForBeginV1(collected)).toEqual(
      labProcedureSceneV1.openMutations(collected),
    );
    await dispatchCommittedV1(harness, "lab.begin_procedure");
    const staged = stageOfV1(harness);
    for (const layerId of ["layer.e2e.background", "layer.e2e.characters"] as const) {
      expect(entriesOfV1(staged, layerId)).toMatchObject(
        labProcedureSceneV1.sceneDocument.entries
          .filter((entry) => entry.layerId === layerId)
          .map(({ layerId: _layerId, ...entry }) => entry),
      );
    }
    expect(entriesOfV1(staged, "layer.e2e.props")).toEqual(
      entriesOfV1(collected, "layer.e2e.props"),
    );
    expect(labStageMutationsForBeginV1(staged)).toEqual([]);

    // Replace preserved the background entry's identity and placement.
    expect(entriesOfV1(staged, "layer.e2e.background")[0]?.placement).toEqual(
      entriesOfV1(opening, "layer.e2e.background")[0]?.placement,
    );

    // Advancing focuses the lead character without moving anyone.
    await dispatchCommittedV1(harness, "lab.advance_procedure");
    const advanced = stageOfV1(harness);
    expect(entriesOfV1(advanced, "layer.e2e.characters")[0]?.appearance).toEqual({
      pose: "standing",
      expression: "focused",
    });
    expect(advanced.camera).toEqual(opening.camera);

    // The completing experiment settles appearances, moves alpha, zooms the
    // camera, and the consumed samples take the crate away with them.
    await dispatchCommittedV1(harness, "lab.run_experiment");
    expect(harness.observe().game.procedurePhase).toBe("complete");
    const completed = stageOfV1(harness);
    expect(entriesOfV1(completed, "layer.e2e.characters")).toMatchObject([
      {
        tag: labStageTagsV1.alpha,
        appearance: { pose: "standing", expression: "pleased" },
        placement: expect.objectContaining({ x: 640 }),
      },
      { tag: labStageTagsV1.beta, appearance: { pose: "standing", expression: "pleased" } },
    ]);
    expect(completed.camera.zoomPermille).toBe(1150);
    const remainingSamples = harness.observe().game.samplesCollected;
    if (remainingSamples === 0) {
      expect(entriesOfV1(completed, "layer.e2e.props")).toEqual([]);
    } else {
      expect(entriesOfV1(completed, "layer.e2e.props")).toHaveLength(1);
    }

    await harness.dispose();
  });

  it("rejected commands leave the stage untouched", async () => {
    const harness = await createLabHarnessV1();
    const before = stageOfV1(harness);
    const result = await harness.dispatch(invoke("lab.run_experiment"));
    expect(result).toMatchObject({ kind: "rejected" });
    expect(stageOfV1(harness)).toBe(before);
    await harness.dispose();
  });

  it("stage state survives save/load with a stable canonical digest", async () => {
    const harness = await createLabHarnessV1();
    await dispatchCommittedV1(harness, "lab.collect_sample");
    await dispatchCommittedV1(harness, "lab.begin_procedure");

    const beforeSave = stageOfV1(harness);
    const digest = digestSemanticStageStateV1(beforeSave);
    await expect(harness.saves.save("manual.1")).resolves.toMatchObject({ kind: "saved" });
    await dispatchCommittedV1(harness, "lab.advance_procedure");
    expect(digestSemanticStageStateV1(stageOfV1(harness))).not.toBe(digest);

    await expect(harness.saves.load("manual.1")).resolves.toMatchObject({ kind: "loaded" });
    const restored = stageOfV1(harness);
    expect(restored).toEqual(beforeSave);
    expect(digestSemanticStageStateV1(restored)).toBe(digest);

    // The persisted stage remains plain canonical data.
    const reparsed = parseSemanticStageStateV1(JSON.parse(JSON.stringify(restored)));
    expect(digestSemanticStageStateV1(reparsed)).toBe(digest);
    await harness.dispose();
  });

  it("projects a deterministic render target from state plus catalog", async () => {
    const harness = await createLabHarnessV1();
    await dispatchCommittedV1(harness, "lab.collect_sample");
    await dispatchCommittedV1(harness, "lab.begin_procedure");
    const stage = stageOfV1(harness);

    const first = projectStageRenderTargetV1(stage, labStageContentCatalogV1);
    const second = projectStageRenderTargetV1(stage, labStageContentCatalogV1);
    expect(JSON.parse(JSON.stringify(second.target))).toEqual(
      JSON.parse(JSON.stringify(first.target)),
    );
    expect(first.diagnostics).toEqual([]);

    // Renderer-facing data lives only in the projection.
    const characters = first.target.layers.find(
      (layer) => layer.layerId === "layer.e2e.characters",
    );
    expect(characters?.entries.map((entry) => entry.key)).toEqual([
      "layer.e2e.characters:tag.e2e.alpha",
      "layer.e2e.characters:tag.e2e.beta",
    ]);
    expect(characters?.entries[0]).toMatchObject({
      rendererId: "renderer.e2e.lab.stage-character",
      accessibleName: "研究员甲",
      props: { pose: "standing", expression: "neutral" },
    });
    // Alpha's declared frame set joins asset demand (preload keeps frame
    // swaps flash-free); beta declares none, the storeroom background
    // carries no runtime asset, and the crate's shaped region contributes
    // its hover-reveal asset.
    expect(first.target.requiredAssetIds).toEqual([
      "asset.e2e.lab.char-stand",
      "asset.e2e.lab.char-step",
      "asset.e2e.lab.crate-glow",
    ]);

    // The lab background carries the runtime asset; the storeroom does not.
    const openingProjection = projectStageRenderTargetV1(
      await (async () => {
        const fresh = await createLabHarnessV1();
        const opening = stageOfV1(fresh);
        await fresh.dispose();
        return opening;
      })(),
      labStageContentCatalogV1,
    );
    expect(openingProjection.target.requiredAssetIds).toEqual(["asset.e2e.lab.background"]);

    await harness.dispose();
  });

  it("binds unknown content to the fallback renderer with a diagnostic", async () => {
    const harness = await createLabHarnessV1();
    const stage = stageOfV1(harness);
    const emptyCatalog = { resolveContent: () => null };
    const projection = projectStageRenderTargetV1(stage, emptyCatalog);
    expect(projection.target.layers[0]?.entries[0]?.rendererId).toBe(stageFallbackRendererIdV1);
    expect(projection.diagnostics).toMatchObject([{ code: "stage.content_unresolved" }]);
    await harness.dispose();
  });
});
