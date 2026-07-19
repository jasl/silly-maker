// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";

import {
  createGameSnapshotEnvelopeSchemaV1,
  createPristineRunIntegrityV1,
  createTransactionalRngV1,
  digestCanonical,
  extractDiagnosticsV1,
  parseNonNegativeSafeInteger,
  rngStateV1Schema,
} from "@sillymaker/base";
import { createGameSessionV1 } from "@sillymaker/base/runtime";
import { createFixedBootstrapEntropyV1, resolveStoryForTestV1 } from "@sillymaker/base/testkit";

import type { LabAttemptV1, LabCommandV1, LabSimulationTypesV1, LabSnapshotV1 } from "../index.js";
import {
  labProcedureStepsToCompleteV1,
  labSamplesStateSchemaV1,
  labStoryEntryV1,
} from "../index.js";

const fixedSeedV1 = 23049;

function createEntropyV1() {
  return createFixedBootstrapEntropyV1({
    uuids: ["9e2f1a34-6d2b-4c33-8a41-5a3f6c1b2d4e"],
    seeds: [fixedSeedV1],
  });
}

function createLabSessionV1() {
  const resolved = resolveStoryForTestV1(labStoryEntryV1);
  const gameSimulation = resolved.gameSimulation;
  const snapshotSchema = createGameSnapshotEnvelopeSchemaV1(
    gameSimulation.stateSchema,
    rngStateV1Schema,
  );
  const bootstrap = gameSimulation.createBootstrapInput(createEntropyV1());
  const initialSnapshot = snapshotSchema.parse({
    state: gameSimulation.createInitialState(bootstrap),
    rng: createTransactionalRngV1(bootstrap.rngSeed).candidateState(),
    commandSequence: parseNonNegativeSafeInteger(0),
    integrity: createPristineRunIntegrityV1(),
  });
  const created = createGameSessionV1<LabSimulationTypesV1>({
    initialSnapshot,
    commandSchema: gameSimulation.commandSchema,
    executionContext: undefined,
    executeAttempt(snapshot, command): LabAttemptV1 {
      return gameSimulation.commandExecutor.executeAttempt(
        snapshot as LabSnapshotV1,
        command as LabCommandV1,
        undefined,
      );
    },
    normalizeUnexpectedDispatchFault(_error, snapshot): LabAttemptV1 {
      const rng = createTransactionalRngV1((snapshot as LabSnapshotV1).rng);
      return Object.freeze({
        result: Object.freeze({
          kind: "faulted" as const,
          snapshot: snapshot as LabSnapshotV1,
          fault: Object.freeze({ code: "lab.executor_failed" as const }),
        }),
        diagnostics: Object.freeze({
          committedRngBefore: (snapshot as LabSnapshotV1).rng,
          attemptedDraws: rng.attemptedDraws(),
          committedRngAfter: (snapshot as LabSnapshotV1).rng,
        }),
      });
    },
  });
  return Object.freeze({ resolved, session: created.session });
}

