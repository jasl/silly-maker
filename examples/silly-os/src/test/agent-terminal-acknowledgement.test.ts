// SPDX-License-Identifier: MIT

import { describe, expect, it, vi } from "vitest";

import {
  acknowledgeAppliedAgentTerminalV1,
  canConsumeAgentTerminalV1,
} from "../ui/agent-terminal-acknowledgement.ts";
import type { WorkspaceMutationReceiptV1 } from "../workspace/contracts.ts";

const receiptV1: WorkspaceMutationReceiptV1 = Object.freeze({
  revision: 1,
  sequence: 1,
  programId: "program.terminal-ack",
  workspaceId: "workspace.terminal-ack",
  workspaceSessionId: "workspace.session.terminal-ack",
  agentRunId: "agent.run.terminal-ack",
  toolCallId: "tool.call.terminal-ack",
  tool: "write",
  expectedGeneration: 1,
  baseGeneration: 1,
  resultingGeneration: 2,
  outcome: "succeeded",
  effect: "changed",
  changedPaths: Object.freeze(["artifact.txt"]),
  diagnosticCode: null,
});

describe("Agent terminal acknowledgement", () => {
  it("retains both receipt families after persistence failure and acknowledges only after retry applies", async () => {
    const acknowledgeWorkspaceReceipts = vi.fn(async () => ({
      kind: "acknowledged" as const,
      throughSequence: receiptV1.sequence,
    }));
    const acknowledgeTerminal = vi.fn(() => true);
    const input = {
      agentRunId: receiptV1.agentRunId,
      receipts: [receiptV1],
      acknowledgeWorkspaceReceipts,
      acknowledgeTerminal,
    };

    const failedDurability = {
      phase: "failed" as const,
      operation: "agent_run" as const,
      code: "repository_failed",
      recovery: "retry" as const,
    };
    expect(canConsumeAgentTerminalV1(failedDurability.phase)).toBe(false);
    await expect(acknowledgeAppliedAgentTerminalV1({
      ...input,
      persistence: { kind: "failed", code: "repository_failed" },
    })).resolves.toEqual({ kind: "retained" });
    expect(acknowledgeWorkspaceReceipts).not.toHaveBeenCalled();
    expect(acknowledgeTerminal).not.toHaveBeenCalled();

    expect(canConsumeAgentTerminalV1("saving")).toBe(false);
    expect(canConsumeAgentTerminalV1("ready")).toBe(true);
    await expect(acknowledgeAppliedAgentTerminalV1({
      ...input,
      persistence: {
        kind: "completed",
        value: { kind: "applied", outcome: "completed" },
      },
    })).resolves.toEqual({ kind: "acknowledged" });
    expect(acknowledgeWorkspaceReceipts).toHaveBeenCalledOnce();
    expect(acknowledgeWorkspaceReceipts).toHaveBeenCalledWith(receiptV1.sequence);
    expect(acknowledgeTerminal).toHaveBeenCalledOnce();
    expect(acknowledgeTerminal).toHaveBeenCalledWith(receiptV1.agentRunId);
    expect(acknowledgeWorkspaceReceipts.mock.invocationCallOrder[0]).toBeLessThan(
      acknowledgeTerminal.mock.invocationCallOrder[0] ?? 0,
    );
  });

  it("releases an inherited approval-interruption prefix without rewriting receipt identity", async () => {
    const acknowledgeWorkspaceReceipts = vi.fn(async () => ({
      kind: "acknowledged" as const,
      throughSequence: receiptV1.sequence,
    }));
    const retryAgentRunId = "agent.run.terminal-ack.retry";
    const acknowledgeTerminal = vi.fn((agentRunId: string) => agentRunId === retryAgentRunId);

    await expect(acknowledgeAppliedAgentTerminalV1({
      persistence: {
        kind: "completed",
        value: { kind: "applied", outcome: "completed" },
      },
      agentRunId: retryAgentRunId,
      receipts: [receiptV1],
      receiptThroughSequence: receiptV1.sequence,
      acknowledgeWorkspaceReceipts,
      acknowledgeTerminal,
    })).resolves.toEqual({ kind: "acknowledged" });

    expect(receiptV1.agentRunId).toBe("agent.run.terminal-ack");
    expect(acknowledgeWorkspaceReceipts).toHaveBeenCalledWith(receiptV1.sequence);
    expect(acknowledgeTerminal).toHaveBeenCalledWith(retryAgentRunId);
  });
});
