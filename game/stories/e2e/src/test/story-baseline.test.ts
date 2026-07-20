// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";

import { extractDiagnosticsV1 } from "@sillymaker/base";
import { createGameHarnessV1, resolveStoryForTestV1 } from "@sillymaker/base/testkit";

import type { LabActionIdV1, LabGameStateV1, LabInvocationV1 } from "../index.js";
import {
  labProcedureStepsToCompleteV1,
  labSamplesStateSchemaV1,
  labSemanticAdapterV1,
  labStoryEntryV1,
} from "../index.js";

function createLabHarnessV1(seed = 23049) {
  return createGameHarnessV1({
    entry: labStoryEntryV1,
    semantic: labSemanticAdapterV1,
    seed,
  });
}

function invoke(actionId: LabActionIdV1): LabInvocationV1 {
  return Object.freeze({ kind: "invoke" as const, actionId });
}

function labStateOfV1(harness: Awaited<ReturnType<typeof createLabHarnessV1>>): LabGameStateV1 {
  return harness.admin.inspectForTest().snapshot.state as LabGameStateV1;
}

async function dispatchCommittedV1(
  harness: Awaited<ReturnType<typeof createLabHarnessV1>>,
  actionId: LabActionIdV1,
) {
  const result = await harness.dispatch(invoke(actionId));
  expect(result).toMatchObject({ kind: "committed" });
  return result;
}

