// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";

import { createAgentTranscriptRecorderV1 } from "@sillymaker/base/runtime";
import type { AgentGamePortV1 } from "@sillymaker/base/runtime";
import { createGameHarnessV1 } from "@sillymaker/base/testkit";

import type {
  LabActionDescriptorV1,
  LabActionResultV1,
  LabGameViewV1,
  LabInvocationV1,
  LabNarrativeViewV1,
  LabPreviewV1,
} from "../index.js";
import { labSemanticAdapterV1, labStoryEntryV1 } from "../index.js";

type LabAgentPortV1 = AgentGamePortV1<
  LabGameViewV1,
  LabNarrativeViewV1,
  LabActionDescriptorV1,
  LabInvocationV1,
  LabPreviewV1,
  LabActionResultV1
>;

function createLabHarnessV1(seed = 23049) {
  return createGameHarnessV1({
    entry: labStoryEntryV1,
    semantic: labSemanticAdapterV1,
    seed,
  });
}

type LabInvokeActionIdV1 = Extract<LabInvocationV1, { readonly kind: "invoke" }>["actionId"];

const invoke = (actionId: LabInvokeActionIdV1): LabInvocationV1 =>
  Object.freeze({ kind: "invoke" as const, actionId });

/** Plays the route purely from observed action availability, like an AI player. */
async function playToCompletionV1(agent: LabAgentPortV1): Promise<number> {
  for (let step = 0; step < 32; step += 1) {
    const publication = agent.observe();
    if (publication.game.procedurePhase === "complete") return step;
    const preferred = (["lab.run_experiment", "lab.begin_procedure", "lab.collect_sample"] as const)
      .map((actionId) => publication.actions.find((action) => action.actionId === actionId))
      .find((action) => action?.enabled === true);
    if (preferred === undefined) throw new Error("agent found no enabled action");
    const result = await agent.dispatch(invoke(preferred.actionId));
    expect(result).toMatchObject({ kind: "committed" });
    const idle = await agent.waitForIdle({ timeoutMs: 1_000 });
    expect(idle.kind).toBe("idle");
  }
  throw new Error("agent did not finish within the step budget");
}

describe("Engine Lab agent port", () => {
  it("completes a full route through the core agent surface only", async () => {
    const harness = await createLabHarnessV1();
    const agent: LabAgentPortV1 = harness.agent;

    expect(agent.identity()).toEqual({ storyId: "story.e2e.engine-lab", storyRevision: 4 });
    await playToCompletionV1(agent);
    expect(agent.observe().game.procedurePhase).toBe("complete");
    await harness.dispose();
  });

  it("rejects a stale invocation against the current queue-front state", async () => {
    const harness = await createLabHarnessV1();
    const agent = harness.agent;

    await agent.dispatch(invoke("lab.collect_sample"));
    // Captured while begin_procedure is legal; becomes stale after the first
    // dispatch commits and must be re-validated at the queue front.
    const staleInvocation = invoke("lab.begin_procedure");
    const [first, second] = await Promise.all([
      agent.dispatch(staleInvocation),
      agent.dispatch(staleInvocation),
    ]);
    expect(first).toEqual({ kind: "committed" });
    expect(second).toEqual({ kind: "rejected", codes: ["lab.procedure_already_running"] });
    await harness.dispose();
  });

  it("keeps agent results free of raw state, snapshots, RNG, and debug surfaces", async () => {
    const harness = await createLabHarnessV1();
    const agent = harness.agent;

    const committed = await agent.dispatch(invoke("lab.collect_sample"));
    const serialized = JSON.stringify({
      publication: agent.observe(),
      committed,
      actions: agent.describeActions(),
    });
    for (const forbidden of ["snapshot", "rng", "integrity", "commandSequence", "debug", "facts"]) {
      expect(serialized).not.toContain(forbidden);
    }
    expect("inspectForTest" in agent).toBe(false);
    expect("saves" in agent).toBe(false);
    await harness.dispose();
  });

  it("exports saves and diagnostics only through revocable capabilities", async () => {
    const harness = await createLabHarnessV1();
    await harness.agent.dispatch(invoke("lab.collect_sample"));

    const persistence = harness.grantPersistenceCapability();
    await expect(persistence.capability.save("quick")).resolves.toEqual({
      kind: "saved",
      slotId: "quick",
    });
    const exported = await persistence.capability.exportCurrentSave();
    expect(exported).toMatchObject({ mediaType: "application/json" });

    const diagnostics = harness.grantDiagnosticsCapability();
    await expect(diagnostics.capability.exportDiagnostics()).resolves.toMatchObject({
      storyId: "story.e2e.engine-lab",
      trace: [expect.objectContaining({ outcome: "committed" })],
    });

    persistence.revoke();
    diagnostics.revoke();
    await expect(persistence.capability.save("quick")).resolves.toEqual({
      kind: "capability_revoked",
    });
    await expect(diagnostics.capability.exportDiagnostics()).resolves.toEqual({
      kind: "capability_revoked",
    });
    await harness.dispose();
  });

  it("produces identical transcripts for two runs with the same seed", async () => {
    const transcripts: string[] = [];
    for (let run = 0; run < 2; run += 1) {
      const harness = await createLabHarnessV1(23049);
      const recorder = createAgentTranscriptRecorderV1(harness.agent);
      await recorder.agent.dispatch(invoke("lab.collect_sample"));
      await recorder.agent.dispatch(invoke("lab.begin_procedure"));
      recorder.agent.observe();
      transcripts.push(JSON.stringify(recorder.transcript()));
      await harness.dispose();
    }
    expect(transcripts[0]).toBe(transcripts[1]);
  });
});
