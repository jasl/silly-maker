// SPDX-License-Identifier: MIT

import type {
  TranslationBatchCandidateV1,
  TranslationBatchRequestV1,
} from "./translation-batch-protocol.ts";

/**
 * Product-owned identity for one bounded Translation attempt. Pi Session/Run
 * identity remains private to the Browser Program Agent port.
 */
export interface TranslationAgentRunRequestV1 {
  readonly agentRunId: string;
  readonly executionCompatibilityReference: string;
  readonly processId: string;
  readonly processAttemptGeneration: number;
  readonly workspaceCheckpointId: string;
  readonly workspaceGeneration: number;
  /** Subject Program that owns the Process Workspace mounted in Pi. */
  readonly programId: string;
  readonly expectedWorksetRevision: number;
  /** Exact bounded completion envelope selected with this immutable batch. */
  readonly requestedOutputTokens: number;
  readonly batch: TranslationBatchRequestV1;
}

export type TranslationAgentTerminalDiagnosticCodeV1 =
  | "candidate_invalid"
  | "connection_failed"
  | "protocol_invalid"
  | "run_failed";

export type TranslationAgentTerminalRunV1 =
  | {
    readonly run: TranslationAgentRunRequestV1;
    readonly outcome: "completed";
    readonly candidate: TranslationBatchCandidateV1;
  }
  | {
    readonly run: TranslationAgentRunRequestV1;
    readonly outcome: "cancelled" | "replaced";
  }
  | {
    readonly run: TranslationAgentRunRequestV1;
    readonly outcome: "failed";
    readonly diagnosticCode: TranslationAgentTerminalDiagnosticCodeV1;
  };
