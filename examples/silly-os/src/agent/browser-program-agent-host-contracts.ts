// SPDX-License-Identifier: MIT

import type {
  BrowserProgramAgentAdapterLoadV1,
  BrowserProgramAgentAdapterV1,
} from "./browser-program-agent-adapter.ts";
import type {
  BrowserProgramAgentNetworkAccessCapabilityV1,
  BrowserProgramAgentPhaseV1,
  BrowserProgramAgentPortBaseV1,
  BrowserProgramAgentPortSubmitResultV1,
  BrowserProgramAgentWorkspaceSnapshotV1,
  BrowserProgramAgentWorkspaceExportCapabilityV1,
} from "./browser-program-agent-port-contracts.ts";
import type { BrowserPiDistributionIdentityV1 } from "./browser-pi-distribution.ts";
import type { BrowserProgramAgentDiagnosticV1 } from "./browser-program-agent-port-contracts.ts";

export interface BrowserProgramAgentPortV1
  extends
    BrowserProgramAgentPortBaseV1<unknown>,
    BrowserProgramAgentWorkspaceExportCapabilityV1,
    BrowserProgramAgentNetworkAccessCapabilityV1 {
  submit(input: unknown): Promise<BrowserProgramAgentPortSubmitResultV1>;
}

export interface BrowserProgramAgentControlSnapshotV1 {
  readonly revision: number;
  readonly phase: BrowserProgramAgentPhaseV1;
  readonly distribution: BrowserPiDistributionIdentityV1;
  readonly diagnostic: BrowserProgramAgentDiagnosticV1 | null;
  readonly workspace: BrowserProgramAgentWorkspaceSnapshotV1;
}

/** Program-neutral controls for the one shared Provider/Session owner. */
export type BrowserProgramAgentControlPortV1 = Pick<
  BrowserProgramAgentPortBaseV1<BrowserProgramAgentControlSnapshotV1>,
  | "getSnapshot"
  | "subscribe"
  | "configureCredential"
  | "configureCredentialHandoff"
  | "testConnection"
  | "selectModel"
  | "selectReasoningEffort"
  | "revokeCredential"
  | "forget"
  | "dispose"
>;

export interface BrowserProgramAgentHostV1 {
  createControlPort(): BrowserProgramAgentControlPortV1;
  createPort(input: {
    readonly loadAdapter: BrowserProgramAgentAdapterLoadV1;
    readonly projectPendingSnapshot: (
      input: Parameters<BrowserProgramAgentAdapterV1["projectSnapshot"]>[0],
    ) => unknown;
  }): BrowserProgramAgentPortV1;
  forget(): Promise<void>;
  dispose(): Promise<void>;
}
