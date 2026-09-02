// SPDX-License-Identifier: MIT

import type {
  BrowserProgramAgentAcknowledgeTerminalResultV1,
  BrowserProgramAgentCloseWorkspaceResultV1,
  BrowserProgramAgentConfigureCredentialResultV1,
  BrowserProgramAgentDiagnosticV1,
  BrowserProgramAgentExportWorkspaceResultV1,
  BrowserProgramAgentNetworkAccessCapabilityV1,
  BrowserProgramAgentOpenWorkspaceResultV1,
  BrowserProgramAgentPhaseV1,
  BrowserProgramAgentPortBaseV1,
  BrowserProgramAgentPortCancelResultV1,
  BrowserProgramAgentPortSubmitResultV1,
  BrowserProgramAgentSelectModelResultV1,
  BrowserProgramAgentSelectReasoningEffortResultV1,
  BrowserProgramAgentSynchronizeNetworkAccessResultV1,
  BrowserProgramAgentTestConnectionResultV1,
  BrowserProgramAgentWorkspaceDiagnosticCodeV1,
  BrowserProgramAgentWorkspaceDiagnosticV1,
  BrowserProgramAgentWorkspaceExportCapabilityV1,
  BrowserProgramAgentWorkspacePhaseV1,
  BrowserProgramAgentWorkspaceSnapshotV1,
} from "../../../src/agent/browser-program-agent-port-contracts.ts";
import type { BrowserPiDistributionIdentityV1 } from "../../../src/agent/browser-pi-distribution.ts";
import type { BrowserProgramRuntimeAgentHostV1 } from "../../../src/agent/browser-program-agent-host-contracts.ts";
import type {
  CreatorAgentRunRequestV1,
  CreatorAgentTerminalRunV1,
  CreatorProgramRevisionCandidateV1,
} from "../runtime/contracts.ts";

export type CreatorAgentPhaseV1 = BrowserProgramAgentPhaseV1;
export type CreatorAgentDiagnosticV1 = BrowserProgramAgentDiagnosticV1;
export type CreatorAgentWorkspacePhaseV1 = BrowserProgramAgentWorkspacePhaseV1;
export type CreatorAgentWorkspaceDiagnosticCodeV1 = BrowserProgramAgentWorkspaceDiagnosticCodeV1;
export type CreatorAgentWorkspaceDiagnosticV1 = BrowserProgramAgentWorkspaceDiagnosticV1;
export type CreatorAgentWorkspaceSnapshotV1 = BrowserProgramAgentWorkspaceSnapshotV1;
export type CreatorAgentConfigureCredentialResultV1 =
  BrowserProgramAgentConfigureCredentialResultV1;
export type CreatorAgentTestConnectionResultV1 = BrowserProgramAgentTestConnectionResultV1;
export type CreatorAgentSelectModelResultV1 = BrowserProgramAgentSelectModelResultV1;
export type CreatorAgentSelectReasoningEffortResultV1 =
  BrowserProgramAgentSelectReasoningEffortResultV1;
export type CreatorAgentPortSubmitResultV1 = BrowserProgramAgentPortSubmitResultV1;
export type CreatorAgentPortCancelResultV1 = BrowserProgramAgentPortCancelResultV1;
export type CreatorAgentSynchronizeNetworkAccessResultV1 =
  BrowserProgramAgentSynchronizeNetworkAccessResultV1;
export type CreatorAgentOpenWorkspaceResultV1 = BrowserProgramAgentOpenWorkspaceResultV1;
export type CreatorAgentCloseWorkspaceResultV1 = BrowserProgramAgentCloseWorkspaceResultV1;
export type CreatorAgentAcknowledgeTerminalResultV1 =
  BrowserProgramAgentAcknowledgeTerminalResultV1;
export type CreatorAgentExportWorkspaceResultV1 = BrowserProgramAgentExportWorkspaceResultV1;

export interface CreatorAgentSnapshotV1 {
  readonly revision: number;
  readonly phase: CreatorAgentPhaseV1;
  readonly distribution: BrowserPiDistributionIdentityV1;
  /** Product-owned identity. Pi session and run identities remain private to the Host facade. */
  readonly activeRunId: string | null;
  readonly draft: string;
  readonly candidate: CreatorProgramRevisionCandidateV1 | null;
  readonly terminalRuns: readonly CreatorAgentTerminalRunV1[];
  readonly diagnostic: CreatorAgentDiagnosticV1 | null;
  readonly workspace: CreatorAgentWorkspaceSnapshotV1;
}

export interface CreatorAgentPortV1
  extends
    BrowserProgramAgentPortBaseV1<CreatorAgentSnapshotV1>,
    BrowserProgramAgentWorkspaceExportCapabilityV1,
    BrowserProgramAgentNetworkAccessCapabilityV1 {
  submit(input: CreatorAgentRunRequestV1): Promise<CreatorAgentPortSubmitResultV1>;
}

/** Lazily attaches the Creator adapter to the one fixed Browser Agent owner. */
export function createCreatorProgramAgentPortV1(
  host: BrowserProgramRuntimeAgentHostV1,
): CreatorAgentPortV1 {
  const port = host.createPort({
    loadAdapter: async () =>
      (await import("./creator-agent-adapter.ts")).creatorProgramAgentAdapterV1,
    projectPendingSnapshot: (input) =>
      Object.freeze({
        revision: input.revision,
        phase: input.phase,
        distribution: input.distribution,
        activeRunId: null,
        draft: "",
        candidate: null,
        terminalRuns: Object.freeze([]),
        diagnostic: input.diagnostic,
        workspace: input.workspace,
      }) satisfies CreatorAgentSnapshotV1,
  });
  return Object.freeze({
    ...port,
    getSnapshot: () => port.getSnapshot() as CreatorAgentSnapshotV1,
    submit: (input: CreatorAgentRunRequestV1) => port.submit(input),
  });
}
