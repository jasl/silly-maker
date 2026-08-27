// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";

import {
  lintNarrativeGraph,
  parseStageMutation,
  projectStageRenderTarget,
  reduceAdmittedStageMutations,
} from "@sillymaker/base/story";
import {
  createGameHarnessV1,
  createMemoryHostRecordStoreV1,
  resolveStoryForTestV1,
} from "@sillymaker/base/testkit";

import { createVnReferenceTourApplicationInstanceV1 } from "../application/core-application.ts";
import { vnReferenceTourCoreApplicationDefinitionV1 } from "../application/core-definition.ts";
import { vnReferenceTourSemanticAdapterV1 } from "../application/semantic.ts";
import { vnReferenceTourAssetIdsV1 } from "../content/assets.ts";
import { vnReferenceTourAudioAssetIdsV1 } from "../content/audio.ts";
import { vnReferenceTourStageContentCatalogV1 } from "../content/presentation.ts";
import { vnReferenceTourRooftopAntennaSceneV1 } from "../scenes/rooftop-antenna/index.ts";
import { projectVnReferenceTourNarrativeGraphV1 } from "../story/narrative-graph.ts";
import { vnReferenceTourStoryEntryV1 } from "../story.ts";

function currentOccurrenceIdV1(
  application: { readonly semantic: { observe(): unknown } },
): string {
  const publication = application.semantic.observe() as {
    readonly narrative: { readonly pending: { readonly occurrenceId: string } | null };
  };
  const pending = publication.narrative.pending;
  if (pending === null) throw new TypeError("vn-reference-tour.test_pending_missing");
  return pending.occurrenceId;
}

async function advanceCurrentV1(
  application: Awaited<ReturnType<typeof createVnReferenceTourApplicationInstanceV1>>,
): Promise<void> {
  await expect(application.semantic.dispatch({
    kind: "resolve",
    expectedOccurrenceId: currentOccurrenceIdV1(application),
    resolution: { kind: "advance" },
  } as never)).resolves.toMatchObject({ kind: "committed" });
}