describe("Engine Lab story baseline", () => {
  it("resolves through public package exports with a stable identity", () => {
    const resolved = resolveStoryForTestV1(labStoryEntryV1);
    expect(labStoryEntryV1.identity.id).toBe("story.e2e.engine-lab");
    expect(resolved.simulationProgram.kind).toBe("e2e-lab");
    expect(resolved.presentation.kind).toBe("e2e-lab-presentation");
    expect(resolved.sceneGraph.stageScenes).toHaveLength(1);
    expect(resolved.gameSimulation.modules).toHaveLength(2);
  });

  it("plays the full route through the harness semantic surface only", async () => {
    const harness = await createLabHarnessV1();

    const opening = harness.observe();
    expect(opening.game).toEqual({
      samplesCollected: 0,
      procedurePhase: "idle",
      procedureSteps: 0,
    });
    expect(opening.actions).toContainEqual({
      actionId: "lab.begin_procedure",
      enabled: false,
      blockedBy: "lab.samples_required",
    });

    await dispatchCommittedV1(harness, "lab.collect_sample");
    const afterCollect = harness.observe();
    expect(afterCollect.game.samplesCollected).toBeGreaterThanOrEqual(1);
    expect(afterCollect.game.samplesCollected).toBeLessThanOrEqual(3);
    expect(labStateOfV1(harness).simulation.samples.collected).toBe(
      afterCollect.game.samplesCollected,
    );

    await dispatchCommittedV1(harness, "lab.begin_procedure");
    expect(harness.observe().game.procedurePhase).toBe("running");

    for (let step = 0; step < labProcedureStepsToCompleteV1; step += 1) {
      await dispatchCommittedV1(harness, "lab.advance_procedure");
    }
    const finished = harness.observe();
    expect(finished.game.procedurePhase).toBe("complete");
    expect(finished.game.procedureSteps).toBe(labProcedureStepsToCompleteV1);
    expect(finished.revision).toBe(2 + labProcedureStepsToCompleteV1);
    await harness.dispose();
  });

  it("keeps preview, action availability, and dispatch on the same evaluator", async () => {
    const harness = await createLabHarnessV1();

    expect(await harness.preview(invoke("lab.begin_procedure"))).toEqual({
      kind: "blocked",
      code: "lab.samples_required",
    });
    const rejected = await harness.dispatch(invoke("lab.begin_procedure"));
    expect(rejected).toEqual({ kind: "rejected", codes: ["lab.samples_required"] });

    await dispatchCommittedV1(harness, "lab.collect_sample");
    expect(await harness.preview(invoke("lab.begin_procedure"))).toEqual({ kind: "allowed" });
    const enabled = harness
      .observe()
      .actions.find((action) => action.actionId === "lab.begin_procedure");
    expect(enabled).toMatchObject({ enabled: true, blockedBy: null });
    await harness.dispose();
  });

  it("runs the cross-owner experiment atomically and rejects deterministically at the end", async () => {
    const harness = await createLabHarnessV1();
    await dispatchCommittedV1(harness, "lab.collect_sample");
    await dispatchCommittedV1(harness, "lab.begin_procedure");
    const samplesBefore = harness.observe().game.samplesCollected;

    const experiment = await harness.dispatch(invoke("lab.run_experiment"));
    expect(experiment).toEqual({ kind: "committed" });
    const afterFirst = harness.observe();
    expect(afterFirst.game.samplesCollected).toBe(samplesBefore - 1);
    expect(afterFirst.game.procedureSteps).toBe(1);

    const digestBeforeSecond = harness.stateDigest();
    const second = await harness.dispatch(invoke("lab.run_experiment"));
    if (afterFirst.game.samplesCollected === 0) {
      expect(second).toEqual({ kind: "rejected", codes: ["lab.insufficient_samples"] });
      expect(harness.stateDigest()).toBe(digestBeforeSecond);
      await harness.dispose();
      return;
    }
    expect(second).toMatchObject({ kind: "committed" });
    expect(harness.observe().game.procedurePhase).toBe("complete");

    const afterComplete = await harness.dispatch(invoke("lab.run_experiment"));
    expect(afterComplete).toEqual({ kind: "rejected", codes: ["lab.procedure_not_running"] });
    await harness.dispose();
  });

  it("keeps the exact snapshot digest on business rejection", async () => {
    const harness = await createLabHarnessV1();
    const before = harness.stateDigest();

    const rejected = await harness.dispatch(invoke("lab.advance_procedure"));
    expect(rejected).toEqual({ kind: "rejected", codes: ["lab.procedure_not_running"] });
    expect(harness.stateDigest()).toBe(before);
    expect(harness.trace()).toEqual([expect.objectContaining({ ordinal: 1, outcome: "rejected" })]);
    await harness.dispose();
  });

  it("reports structured diagnostics with pointers for invalid module State", () => {
    let thrown: unknown;
    try {
      labSamplesStateSchemaV1.parse({ collected: -1 });
    } catch (error) {
      thrown = error;
    }
    const diagnostics = extractDiagnosticsV1(thrown);
    expect(diagnostics).not.toBeNull();
    expect(diagnostics).toMatchObject([
      {
        code: "authoring.schema.invalid_value",
        location: { jsonPointer: "/collected" },
        subject: { kind: "module", id: "lab.samples" },
      },
    ]);
  });

  it("produces identical traces and digests for the same seed and transcript", async () => {
    const transcript: readonly LabActionIdV1[] = Object.freeze([
      "lab.collect_sample",
      "lab.begin_procedure",
      "lab.collect_sample",
      "lab.run_experiment",
    ]);

    const outcomes: string[] = [];
    for (let run = 0; run < 2; run += 1) {
      const harness = await createLabHarnessV1(23049);
      for (const actionId of transcript) {
        await dispatchCommittedV1(harness, actionId);
      }
      outcomes.push(JSON.stringify(harness.trace()) + harness.stateDigest());
      await harness.dispose();
    }
    expect(outcomes[0]).toBe(outcomes[1]);
  });

  it("saves and reloads through the harness persistence port", async () => {
    const harness = await createLabHarnessV1();
    await dispatchCommittedV1(harness, "lab.collect_sample");
    const savedDigest = harness.stateDigest();

    await expect(harness.saves.save("quick")).resolves.toEqual({
      kind: "saved",
      slotId: "quick",
    });
    await dispatchCommittedV1(harness, "lab.begin_procedure");
    expect(harness.stateDigest()).not.toBe(savedDigest);

    await expect(harness.saves.load("quick")).resolves.toMatchObject({ kind: "loaded" });
    expect(harness.stateDigest()).toBe(savedDigest);
    await harness.dispose();
  });

  it("returns structured outcomes after disposal and passes authoritative replay", async () => {
    const harness = await createLabHarnessV1();
    await dispatchCommittedV1(harness, "lab.collect_sample");

    await expect(harness.admin.replayAuthoritatively()).resolves.toMatchObject({
      authoritative: true,
      matches: true,
    });

    await harness.dispose();
    expect(harness.isDisposed()).toBe(true);
    await expect(harness.dispatch(invoke("lab.collect_sample"))).resolves.toEqual({
      kind: "harness_disposed",
    });
    await expect(harness.saves.save("quick")).resolves.toEqual({
      kind: "faulted",
      code: "runtime_disposed",
    });
    expect(harness.admin.debugControl).toBeUndefined();
  });
});
