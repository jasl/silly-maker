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

import { createVnLastSoundCheckApplicationInstanceV1 } from "../application/core-application.ts";
import { vnLastSoundCheckCoreApplicationDefinitionV1 } from "../application/core-definition.ts";
import { vnLastSoundCheckSemanticAdapterV1 } from "../application/semantic.ts";
import { vnLastSoundCheckAssetIdsV1 } from "../content/assets.ts";
import { vnLastSoundCheckAudioAssetIdsV1 } from "../content/audio.ts";
import { vnLastSoundCheckStageContentCatalogV1 } from "../content/presentation.ts";
import { vnLastSoundCheckRooftopAntennaSceneV1 } from "../scenes/rooftop-antenna/index.ts";
import { projectVnLastSoundCheckNarrativeGraphV1 } from "../story/narrative-graph.ts";
import { vnLastSoundCheckStoryEntryV1 } from "../story.ts";

const maxNarrativeAdvancesV1 = 128;

function currentOccurrenceIdV1(
  application: { readonly semantic: { observe(): unknown } },
): string {
  const publication = application.semantic.observe() as {
    readonly narrative: { readonly pending: { readonly occurrenceId: string } | null };
  };
  const pending = publication.narrative.pending;
  if (pending === null) throw new TypeError("vn-last-sound-check.test_pending_missing");
  return pending.occurrenceId;
}

async function advanceCurrentV1(
  application: Awaited<ReturnType<typeof createVnLastSoundCheckApplicationInstanceV1>>,
): Promise<void> {
  await expect(application.semantic.dispatch({
    kind: "resolve",
    expectedOccurrenceId: currentOccurrenceIdV1(application),
    resolution: { kind: "advance" },
  } as never)).resolves.toMatchObject({ kind: "committed" });
}

async function advanceUntilPendingKindV1(
  application: Awaited<ReturnType<typeof createVnLastSoundCheckApplicationInstanceV1>>,
  kind: "choice" | "hold",
): Promise<void> {
  for (let step = 0; step < maxNarrativeAdvancesV1; step += 1) {
    const pending = application.semantic.observe().narrative.pending;
    if (pending?.kind === kind) return;
    if (pending === null || pending.kind !== "say") {
      throw new TypeError(`vn-last-sound-check.test_unexpected_pending_before_${kind}`);
    }
    await advanceCurrentV1(application);
  }
  throw new TypeError(`vn-last-sound-check.test_${kind}_advance_limit`);
}

