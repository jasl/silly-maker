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

import type { LabInvocationV1 } from "../index.js";
import { labSemanticAdapterV1, labStoryEntryV1 } from "../index.js";

const transcriptInvocationsV1: readonly LabInvocationV1[] = Object.freeze([
  Object.freeze({ kind: "invoke" as const, actionId: "lab.collect_sample" as const }),
  Object.freeze({ kind: "invoke" as const, actionId: "lab.begin_procedure" as const }),
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
  });
});
