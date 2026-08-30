// SPDX-License-Identifier: MIT

import type {
  CreatorControllerResultV1,
  CreatorDurabilityStateV1,
} from "../product/creator-controller.ts";
import type { CreatorAgentTerminalApplyResultV1 } from "../product/contracts.ts";
import type { CreatorAgentAcknowledgeTerminalResultV1 } from "../agent/creator-agent-port.ts";

export type AgentTerminalAcknowledgementResultV1 =
  | { readonly kind: "retained" }
  | { readonly kind: "acknowledged" }
  | { readonly kind: "workspace_unavailable"; readonly diagnostic: unknown }
  | { readonly kind: "terminal_unavailable" };

export function canConsumeAgentTerminalV1(
  phase: CreatorDurabilityStateV1["phase"],
): boolean {
  return phase === "ready";
}

/**
 * Releases transient Agent evidence after persistence reaches a terminal
 * classification. Applied, stale and unrelated terminals all retire their
 * transient Run; only a temporarily failed/busy persistence result remains for
 * retry. The Agent port owns the transient Workspace watermark and waits for it
 * before releasing the terminal, so this layer never reconstructs receipt state.
 */
export async function acknowledgeAppliedAgentTerminalV1(input: {
  readonly persistence: CreatorControllerResultV1<CreatorAgentTerminalApplyResultV1>;
  readonly agentRunId: string;
  readonly acknowledgeTerminal: (
    agentRunId: string,
  ) => Promise<CreatorAgentAcknowledgeTerminalResultV1>;
}): Promise<AgentTerminalAcknowledgementResultV1> {
  if (input.persistence.kind !== "completed") {
    return { kind: "retained" };
  }

  const acknowledged = await input.acknowledgeTerminal(input.agentRunId);
  if (acknowledged.kind === "workspace_unavailable") {
    return { kind: "workspace_unavailable", diagnostic: acknowledged.diagnostic };
  }
  return acknowledged.kind === "acknowledged"
    ? { kind: "acknowledged" }
    : { kind: "terminal_unavailable" };
}