describe("One Last Sound Check M1 story shell", () => {
  it("resolves only the selected narrative and Stage authorities", () => {
    const resolved = resolveStoryForTestV1(vnLastSoundCheckStoryEntryV1);
    const narrativeGraph = projectVnLastSoundCheckNarrativeGraphV1();
    expect(resolved.provenance.story.id).toBe("story.example.vn-last-sound-check");
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
      "vn-last-sound-check.narrative",
      "vn-last-sound-check.stage",
    ]);
    expect(lintNarrativeGraph(narrativeGraph)).toEqual([]);
    expect(
      narrativeGraph.nodes.find((node) =>
        node.nodeId === "node.vn-last-sound-check.open-control-room"
      )?.dependencies.stageContentIds,
    ).toEqual([
      "content.vn-last-sound-check.background.control-room",
      "content.vn-last-sound-check.effect.window-first-light",
      "content.vn-last-sound-check.prop.mixing-console",
      "content.vn-last-sound-check.prop.tape-machine",
      "content.vn-last-sound-check.prop.wall-clock",
      "content.vn-last-sound-check.prop.microphone",
      "content.vn-last-sound-check.prop.signal-light",
      "content.vn-last-sound-check.character.zhou",
    ]);
    expect(
      new Set(narrativeGraph.nodes.flatMap((node) => node.dependencies.assetIds)),
    ).toEqual(new Set(Object.values(vnLastSoundCheckAudioAssetIdsV1)));
  });

  it("begins headlessly and advances through the occurrence-fenced semantic port", async () => {
    const application = await createVnLastSoundCheckApplicationInstanceV1();
    try {
      await expect(application.semantic.dispatch({
        kind: "invoke",
        actionId: "vn-last-sound-check.begin_story",
      } as never)).resolves.toMatchObject({ kind: "committed" });

      const initialStageAssets = projectStageRenderTarget(
        application.semantic.observe().game.stage,
        vnLastSoundCheckStageContentCatalogV1,
      ).target.requiredAssetIds;
      expect(initialStageAssets).toContain(vnLastSoundCheckAssetIdsV1.controlRoom);
      expect(initialStageAssets).toContain(vnLastSoundCheckAssetIdsV1.zhouNeutral);
      expect(initialStageAssets).toContain(vnLastSoundCheckAssetIdsV1.mixingConsole);
      expect(initialStageAssets).toContain(vnLastSoundCheckAssetIdsV1.signalLight);
      expect(initialStageAssets).not.toContain(vnLastSoundCheckAssetIdsV1.rooftopAntenna);
      expect(initialStageAssets).not.toContain(vnLastSoundCheckAssetIdsV1.linRelieved);
      expect(initialStageAssets).not.toContain(vnLastSoundCheckAssetIdsV1.zhouSoft);

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

  it("ordinary disposal flushes an exact partial-hold autosave for a fresh instance", async () => {
    const records = createMemoryHostRecordStoreV1();
    const initial = await createVnLastSoundCheckApplicationInstanceV1({
      records,
      autosave: { mode: "debounced", delayMs: 60_000 },
    });
    let expected: ReturnType<typeof initial.semantic.observe>;
    let expectedDigest: string;
    try {
      await initial.semantic.dispatch({
        kind: "invoke",
        actionId: "vn-last-sound-check.begin_story",
      } as never);
      await advanceUntilPendingKindV1(initial, "choice");
      const choice = initial.semantic.observe().narrative.pending;
      if (choice === null || choice.kind !== "choice") {
        throw new TypeError("vn-last-sound-check.test_choice_missing");
      }
      await expect(initial.semantic.dispatch({
        kind: "resolve",
        expectedOccurrenceId: choice.occurrenceId,
        resolution: {
          kind: "choose",
          choiceId: "choice.vn-last-sound-check.present-voice",
        },
      } as never)).resolves.toMatchObject({ kind: "committed" });
      await advanceUntilPendingKindV1(initial, "hold");
      const hold = initial.semantic.observe().narrative.pending;
      if (hold === null || hold.kind !== "hold") {
        throw new TypeError("vn-last-sound-check.test_hold_missing");
      }
      await expect(initial.semantic.dispatch({
        kind: "time",
        tick: { elapsedMs: 400, expectedHoldOccurrenceId: hold.occurrenceId },
      } as never)).resolves.toMatchObject({ kind: "committed" });
      expected = initial.semantic.observe();
      expectedDigest = initial.admin.stateDigest();
      expect(expected.narrative.pending).toMatchObject({
        kind: "hold",
        totalMs: 1_200,
        remainingMs: 800,
      });
      expect(expected.narrative.signalChoice).toBe("present");
      expect(
        (await initial.persistence.listSlots()).find(({ slotId }) => slotId === "auto.current")
          ?.health,
      ).toBe("empty");
    } finally {
      await initial.dispose();
    }

    const resumed = await createVnLastSoundCheckApplicationInstanceV1({ records });
    try {
      const publication = resumed.semantic.observe();
      expect(resumed.admin.stateDigest()).toBe(expectedDigest);
      expect(publication.narrative).toEqual(expected.narrative);
      expect(publication.game.stage).toEqual(expected.game.stage);
      expect(publication.game.audio).toEqual(expected.game.audio);
      expect(resumed.presentationAnchor()).toEqual({ epoch: 0, origin: "bootstrap" });
      expect(resumed.admin.commandLog()).toEqual([]);
      expect(resumed.rollback.available()).toEqual({ steps: 0, forwardSteps: 0 });
    } finally {
      await resumed.dispose();
    }
  });

  it("restores the exact mid-choice product state from the quick slot", async () => {
    const application = await createVnLastSoundCheckApplicationInstanceV1();
    try {
      await application.semantic.dispatch({
        kind: "invoke",
        actionId: "vn-last-sound-check.begin_story",
      } as never);
      await advanceUntilPendingKindV1(application, "choice");

      const atChoice = application.semantic.observe();
      expect(atChoice.narrative.pending).toMatchObject({ kind: "choice" });
      expect(atChoice.narrative.signalChoice).toBeNull();
      const atChoiceDigest = application.admin.stateDigest();
      await expect(application.persistence.save("quick")).resolves.toEqual({
        kind: "saved",
        slotId: "quick",
      });

      const choice = atChoice.narrative.pending;
      if (choice === null || choice.kind !== "choice") {
        throw new TypeError("vn-last-sound-check.test_choice_missing");
      }
      await expect(application.semantic.dispatch({
        kind: "resolve",
        expectedOccurrenceId: choice.occurrenceId,
        resolution: {
          kind: "choose",
          choiceId: "choice.vn-last-sound-check.archive-voice",
        },
      } as never)).resolves.toMatchObject({ kind: "committed" });
      await advanceUntilPendingKindV1(application, "hold");
      const hold = application.semantic.observe().narrative.pending;
      if (hold === null || hold.kind !== "hold") {
        throw new TypeError("vn-last-sound-check.test_hold_missing");
      }
      await expect(application.semantic.dispatch({
        kind: "time",
        tick: { elapsedMs: 1_200, expectedHoldOccurrenceId: hold.occurrenceId },
      } as never)).resolves.toMatchObject({ kind: "committed" });
      expect(application.semantic.observe().narrative.signalChoice).toBe("archive");
      expect(application.semantic.observe().game.stage).not.toEqual(atChoice.game.stage);
      expect(application.semantic.observe().game.audio).not.toEqual(atChoice.game.audio);
      expect(application.rollback.available().steps).toBeGreaterThan(0);

      await expect(application.persistence.load("quick")).resolves.toMatchObject({
        kind: "loaded",
      });
      expect(application.admin.stateDigest()).toBe(atChoiceDigest);
      const restoredChoice = application.semantic.observe();
      expect(restoredChoice.narrative).toEqual(atChoice.narrative);
      expect(restoredChoice.game.stage).toEqual(atChoice.game.stage);
      expect(restoredChoice.game.audio).toEqual(atChoice.game.audio);
      expect(application.presentationAnchor()).toEqual({ epoch: 1, origin: "load" });
      expect(application.admin.commandLog()).toEqual([]);
      expect(application.rollback.available()).toEqual({ steps: 0, forwardSteps: 0 });
    } finally {
      await application.dispose();
    }
  });

  it("restores the exact partial hold from a manual slot", async () => {
    const application = await createVnLastSoundCheckApplicationInstanceV1();
    try {
      await application.semantic.dispatch({
        kind: "invoke",
        actionId: "vn-last-sound-check.begin_story",
      } as never);
      await advanceUntilPendingKindV1(application, "choice");

      const choice = application.semantic.observe().narrative.pending;
      if (choice === null || choice.kind !== "choice") {
        throw new TypeError("vn-last-sound-check.test_choice_missing");
      }
      await expect(application.semantic.dispatch({
        kind: "resolve",
        expectedOccurrenceId: choice.occurrenceId,
        resolution: {
          kind: "choose",
          choiceId: "choice.vn-last-sound-check.present-voice",
        },
      } as never)).resolves.toMatchObject({ kind: "committed" });
      await advanceUntilPendingKindV1(application, "hold");

      const hold = application.semantic.observe().narrative.pending;
      if (hold === null || hold.kind !== "hold") {
        throw new TypeError("vn-last-sound-check.test_hold_missing");
      }
      await expect(application.semantic.dispatch({
        kind: "time",
        tick: { elapsedMs: 400, expectedHoldOccurrenceId: hold.occurrenceId },
      } as never)).resolves.toMatchObject({ kind: "committed" });

      const partialHold = application.semantic.observe();
      expect(partialHold.narrative.pending).toMatchObject({
        kind: "hold",
        totalMs: 1_200,
        remainingMs: 800,
      });
      expect(partialHold.narrative.signalChoice).toBe("present");
      const partialHoldDigest = application.admin.stateDigest();
      await expect(application.persistence.save("manual.1")).resolves.toEqual({
        kind: "saved",
        slotId: "manual.1",
      });

      await expect(application.semantic.dispatch({
        kind: "time",
        tick: { elapsedMs: 800, expectedHoldOccurrenceId: hold.occurrenceId },
      } as never)).resolves.toMatchObject({ kind: "committed" });
      expect(application.semantic.observe()).not.toEqual(partialHold);
      expect(application.rollback.available().steps).toBeGreaterThan(0);

      await expect(application.persistence.load("manual.1")).resolves.toMatchObject({
        kind: "loaded",
      });
      expect(application.admin.stateDigest()).toBe(partialHoldDigest);
      const restoredHold = application.semantic.observe();
      expect(restoredHold.narrative).toEqual(partialHold.narrative);
      expect(restoredHold.game.stage).toEqual(partialHold.game.stage);
      expect(restoredHold.game.audio).toEqual(partialHold.game.audio);
      expect(application.presentationAnchor()).toEqual({ epoch: 1, origin: "load" });
      expect(application.admin.commandLog()).toEqual([]);
      expect(application.rollback.available()).toEqual({ steps: 0, forwardSteps: 0 });
    } finally {
      await application.dispose();
    }
  });

  it("rejects a stale occurrence without changing authoritative State", async () => {
    const application = await createVnLastSoundCheckApplicationInstanceV1();
    try {
      await application.semantic.dispatch({
        kind: "invoke",
        actionId: "vn-last-sound-check.begin_story",
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
    const application = await createVnLastSoundCheckApplicationInstanceV1();
    try {
      await application.semantic.dispatch({
        kind: "invoke",
        actionId: "vn-last-sound-check.begin_story",
      } as never);

      await advanceUntilPendingKindV1(application, "choice");
      const choice = application.semantic.observe().narrative.pending;
      if (choice === null || choice.kind !== "choice") {
        throw new TypeError("vn-last-sound-check.test_choice_missing");
      }
      await expect(application.semantic.dispatch({
        kind: "resolve",
        expectedOccurrenceId: choice.occurrenceId,
        resolution: {
          kind: "choose",
          choiceId: "choice.vn-last-sound-check.archive-voice",
        },
      } as never)).resolves.toMatchObject({ kind: "committed" });

      let beforeHold: ReturnType<typeof application.semantic.observe>["narrative"]["pending"] =
        null;
      let beforeHoldDigest: string | null = null;
      for (let step = 0; step < maxNarrativeAdvancesV1; step += 1) {
        const publication = application.semantic.observe();
        const pending = publication.narrative.pending;
        if (pending?.kind === "hold") break;
        if (pending === null || pending.kind !== "say") {
          throw new TypeError("vn-last-sound-check.test_unexpected_pending_before_hold");
        }
        beforeHold = pending;
        beforeHoldDigest = application.admin.stateDigest();
        await advanceCurrentV1(application);
      }
      if (beforeHold === null || beforeHold.kind !== "say" || beforeHoldDigest === null) {
        throw new TypeError("vn-last-sound-check.test_pre_hold_say_missing");
      }
      const hold = application.semantic.observe().narrative.pending;
      if (hold === null || hold.kind !== "hold") {
        throw new TypeError("vn-last-sound-check.test_hold_missing");
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
        textId: expect.stringContaining("text.vn-last-sound-check.archive.roof."),
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
      entry: vnLastSoundCheckStoryEntryV1,
      semantic: vnLastSoundCheckSemanticAdapterV1,
      seed: 4242,
    });
    try {
      await expect(harness.dispatch({
        kind: "invoke",
        actionId: "vn-last-sound-check.begin_story",
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
    const application = await createVnLastSoundCheckApplicationInstanceV1();
    try {
      const initialSnapshot = application.admin.inspectForTest().snapshot;
      const initialStage = initialSnapshot.state.simulation.stage;
      const opened = reduceAdmittedStageMutations(
        initialStage,
        vnLastSoundCheckRooftopAntennaSceneV1.openMutations(initialStage),
      );
      if (opened.kind !== "applied") {
        throw new TypeError("vn-last-sound-check.test_rooftop_open_failed");
      }

      const project = vnLastSoundCheckCoreApplicationDefinitionV1.projectRebootstrapCommand;
      if (project === undefined) {
        throw new TypeError("vn-last-sound-check.test_rebootstrap_projector_missing");
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
          layerId: "layer.vn-last-sound-check.props",
          tag: "tag.vn-last-sound-check.rooftop-antenna.antenna",
          zOrder: 1,
        }),
        parseStageMutation({
          kind: "setZOrder",
          layerId: "layer.vn-last-sound-check.props",
          tag: "tag.vn-last-sound-check.rooftop-antenna.cable",
          zOrder: 0,
        }),
      ]);
      if (drifted.kind !== "applied") {
        throw new TypeError("vn-last-sound-check.test_rooftop_drift_failed");
      }

      expect(project(snapshotWithStage(drifted.state), undefined, undefined)).toEqual({
        kind: "vn-last-sound-check.scene_reconcile",
        mutations: [
          {
            kind: "setZOrder",
            layerId: "layer.vn-last-sound-check.props",
            tag: "tag.vn-last-sound-check.rooftop-antenna.antenna",
            zOrder: 0,
          },
          {
            kind: "setZOrder",
            layerId: "layer.vn-last-sound-check.props",
            tag: "tag.vn-last-sound-check.rooftop-antenna.cable",
            zOrder: 1,
          },
        ],
      });
    } finally {
      await application.dispose();
    }
  });
});
