// SPDX-License-Identifier: MIT

import type { BrowserProgramAgentAcknowledgeTerminalResultV1 } from "../../../src/agent/browser-program-agent-port-contracts.ts";
import type {
  CreatorControllerResultV1,
  CreatorDurabilityStateV1,
} from "../runtime/creator-controller.ts";
import type { CreatorAgentTerminalApplyResultV1 } from "../runtime/contracts.ts";

export type CreatorAgentTerminalAcknowledgementResultV1 =
  | { readonly kind: "retained" }
  | { readonly kind: "acknowledged" }
  | { readonly kind: "workspace_unavailable"; readonly diagnostic: unknown }
  | { readonly kind: "terminal_unavailable" };

export function canConsumeAgentTerminalV1(
  phase: CreatorDurabilityStateV1["phase"],
): boolean {
  return phase === "ready";
}

export async function acknowledgeAppliedAgentTerminalV1(input: {
  readonly persistence: CreatorControllerResultV1<CreatorAgentTerminalApplyResultV1>;
  readonly agentRunId: string;
  readonly acknowledgeTerminal: (
    agentRunId: string,
  ) => Promise<BrowserProgramAgentAcknowledgeTerminalResultV1>;
}): Promise<CreatorAgentTerminalAcknowledgementResultV1> {
  if (input.persistence.kind !== "completed") return { kind: "retained" };

  const acknowledged = await input.acknowledgeTerminal(input.agentRunId);
  if (acknowledged.kind === "workspace_unavailable") {
    return { kind: "workspace_unavailable", diagnostic: acknowledged.diagnostic };
  }
  return acknowledged.kind === "acknowledged"
    ? { kind: "acknowledged" }
    : { kind: "terminal_unavailable" };
}