async function dispatchCommittedV1(
  session: ReturnType<typeof createLabSessionV1>["session"],
  command: LabCommandV1,
): Promise<void> {
  const result = await session.dispatch(command);
  expect(result).toMatchObject({ kind: "executed", execution: { kind: "committed" } });
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

  it("collects samples and runs the procedure to completion through one session", async () => {
    const lab = createLabSessionV1();

    await dispatchCommittedV1(lab.session, { kind: "lab.collect_sample" });
    const afterCollect = lab.session.getCurrentSnapshot();
    expect(afterCollect.state.simulation.samples.collected).toBeGreaterThanOrEqual(1);
    expect(afterCollect.state.simulation.samples.collected).toBeLessThanOrEqual(3);
    expect(afterCollect.rng.rawDrawCount).toBeGreaterThan(0);

    await dispatchCommittedV1(lab.session, { kind: "lab.begin_procedure" });
    expect(lab.session.getCurrentSnapshot().state.simulation.procedure.phase).toBe("running");

    for (let step = 0; step < labProcedureStepsToCompleteV1; step += 1) {
      await dispatchCommittedV1(lab.session, { kind: "lab.advance_procedure" });
    }
    const finished = lab.session.getCurrentSnapshot();
    expect(finished.state.simulation.procedure).toEqual({
      phase: "complete",
      stepsTaken: labProcedureStepsToCompleteV1,
    });
    expect(finished.commandSequence).toBe(2 + labProcedureStepsToCompleteV1);
  });

  it("gates the procedure on the samples capability provided across modules", async () => {
    const lab = createLabSessionV1();
    const before = lab.session.getCurrentSnapshot();

    const withoutSamples = await lab.session.dispatch({ kind: "lab.begin_procedure" });
    expect(withoutSamples).toMatchObject({
      kind: "executed",
      execution: {
        kind: "rejected",
        reasons: [{ code: "lab.samples_required" }],
      },
    });
    expect(lab.session.getCurrentSnapshot()).toBe(before);

    await dispatchCommittedV1(lab.session, { kind: "lab.collect_sample" });
    await dispatchCommittedV1(lab.session, { kind: "lab.begin_procedure" });
    expect(lab.session.getCurrentSnapshot().state.simulation.procedure.phase).toBe("running");
  });

  it("runs the cross-owner experiment atomically and rejects deterministically at the end", async () => {
    const lab = createLabSessionV1();
    await dispatchCommittedV1(lab.session, { kind: "lab.collect_sample" });
    await dispatchCommittedV1(lab.session, { kind: "lab.begin_procedure" });
    const samplesBefore = lab.session.getCurrentSnapshot().state.simulation.samples.collected;

    const experiment = await lab.session.dispatch({ kind: "lab.run_experiment" });
    expect(experiment).toMatchObject({
      kind: "executed",
      execution: {
        kind: "committed",
        facts: [
          { kind: "lab.procedure_advanced", stepsTaken: 1 },
          { kind: "lab.samples_consumed", amount: 1, remaining: samplesBefore - 1 },
        ],
      },
    });
    const afterFirst = lab.session.getCurrentSnapshot();
    expect(afterFirst.state.simulation.samples.collected).toBe(samplesBefore - 1);
    expect(afterFirst.state.simulation.procedure).toEqual({ phase: "running", stepsTaken: 1 });

    // Whatever the RNG yielded (1..3), the second dispatch has exactly one
    // legal outcome: with zero samples left it must starve atomically, and
    // with samples left it must complete the procedure.
    const second = await lab.session.dispatch({ kind: "lab.run_experiment" });
    if (afterFirst.state.simulation.samples.collected === 0) {
      expect(second).toMatchObject({
        kind: "executed",
        execution: { kind: "rejected", reasons: [{ code: "lab.insufficient_samples" }] },
      });
      expect(lab.session.getCurrentSnapshot()).toBe(afterFirst);
      return;
    }
    expect(second).toMatchObject({ kind: "executed", execution: { kind: "committed" } });
    const complete = lab.session.getCurrentSnapshot();
    expect(complete.state.simulation.procedure).toEqual({
      phase: "complete",
      stepsTaken: labProcedureStepsToCompleteV1,
    });

    const afterComplete = await lab.session.dispatch({ kind: "lab.run_experiment" });
    expect(afterComplete).toMatchObject({
      kind: "executed",
      execution: { kind: "rejected", reasons: [{ code: "lab.procedure_not_running" }] },
    });
    expect(lab.session.getCurrentSnapshot()).toBe(complete);
  });

  it("keeps the exact Snapshot on business rejection", async () => {
    const lab = createLabSessionV1();
    const before = lab.session.getCurrentSnapshot();

    const rejected = await lab.session.dispatch({ kind: "lab.advance_procedure" });
    expect(rejected).toMatchObject({
      kind: "executed",
      execution: {
        kind: "rejected",
        reasons: [{ code: "lab.procedure_not_running" }],
      },
    });
    expect(lab.session.getCurrentSnapshot()).toBe(before);

    await dispatchCommittedV1(lab.session, { kind: "lab.collect_sample" });
    await dispatchCommittedV1(lab.session, { kind: "lab.begin_procedure" });
    const running = lab.session.getCurrentSnapshot();
    const beginAgain = await lab.session.dispatch({ kind: "lab.begin_procedure" });
    expect(beginAgain).toMatchObject({
      kind: "executed",
      execution: {
        kind: "rejected",
        reasons: [{ code: "lab.procedure_already_running" }],
      },
    });
    expect(lab.session.getCurrentSnapshot()).toBe(running);
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

  it("produces identical snapshots for the same seed and command transcript", async () => {
    const transcript: readonly LabCommandV1[] = Object.freeze([
      { kind: "lab.collect_sample" },
      { kind: "lab.begin_procedure" },
      { kind: "lab.collect_sample" },
      { kind: "lab.run_experiment" },
    ]);

    const digests: string[] = [];
    for (let run = 0; run < 2; run += 1) {
      const lab = createLabSessionV1();
      for (const command of transcript) {
        await dispatchCommittedV1(lab.session, command);
      }
      digests.push(digestCanonical("sillymaker:state:v1", lab.session.getCurrentSnapshot()));
    }
    expect(digests[0]).toBe(digests[1]);
  });
});