describe("VN Reference Tour M1 story shell", () => {
  it("resolves only the selected narrative and Stage authorities", () => {
    const resolved = resolveStoryForTestV1(vnReferenceTourStoryEntryV1);
    const narrativeGraph = projectVnReferenceTourNarrativeGraphV1();
    expect(resolved.provenance.story.id).toBe("story.example.vn-reference-tour");
    expect(resolved.assets.assets).toHaveLength(16);
    expect(resolved.assets.assets.every((asset) => asset.delivery === "runtime_image")).toBe(true);
    expect(
      resolved.assets.assets.map((asset) =>
        asset.delivery === "runtime_image" ? asset.runtimePath : null
      ),
    ).toEqual([
      "assets/images/control-room.webp",
      "assets/images/rooftop-antenna.webp",
      "assets/images/lin-focused-open.webp",
      "assets/images/lin-focused-closed.webp",
      "assets/images/lin-relieved.webp",
      "assets/images/zhou-neutral.webp",
      "assets/images/zhou-soft.webp",
      "assets/images/prop-mixing-console.webp",
      "assets/images/prop-tape-machine.webp",
      "assets/images/prop-wall-clock.webp",
      "assets/images/prop-microphone.webp",
      "assets/images/prop-signal-light.webp",
      "assets/images/prop-antenna.webp",
      "assets/images/prop-antenna-cable.webp",
      "assets/images/prop-master-switch.webp",
      "assets/images/prop-status-light.webp",
    ]);
    expect(resolved.gameSimulation.modules.map((module) => module.descriptor.id)).toEqual([
      "vn-reference-tour.narrative",
      "vn-reference-tour.stage",
    ]);
    expect(lintNarrativeGraph(narrativeGraph)).toEqual([]);
    expect(
      narrativeGraph.nodes.find((node) =>
        node.nodeId === "node.vn-reference-tour.open-control-room"
      )?.dependencies.stageContentIds,
    ).toEqual([
      "content.vn-reference-tour.background.control-room",
      "content.vn-reference-tour.effect.window-first-light",
      "content.vn-reference-tour.prop.mixing-console",
      "content.vn-reference-tour.prop.tape-machine",
      "content.vn-reference-tour.prop.wall-clock",
      "content.vn-reference-tour.prop.microphone",
      "content.vn-reference-tour.prop.signal-light",
      "content.vn-reference-tour.character.zhou",
    ]);
    expect(
      new Set(narrativeGraph.nodes.flatMap((node) => node.dependencies.assetIds)),
    ).toEqual(new Set(Object.values(vnReferenceTourAudioAssetIdsV1)));
  });

  it("begins headlessly and advances through the occurrence-fenced semantic port", async () => {
    const application = await createVnReferenceTourApplicationInstanceV1();
    try {
      await expect(application.semantic.dispatch({
        kind: "invoke",
        actionId: "vn-reference-tour.begin_story",
      } as never)).resolves.toMatchObject({ kind: "committed" });

      const initialStageAssets = projectStageRenderTarget(
        application.semantic.observe().game.stage,
        vnReferenceTourStageContentCatalogV1,
      ).target.requiredAssetIds;
      expect(initialStageAssets).toContain(vnReferenceTourAssetIdsV1.controlRoom);
      expect(initialStageAssets).toContain(vnReferenceTourAssetIdsV1.zhouNeutral);
      expect(initialStageAssets).toContain(vnReferenceTourAssetIdsV1.mixingConsole);
      expect(initialStageAssets).toContain(vnReferenceTourAssetIdsV1.signalLight);
      expect(initialStageAssets).not.toContain(vnReferenceTourAssetIdsV1.rooftopAntenna);
      expect(initialStageAssets).not.toContain(vnReferenceTourAssetIdsV1.linRelieved);
      expect(initialStageAssets).not.toContain(vnReferenceTourAssetIdsV1.zhouSoft);

      expect(application.semantic.observe().narrative.pending).toMatchObject({
        kind: "say",
        occurrenceId: "interaction-occurrence.1",
      });
      await expect(application.semantic.dispatch({
        kind: "resolve",
        expectedOccurrenceId: currentOccurrenceIdV1(application),
        resolution: { kind: "advance" },
      } as never)).resolves.toMatchObject({ kind: "committed" });
      expect(application.semantic.observe().narrative.pending).toMatchObject({
        kind: "say",
        occurrenceId: "interaction-occurrence.2",
      });
    } finally {
      await application.dispose();
    }
  });

  it("resumes the latest autosave into a fresh instance without serializing rollback history", async () => {
    const records = createMemoryHostRecordStoreV1();
    const initial = await createVnReferenceTourApplicationInstanceV1({ records });
    let expected: ReturnType<typeof initial.semantic.observe>;
    try {
      await initial.semantic.dispatch({
        kind: "invoke",
        actionId: "vn-reference-tour.begin_story",
      } as never);
      await advanceCurrentV1(initial);
      expected = initial.semantic.observe();
      await initial.flushAutoSave();
    } finally {
      await initial.dispose();
    }

    const resumed = await createVnReferenceTourApplicationInstanceV1({ records });
    try {
      const publication = resumed.semantic.observe();
      expect(publication.narrative).toEqual(expected.narrative);
      expect(publication.game.stage).toEqual(expected.game.stage);
      expect(resumed.presentationAnchor()).toEqual({ epoch: 0, origin: "bootstrap" });
      expect(resumed.admin.commandLog()).toEqual([]);
      expect(resumed.rollback.available()).toEqual({ steps: 0, forwardSteps: 0 });
    } finally {
      await resumed.dispose();
    }
  });

  it("rejects a stale occurrence without changing authoritative State", async () => {
    const application = await createVnReferenceTourApplicationInstanceV1();
    try {
      await application.semantic.dispatch({
        kind: "invoke",
        actionId: "vn-reference-tour.begin_story",
      } as never);
      const before = application.admin.stateDigest();
      await expect(application.semantic.dispatch({
        kind: "resolve",
        expectedOccurrenceId: "interaction-occurrence.99",
        resolution: { kind: "advance" },
      } as never)).resolves.toMatchObject({
        kind: "rejected",
        codes: ["interaction.occurrence_mismatch"],
      });
      expect(application.admin.stateDigest()).toBe(before);
    } finally {
      await application.dispose();
    }
  });

  it("navigates interaction checkpoints without exposing hold ticks as history stops", async () => {
    const application = await createVnReferenceTourApplicationInstanceV1();
    try {
      await application.semantic.dispatch({
        kind: "invoke",
        actionId: "vn-reference-tour.begin_story",
      } as never);

      for (let index = 0; index < 26; index += 1) await advanceCurrentV1(application);
      const choice = application.semantic.observe().narrative.pending;
      if (choice === null || choice.kind !== "choice") {
        throw new TypeError("vn-reference-tour.test_choice_missing");
      }
      await expect(application.semantic.dispatch({
        kind: "resolve",
        expectedOccurrenceId: choice.occurrenceId,
        resolution: {
          kind: "choose",
          choiceId: "choice.vn-reference-tour.archive-voice",
        },
      } as never)).resolves.toMatchObject({ kind: "committed" });

      for (let index = 0; index < 5; index += 1) await advanceCurrentV1(application);
      const beforeHold = application.semantic.observe().narrative.pending;
      if (beforeHold === null || beforeHold.kind !== "say") {
        throw new TypeError("vn-reference-tour.test_pre_hold_say_missing");
      }
      const beforeHoldDigest = application.admin.stateDigest();

      await advanceCurrentV1(application);
      const hold = application.semantic.observe().narrative.pending;
      if (hold === null || hold.kind !== "hold") {
        throw new TypeError("vn-reference-tour.test_hold_missing");
      }
      const stepsAtHold = application.rollback.available().steps;
      await expect(application.semantic.dispatch({
        kind: "time",
        tick: { elapsedMs: 400, expectedHoldOccurrenceId: hold.occurrenceId },
      } as never)).resolves.toMatchObject({ kind: "committed" });
      expect(application.rollback.available().steps).toBe(stepsAtHold);

      await expect(application.semantic.dispatch({
        kind: "time",
        tick: { elapsedMs: 800, expectedHoldOccurrenceId: hold.occurrenceId },
      } as never)).resolves.toMatchObject({ kind: "committed" });
      expect(application.semantic.observe().narrative.pending).toMatchObject({
        kind: "say",
        textId: expect.stringContaining("text.vn-reference-tour.archive.roof."),
      });
      const afterHoldDigest = application.admin.stateDigest();

      await expect(application.rollback.toPrevious()).resolves.toMatchObject({
        kind: "rolled_back",
      });
      expect(application.admin.stateDigest()).toBe(beforeHoldDigest);
      expect(application.semantic.observe().narrative.pending).toEqual(beforeHold);
      expect(application.rollback.available().forwardSteps).toBe(1);

      await expect(application.rollback.toNext()).resolves.toMatchObject({
        kind: "rolled_forward",
      });
      expect(application.admin.stateDigest()).toBe(afterHoldDigest);
      expect(application.rollback.available().forwardSteps).toBe(0);

      await application.rollback.toPrevious();
      await advanceCurrentV1(application);
      expect(application.rollback.available().forwardSteps).toBe(0);
    } finally {
      await application.dispose();
    }
  });

  it("replays the admitted story authoritatively", async () => {
    const harness = await createGameHarnessV1({
      entry: vnReferenceTourStoryEntryV1,
      semantic: vnReferenceTourSemanticAdapterV1,
      seed: 4242,
    });
    try {
      await expect(harness.dispatch({
        kind: "invoke",
        actionId: "vn-reference-tour.begin_story",
      } as never)).resolves.toMatchObject({ kind: "committed" });
      await expect(harness.dispatch({
        kind: "resolve",
        expectedOccurrenceId: "interaction-occurrence.1",
        resolution: { kind: "advance" },
      } as never)).resolves.toMatchObject({ kind: "committed" });
      await expect(harness.admin.replayAuthoritatively()).resolves.toMatchObject({
        authoritative: true,
        identityMatch: true,
        matches: true,
      });
    } finally {
      await harness.dispose();
    }
  });

  it("reconciles rooftop authoring order after exact rebootstrap", async () => {
    const application = await createVnReferenceTourApplicationInstanceV1();
    try {
      const initialSnapshot = application.admin.inspectForTest().snapshot;
      const initialStage = initialSnapshot.state.simulation.stage;
      const opened = reduceAdmittedStageMutations(
        initialStage,
        vnReferenceTourRooftopAntennaSceneV1.openMutations(initialStage),
      );
      if (opened.kind !== "applied") {
        throw new TypeError("vn-reference-tour.test_rooftop_open_failed");
      }

      const project = vnReferenceTourCoreApplicationDefinitionV1.projectRebootstrapCommand;
      if (project === undefined) {
        throw new TypeError("vn-reference-tour.test_rebootstrap_projector_missing");
      }
      const snapshotWithStage = (stage: typeof opened.state) => ({
        ...initialSnapshot,
        state: {
          simulation: { ...initialSnapshot.state.simulation, stage },
        },
      });

      expect(project(snapshotWithStage(opened.state), undefined, undefined)).toBeNull();

      const drifted = reduceAdmittedStageMutations(opened.state, [
        parseStageMutation({
          kind: "setZOrder",
          layerId: "layer.vn-reference-tour.props",
          tag: "tag.vn-reference-tour.rooftop-antenna.antenna",
          zOrder: 1,
        }),
        parseStageMutation({
          kind: "setZOrder",
          layerId: "layer.vn-reference-tour.props",
          tag: "tag.vn-reference-tour.rooftop-antenna.cable",
          zOrder: 0,
        }),
      ]);
      if (drifted.kind !== "applied") {
        throw new TypeError("vn-reference-tour.test_rooftop_drift_failed");
      }

      expect(project(snapshotWithStage(drifted.state), undefined, undefined)).toEqual({
        kind: "vn-reference-tour.scene_reconcile",
        mutations: [
          {
            kind: "setZOrder",
            layerId: "layer.vn-reference-tour.props",
            tag: "tag.vn-reference-tour.rooftop-antenna.antenna",
            zOrder: 0,
          },
          {
            kind: "setZOrder",
            layerId: "layer.vn-reference-tour.props",
            tag: "tag.vn-reference-tour.rooftop-antenna.cable",
            zOrder: 1,
          },
        ],
      });
    } finally {
      await application.dispose();
    }
  });
});
