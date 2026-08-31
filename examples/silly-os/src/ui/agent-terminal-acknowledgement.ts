// SPDX-License-Identifier: MIT

import type {
  CreatorControllerResultV1,
  CreatorDurabilityStateV1,
} from "../product/creator-controller.ts";
import type { CreatorAgentTerminalApplyResultV1 } from "../product/contracts.ts";
import type { CreatorAgentAcknowledgeTerminalResultV1 } from "../agent/browser-program-agent-port.ts";
import type {
  TranslationAgentTerminalPersistenceResultV1,
  TranslationProcessControllerResultV1,
} from "../product/translation/translation-process-controller.ts";

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

export type TranslationAgentTerminalPersistenceDispositionV1 =
  | "persisted"
  | "recover"
  | "retain";

/**
 * A Translation terminal may leave transient Agent storage only after the
 * Process terminal was durably committed, or after stale ownership has been
 * reconciled through the Process recovery path. A merely `completed`
 * controller call is not sufficient because `stale` is also a completed
 * classification.
 */
export function translationAgentTerminalPersistenceDispositionV1(
  persistence: TranslationProcessControllerResultV1<
    TranslationAgentTerminalPersistenceResultV1
  >,
): TranslationAgentTerminalPersistenceDispositionV1 {
  if (persistence.kind !== "completed") return "retain";
  return persistence.value.kind === "persisted" ? "persisted" : "recover";
}

export async function acknowledgeTranslationAgentTerminalV1(input: {
  readonly persistence: TranslationProcessControllerResultV1<
    TranslationAgentTerminalPersistenceResultV1
  >;
  readonly agentRunId: string;
  readonly recover: () => Promise<void>;
  readonly acknowledgeTerminal: (
    agentRunId: string,
  ) => Promise<CreatorAgentAcknowledgeTerminalResultV1>;
}): Promise<AgentTerminalAcknowledgementResultV1> {
  const disposition = translationAgentTerminalPersistenceDispositionV1(input.persistence);
  if (disposition === "retain") return { kind: "retained" };
  if (disposition === "recover") await input.recover();

  const acknowledged = await input.acknowledgeTerminal(input.agentRunId);
  if (acknowledged.kind === "workspace_unavailable") {
    return { kind: "workspace_unavailable", diagnostic: acknowledged.diagnostic };
  }
  return acknowledged.kind === "acknowledged"
    ? { kind: "acknowledged" }
    : { kind: "terminal_unavailable" };
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
