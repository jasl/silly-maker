// SPDX-License-Identifier: MIT

import { describe, expect, it, vi } from "vitest";

import {
  acknowledgeAppliedAgentTerminalV1,
  acknowledgeTranslationAgentTerminalV1,
  canConsumeAgentTerminalV1,
  translationAgentTerminalPersistenceDispositionV1,
} from "../ui/agent-terminal-acknowledgement.ts";

const agentRunIdV1 = "agent.run.terminal-ack";

describe("Agent terminal acknowledgement", () => {
  it("requires Process recovery before a stale Translation terminal can be acknowledged", () => {
    expect(translationAgentTerminalPersistenceDispositionV1({
      kind: "completed",
      value: { kind: "persisted", candidateId: "candidate.ready" },
    })).toBe("persisted");
    expect(translationAgentTerminalPersistenceDispositionV1({
      kind: "completed",
      value: { kind: "stale" },
    })).toBe("recover");
    expect(translationAgentTerminalPersistenceDispositionV1({
      kind: "completed",
      value: { kind: "unavailable" },
    })).toBe("recover");
    expect(translationAgentTerminalPersistenceDispositionV1({ kind: "busy" })).toBe("retain");
    expect(translationAgentTerminalPersistenceDispositionV1({
      kind: "failed",
      code: "repository_failed",
    })).toBe("retain");
  });

  it("recovers a stale Translation terminal before acknowledging transient Agent evidence", async () => {
    const order: string[] = [];
    const recover = vi.fn(async () => {
      order.push("recover");
    });
    const acknowledgeTerminal = vi.fn(async () => {
      order.push("acknowledge");
      return { kind: "acknowledged" as const };
    });

    await expect(acknowledgeTranslationAgentTerminalV1({
      persistence: { kind: "completed", value: { kind: "stale" } },
      agentRunId: agentRunIdV1,
      recover,
      acknowledgeTerminal,
    })).resolves.toEqual({ kind: "acknowledged" });
    expect(order).toEqual(["recover", "acknowledge"]);
  });

  it("retains a stale Translation terminal when Process recovery fails", async () => {
    const failure = new Error("repository unavailable");
    const acknowledgeTerminal = vi.fn(async () => ({ kind: "acknowledged" as const }));

    await expect(acknowledgeTranslationAgentTerminalV1({
      persistence: { kind: "completed", value: { kind: "stale" } },
      agentRunId: agentRunIdV1,
      recover: async () => {
        throw failure;
      },
      acknowledgeTerminal,
    })).rejects.toBe(failure);
    expect(acknowledgeTerminal).not.toHaveBeenCalled();
  });

  it("retains the terminal after persistence failure and delegates its Workspace watermark to the Agent port", async () => {
    const acknowledgeTerminal = vi.fn(async () => ({ kind: "acknowledged" as const }));
    const input = {
      agentRunId: agentRunIdV1,
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
    expect(acknowledgeTerminal).toHaveBeenCalledOnce();
    expect(acknowledgeTerminal).toHaveBeenCalledWith(agentRunIdV1);
  });

  it.each([
    {
      label: "stale",
      persistence: {
        kind: "completed" as const,
        value: {
          kind: "stale" as const,
          current: {
            proposalId: "proposal.successor",
            programId: "program.successor",
            baseProgramRevision: 2,
          },
        },
      },
    },
    {
      label: "unavailable",
      persistence: {
        kind: "completed" as const,
        value: { kind: "unavailable" as const },
      },
    },
  ])("retires a terminally $label run so it cannot block the next terminal", async ({
    persistence,
  }) => {
    const terminalRuns = [agentRunIdV1, "agent.run.next"];
    const acknowledgeTerminal = vi.fn(async (agentRunId: string) => {
      const index = terminalRuns.indexOf(agentRunId);
      if (index < 0) return { kind: "idle" as const };
      terminalRuns.splice(index, 1);
      return { kind: "acknowledged" as const };
    });

    await expect(acknowledgeAppliedAgentTerminalV1({
      persistence,
      agentRunId: agentRunIdV1,
      acknowledgeTerminal,
    })).resolves.toEqual({ kind: "acknowledged" });
    expect(acknowledgeTerminal).toHaveBeenCalledWith(agentRunIdV1);
    expect(terminalRuns[0]).toBe("agent.run.next");
  });

  it("retains the terminal when its Agent-port Workspace watermark cannot settle", async () => {
    const diagnostic = { code: "workspace_busy", path: "/workspace/acknowledge" } as const;
    const acknowledgeTerminal = vi.fn(async () => ({
      kind: "workspace_unavailable" as const,
      diagnostic,
    }));

    await expect(acknowledgeAppliedAgentTerminalV1({
      persistence: {
        kind: "completed",
        value: { kind: "applied", outcome: "completed" },
      },
      agentRunId: agentRunIdV1,
      acknowledgeTerminal,
    })).resolves.toEqual({ kind: "workspace_unavailable", diagnostic });
  });
});
