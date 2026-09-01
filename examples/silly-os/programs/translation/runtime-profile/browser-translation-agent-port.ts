// SPDX-License-Identifier: MIT

import type {
  BrowserProgramAgentDiagnosticV1,
  BrowserProgramAgentPhaseV1,
  BrowserProgramAgentPortBaseV1,
  BrowserProgramAgentPortSubmitResultV1,
  BrowserProgramAgentWorkspaceSnapshotV1,
} from "../../../src/agent/browser-program-agent-port-contracts.ts";
import type { BrowserPiDistributionIdentityV1 } from "../../../src/agent/browser-pi-distribution.ts";
import type { BrowserProgramAgentHostV1 } from "../../../src/agent/browser-program-agent-host-contracts.ts";
import type {
  TranslationAgentRunRequestV1,
  TranslationAgentTerminalRunV1,
} from "../runtime/translation-agent-contracts.ts";
import type { TranslationBatchCandidateV1 } from "../runtime/translation-batch-protocol.ts";

export interface TranslationAgentSnapshotV1 {
  readonly revision: number;
  readonly phase: BrowserProgramAgentPhaseV1;
  readonly distribution: BrowserPiDistributionIdentityV1;
  /** Product-owned identity. Pi session and run identities remain private to the Host facade. */
  readonly activeRunId: string | null;
  readonly candidate: TranslationBatchCandidateV1 | null;
  readonly terminalRuns: readonly TranslationAgentTerminalRunV1[];
  readonly diagnostic: BrowserProgramAgentDiagnosticV1 | null;
  readonly workspace: BrowserProgramAgentWorkspaceSnapshotV1;
}

export interface TranslationAgentPortV1
  extends BrowserProgramAgentPortBaseV1<TranslationAgentSnapshotV1> {
  submit(input: TranslationAgentRunRequestV1): Promise<BrowserProgramAgentPortSubmitResultV1>;
}

/** Lazily attaches the Translation adapter to the one fixed Browser Agent owner. */
export function createTranslationProgramAgentPortV1(
  host: BrowserProgramAgentHostV1,
): TranslationAgentPortV1 {
  const port = host.createPort({
    loadAdapter: async () =>
      (await import("./translation-agent-adapter.ts")).translationProgramAgentAdapterV1,
    projectPendingSnapshot: (input) =>
      Object.freeze({
        revision: input.revision,
        phase: input.phase,
        distribution: input.distribution,
        activeRunId: null,
        candidate: null,
        terminalRuns: Object.freeze([]),
        diagnostic: input.diagnostic,
        workspace: input.workspace,
      }) satisfies TranslationAgentSnapshotV1,
  });
  return Object.freeze({
    getSnapshot: () => port.getSnapshot() as TranslationAgentSnapshotV1,
    subscribe: port.subscribe,
    configureCredential: port.configureCredential,
    configureCredentialHandoff: port.configureCredentialHandoff,
    testConnection: port.testConnection,
    selectModel: port.selectModel,
    selectReasoningEffort: port.selectReasoningEffort,
    openWorkspace: port.openWorkspace,
    closeWorkspace: port.closeWorkspace,
    submit: (input: TranslationAgentRunRequestV1) => port.submit(input),
    cancel: port.cancel,
    acknowledgeTerminal: port.acknowledgeTerminal,
    revokeCredential: port.revokeCredential,
    forget: port.forget,
    dispose: port.dispose,
  });
}
