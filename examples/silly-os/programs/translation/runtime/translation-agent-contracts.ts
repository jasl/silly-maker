// SPDX-License-Identifier: MIT

import type {
  TranslationBatchCandidateV1,
  TranslationBatchRequestV1,
} from "./translation-batch-protocol.ts";
import type {
  InstalledProgramPackageReferenceV1,
} from "../../../src/program-platform/package/program-package-archive.ts";

/**
 * Product-owned identity for one bounded Translation attempt. Pi Session/Run
 * identity remains private to the Browser Program Agent port.
 */
export interface TranslationAgentRunRequestV1 {
  readonly agentRunId: string;
  /** Exact immutable Program package pinned by this Process. */
  readonly programPackage: InstalledProgramPackageReferenceV1;
  readonly processId: string;
  readonly processAttemptGeneration: number;
  readonly workspaceCheckpointId: string;
  readonly workspaceGeneration: number;
  /** Derived routing value; it must equal programPackage.programId and is not a second identity. */
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
