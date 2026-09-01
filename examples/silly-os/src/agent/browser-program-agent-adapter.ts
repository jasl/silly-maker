// SPDX-License-Identifier: MIT

import type { AgentSessionStreamEventV1 } from "@sillymaker/agent/session";

import type { BrowserPiDistributionIdentityV1 } from "./browser-pi-distribution.ts";
import type {
  BrowserProgramAgentDiagnosticV1,
  BrowserProgramAgentPhaseV1,
  BrowserProgramAgentWorkspaceSnapshotV1,
} from "./browser-program-agent-port-contracts.ts";
import type { InstalledProgramPackageReferenceV1 } from "../program-platform/package/program-package-archive.ts";

/** Identity the fixed Browser harness needs without interpreting Program data. */
export interface BrowserProgramAgentRunIdentityV1 {
  readonly agentRunId: string;
  readonly programPackage: InstalledProgramPackageReferenceV1;
  readonly processId: string;
  readonly processAttemptGeneration: number;
  readonly programId: string;
  readonly workspaceCheckpointId: string;
  readonly workspaceGeneration: number;
}

export interface BrowserProgramAgentPreparedRunV1 {
  readonly run: BrowserProgramAgentRunIdentityV1;
  readonly serializedSubmit: string;
  readonly requireWorkspaceGeneration: boolean;
  readonly state: object;
}

export type BrowserProgramAgentRunAdmissionV1 =
  | { readonly kind: "admitted"; readonly prepared: BrowserProgramAgentPreparedRunV1 }
  | { readonly kind: "rejected" };

export interface BrowserProgramAgentTerminalProjectionV1 {
  readonly runId: string;
  readonly outcome: "completed" | "failed" | "cancelled" | "replaced";
  readonly value: object;
  readonly diagnostic: BrowserProgramAgentDiagnosticV1 | null;
}

export type BrowserProgramAgentStreamTransitionV1 =
  | { readonly kind: "ignored" }
  | { readonly kind: "active"; readonly state: object }
  | {
    readonly kind: "terminal";
    readonly terminal: BrowserProgramAgentTerminalProjectionV1;
    readonly cancelRemote: boolean;
  };

export interface BrowserProgramAgentSnapshotProjectionInputV1 {
  readonly revision: number;
  readonly phase: BrowserProgramAgentPhaseV1;
  readonly distribution: BrowserPiDistributionIdentityV1;
  readonly activeRunId: string | null;
  readonly activeState: object | null;
  readonly terminalRuns: readonly object[];
  readonly diagnostic: BrowserProgramAgentDiagnosticV1 | null;
  readonly workspace: BrowserProgramAgentWorkspaceSnapshotV1;
}

/**
 * Program-owned admission and projection for the fixed Browser Agent harness.
 *
 * The Host treats `state`, terminal values, and submitted input as opaque. The
 * adapter owns every Program-specific schema, candidate rule, and terminal
 * shape, while Session/Worker/credential/Workspace lifetime remains singular.
 */
export interface BrowserProgramAgentAdapterV1 {
  prepareRun(input: unknown): Promise<BrowserProgramAgentRunAdmissionV1>;
  projectStream(input: {
    readonly prepared: BrowserProgramAgentPreparedRunV1;
    readonly state: object;
    readonly event: AgentSessionStreamEventV1;
  }): BrowserProgramAgentStreamTransitionV1;
  projectInterruption(input: {
    readonly prepared: BrowserProgramAgentPreparedRunV1;
    readonly state: object;
    readonly diagnosticCode: "connection_failed" | "protocol_invalid";
    readonly diagnostic: BrowserProgramAgentDiagnosticV1;
  }): BrowserProgramAgentTerminalProjectionV1;
  projectSnapshot(input: BrowserProgramAgentSnapshotProjectionInputV1): object;
}

export type BrowserProgramAgentAdapterLoadV1 = () => Promise<BrowserProgramAgentAdapterV1>;
