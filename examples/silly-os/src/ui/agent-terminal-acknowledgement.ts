// SPDX-License-Identifier: MIT

import type {
  CreatorControllerResultV1,
  CreatorDurabilityStateV1,
} from "../product/creator-controller.ts";
import type { CreatorAgentTerminalApplyResultV1 } from "../product/contracts.ts";
import type { WorkspaceMutationReceiptV1 } from "../workspace/contracts.ts";

interface WorkspaceReceiptAcknowledgedV1 {
  readonly kind: "acknowledged";
  readonly throughSequence: number;
}

interface WorkspaceReceiptUnavailableV1 {
  readonly kind: "unavailable";
  readonly diagnostic: unknown;
}

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
 * Releases transient Agent evidence only after its durable terminal mutation is
 * known to have applied. Workspace acknowledgement precedes terminal release so
 * a failed workspace acknowledgement retains the product retry anchor.
 */
export async function acknowledgeAppliedAgentTerminalV1(input: {
  readonly persistence: CreatorControllerResultV1<CreatorAgentTerminalApplyResultV1>;
  readonly agentRunId: string;
  readonly receipts: readonly WorkspaceMutationReceiptV1[];
  readonly acknowledgeWorkspaceReceipts: (
    throughSequence: number,
  ) => Promise<WorkspaceReceiptAcknowledgedV1 | WorkspaceReceiptUnavailableV1>;
  readonly acknowledgeTerminal: (agentRunId: string) => boolean;
}): Promise<AgentTerminalAcknowledgementResultV1> {
  if (input.persistence.kind !== "completed" || input.persistence.value.kind !== "applied") {
    return { kind: "retained" };
  }

  const lastWorkspaceReceipt = input.receipts.findLast(
    (receipt) => receipt.agentRunId === input.agentRunId,
  );
  if (lastWorkspaceReceipt !== undefined) {
    const acknowledged = await input.acknowledgeWorkspaceReceipts(lastWorkspaceReceipt.sequence);
    if (acknowledged.kind === "unavailable") {
      return { kind: "workspace_unavailable", diagnostic: acknowledged.diagnostic };
    }
  }
  return input.acknowledgeTerminal(input.agentRunId)
    ? { kind: "acknowledged" }
    : { kind: "terminal_unavailable" };
}
