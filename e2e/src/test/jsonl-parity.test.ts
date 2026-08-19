// SPDX-License-Identifier: MIT
import { PassThrough } from "node:stream";
import { describe, expect, it } from "vitest";

import type { AgentTranscriptEntryV1 } from "@sillymaker/base/runtime";
import {
  compareAgentTranscriptsV1,
  createAgentTranscriptRecorderV1,
} from "@sillymaker/base/runtime";
import { createGameHarnessV1 } from "@sillymaker/base/testkit";
import { createJsonlAgentClientV1, createJsonlAgentHostV1 } from "@sillymaker/tooling";

import type { LabInvocationV1 } from "../index.ts";
import { labSemanticAdapterV1, labStoryEntryV1 } from "../index.ts";

const resolveV1 = (expectedOccurrenceId: string, resolution: unknown): LabInvocationV1 =>
  Object.freeze({ kind: "resolve", expectedOccurrenceId, resolution }) as LabInvocationV1;

/**
 * The whole conformance route as one deterministic invocation list: with a
 * fixed seed the occurrence sequence is stable, so the in-process agent and
 * the JSONL host replay the exact same wire-shaped steps — three samples,
 * the calibration narrative through the cross-module precise branch, then
 * the ordinary SLG procedure to completion.
 */
const transcriptInvocationsV1: readonly LabInvocationV1[] = Object.freeze([
  Object.freeze({ kind: "invoke" as const, actionId: "lab.collect_sample" as const }),
  Object.freeze({ kind: "invoke" as const, actionId: "lab.collect_sample" as const }),
  Object.freeze({ kind: "invoke" as const, actionId: "lab.collect_sample" as const }),
  Object.freeze({ kind: "invoke" as const, actionId: "lab.begin_calibration" as const }),
  resolveV1("interaction-occurrence.1", { kind: "advance" }),
  resolveV1("interaction-occurrence.2", { kind: "advance" }),
  resolveV1("interaction-occurrence.3", { kind: "choose", choiceId: "choice.e2e.cal.precise" }),
  resolveV1("interaction-occurrence.4", {
    kind: "barrier_completed",
    transitionId: "transition.e2e.bg-crossfade",
  }),
  resolveV1("interaction-occurrence.5", { kind: "hold_tick", elapsedMs: 400 }),
  resolveV1("interaction-occurrence.6", { kind: "custom", payload: { value: 2 } }),
  resolveV1("interaction-occurrence.7", { kind: "advance" }),
  Object.freeze({ kind: "invoke" as const, actionId: "lab.begin_procedure" as const }),
  Object.freeze({ kind: "invoke" as const, actionId: "lab.run_experiment" as const }),
  Object.freeze({ kind: "invoke" as const, actionId: "lab.run_experiment" as const }),
]);

function createLabHarnessV1() {
  return createGameHarnessV1({
    entry: labStoryEntryV1,
    semantic: labSemanticAdapterV1,
    seed: 23049,
  });
}

describe("Node in-process versus JSONL host parity", () => {
  it("yields identical semantic results, transcripts, and final digests", async () => {
    // Route one: the in-process Node agent with a transcript recorder.
    const nodeHarness = await createLabHarnessV1();
    const nodeRecorder = createAgentTranscriptRecorderV1(nodeHarness.agent);
    nodeRecorder.agent.observe();
    for (const invocation of transcriptInvocationsV1) {
      await nodeRecorder.agent.dispatch(invocation);
    }
    nodeRecorder.agent.observe();
    const nodeTranscript = nodeRecorder.transcript();
    const nodeDigest = nodeHarness.stateDigest();
    await nodeHarness.dispose();

    // Route two: a fresh same-seed harness behind the JSONL stdio host.
    const jsonlHarness = await createLabHarnessV1();
    const toHost = new PassThrough();
    const fromHost = new PassThrough();
    const host = createJsonlAgentHostV1({
      agent: jsonlHarness.agent,
      input: toHost,
      output: fromHost,
    });
    const client = createJsonlAgentClientV1({ input: toHost, output: fromHost });

    const jsonlTranscript: AgentTranscriptEntryV1[] = [];
    const record = (method: AgentTranscriptEntryV1["method"], output: unknown, input?: unknown) => {
      jsonlTranscript.push({
        ordinal: jsonlTranscript.length + 1,
        method,
        ...(input === undefined ? {} : { input }),
        output,
      });
    };

    const observedBefore = await client.request("observe");
    expect(observedBefore.ok).toBe(true);
    if (observedBefore.ok) record("observe", observedBefore.result);
    for (const invocation of transcriptInvocationsV1) {
      const response = await client.request("dispatch", { invocation });
      expect(response.ok).toBe(true);
      if (response.ok) record("dispatch", response.result, invocation);
    }
    const observedAfter = await client.request("observe");
    expect(observedAfter.ok).toBe(true);
    if (observedAfter.ok) record("observe", observedAfter.result);

    await client.request("shutdown");
    await host.done;
    const jsonlDigest = jsonlHarness.stateDigest();
    await jsonlHarness.dispose();

    // JSON round-trip the Node transcript so both sides compare wire-shaped
    // values rather than in-memory references.
    const normalizedNodeTranscript = JSON.parse(
      JSON.stringify(nodeTranscript),
    ) as readonly AgentTranscriptEntryV1[];
    expect(compareAgentTranscriptsV1(normalizedNodeTranscript, jsonlTranscript)).toEqual({
      kind: "matching",
      entries: nodeTranscript.length,
    });
    expect(jsonlDigest).toBe(nodeDigest);

    // Both channels finished the whole route, not just a prefix.
    const final = observedAfter.ok
      ? (observedAfter.result as {
        narrative: { phase: string; calibration: number | null };
        game: { procedurePhase: string };
      })
      : null;
    expect(final?.narrative).toMatchObject({ phase: "completed", calibration: 2 });
    expect(final?.game.procedurePhase).toBe("complete");
  });
});
