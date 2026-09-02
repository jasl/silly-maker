// SPDX-License-Identifier: MIT

import type {
  BrowserProgramWorkspaceExportProgressV1,
  BrowserProgramWorkspaceExportReadyV1,
} from "../application/workspace/browser-program-workspace-authority.ts";
import type { ProcessNetworkAccessV1 } from "../program-platform/capabilities/process-network-access.ts";
import type {
  WorkspaceExecutionDescriptorV1,
  WorkspaceMutationReceiptV1,
} from "../workspace/contracts.ts";
import type { CredentialVaultBindingV2 } from "../credential/credential-vault-contracts.ts";
import type { BrowserPiCredentialHandoffV1 } from "./browser-pi-transport.ts";
import type {
  BrowserPiModelSelectionV1,
  BrowserPiReasoningEffortV1,
} from "./browser-pi-worker-protocol.ts";

export type BrowserProgramAgentPhaseV1 =
  | "uninitialized"
  | "configuring"
  | "configured"
  | "testing"
  | "ready"
  | "running"
  | "completed"
  | "failed"
  | "forgotten"
  | "disposed";

export type BrowserProgramAgentDiagnosticCodeV1 =
  | "unconfigured"
  | "connection_failed"
  | "request_failed"
  | "protocol_invalid"
  | "submit_invalid"
  | "candidate_invalid"
  | "draft_too_large"
  | "output_limit"
  | "run_failed"
  | "disposed";

export interface BrowserProgramAgentDiagnosticV1 {
  readonly code: BrowserProgramAgentDiagnosticCodeV1;
  readonly path: string;
}

export type BrowserProgramAgentWorkspacePhaseV1 =
  | "closed"
  | "opening"
  | "open"
  | "closing"
  | "failed"
  | "forgotten"
  | "disposed";

export type BrowserProgramAgentWorkspaceDiagnosticCodeV1 =
  | "request_failed"
  | "protocol_invalid"
  | "workspace_busy"
  | "storage_unavailable"
  | "volume_missing"
  | "volume_corrupt"
  | "capacity_exceeded"
  | "recovery_required"
  | "disposed";

export interface BrowserProgramAgentWorkspaceDiagnosticV1 {
  readonly code: BrowserProgramAgentWorkspaceDiagnosticCodeV1;
  readonly path: string;
}

export interface BrowserProgramAgentWorkspaceSnapshotV1 {
  readonly phase: BrowserProgramAgentWorkspacePhaseV1;
  readonly descriptor: WorkspaceExecutionDescriptorV1 | null;
  readonly receipts: readonly WorkspaceMutationReceiptV1[];
  readonly lastReceipt: WorkspaceMutationReceiptV1 | null;
  readonly diagnostic: BrowserProgramAgentWorkspaceDiagnosticV1 | null;
}

export type BrowserProgramAgentConfigureCredentialResultV1 =
  | {
    readonly kind: "configured";
    readonly effectiveReasoningEffort: BrowserPiReasoningEffortV1;
  }
  | { readonly kind: "unavailable"; readonly diagnostic: BrowserProgramAgentDiagnosticV1 };

export type BrowserProgramAgentTestConnectionResultV1 =
  | { readonly kind: "ready" }
  | { readonly kind: "unavailable"; readonly diagnostic: BrowserProgramAgentDiagnosticV1 };

export type BrowserProgramAgentSelectModelResultV1 =
  | {
    readonly kind: "selected";
    readonly selection: BrowserPiModelSelectionV1;
    readonly effectiveReasoningEffort: BrowserPiReasoningEffortV1;
  }
  | { readonly kind: "unavailable"; readonly diagnostic: BrowserProgramAgentDiagnosticV1 };

export type BrowserProgramAgentSelectReasoningEffortResultV1 =
  | {
    readonly kind: "selected";
    readonly preferredReasoningEffort: BrowserPiReasoningEffortV1;
    readonly effectiveReasoningEffort: BrowserPiReasoningEffortV1;
  }
  | { readonly kind: "unavailable"; readonly diagnostic: BrowserProgramAgentDiagnosticV1 };

export type BrowserProgramAgentPortSubmitResultV1 =
  | { readonly kind: "submitted"; readonly agentRunId: string }
  | { readonly kind: "unavailable"; readonly diagnostic: BrowserProgramAgentDiagnosticV1 };

export type BrowserProgramAgentPortCancelResultV1 =
  | { readonly kind: "cancel_requested" }
  | { readonly kind: "idle" }
  | { readonly kind: "unavailable"; readonly diagnostic: BrowserProgramAgentDiagnosticV1 };

