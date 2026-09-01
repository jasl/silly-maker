// SPDX-License-Identifier: MIT

import { describe, expect, it, vi } from "vitest";

import {
  acknowledgeTranslationAgentTerminalV1,
  translationAgentTerminalPersistenceDispositionV1,
} from "../ui/agent-terminal-acknowledgement.ts";

const agentRunIdV1 = "agent.run.terminal-ack";

describe("Translation Agent terminal acknowledgement", () => {
  it("requires Process recovery before a stale terminal can be acknowledged", () => {
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

  it("recovers a stale terminal before acknowledging transient Agent evidence", async () => {
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

  it("retains a stale terminal when Process recovery fails", async () => {
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
});
