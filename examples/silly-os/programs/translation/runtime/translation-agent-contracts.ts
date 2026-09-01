// SPDX-License-Identifier: MIT

import type {
  TranslationBatchCandidateV1,
  TranslationBatchRequestV1,
} from "./translation-batch-protocol.ts";
import type {
  InstalledProgramPackageReferenceV1,
} from "../../../src/program-platform/package/program-package-archive.ts";

/** Matches the shared Conversation composer budget. */
export const translationAgentInstructionMaximumCharactersV1 = 4_000;
/** Matches the shared Conversation assistant-message envelope. */
export const translationAgentFollowUpReplyMaximumCharactersV1 = 8_000;

/**
 * Bounded semantic context for conversation after the Translation workset is
 * complete. It deliberately excludes source rows and translated rows. The
 * recentConversation projection is selected from the newest durable transcript
 * page and trimmed to the current model request budget.
 */
export interface TranslationFollowUpConversationTurnV1 {
  readonly sequence: number;
  readonly role: "user" | "assistant";
  readonly markdown: string;
}

export interface TranslationFollowUpContextV1 {
  readonly worksetRevision: number;
  readonly title: string;
  readonly sourceFileName: string;
  readonly documentFormat: string;
  readonly sourceLocale: string;
  readonly targetLocale: string;
  readonly documentPurpose: string;
  readonly style: string;
  readonly translatedUnitCount: number;
  readonly acceptedBatchCount: number;
  readonly recentConversation: readonly TranslationFollowUpConversationTurnV1[];
}

export function admitTranslationFollowUpContextV1(
  value: unknown,
): TranslationFollowUpContextV1 | null {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return null;
  const keys = [
    "worksetRevision",
    "title",
    "sourceFileName",
    "documentFormat",
    "sourceLocale",
    "targetLocale",
    "documentPurpose",
    "style",
    "translatedUnitCount",
    "acceptedBatchCount",
    "recentConversation",
  ] as const;
  if (
    Reflect.ownKeys(value).length !== keys.length ||
    !keys.every((key) => Object.hasOwn(value, key))
  ) return null;
  const record = value as Readonly<Record<(typeof keys)[number], unknown>>;
  if (
    typeof record.worksetRevision !== "number" ||
    !Number.isSafeInteger(record.worksetRevision) || record.worksetRevision <= 0 ||
    typeof record.translatedUnitCount !== "number" ||
    !Number.isSafeInteger(record.translatedUnitCount) || record.translatedUnitCount < 0 ||
    typeof record.acceptedBatchCount !== "number" ||
    !Number.isSafeInteger(record.acceptedBatchCount) || record.acceptedBatchCount < 0 ||
    !Array.isArray(record.recentConversation) ||
    ![
      record.title,
      record.sourceFileName,
      record.documentFormat,
      record.sourceLocale,
      record.targetLocale,
      record.documentPurpose,
      record.style,
    ].every((entry) => typeof entry === "string")
  ) return null;
  const recentConversation: TranslationFollowUpConversationTurnV1[] = [];
  let previousSequence = 0;
  for (const turn of record.recentConversation) {
    if (
      turn === null || typeof turn !== "object" || Array.isArray(turn) ||
      Reflect.ownKeys(turn).length !== 3 || !Object.hasOwn(turn, "sequence") ||
      !Object.hasOwn(turn, "role") || !Object.hasOwn(turn, "markdown")
    ) return null;
    const candidate = turn as Readonly<Record<"sequence" | "role" | "markdown", unknown>>;
    if (
      typeof candidate.sequence !== "number" || !Number.isSafeInteger(candidate.sequence) ||
      candidate.sequence <= previousSequence ||
      (candidate.role !== "user" && candidate.role !== "assistant") ||
      typeof candidate.markdown !== "string" || candidate.markdown.length === 0 ||
      candidate.markdown.length >
        (candidate.role === "user"
          ? translationAgentInstructionMaximumCharactersV1
          : translationAgentFollowUpReplyMaximumCharactersV1)
    ) return null;
    previousSequence = candidate.sequence;
    recentConversation.push({
      sequence: candidate.sequence,
      role: candidate.role,
      markdown: candidate.markdown,
    });
  }
  return {
    worksetRevision: record.worksetRevision,
    title: record.title as string,
    sourceFileName: record.sourceFileName as string,
    documentFormat: record.documentFormat as string,
    sourceLocale: record.sourceLocale as string,
    targetLocale: record.targetLocale as string,
    documentPurpose: record.documentPurpose as string,
    style: record.style as string,
    translatedUnitCount: record.translatedUnitCount,
    acceptedBatchCount: record.acceptedBatchCount,
    recentConversation,
  };
}

interface TranslationAgentRunRequestBaseV1 {
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
  /** Candidate-output or text-output policy selected before this attempt. */
  readonly requestedOutputTokens: number;
  /** Exact user entry committed as this attempt's durable trigger. */
  readonly instruction: string;
}

/**
 * Product-owned identity for one bounded Translation attempt. Pi Session/Run
 * identity remains private to the Browser Program Agent port.
 */
export interface TranslationBatchAgentRunRequestV1 extends TranslationAgentRunRequestBaseV1 {
  readonly kind: "batch";
  /** Exact predecessor retained until a successful replacement; null for a new batch. */
  readonly replacesCandidateId: string | null;
  readonly batch: TranslationBatchRequestV1;
}

export interface TranslationFollowUpAgentRunRequestV1 extends TranslationAgentRunRequestBaseV1 {
  readonly kind: "follow_up";
  readonly context: TranslationFollowUpContextV1;
}

export type TranslationAgentRunRequestV1 =
  | TranslationBatchAgentRunRequestV1
  | TranslationFollowUpAgentRunRequestV1;

export type TranslationAgentTerminalDiagnosticCodeV1 =
  | "candidate_structure_invalid"
  | "candidate_invalid"
  | "connection_failed"
  | "protocol_invalid"
  | "run_failed";

export type TranslationAgentTerminalRunV1 =
  | {
    readonly run: TranslationBatchAgentRunRequestV1;
    readonly outcome: "completed";
    readonly candidate: TranslationBatchCandidateV1;
  }
  | {
    readonly run: TranslationFollowUpAgentRunRequestV1;
    readonly outcome: "completed";
    readonly assistantReply: string;
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