export type BrowserProgramAgentSynchronizeNetworkAccessResultV1 =
  | { readonly kind: "synchronized" }
  | { readonly kind: "unavailable"; readonly diagnostic: BrowserProgramAgentDiagnosticV1 };

export type BrowserProgramAgentOpenWorkspaceResultV1 =
  | { readonly kind: "opened"; readonly descriptor: WorkspaceExecutionDescriptorV1 }
  | {
    readonly kind: "unavailable";
    readonly diagnostic: BrowserProgramAgentWorkspaceDiagnosticV1;
  };

export type BrowserProgramAgentCloseWorkspaceResultV1 =
  | { readonly kind: "closed"; readonly descriptor: WorkspaceExecutionDescriptorV1 }
  | { readonly kind: "idle" }
  | {
    readonly kind: "unavailable";
    readonly diagnostic: BrowserProgramAgentWorkspaceDiagnosticV1;
  };

export type BrowserProgramAgentAcknowledgeWorkspaceReceiptsResultV1 =
  | { readonly kind: "acknowledged"; readonly throughSequence: number }
  | {
    readonly kind: "unavailable";
    readonly diagnostic: BrowserProgramAgentWorkspaceDiagnosticV1;
  };

export type BrowserProgramAgentAcknowledgeTerminalResultV1 =
  | { readonly kind: "acknowledged" }
  | { readonly kind: "idle" }
  | {
    readonly kind: "workspace_unavailable";
    readonly diagnostic: BrowserProgramAgentWorkspaceDiagnosticV1;
  };

export type BrowserProgramAgentExportWorkspaceResultV1 =
  | ({
    readonly kind: "released";
    readonly checkpointId: string;
    readonly generation: number;
  } & BrowserProgramWorkspaceExportProgressV1)
  | ({ readonly kind: "cancelled" } & BrowserProgramWorkspaceExportProgressV1)
  | {
    readonly kind: "unavailable";
    readonly diagnostic: BrowserProgramAgentWorkspaceDiagnosticV1;
  };

/** Common fixed-harness controls shared by every Program-specific typed facade. */
export interface BrowserProgramAgentPortBaseV1<TSnapshot> {
  getSnapshot(): TSnapshot;
  subscribe(listener: () => void): () => void;
  configureCredential(apiKey: string): Promise<BrowserProgramAgentConfigureCredentialResultV1>;
  configureCredentialHandoff(input: {
    readonly binding: CredentialVaultBindingV2;
    readonly handoff: BrowserPiCredentialHandoffV1;
  }): Promise<BrowserProgramAgentConfigureCredentialResultV1>;
  testConnection(
    selection?: BrowserPiModelSelectionV1 | null,
  ): Promise<BrowserProgramAgentTestConnectionResultV1>;
  selectModel(
    selection: BrowserPiModelSelectionV1,
  ): Promise<BrowserProgramAgentSelectModelResultV1>;
  selectReasoningEffort(
    preferredReasoningEffort: BrowserPiReasoningEffortV1,
  ): Promise<BrowserProgramAgentSelectReasoningEffortResultV1>;
  openWorkspace(input: {
    readonly processId: string;
    readonly programId: string;
    readonly workspaceId: string;
  }): Promise<BrowserProgramAgentOpenWorkspaceResultV1>;
  closeWorkspace(
    workspaceSessionId?: string,
  ): Promise<BrowserProgramAgentCloseWorkspaceResultV1>;
  cancel(agentRunId?: string): Promise<BrowserProgramAgentPortCancelResultV1>;
  acknowledgeTerminal(
    agentRunId: string,
  ): Promise<BrowserProgramAgentAcknowledgeTerminalResultV1>;
  revokeCredential(): void;
  forget(): Promise<void>;
  dispose(): Promise<void>;
}

export interface BrowserProgramAgentWorkspaceExportCapabilityV1 {
  exportWorkspace(input: {
    readonly workspaceSessionId: string;
    readonly fileName: string;
    readonly signal: AbortSignal;
    readonly onProgress?: (progress: BrowserProgramWorkspaceExportProgressV1) => void;
    readonly onReady: (
      ready: BrowserProgramWorkspaceExportReadyV1,
      startDownload: () => Promise<void>,
    ) => "release" | "cancel" | Promise<"release" | "cancel">;
  }): Promise<BrowserProgramAgentExportWorkspaceResultV1>;
}

export interface BrowserProgramAgentNetworkAccessCapabilityV1 {
  synchronizeNetworkAccess(
    access: ProcessNetworkAccessV1,
  ): Promise<BrowserProgramAgentSynchronizeNetworkAccessResultV1>;
}
