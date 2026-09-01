// SPDX-License-Identifier: MIT

import type { BrowserProgramAgentAcknowledgeTerminalResultV1 } from "../../../src/agent/browser-program-agent-port-contracts.ts";
import type {
  TranslationAgentTerminalPersistenceResultV1,
  TranslationProcessControllerResultV1,
} from "../runtime/translation-process-controller.ts";

export type TranslationAgentTerminalAcknowledgementResultV1 =
  | { readonly kind: "retained" }
  | { readonly kind: "acknowledged" }
  | { readonly kind: "workspace_unavailable"; readonly diagnostic: unknown }
  | { readonly kind: "terminal_unavailable" };

export type TranslationAgentTerminalPersistenceDispositionV1 =
  | "persisted"
  | "recover"
  | "retain";

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
  ) => Promise<BrowserProgramAgentAcknowledgeTerminalResultV1>;
}): Promise<TranslationAgentTerminalAcknowledgementResultV1> {
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
