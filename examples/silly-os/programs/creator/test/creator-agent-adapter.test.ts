// SPDX-License-Identifier: MIT

import { describe, expect, it } from "vitest";

import { creatorProgramAgentAdapterV1 } from "../runtime-profile/creator-agent-adapter.ts";

describe("SillyOS Creator Agent adapter", () => {
  it("preserves the remote output-limit diagnostic", async () => {
    const prepared = await creatorProgramAgentAdapterV1.prepareRun({
      agentRunId: "agent.run.output-limit",
      programPackage: {
        programId: "sillyos.creator",
        packageVersion: "1.0.0",
        contentDigest: "c".repeat(64),
      },
      processId: "process.output-limit",
      processAttemptGeneration: 1,
      workspaceCheckpointId: "checkpoint.output-limit",
      workspaceGeneration: 1,
      proposalId: "proposal.output-limit",
      programId: "program.output-limit",
      baseProgramRevision: 1,
      baseRepositoryRevision: 1,
      text: "Create a focused Program.",
    });
    if (prepared.kind === "rejected") throw new Error("Creator run was rejected");

    expect(creatorProgramAgentAdapterV1.projectStream({
      prepared: prepared.prepared,
      state: prepared.prepared.state,
      event: {
        kind: "run_failed",
        sessionId: "session.output-limit",
        runId: "remote.output-limit",
        sequence: 1,
        diagnostic: {
          code: "agent_session.operation_failed",
          path: "/remote/output_limit",
        },
      },
    })).toMatchObject({
      kind: "terminal",
      terminal: {
        outcome: "failed",
        value: { outcome: "failed", diagnosticCode: "output_limit" },
        diagnostic: { code: "output_limit", path: "/remote/output_limit" },
      },
    });
  });
});
