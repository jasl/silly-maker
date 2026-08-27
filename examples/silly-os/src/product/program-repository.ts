// SPDX-License-Identifier: MIT

import type {
  CreatorAgentDiagnosticCodeV1,
  CreatorAgentRunOutcomeV1,
  CreatorAgentTerminalRunV1,
  CreatorProgramRevisionBaseV1,
  CreatorSessionSnapshotV1,
  PreviewProgramKindV1,
  PreviewProgramV1,
  ProgramProposalReferenceV1,
  ProgramProposalStatusV1,
  ProgramProposalV1,
} from "./contracts.ts";
import {
  admitProgramWorkspaceSnapshotReceiptV1,
  programWorkspaceSnapshotReceiptsEqualV1,
  type ProgramWorkspaceSnapshotReceiptV1,
} from "../workspace/contracts.ts";

export const programRepositorySchemaVersionV3 = 3 as const;
export const programRepositoryAggregateMaximumBytesV3 = 512 * 1024;
export const programRepositoryMaximumProgramsV3 = 64;
export const programRepositoryMaximumProgramRevisionsV3 = 32;
export const programRepositoryMaximumDecisionsV3 = 32;
export const programRepositoryMaximumMessagesV3 = 96;
export const programRepositoryMaximumActivitiesV3 = 96;
export const programRepositoryMaximumRequirementsV3 = 32;
export const programRepositoryMaximumCapabilitiesV3 = 32;
export const programRepositoryMaximumAgentRunReceiptsV3 = 32;
export const browserProgramContinuationManifestMaximumBytesV1 = 1_024;

const identifierPatternV1 = /^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,127}$/u;

export type ProgramRepositoryOperationV3 =
  | "initialize"
  | "list"
  | "load"
  | "load_workspace_continuation"
  | "create"
  | "apply_revision"
  | "decide"
  | "settle_agent_run"
  | "dispose";

export type ProgramRepositoryFailureCodeV3 =
  | "unavailable"
  | "database_newer"
  | "upgrade_blocked"
  | "quota_exceeded"
  | "transaction_aborted"
  | "request_failed"
  | "schema_invalid"
  | "disposed"
  | "wire_invalid"
  | "outcome_unknown";

export interface ProgramRepositoryFailureV3 extends Error {
  readonly code: ProgramRepositoryFailureCodeV3;
  readonly operation: ProgramRepositoryOperationV3;
}

export interface ProgramRepositoryAcceptedDecisionV3 {
  readonly proposalId: string;
  readonly programRevision: number;
  readonly status: "accepted";
  /** Repository revision at which this exact decision became durable. */
  readonly repositoryRevision: number;
  readonly snapshot: ProgramWorkspaceSnapshotReceiptV1;
}

export interface ProgramRepositoryRejectedDecisionV3 {
  readonly proposalId: string;
  readonly programRevision: number;
  readonly status: "rejected";
  /** Repository revision at which this exact decision became durable. */
  readonly repositoryRevision: number;
}

export type ProgramRepositoryDecisionV3 =
  | ProgramRepositoryAcceptedDecisionV3
  | ProgramRepositoryRejectedDecisionV3;

export interface ProgramRepositoryReviewBindingV3 {
  readonly proposalId: string;
  readonly programId: string;
  readonly programRevision: number;
  readonly baseAcceptedProgramRevision: number | null;
  readonly repositoryRevision: number;
  readonly workspaceId: string;
  readonly volumeId: string;
  readonly workspaceFormat: 1;
  readonly checkpointId: string;
  readonly generation: number;
}

export interface ProgramRepositoryReviewedHeadV3 {
  readonly checkpointId: string;
  readonly generation: number;
}

export interface ProgramAgentRunReceiptV3 {
  readonly agentRunId: string;
  readonly sequence: number;
  readonly proposalId: string;
  readonly userMessageId: string;
  readonly creatorMessageId: string | null;
  readonly baseProgramRevision: number;
  readonly baseRepositoryRevision: number;
  readonly resultingProgramRevision: number | null;
  readonly outcome: CreatorAgentRunOutcomeV1;
  readonly diagnosticCode: CreatorAgentDiagnosticCodeV1 | null;
}

/** The only durable V3 unit: one bounded aggregate per Program. */
export interface ProgramRepositoryAggregateV3 {
  readonly schemaVersion: 3;
  readonly programId: string;
  readonly repositoryRevision: number;
  /** Caller-supplied Unix epoch milliseconds. The repository owns no clock. */
  readonly updatedAt: number;
  readonly snapshot: CreatorSessionSnapshotV1;
  readonly programRevisions: readonly PreviewProgramV1[];
  readonly decisions: readonly ProgramRepositoryDecisionV3[];
  readonly agentRunReceipts: readonly ProgramAgentRunReceiptV3[];
  readonly reviewBinding: ProgramRepositoryReviewBindingV3 | null;
}

export interface ProgramRepositorySummaryV3 {
  readonly programId: string;
  readonly name: string;
  readonly kind: PreviewProgramKindV1;
  readonly programRevision: number;
  readonly proposalStatus: ProgramProposalStatusV1;
  readonly updatedAt: number;
  readonly repositoryRevision: number;
}

export interface ProgramRepositoryCreateInputV3 {
  readonly snapshot: CreatorSessionSnapshotV1;
  readonly updatedAt: number;
  readonly continuation: BrowserProgramContinuationManifestV1;
  readonly reviewedHead: ProgramRepositoryReviewedHeadV3;
}

export interface ProgramRepositoryApplyRevisionInputV3 {
  readonly programId: string;
  readonly expectedRepositoryRevision: number;
  readonly expectedBase: CreatorProgramRevisionBaseV1;
  readonly snapshot: CreatorSessionSnapshotV1;
  readonly continuation: BrowserProgramContinuationManifestV1;
  readonly reviewedHead: ProgramRepositoryReviewedHeadV3;
  readonly updatedAt: number;
}

interface ProgramRepositoryDecideInputBaseV3 {
  readonly programId: string;
  readonly expectedRepositoryRevision: number;
  readonly expectedProposal: ProgramProposalReferenceV1;
  readonly snapshot: CreatorSessionSnapshotV1;
  readonly continuation: BrowserProgramContinuationManifestV1;
  readonly updatedAt: number;
}

export type ProgramRepositoryDecideInputV3 =
  | (ProgramRepositoryDecideInputBaseV3 & {
    readonly status: "accepted";
    readonly snapshotReceipt: ProgramWorkspaceSnapshotReceiptV1;
  })
  | (ProgramRepositoryDecideInputBaseV3 & {
    readonly status: "rejected";
  });

export interface ProgramRepositorySettleAgentRunInputV3 {
  readonly programId: string;
  readonly expectedRepositoryRevision: number;
  readonly terminal: CreatorAgentTerminalRunV1;
  readonly snapshot: CreatorSessionSnapshotV1;
  readonly continuation: BrowserProgramContinuationManifestV1;
  readonly reviewedHead: ProgramRepositoryReviewedHeadV3 | null;
  readonly updatedAt: number;
}

export interface BrowserProgramContinuationManifestV1 {
  readonly revision: 1;
  readonly programId: string;
  readonly workspaceId: string;
  readonly volumeId: string;
  readonly workspaceFormat: 1;
  readonly programRevision: number;
  readonly repositoryRevision: number;
}

export type ProgramRepositoryCommitResultV3 =
  | { readonly kind: "committed"; readonly aggregate: ProgramRepositoryAggregateV3 }
  | { readonly kind: "unchanged"; readonly aggregate: ProgramRepositoryAggregateV3 }
  | {
    readonly kind: "conflict";
    readonly current: ProgramRepositoryAggregateV3 | null;
  };

export interface ProgramRepositoryV3 {
  initialize(): Promise<void>;
  list(): Promise<readonly ProgramRepositorySummaryV3[]>;
  load(programId: string): Promise<ProgramRepositoryAggregateV3 | null>;
  create(input: ProgramRepositoryCreateInputV3): Promise<ProgramRepositoryCommitResultV3>;
  applyRevision(
    input: ProgramRepositoryApplyRevisionInputV3,
  ): Promise<ProgramRepositoryCommitResultV3>;
  decide(input: ProgramRepositoryDecideInputV3): Promise<ProgramRepositoryCommitResultV3>;
  settleAgentRun(
    input: ProgramRepositorySettleAgentRunInputV3,
  ): Promise<ProgramRepositoryCommitResultV3>;
  dispose(): Promise<void>;
}

export interface ProgramRepositoryWorkspaceContinuationV1 {
  loadWorkspaceContinuation(
    programId: string,
  ): Promise<BrowserProgramContinuationManifestV1 | null>;
}

export type ProgramRepositoryWithWorkspaceContinuationV1 =
  & ProgramRepositoryV3
  & ProgramRepositoryWorkspaceContinuationV1;

export type ProgramRepositoryAdmissionResultV3<TValue> =
  | { readonly kind: "admitted"; readonly value: TValue }
  | { readonly kind: "rejected"; readonly path: string };

type ExactRecordV1 = Readonly<Record<string, unknown>>;

function exactRecordV1(value: unknown, keys: readonly string[]): ExactRecordV1 | null {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return null;
  try {
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) return null;
    if (Object.getOwnPropertySymbols(value).length !== 0) return null;
    const descriptors = Object.getOwnPropertyDescriptors(value);
    const actualKeys = Object.keys(descriptors);
    if (
      actualKeys.length !== keys.length ||
      !keys.every((key) => Object.hasOwn(descriptors, key))
    ) return null;
    for (const key of keys) {
      const descriptor = descriptors[key];
      if (
        descriptor === undefined || !descriptor.enumerable ||
        !Object.hasOwn(descriptor, "value")
      ) return null;
    }
    return Object.fromEntries(keys.map((key) => [key, descriptors[key]?.value]));
  } catch {
    return null;
  }
}

function rejectV1<TValue>(path: string): ProgramRepositoryAdmissionResultV3<TValue> {
  return { kind: "rejected", path };
}

function admittedV1<TValue>(value: TValue): ProgramRepositoryAdmissionResultV3<TValue> {
  return { kind: "admitted", value };
}

function positiveSafeIntegerV1(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}

function nonNegativeSafeIntegerV1(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

function identifierV1(value: unknown): value is string {
  return typeof value === "string" && identifierPatternV1.test(value);
}

function creatorAgentDiagnosticCodeV1(value: unknown): value is CreatorAgentDiagnosticCodeV1 {
  return value === "unconfigured" || value === "connection_failed" ||
    value === "request_failed" || value === "protocol_invalid" ||
    value === "submit_invalid" || value === "candidate_invalid" ||
    value === "draft_too_large" || value === "run_failed" || value === "disposed";
}

function boundedTextV1(
  value: unknown,
  maximumCharacters: number,
  options: { readonly empty?: boolean; readonly trimmed?: boolean } = {},
): value is string {
  if (typeof value !== "string" || value.length > maximumCharacters) return false;
  if (options.empty !== true && value.length === 0) return false;
  return options.trimmed !== true || value === value.trim();
}

function arrayV1(value: unknown, maximumLength: number): readonly unknown[] | null {
  return Array.isArray(value) && value.length <= maximumLength ? value : null;
}

function utf8ByteLengthV1(value: string): number {
  let byteLength = 0;
  for (let index = 0; index < value.length; index += 1) {
    const codeUnit = value.charCodeAt(index);
    if (codeUnit <= 0x7f) {
      byteLength += 1;
    } else if (codeUnit <= 0x7ff) {
      byteLength += 2;
    } else if (codeUnit >= 0xd800 && codeUnit <= 0xdbff) {
      const nextCodeUnit = value.charCodeAt(index + 1);
      if (nextCodeUnit >= 0xdc00 && nextCodeUnit <= 0xdfff) {
        byteLength += 4;
        index += 1;
      } else {
        byteLength += 3;
      }
    } else {
      byteLength += 3;
    }
  }
  return byteLength;
}

export function admitBrowserProgramContinuationManifestV1(
  value: unknown,
): ProgramRepositoryAdmissionResultV3<BrowserProgramContinuationManifestV1> {
  const record = exactRecordV1(value, [
    "revision",
    "programId",
    "workspaceId",
    "volumeId",
    "workspaceFormat",
    "programRevision",
    "repositoryRevision",
  ]);
  if (record === null) return rejectV1("/");
  if (record.revision !== 1) return rejectV1("/revision");
  if (!identifierV1(record.programId)) return rejectV1("/programId");
  if (!identifierV1(record.workspaceId)) return rejectV1("/workspaceId");
  if (!identifierV1(record.volumeId)) return rejectV1("/volumeId");
  if (record.workspaceFormat !== 1) return rejectV1("/workspaceFormat");
  if (!positiveSafeIntegerV1(record.programRevision)) return rejectV1("/programRevision");
  if (!positiveSafeIntegerV1(record.repositoryRevision)) {
    return rejectV1("/repositoryRevision");
  }
  const manifest: BrowserProgramContinuationManifestV1 = {
    revision: 1,
    programId: record.programId,
    workspaceId: record.workspaceId,
    volumeId: record.volumeId,
    workspaceFormat: 1,
    programRevision: record.programRevision,
    repositoryRevision: record.repositoryRevision,
  };
  if (
    utf8ByteLengthV1(JSON.stringify(manifest)) >
      browserProgramContinuationManifestMaximumBytesV1
  ) return rejectV1("/");
  return admittedV1(manifest);
}

export function cloneBrowserProgramContinuationManifestV1(
  value: BrowserProgramContinuationManifestV1,
): BrowserProgramContinuationManifestV1 {
  const admitted = admitBrowserProgramContinuationManifestV1(value);
  if (admitted.kind === "rejected") {
    throw new TypeError(
      `sillyos.program_repository.workspace_continuation.invalid${admitted.path}`,
    );
  }
  return admitted.value;
}

export function browserProgramContinuationManifestsEqualV1(
  left: BrowserProgramContinuationManifestV1,
  right: BrowserProgramContinuationManifestV1,
): boolean {
  return left.revision === right.revision && left.programId === right.programId &&
    left.workspaceId === right.workspaceId && left.volumeId === right.volumeId &&
    left.workspaceFormat === right.workspaceFormat &&
    left.programRevision === right.programRevision &&
    left.repositoryRevision === right.repositoryRevision;
}

/**
 * Verifies the immutable continuation identity carried by a mutation against the
 * currently stored pair. The mutation intentionally carries its exact pre-state
 * repository revision, so idempotent replay must not require full row equality
 * after the stored continuation has advanced.
 */
export function browserProgramContinuationMatchesMutationPreStateV3(
  inputValue: BrowserProgramContinuationManifestV1,
  storedValue: BrowserProgramContinuationManifestV1,
  expectedRepositoryRevision: number,
): boolean {
  const input = cloneBrowserProgramContinuationManifestV1(inputValue);
  const stored = cloneBrowserProgramContinuationManifestV1(storedValue);
  return positiveSafeIntegerV1(expectedRepositoryRevision) &&
    input.repositoryRevision === expectedRepositoryRevision &&
    input.revision === stored.revision && input.programId === stored.programId &&
    input.workspaceId === stored.workspaceId && input.volumeId === stored.volumeId &&
    input.workspaceFormat === stored.workspaceFormat;
}

export function admitProgramRepositoryReviewedHeadV3(
  value: unknown,
): ProgramRepositoryAdmissionResultV3<ProgramRepositoryReviewedHeadV3> {
  const record = exactRecordV1(value, ["checkpointId", "generation"]);
  if (record === null) return rejectV1("/");
  if (!identifierV1(record.checkpointId)) return rejectV1("/checkpointId");
  if (!positiveSafeIntegerV1(record.generation)) return rejectV1("/generation");
  return admittedV1({ checkpointId: record.checkpointId, generation: record.generation });
}

export function cloneProgramRepositoryReviewedHeadV3(
  value: ProgramRepositoryReviewedHeadV3,
): ProgramRepositoryReviewedHeadV3 {
  const admitted = admitProgramRepositoryReviewedHeadV3(value);
  if (admitted.kind === "rejected") {
    throw new TypeError(`sillyos.program_repository.reviewed_head.invalid${admitted.path}`);
  }
  return admitted.value;
}

function admitReviewBindingV3(
  value: unknown,
  path: string,
): ProgramRepositoryAdmissionResultV3<ProgramRepositoryReviewBindingV3> {
  const record = exactRecordV1(value, [
    "proposalId",
    "programId",
    "programRevision",
    "baseAcceptedProgramRevision",
    "repositoryRevision",
    "workspaceId",
    "volumeId",
    "workspaceFormat",
    "checkpointId",
    "generation",
  ]);
  if (record === null) return rejectV1(path.length === 0 ? "/" : path);
  if (!identifierV1(record.proposalId)) return rejectV1(`${path}/proposalId`);
  if (!identifierV1(record.programId)) return rejectV1(`${path}/programId`);
  if (!positiveSafeIntegerV1(record.programRevision)) {
    return rejectV1(`${path}/programRevision`);
  }
  if (
    record.baseAcceptedProgramRevision !== null &&
    !positiveSafeIntegerV1(record.baseAcceptedProgramRevision)
  ) return rejectV1(`${path}/baseAcceptedProgramRevision`);
  if (!positiveSafeIntegerV1(record.repositoryRevision)) {
    return rejectV1(`${path}/repositoryRevision`);
  }
  if (!identifierV1(record.workspaceId)) return rejectV1(`${path}/workspaceId`);
  if (!identifierV1(record.volumeId)) return rejectV1(`${path}/volumeId`);
  if (record.workspaceFormat !== 1) return rejectV1(`${path}/workspaceFormat`);
  if (!identifierV1(record.checkpointId)) return rejectV1(`${path}/checkpointId`);
  if (!positiveSafeIntegerV1(record.generation)) return rejectV1(`${path}/generation`);
  return admittedV1({
    proposalId: record.proposalId,
    programId: record.programId,
    programRevision: record.programRevision,
    baseAcceptedProgramRevision: record.baseAcceptedProgramRevision,
    repositoryRevision: record.repositoryRevision,
    workspaceId: record.workspaceId,
    volumeId: record.volumeId,
    workspaceFormat: 1,
    checkpointId: record.checkpointId,
    generation: record.generation,
  });
}

export function admitProgramRepositoryReviewBindingV3(
  value: unknown,
): ProgramRepositoryAdmissionResultV3<ProgramRepositoryReviewBindingV3> {
  return admitReviewBindingV3(value, "");
}

export function cloneProgramRepositoryReviewBindingV3(
  value: ProgramRepositoryReviewBindingV3,
): ProgramRepositoryReviewBindingV3 {
  const admitted = admitReviewBindingV3(value, "");
  if (admitted.kind === "rejected") {
    throw new TypeError(`sillyos.program_repository.review_binding.invalid${admitted.path}`);
  }
  return admitted.value;
}

export function programRepositoryReviewBindingsEqualV3(
  left: ProgramRepositoryReviewBindingV3,
  right: ProgramRepositoryReviewBindingV3,
): boolean {
  return equalV1(
    cloneProgramRepositoryReviewBindingV3(left),
    cloneProgramRepositoryReviewBindingV3(right),
  );
}

export function browserProgramContinuationMatchesAggregateV1(
  continuation: BrowserProgramContinuationManifestV1,
  aggregate: ProgramRepositoryAggregateV3,
): boolean {
  const program = aggregate.snapshot.program;
  const workspace = aggregate.snapshot.workspace;
  const reviewBinding = aggregate.reviewBinding;
  return program !== null && workspace !== null &&
    continuation.programId === aggregate.programId &&
    continuation.workspaceId === workspace.workspaceId &&
    continuation.workspaceFormat === 1 &&
    continuation.programRevision === program.revision &&
    continuation.repositoryRevision === aggregate.repositoryRevision &&
    (reviewBinding === null ||
      (reviewBinding.workspaceId === continuation.workspaceId &&
        reviewBinding.volumeId === continuation.volumeId &&
        reviewBinding.workspaceFormat === continuation.workspaceFormat)) &&
    aggregate.decisions.every((decision) =>
      decision.status === "rejected" ||
      (decision.snapshot.workspaceId === continuation.workspaceId &&
        decision.snapshot.volumeId === continuation.volumeId &&
        decision.snapshot.workspaceFormat === continuation.workspaceFormat)
    );
}

export function advanceBrowserProgramContinuationV1(
  continuationValue: BrowserProgramContinuationManifestV1,
  aggregateValue: ProgramRepositoryAggregateV3,
): BrowserProgramContinuationManifestV1 {
  const continuation = cloneBrowserProgramContinuationManifestV1(continuationValue);
  const aggregate = cloneProgramRepositoryAggregateV3(aggregateValue);
  const program = aggregate.snapshot.program;
  const workspace = aggregate.snapshot.workspace;
  if (
    program === null || workspace === null || continuation.programId !== aggregate.programId ||
    continuation.workspaceId !== workspace.workspaceId ||
    (aggregate.reviewBinding !== null &&
      (aggregate.reviewBinding.volumeId !== continuation.volumeId ||
        aggregate.reviewBinding.workspaceFormat !== continuation.workspaceFormat)) ||
    aggregate.decisions.some((decision) =>
      decision.status === "accepted" &&
      (decision.snapshot.volumeId !== continuation.volumeId ||
        decision.snapshot.workspaceFormat !== continuation.workspaceFormat)
    )
  ) {
    throw new TypeError("sillyos.program_repository.workspace_continuation.aggregate_mismatch");
  }
  return cloneBrowserProgramContinuationManifestV1({
    ...continuation,
    programRevision: program.revision,
    repositoryRevision: aggregate.repositoryRevision,
  });
}

function admitCapabilityV1(
  value: unknown,
  path: string,
): ProgramRepositoryAdmissionResultV3<PreviewProgramV1["suggestedCapabilities"][number]> {
  const record = exactRecordV1(value, ["capabilityId", "label", "description"]);
  if (record === null) return rejectV1(path);
  if (!identifierV1(record.capabilityId)) return rejectV1(`${path}/capabilityId`);
  if (!boundedTextV1(record.label, 256, { trimmed: true })) {
    return rejectV1(`${path}/label`);
  }
  if (!boundedTextV1(record.description, 2_048, { trimmed: true })) {
    return rejectV1(`${path}/description`);
  }
  return admittedV1({
    capabilityId: record.capabilityId,
    label: record.label,
    description: record.description,
  });
}

function admitProgramV1(
  value: unknown,
  path: string,
): ProgramRepositoryAdmissionResultV3<PreviewProgramV1> {
  const record = exactRecordV1(value, [
    "programId",
    "revision",
    "kind",
    "name",
    "purpose",
    "requirements",
    "suggestedCapabilities",
  ]);
  if (record === null) return rejectV1(path);
  if (!identifierV1(record.programId)) return rejectV1(`${path}/programId`);
  if (!positiveSafeIntegerV1(record.revision)) return rejectV1(`${path}/revision`);
  if (
    record.kind !== "translation" && record.kind !== "writing" &&
    record.kind !== "roleplay" && record.kind !== "general"
  ) return rejectV1(`${path}/kind`);
  if (!boundedTextV1(record.name, 256, { trimmed: true })) return rejectV1(`${path}/name`);
  if (!boundedTextV1(record.purpose, 4_000, { trimmed: true })) {
    return rejectV1(`${path}/purpose`);
  }
  const rawRequirements = arrayV1(record.requirements, programRepositoryMaximumRequirementsV3);
  if (rawRequirements === null || rawRequirements.length === 0) {
    return rejectV1(`${path}/requirements`);
  }
  const requirements: string[] = [];
  for (let index = 0; index < rawRequirements.length; index += 1) {
    const requirement = rawRequirements[index];
    if (!boundedTextV1(requirement, 4_000, { trimmed: true })) {
      return rejectV1(`${path}/requirements/${String(index)}`);
    }
    requirements.push(requirement);
  }
  const rawCapabilities = arrayV1(
    record.suggestedCapabilities,
    programRepositoryMaximumCapabilitiesV3,
  );
  if (rawCapabilities === null) return rejectV1(`${path}/suggestedCapabilities`);
  const suggestedCapabilities: PreviewProgramV1["suggestedCapabilities"][number][] = [];
  for (let index = 0; index < rawCapabilities.length; index += 1) {
    const capability = admitCapabilityV1(
      rawCapabilities[index],
      `${path}/suggestedCapabilities/${String(index)}`,
    );
    if (capability.kind === "rejected") return capability;
    suggestedCapabilities.push(capability.value);
  }
  if (
    new Set(suggestedCapabilities.map(({ capabilityId }) => capabilityId)).size !==
      suggestedCapabilities.length
  ) {
    return rejectV1(`${path}/suggestedCapabilities`);
  }
  return admittedV1({
    programId: record.programId,
    revision: record.revision,
    kind: record.kind,
    name: record.name,
    purpose: record.purpose,
    requirements,
    suggestedCapabilities,
  });
}

function admitSnapshotV1(
  value: unknown,
  path: string,
): ProgramRepositoryAdmissionResultV3<CreatorSessionSnapshotV1> {
  const record = exactRecordV1(value, [
    "revision",
    "source",
    "route",
    "workspace",
    "messages",
    "proposal",
    "program",
    "activity",
  ]);
  if (record === null) return rejectV1(path);
  if (!positiveSafeIntegerV1(record.revision)) return rejectV1(`${path}/revision`);
  if (record.source !== "deterministic_fake_preview") return rejectV1(`${path}/source`);
  if (record.route !== "workspace") return rejectV1(`${path}/route`);

  const workspaceRecord = exactRecordV1(record.workspace, ["workspaceId", "intent", "title"]);
  if (workspaceRecord === null) return rejectV1(`${path}/workspace`);
  if (!identifierV1(workspaceRecord.workspaceId)) {
    return rejectV1(`${path}/workspace/workspaceId`);
  }
  if (!boundedTextV1(workspaceRecord.intent, 4_000, { trimmed: true })) {
    return rejectV1(`${path}/workspace/intent`);
  }
  if (!boundedTextV1(workspaceRecord.title, 256, { trimmed: true })) {
    return rejectV1(`${path}/workspace/title`);
  }
  const workspace = {
    workspaceId: workspaceRecord.workspaceId,
    intent: workspaceRecord.intent,
    title: workspaceRecord.title,
  };

  const rawMessages = arrayV1(record.messages, programRepositoryMaximumMessagesV3);
  if (rawMessages === null || rawMessages.length === 0) return rejectV1(`${path}/messages`);
  const messages: CreatorSessionSnapshotV1["messages"][number][] = [];
  for (let index = 0; index < rawMessages.length; index += 1) {
    const messageRecord = exactRecordV1(rawMessages[index], ["messageId", "role", "text"]);
    const messagePath = `${path}/messages/${String(index)}`;
    if (messageRecord === null) return rejectV1(messagePath);
    if (!identifierV1(messageRecord.messageId)) return rejectV1(`${messagePath}/messageId`);
    if (messageRecord.role !== "user" && messageRecord.role !== "creator") {
      return rejectV1(`${messagePath}/role`);
    }
    const maximumCharacters = messageRecord.role === "user" ? 4_000 : 8_192;
    if (!boundedTextV1(messageRecord.text, maximumCharacters, { trimmed: true })) {
      return rejectV1(`${messagePath}/text`);
    }
    messages.push({
      messageId: messageRecord.messageId,
      role: messageRecord.role,
      text: messageRecord.text,
    });
  }
  if (new Set(messages.map(({ messageId }) => messageId)).size !== messages.length) {
    return rejectV1(`${path}/messages`);
  }

  const proposalRecord = exactRecordV1(record.proposal, [
    "proposalId",
    "programRevision",
    "status",
  ]);
  if (proposalRecord === null) return rejectV1(`${path}/proposal`);
  if (!identifierV1(proposalRecord.proposalId)) return rejectV1(`${path}/proposal/proposalId`);
  if (!positiveSafeIntegerV1(proposalRecord.programRevision)) {
    return rejectV1(`${path}/proposal/programRevision`);
  }
  if (
    proposalRecord.status !== "pending" && proposalRecord.status !== "accepted" &&
    proposalRecord.status !== "rejected"
  ) return rejectV1(`${path}/proposal/status`);
  const proposal: ProgramProposalV1 = {
    proposalId: proposalRecord.proposalId,
    programRevision: proposalRecord.programRevision,
    status: proposalRecord.status,
  };

  const program = admitProgramV1(record.program, `${path}/program`);
  if (program.kind === "rejected") return program;
  if (program.value.revision !== proposal.programRevision) {
    return rejectV1(`${path}/proposal/programRevision`);
  }

  const rawActivity = arrayV1(record.activity, programRepositoryMaximumActivitiesV3);
  if (rawActivity === null || rawActivity.length === 0) return rejectV1(`${path}/activity`);
  const activity: CreatorSessionSnapshotV1["activity"][number][] = [];
  const activityKinds = new Set([
    "intent_submitted",
    "follow_up_submitted",
    "proposal_created",
    "proposal_revised",
    "proposal_accepted",
    "proposal_rejected",
    "agent_run_failed",
    "agent_run_cancelled",
    "agent_run_replaced",
  ]);
  for (let index = 0; index < rawActivity.length; index += 1) {
    const activityRecord = exactRecordV1(rawActivity[index], [
      "activityId",
      "sequence",
      "kind",
      "summary",
    ]);
    const activityPath = `${path}/activity/${String(index)}`;
    if (activityRecord === null) return rejectV1(activityPath);
    if (!identifierV1(activityRecord.activityId)) {
      return rejectV1(`${activityPath}/activityId`);
    }
    if (activityRecord.sequence !== index + 1) return rejectV1(`${activityPath}/sequence`);
    if (typeof activityRecord.kind !== "string" || !activityKinds.has(activityRecord.kind)) {
      return rejectV1(`${activityPath}/kind`);
    }
    if (!boundedTextV1(activityRecord.summary, 2_048, { trimmed: true })) {
      return rejectV1(`${activityPath}/summary`);
    }
    activity.push({
      activityId: activityRecord.activityId,
      sequence: activityRecord.sequence,
      kind: activityRecord.kind as CreatorSessionSnapshotV1["activity"][number]["kind"],
      summary: activityRecord.summary,
    });
  }
  if (new Set(activity.map(({ activityId }) => activityId)).size !== activity.length) {
    return rejectV1(`${path}/activity`);
  }

  return admittedV1({
    revision: record.revision,
    source: record.source,
    route: record.route,
    workspace,
    messages,
    proposal,
    program: program.value,
    activity,
  });
}

function equalV1(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function isLogicalSuccessorV1(previous: PreviewProgramV1, next: PreviewProgramV1): boolean {
  if (
    next.programId !== previous.programId || next.revision !== previous.revision + 1 ||
    next.kind !== previous.kind || next.name !== previous.name ||
    next.purpose !== previous.purpose ||
    next.requirements.length !== previous.requirements.length + 1 ||
    !equalV1(next.requirements.slice(0, -1), previous.requirements) ||
    !equalV1(next.suggestedCapabilities, previous.suggestedCapabilities)
  ) return false;
  return true;
}

export function admitProgramRepositoryAggregateV3(
  value: unknown,
): ProgramRepositoryAdmissionResultV3<ProgramRepositoryAggregateV3> {
  const record = exactRecordV1(value, [
    "schemaVersion",
    "programId",
    "repositoryRevision",
    "updatedAt",
    "snapshot",
    "programRevisions",
    "decisions",
    "agentRunReceipts",
    "reviewBinding",
  ]);
  if (record === null) return rejectV1("/");
  if (record.schemaVersion !== programRepositorySchemaVersionV3) {
    return rejectV1("/schemaVersion");
  }
  if (!identifierV1(record.programId)) return rejectV1("/programId");
  if (!positiveSafeIntegerV1(record.repositoryRevision)) {
    return rejectV1("/repositoryRevision");
  }
  if (!nonNegativeSafeIntegerV1(record.updatedAt)) return rejectV1("/updatedAt");
  const snapshot = admitSnapshotV1(record.snapshot, "/snapshot");
  if (snapshot.kind === "rejected") return snapshot;
  if (snapshot.value.program?.programId !== record.programId) return rejectV1("/programId");

  const rawRevisions = arrayV1(
    record.programRevisions,
    programRepositoryMaximumProgramRevisionsV3,
  );
  if (rawRevisions === null || rawRevisions.length === 0) {
    return rejectV1("/programRevisions");
  }
  const programRevisions: PreviewProgramV1[] = [];
  for (let index = 0; index < rawRevisions.length; index += 1) {
    const revision = admitProgramV1(rawRevisions[index], `/programRevisions/${String(index)}`);
    if (revision.kind === "rejected") return revision;
    if (
      revision.value.programId !== record.programId || revision.value.revision !== index + 1 ||
      revision.value.requirements.length !== revision.value.revision
    ) return rejectV1(`/programRevisions/${String(index)}`);
    const previous = programRevisions.at(-1);
    if (previous !== undefined && !isLogicalSuccessorV1(previous, revision.value)) {
      return rejectV1(`/programRevisions/${String(index)}`);
    }
    programRevisions.push(revision.value);
  }
  const currentProgram = snapshot.value.program;
  if (currentProgram === null || !equalV1(programRevisions.at(-1), currentProgram)) {
    return rejectV1("/snapshot/program");
  }

  const rawDecisions = arrayV1(record.decisions, programRepositoryMaximumDecisionsV3);
  if (rawDecisions === null) return rejectV1("/decisions");
  const decisions: ProgramRepositoryDecisionV3[] = [];
  const acceptedSnapshotIds = new Set<string>();
  const occupiedRepositoryRevisions = new Set<number>([1]);
  for (let index = 0; index < rawDecisions.length; index += 1) {
    const rejectedRecord = exactRecordV1(rawDecisions[index], [
      "proposalId",
      "programRevision",
      "status",
      "repositoryRevision",
    ]);
    const acceptedRecord = exactRecordV1(rawDecisions[index], [
      "proposalId",
      "programRevision",
      "status",
      "repositoryRevision",
      "snapshot",
    ]);
    const decisionRecord = acceptedRecord ?? rejectedRecord;
    const decisionPath = `/decisions/${String(index)}`;
    if (decisionRecord === null) return rejectV1(decisionPath);
    if (
      !identifierV1(decisionRecord.proposalId) ||
      decisionRecord.proposalId !== snapshot.value.proposal?.proposalId
    ) {
      return rejectV1(`${decisionPath}/proposalId`);
    }
    if (
      !positiveSafeIntegerV1(decisionRecord.programRevision) ||
      decisionRecord.programRevision > currentProgram.revision ||
      (decisions.at(-1)?.programRevision ?? 0) >= decisionRecord.programRevision
    ) return rejectV1(`${decisionPath}/programRevision`);
    if (
      (acceptedRecord === null && decisionRecord.status !== "rejected") ||
      (acceptedRecord !== null && decisionRecord.status !== "accepted")
    ) {
      return rejectV1(`${decisionPath}/status`);
    }
    if (
      !positiveSafeIntegerV1(decisionRecord.repositoryRevision) ||
      decisionRecord.repositoryRevision <= decisionRecord.programRevision ||
      decisionRecord.repositoryRevision > record.repositoryRevision ||
      (decisions.at(-1)?.repositoryRevision ?? 0) >= decisionRecord.repositoryRevision ||
      occupiedRepositoryRevisions.has(decisionRecord.repositoryRevision)
    ) return rejectV1(`${decisionPath}/repositoryRevision`);
    occupiedRepositoryRevisions.add(decisionRecord.repositoryRevision);
    if (acceptedRecord === null) {
      decisions.push({
        proposalId: decisionRecord.proposalId,
        programRevision: decisionRecord.programRevision,
        status: "rejected",
        repositoryRevision: decisionRecord.repositoryRevision,
      });
      continue;
    }
    const acceptedSnapshot = admitProgramWorkspaceSnapshotReceiptV1(acceptedRecord.snapshot);
    if (
      acceptedSnapshot === null || acceptedSnapshot.programId !== record.programId ||
      acceptedSnapshot.workspaceId !== snapshot.value.workspace?.workspaceId ||
      acceptedSnapshot.proposalId !== decisionRecord.proposalId ||
      acceptedSnapshot.programRevision !== decisionRecord.programRevision ||
      acceptedSnapshot.baseRepositoryRevision !== decisionRecord.repositoryRevision - 1 ||
      acceptedSnapshotIds.has(acceptedSnapshot.snapshotId)
    ) return rejectV1(`${decisionPath}/snapshot`);
    acceptedSnapshotIds.add(acceptedSnapshot.snapshotId);
    decisions.push({
      proposalId: decisionRecord.proposalId,
      programRevision: decisionRecord.programRevision,
      status: "accepted",
      repositoryRevision: decisionRecord.repositoryRevision,
      snapshot: acceptedSnapshot,
    });
  }
  const currentProposal = snapshot.value.proposal;
  if (currentProposal === null) return rejectV1("/snapshot/proposal");
  const currentDecision = decisions.find((entry) =>
    entry.proposalId === currentProposal.proposalId &&
    entry.programRevision === currentProposal.programRevision
  );
  if (
    (currentProposal.status === "pending" && currentDecision !== undefined) ||
    (currentProposal.status !== "pending" &&
      currentDecision?.status !== currentProposal.status)
  ) return rejectV1("/snapshot/proposal/status");

  const admittedReviewBinding = record.reviewBinding === null
    ? null
    : admitReviewBindingV3(record.reviewBinding, "/reviewBinding");
  if (admittedReviewBinding !== null && admittedReviewBinding.kind === "rejected") {
    return admittedReviewBinding;
  }
  const reviewBinding = admittedReviewBinding?.value ?? null;
  const workspace = snapshot.value.workspace;
  const latestAcceptedProgramRevision =
    decisions.filter((decision) => decision.status === "accepted").at(-1)?.programRevision ?? null;
  if (
    workspace === null ||
    (currentProposal.status === "pending") !== (reviewBinding !== null) ||
    (reviewBinding !== null &&
      (reviewBinding.proposalId !== currentProposal.proposalId ||
        reviewBinding.programId !== record.programId ||
        reviewBinding.programRevision !== currentProgram.revision ||
        reviewBinding.programRevision !== currentProposal.programRevision ||
        reviewBinding.baseAcceptedProgramRevision !== latestAcceptedProgramRevision ||
        (reviewBinding.baseAcceptedProgramRevision !== null &&
          reviewBinding.baseAcceptedProgramRevision >= reviewBinding.programRevision) ||
        reviewBinding.repositoryRevision !== record.repositoryRevision ||
        reviewBinding.workspaceId !== workspace.workspaceId))
  ) return rejectV1("/reviewBinding");

  const rawReceipts = arrayV1(
    record.agentRunReceipts,
    programRepositoryMaximumAgentRunReceiptsV3,
  );
  if (rawReceipts === null) return rejectV1("/agentRunReceipts");
  const agentRunReceipts: ProgramAgentRunReceiptV3[] = [];
  const usedUserMessageIds = new Set<string>();
  const usedCreatorMessageIds = new Set<string>();
  const resultingProgramRevisions = new Set<number>();
  for (let index = 0; index < rawReceipts.length; index += 1) {
    const receiptRecord = exactRecordV1(rawReceipts[index], [
      "agentRunId",
      "sequence",
      "proposalId",
      "userMessageId",
      "creatorMessageId",
      "baseProgramRevision",
      "baseRepositoryRevision",
      "resultingProgramRevision",
      "outcome",
      "diagnosticCode",
    ]);
    const receiptPath = `/agentRunReceipts/${String(index)}`;
    if (receiptRecord === null) return rejectV1(receiptPath);
    if (!identifierV1(receiptRecord.agentRunId)) {
      return rejectV1(`${receiptPath}/agentRunId`);
    }
    if (receiptRecord.sequence !== index + 1) return rejectV1(`${receiptPath}/sequence`);
    if (
      !identifierV1(receiptRecord.proposalId) ||
      receiptRecord.proposalId !== currentProposal.proposalId
    ) return rejectV1(`${receiptPath}/proposalId`);
    if (!identifierV1(receiptRecord.userMessageId)) {
      return rejectV1(`${receiptPath}/userMessageId`);
    }
    if (usedUserMessageIds.has(receiptRecord.userMessageId)) {
      return rejectV1(`${receiptPath}/userMessageId`);
    }
    const userMessageIndex = snapshot.value.messages.findIndex((message) =>
      message.messageId === receiptRecord.userMessageId
    );
    const userMessage = snapshot.value.messages[userMessageIndex];
    if (userMessage?.role !== "user" || userMessage.text.length > 4_000) {
      return rejectV1(`${receiptPath}/userMessageId`);
    }
    if (
      !positiveSafeIntegerV1(receiptRecord.baseProgramRevision) ||
      receiptRecord.baseProgramRevision > currentProgram.revision
    ) return rejectV1(`${receiptPath}/baseProgramRevision`);
    if (
      !positiveSafeIntegerV1(receiptRecord.baseRepositoryRevision) ||
      receiptRecord.baseRepositoryRevision < receiptRecord.baseProgramRevision ||
      receiptRecord.baseRepositoryRevision >= record.repositoryRevision ||
      (agentRunReceipts.at(-1)?.baseRepositoryRevision ?? 0) >=
        receiptRecord.baseRepositoryRevision ||
      occupiedRepositoryRevisions.has(receiptRecord.baseRepositoryRevision + 1)
    ) return rejectV1(`${receiptPath}/baseRepositoryRevision`);
    occupiedRepositoryRevisions.add(receiptRecord.baseRepositoryRevision + 1);
    if (
      receiptRecord.outcome !== "completed" && receiptRecord.outcome !== "failed" &&
      receiptRecord.outcome !== "cancelled" && receiptRecord.outcome !== "replaced"
    ) return rejectV1(`${receiptPath}/outcome`);

    let creatorMessageId: string | null = null;
    let resultingProgramRevision: number | null = null;
    let diagnosticCode: CreatorAgentDiagnosticCodeV1 | null = null;
    if (receiptRecord.outcome === "completed") {
      if (
        !identifierV1(receiptRecord.creatorMessageId) ||
        usedCreatorMessageIds.has(receiptRecord.creatorMessageId)
      ) return rejectV1(`${receiptPath}/creatorMessageId`);
      const creatorMessageIndex = snapshot.value.messages.findIndex((message) =>
        message.messageId === receiptRecord.creatorMessageId
      );
      const creatorMessage = snapshot.value.messages[creatorMessageIndex];
      if (
        creatorMessage?.role !== "creator" || creatorMessage.text.length > 8_192 ||
        creatorMessageIndex !== userMessageIndex + 1
      ) return rejectV1(`${receiptPath}/creatorMessageId`);
      if (
        !positiveSafeIntegerV1(receiptRecord.resultingProgramRevision) ||
        receiptRecord.resultingProgramRevision !== receiptRecord.baseProgramRevision + 1 ||
        receiptRecord.resultingProgramRevision > currentProgram.revision ||
        resultingProgramRevisions.has(receiptRecord.resultingProgramRevision)
      ) return rejectV1(`${receiptPath}/resultingProgramRevision`);
      if (receiptRecord.diagnosticCode !== null) {
        return rejectV1(`${receiptPath}/diagnosticCode`);
      }
      creatorMessageId = receiptRecord.creatorMessageId;
      resultingProgramRevision = receiptRecord.resultingProgramRevision;
      usedCreatorMessageIds.add(creatorMessageId);
      resultingProgramRevisions.add(resultingProgramRevision);
    } else {
      if (receiptRecord.creatorMessageId !== null) {
        return rejectV1(`${receiptPath}/creatorMessageId`);
      }
      if (receiptRecord.resultingProgramRevision !== null) {
        return rejectV1(`${receiptPath}/resultingProgramRevision`);
      }
      if (receiptRecord.outcome === "failed") {
        if (!creatorAgentDiagnosticCodeV1(receiptRecord.diagnosticCode)) {
          return rejectV1(`${receiptPath}/diagnosticCode`);
        }
        diagnosticCode = receiptRecord.diagnosticCode;
      } else if (receiptRecord.diagnosticCode !== null) {
        return rejectV1(`${receiptPath}/diagnosticCode`);
      }
    }
    usedUserMessageIds.add(receiptRecord.userMessageId);
    agentRunReceipts.push({
      agentRunId: receiptRecord.agentRunId,
      sequence: receiptRecord.sequence,
      proposalId: receiptRecord.proposalId,
      userMessageId: receiptRecord.userMessageId,
      creatorMessageId,
      baseProgramRevision: receiptRecord.baseProgramRevision,
      baseRepositoryRevision: receiptRecord.baseRepositoryRevision,
      resultingProgramRevision,
      outcome: receiptRecord.outcome,
      diagnosticCode,
    });
  }
  if (
    new Set(agentRunReceipts.map(({ agentRunId }) => agentRunId)).size !==
      agentRunReceipts.length
  ) return rejectV1("/agentRunReceipts");
  if (currentProposal.status !== "pending" && currentDecision !== undefined) {
    let retainedProposalRevision = currentDecision.repositoryRevision;
    for (const receipt of agentRunReceipts) {
      if (receipt.baseRepositoryRevision < currentDecision.repositoryRevision) continue;
      if (
        receipt.baseRepositoryRevision !== retainedProposalRevision ||
        receipt.baseProgramRevision !== currentProposal.programRevision ||
        receipt.outcome === "completed"
      ) return rejectV1("/snapshot/proposal/status");
      retainedProposalRevision += 1;
    }
    if (retainedProposalRevision !== record.repositoryRevision) {
      return rejectV1("/snapshot/proposal/status");
    }
  }
  const reachableRepositoryRevision = programRevisions.length + decisions.length +
    agentRunReceipts.filter((receipt) => receipt.outcome !== "completed").length;
  if (record.repositoryRevision !== reachableRepositoryRevision) {
    return rejectV1("/repositoryRevision");
  }

  const decisionsByRepositoryRevision = new Map(
    decisions.map((decision) => [decision.repositoryRevision, decision] as const),
  );
  const receiptsByRepositoryRevision = new Map(
    agentRunReceipts.map((receipt) => [receipt.baseRepositoryRevision + 1, receipt] as const),
  );
  let simulatedProgramRevision = 1;
  let simulatedProposalPending = true;
  for (
    let repositoryRevision = 2;
    repositoryRevision <= record.repositoryRevision;
    repositoryRevision += 1
  ) {
    const decision = decisionsByRepositoryRevision.get(repositoryRevision);
    if (decision !== undefined) {
      if (
        !simulatedProposalPending || decision.programRevision !== simulatedProgramRevision
      ) return rejectV1("/repositoryRevision");
      simulatedProposalPending = false;
      continue;
    }
    const receipt = receiptsByRepositoryRevision.get(repositoryRevision);
    if (receipt !== undefined) {
      if (receipt.baseProgramRevision !== simulatedProgramRevision) {
        return rejectV1("/repositoryRevision");
      }
      if (receipt.outcome === "completed") {
        simulatedProgramRevision += 1;
        if (receipt.resultingProgramRevision !== simulatedProgramRevision) {
          return rejectV1("/repositoryRevision");
        }
        simulatedProposalPending = true;
      }
      continue;
    }
    simulatedProgramRevision += 1;
    simulatedProposalPending = true;
  }
  if (
    simulatedProgramRevision !== currentProgram.revision ||
    simulatedProposalPending !== (currentProposal.status === "pending")
  ) return rejectV1("/repositoryRevision");

  const aggregate: ProgramRepositoryAggregateV3 = {
    schemaVersion: 3,
    programId: record.programId,
    repositoryRevision: record.repositoryRevision,
    updatedAt: record.updatedAt,
    snapshot: snapshot.value,
    programRevisions,
    decisions,
    agentRunReceipts,
    reviewBinding,
  };
  if (utf8ByteLengthV1(JSON.stringify(aggregate)) > programRepositoryAggregateMaximumBytesV3) {
    return rejectV1("/");
  }
  return admittedV1(aggregate);
}

function requireAdmittedV1<TValue>(
  result: ProgramRepositoryAdmissionResultV3<TValue>,
  label: string,
): TValue {
  if (result.kind === "rejected") {
    throw new TypeError(`sillyos.program_repository.${label}.invalid${result.path}`);
  }
  return result.value;
}

export function cloneProgramRepositoryAggregateV3(
  aggregate: ProgramRepositoryAggregateV3,
): ProgramRepositoryAggregateV3 {
  return requireAdmittedV1(admitProgramRepositoryAggregateV3(aggregate), "aggregate");
}

export function findProgramAgentRunReceiptV3(
  aggregate: ProgramRepositoryAggregateV3,
  agentRunId: string,
): ProgramAgentRunReceiptV3 | null {
  const admitted = cloneProgramRepositoryAggregateV3(aggregate);
  if (!identifierV1(agentRunId)) return null;
  return admitted.agentRunReceipts.find((receipt) => receipt.agentRunId === agentRunId) ?? null;
}

export function programRepositoryAggregatesEqualV3(
  left: ProgramRepositoryAggregateV3,
  right: ProgramRepositoryAggregateV3,
): boolean {
  return equalV1(
    cloneProgramRepositoryAggregateV3(left),
    cloneProgramRepositoryAggregateV3(right),
  );
}

export function summarizeProgramRepositoryAggregateV3(
  aggregate: ProgramRepositoryAggregateV3,
): ProgramRepositorySummaryV3 {
  const admitted = cloneProgramRepositoryAggregateV3(aggregate);
  const program = admitted.snapshot.program;
  const proposal = admitted.snapshot.proposal;
  if (program === null || proposal === null) throw new TypeError("invalid Program aggregate");
  return {
    programId: admitted.programId,
    name: program.name,
    kind: program.kind,
    programRevision: program.revision,
    proposalStatus: proposal.status,
    updatedAt: admitted.updatedAt,
    repositoryRevision: admitted.repositoryRevision,
  };
}

export function sortProgramRepositorySummariesV3(
  summaries: readonly ProgramRepositorySummaryV3[],
): readonly ProgramRepositorySummaryV3[] {
  return summaries.toSorted((left, right) =>
    right.updatedAt - left.updatedAt || left.programId.localeCompare(right.programId, "en")
  );
}

export function normalizeProgramRepositoryProgramIdV3(value: unknown): string {
  if (!identifierV1(value)) throw new TypeError("sillyos.program_repository.program_id.invalid");
  return value;
}

function normalizeInputContinuationV3(
  value: unknown,
  operation: "create" | "apply" | "decide" | "settle_agent_run",
): BrowserProgramContinuationManifestV1 {
  const admitted = admitBrowserProgramContinuationManifestV1(value);
  if (admitted.kind === "rejected") {
    throw new TypeError(
      `sillyos.program_repository.${operation}.invalid/continuation${admitted.path}`,
    );
  }
  return admitted.value;
}

export function normalizeProgramRepositoryCreateInputV3(
  value: unknown,
): ProgramRepositoryCreateInputV3 {
  const record = exactRecordV1(value, ["snapshot", "updatedAt", "continuation", "reviewedHead"]);
  if (record === null) throw new TypeError("sillyos.program_repository.create.invalid/");
  const snapshot = requireAdmittedV1(admitSnapshotV1(record.snapshot, "/snapshot"), "create");
  if (!nonNegativeSafeIntegerV1(record.updatedAt)) {
    throw new TypeError("sillyos.program_repository.create.invalid/updatedAt");
  }
  const continuation = normalizeInputContinuationV3(record.continuation, "create");
  const reviewedHead = admitProgramRepositoryReviewedHeadV3(record.reviewedHead);
  if (reviewedHead.kind === "rejected") {
    throw new TypeError(
      `sillyos.program_repository.create.invalid/reviewedHead${reviewedHead.path}`,
    );
  }
  return {
    snapshot,
    updatedAt: record.updatedAt,
    continuation,
    reviewedHead: reviewedHead.value,
  };
}

export function normalizeProgramRepositoryApplyRevisionInputV3(
  value: unknown,
): ProgramRepositoryApplyRevisionInputV3 {
  const record = exactRecordV1(value, [
    "programId",
    "expectedRepositoryRevision",
    "expectedBase",
    "snapshot",
    "continuation",
    "reviewedHead",
    "updatedAt",
  ]);
  if (record === null) throw new TypeError("sillyos.program_repository.apply.invalid/");
  const programId = normalizeProgramRepositoryProgramIdV3(record.programId);
  if (!positiveSafeIntegerV1(record.expectedRepositoryRevision)) {
    throw new TypeError("sillyos.program_repository.apply.invalid/expectedRepositoryRevision");
  }
  const base = exactRecordV1(record.expectedBase, [
    "proposalId",
    "programId",
    "baseProgramRevision",
  ]);
  if (
    base === null || !identifierV1(base.proposalId) || !identifierV1(base.programId) ||
    !positiveSafeIntegerV1(base.baseProgramRevision)
  ) {
    throw new TypeError("sillyos.program_repository.apply.invalid/expectedBase");
  }
  const snapshot = requireAdmittedV1(admitSnapshotV1(record.snapshot, "/snapshot"), "apply");
  const continuation = normalizeInputContinuationV3(record.continuation, "apply");
  const reviewedHead = admitProgramRepositoryReviewedHeadV3(record.reviewedHead);
  if (reviewedHead.kind === "rejected") {
    throw new TypeError(
      `sillyos.program_repository.apply.invalid/reviewedHead${reviewedHead.path}`,
    );
  }
  if (!nonNegativeSafeIntegerV1(record.updatedAt)) {
    throw new TypeError("sillyos.program_repository.apply.invalid/updatedAt");
  }
  return {
    programId,
    expectedRepositoryRevision: record.expectedRepositoryRevision,
    expectedBase: {
      proposalId: base.proposalId,
      programId: base.programId,
      baseProgramRevision: base.baseProgramRevision,
    },
    snapshot,
    continuation,
    reviewedHead: reviewedHead.value,
    updatedAt: record.updatedAt,
  };
}

export function normalizeProgramRepositoryDecideInputV3(
  value: unknown,
): ProgramRepositoryDecideInputV3 {
  const rejectedRecord = exactRecordV1(value, [
    "programId",
    "expectedRepositoryRevision",
    "expectedProposal",
    "status",
    "snapshot",
    "continuation",
    "updatedAt",
  ]);
  const acceptedRecord = exactRecordV1(value, [
    "programId",
    "expectedRepositoryRevision",
    "expectedProposal",
    "status",
    "snapshot",
    "continuation",
    "snapshotReceipt",
    "updatedAt",
  ]);
  const record = acceptedRecord ?? rejectedRecord;
  if (record === null) throw new TypeError("sillyos.program_repository.decide.invalid/");
  const programId = normalizeProgramRepositoryProgramIdV3(record.programId);
  if (!positiveSafeIntegerV1(record.expectedRepositoryRevision)) {
    throw new TypeError("sillyos.program_repository.decide.invalid/expectedRepositoryRevision");
  }
  const proposal = exactRecordV1(record.expectedProposal, ["proposalId", "programRevision"]);
  if (
    proposal === null || !identifierV1(proposal.proposalId) ||
    !positiveSafeIntegerV1(proposal.programRevision)
  ) {
    throw new TypeError("sillyos.program_repository.decide.invalid/expectedProposal");
  }
  if (
    (acceptedRecord !== null && record.status !== "accepted") ||
    (acceptedRecord === null && record.status !== "rejected")
  ) {
    throw new TypeError("sillyos.program_repository.decide.invalid/status");
  }
  const snapshot = requireAdmittedV1(admitSnapshotV1(record.snapshot, "/snapshot"), "decide");
  const continuation = normalizeInputContinuationV3(record.continuation, "decide");
  if (!nonNegativeSafeIntegerV1(record.updatedAt)) {
    throw new TypeError("sillyos.program_repository.decide.invalid/updatedAt");
  }
  const normalized = {
    programId,
    expectedRepositoryRevision: record.expectedRepositoryRevision,
    expectedProposal: {
      proposalId: proposal.proposalId,
      programRevision: proposal.programRevision,
    },
    status: record.status,
    snapshot,
    continuation,
    updatedAt: record.updatedAt,
  };
  if (acceptedRecord === null) return { ...normalized, status: "rejected" };
  const snapshotReceipt = admitProgramWorkspaceSnapshotReceiptV1(acceptedRecord.snapshotReceipt);
  if (snapshotReceipt === null) {
    throw new TypeError("sillyos.program_repository.decide.invalid/snapshotReceipt");
  }
  return { ...normalized, status: "accepted", snapshotReceipt };
}

function normalizeCreatorAgentTerminalRunV1(value: unknown): CreatorAgentTerminalRunV1 {
  const discriminator = exactRecordV1(value, ["run", "outcome"]);
  const completed = exactRecordV1(value, [
    "run",
    "outcome",
    "candidate",
    "finalAssistantReply",
  ]);
  const failed = exactRecordV1(value, ["run", "outcome", "diagnosticCode"]);
  const terminal = completed ?? failed ?? discriminator;
  if (terminal === null) {
    throw new TypeError("sillyos.program_repository.settle_agent_run.invalid/terminal");
  }
  const run = exactRecordV1(terminal.run, [
    "agentRunId",
    "proposalId",
    "programId",
    "baseProgramRevision",
    "baseRepositoryRevision",
    "text",
  ]);
  if (
    run === null || !identifierV1(run.agentRunId) || !identifierV1(run.proposalId) ||
    !identifierV1(run.programId) || !positiveSafeIntegerV1(run.baseProgramRevision) ||
    !positiveSafeIntegerV1(run.baseRepositoryRevision) ||
    !boundedTextV1(run.text, 4_000, { trimmed: true })
  ) throw new TypeError("sillyos.program_repository.settle_agent_run.invalid/terminal/run");
  const normalizedRun = {
    agentRunId: run.agentRunId,
    proposalId: run.proposalId,
    programId: run.programId,
    baseProgramRevision: run.baseProgramRevision,
    baseRepositoryRevision: run.baseRepositoryRevision,
    text: run.text,
  };
  if (completed !== null && completed.outcome === "completed") {
    const candidate = exactRecordV1(completed.candidate, [
      "revision",
      "proposalId",
      "programId",
      "baseProgramRevision",
      "text",
      "requirement",
    ]);
    if (
      candidate === null || candidate.revision !== 1 ||
      !identifierV1(candidate.proposalId) || !identifierV1(candidate.programId) ||
      !positiveSafeIntegerV1(candidate.baseProgramRevision) ||
      !boundedTextV1(candidate.text, 4_000, { trimmed: true }) ||
      !boundedTextV1(candidate.requirement, 4_000, { trimmed: true }) ||
      candidate.proposalId !== normalizedRun.proposalId ||
      candidate.programId !== normalizedRun.programId ||
      candidate.baseProgramRevision !== normalizedRun.baseProgramRevision ||
      candidate.text !== normalizedRun.text ||
      typeof completed.finalAssistantReply !== "string" ||
      completed.finalAssistantReply.length > 8_192 ||
      completed.finalAssistantReply.trim().length === 0
    ) {
      throw new TypeError(
        "sillyos.program_repository.settle_agent_run.invalid/terminal/completed",
      );
    }
    return {
      run: normalizedRun,
      outcome: "completed",
      candidate: {
        revision: 1,
        proposalId: candidate.proposalId,
        programId: candidate.programId,
        baseProgramRevision: candidate.baseProgramRevision,
        text: candidate.text,
        requirement: candidate.requirement,
      },
      finalAssistantReply: completed.finalAssistantReply.trim(),
    };
  }
  if (failed !== null && failed.outcome === "failed") {
    if (!creatorAgentDiagnosticCodeV1(failed.diagnosticCode)) {
      throw new TypeError(
        "sillyos.program_repository.settle_agent_run.invalid/terminal/diagnosticCode",
      );
    }
    return {
      run: normalizedRun,
      outcome: "failed",
      diagnosticCode: failed.diagnosticCode,
    };
  }
  if (
    discriminator !== null &&
    (discriminator.outcome === "cancelled" || discriminator.outcome === "replaced")
  ) {
    return { run: normalizedRun, outcome: discriminator.outcome };
  }
  throw new TypeError("sillyos.program_repository.settle_agent_run.invalid/terminal/outcome");
}

export function normalizeProgramRepositorySettleAgentRunInputV3(
  value: unknown,
): ProgramRepositorySettleAgentRunInputV3 {
  const record = exactRecordV1(value, [
    "programId",
    "expectedRepositoryRevision",
    "terminal",
    "snapshot",
    "continuation",
    "reviewedHead",
    "updatedAt",
  ]);
  if (record === null) {
    throw new TypeError("sillyos.program_repository.settle_agent_run.invalid/");
  }
  const programId = normalizeProgramRepositoryProgramIdV3(record.programId);
  if (!positiveSafeIntegerV1(record.expectedRepositoryRevision)) {
    throw new TypeError(
      "sillyos.program_repository.settle_agent_run.invalid/expectedRepositoryRevision",
    );
  }
  const terminal = normalizeCreatorAgentTerminalRunV1(record.terminal);
  const snapshot = requireAdmittedV1(
    admitSnapshotV1(record.snapshot, "/snapshot"),
    "settle_agent_run",
  );
  const continuation = normalizeInputContinuationV3(record.continuation, "settle_agent_run");
  const reviewedHead = record.reviewedHead === null
    ? null
    : admitProgramRepositoryReviewedHeadV3(record.reviewedHead);
  if (reviewedHead !== null && reviewedHead.kind === "rejected") {
    throw new TypeError(
      `sillyos.program_repository.settle_agent_run.invalid/reviewedHead${reviewedHead.path}`,
    );
  }
  if ((terminal.outcome === "completed") !== (reviewedHead !== null)) {
    throw new TypeError("sillyos.program_repository.settle_agent_run.invalid/reviewedHead");
  }
  if (!nonNegativeSafeIntegerV1(record.updatedAt)) {
    throw new TypeError("sillyos.program_repository.settle_agent_run.invalid/updatedAt");
  }
  return {
    programId,
    expectedRepositoryRevision: record.expectedRepositoryRevision,
    terminal,
    snapshot,
    continuation,
    reviewedHead: reviewedHead?.value ?? null,
    updatedAt: record.updatedAt,
  };
}

export function buildProgramRepositoryCreateV3(
  input: ProgramRepositoryCreateInputV3,
): ProgramRepositoryAggregateV3 {
  const normalized = normalizeProgramRepositoryCreateInputV3(input);
  const program = normalized.snapshot.program;
  const proposal = normalized.snapshot.proposal;
  const workspace = normalized.snapshot.workspace;
  if (
    program === null || proposal === null || workspace === null || program.revision !== 1 ||
    proposal.programRevision !== 1 || proposal.status !== "pending" ||
    normalized.continuation.programId !== program.programId ||
    normalized.continuation.workspaceId !== workspace.workspaceId ||
    normalized.continuation.programRevision !== 1 ||
    normalized.continuation.repositoryRevision !== 1
  ) {
    throw new TypeError("sillyos.program_repository.create.invalid/snapshot/program/revision");
  }
  const aggregate = cloneProgramRepositoryAggregateV3({
    schemaVersion: 3,
    programId: program.programId,
    repositoryRevision: 1,
    updatedAt: normalized.updatedAt,
    snapshot: normalized.snapshot,
    programRevisions: [program],
    decisions: [],
    agentRunReceipts: [],
    reviewBinding: {
      proposalId: proposal.proposalId,
      programId: program.programId,
      programRevision: program.revision,
      baseAcceptedProgramRevision: null,
      repositoryRevision: 1,
      workspaceId: workspace.workspaceId,
      volumeId: normalized.continuation.volumeId,
      workspaceFormat: normalized.continuation.workspaceFormat,
      checkpointId: normalized.reviewedHead.checkpointId,
      generation: normalized.reviewedHead.generation,
    },
  });
  if (!browserProgramContinuationMatchesAggregateV1(normalized.continuation, aggregate)) {
    throw new TypeError("sillyos.program_repository.create.invalid/continuation");
  }
  return aggregate;
}

function hasPrefixV1<TValue>(
  next: readonly TValue[],
  previous: readonly TValue[],
): boolean {
  return next.length >= previous.length && equalV1(next.slice(0, previous.length), previous);
}

function latestAcceptedProgramRevisionV3(
  aggregate: ProgramRepositoryAggregateV3,
): number | null {
  return aggregate.decisions.filter((decision) => decision.status === "accepted").at(-1)
    ?.programRevision ?? null;
}

function successorReviewBindingV3(input: {
  readonly current: ProgramRepositoryAggregateV3;
  readonly continuation: BrowserProgramContinuationManifestV1;
  readonly program: PreviewProgramV1;
  readonly proposal: ProgramProposalV1;
  readonly repositoryRevision: number;
  readonly reviewedHead: ProgramRepositoryReviewedHeadV3;
}): ProgramRepositoryReviewBindingV3 {
  const workspace = input.current.snapshot.workspace;
  if (
    workspace === null ||
    !browserProgramContinuationMatchesAggregateV1(input.continuation, input.current)
  ) throw new TypeError("sillyos.program_repository.workspace_continuation.aggregate_mismatch");
  return cloneProgramRepositoryReviewBindingV3({
    proposalId: input.proposal.proposalId,
    programId: input.program.programId,
    programRevision: input.program.revision,
    baseAcceptedProgramRevision: latestAcceptedProgramRevisionV3(input.current),
    repositoryRevision: input.repositoryRevision,
    workspaceId: workspace.workspaceId,
    volumeId: input.continuation.volumeId,
    workspaceFormat: input.continuation.workspaceFormat,
    checkpointId: input.reviewedHead.checkpointId,
    generation: input.reviewedHead.generation,
  });
}

export function applyProgramRepositoryRevisionV3(
  currentValue: ProgramRepositoryAggregateV3,
  inputValue: ProgramRepositoryApplyRevisionInputV3,
): ProgramRepositoryCommitResultV3 {
  const current = cloneProgramRepositoryAggregateV3(currentValue);
  const input = normalizeProgramRepositoryApplyRevisionInputV3(inputValue);
  const currentProgram = current.snapshot.program;
  const currentProposal = current.snapshot.proposal;
  const nextProgram = input.snapshot.program;
  const nextProposal = input.snapshot.proposal;
  if (currentProgram === null || currentProposal === null) {
    throw new TypeError("invalid current Program aggregate");
  }
  const previousProgram = current.programRevisions.at(-2);
  const currentReviewBinding = current.reviewBinding;
  if (
    current.programId === input.programId &&
    current.repositoryRevision === input.expectedRepositoryRevision + 1 &&
    current.updatedAt === input.updatedAt && equalV1(current.snapshot, input.snapshot) &&
    currentProgram.revision === input.expectedBase.baseProgramRevision + 1 &&
    currentProposal.proposalId === input.expectedBase.proposalId &&
    input.expectedBase.programId === current.programId &&
    previousProgram?.revision === input.expectedBase.baseProgramRevision &&
    input.continuation.programId === current.programId &&
    input.continuation.workspaceId === current.snapshot.workspace?.workspaceId &&
    input.continuation.programRevision === input.expectedBase.baseProgramRevision &&
    input.continuation.repositoryRevision === input.expectedRepositoryRevision &&
    currentReviewBinding !== null &&
    currentReviewBinding.programRevision === currentProgram.revision &&
    currentReviewBinding.repositoryRevision === current.repositoryRevision &&
    currentReviewBinding.volumeId === input.continuation.volumeId &&
    currentReviewBinding.checkpointId === input.reviewedHead.checkpointId &&
    currentReviewBinding.generation === input.reviewedHead.generation
  ) return { kind: "unchanged", aggregate: current };
  if (
    current.programId !== input.programId ||
    current.repositoryRevision !== input.expectedRepositoryRevision ||
    input.expectedBase.programId !== current.programId ||
    input.expectedBase.proposalId !== currentProposal.proposalId ||
    input.expectedBase.baseProgramRevision !== currentProgram.revision ||
    currentProposal.programRevision !== currentProgram.revision ||
    !browserProgramContinuationMatchesAggregateV1(input.continuation, current)
  ) return { kind: "conflict", current };
  if (
    input.updatedAt < current.updatedAt || nextProgram === null || nextProposal === null ||
    input.snapshot.revision !== current.snapshot.revision + 1 ||
    !equalV1(input.snapshot.workspace, current.snapshot.workspace) ||
    !hasPrefixV1(input.snapshot.messages, current.snapshot.messages) ||
    input.snapshot.messages.length !== current.snapshot.messages.length + 2 ||
    !hasPrefixV1(input.snapshot.activity, current.snapshot.activity) ||
    input.snapshot.activity.length !== current.snapshot.activity.length + 2 ||
    nextProposal.proposalId !== currentProposal.proposalId ||
    nextProposal.status !== "pending" || !isLogicalSuccessorV1(currentProgram, nextProgram)
  ) throw new TypeError("sillyos.program_repository.apply.invalid_transition");
  const nextRepositoryRevision = current.repositoryRevision + 1;
  const aggregate = cloneProgramRepositoryAggregateV3({
    ...current,
    repositoryRevision: nextRepositoryRevision,
    updatedAt: input.updatedAt,
    snapshot: input.snapshot,
    programRevisions: [...current.programRevisions, nextProgram],
    reviewBinding: successorReviewBindingV3({
      current,
      continuation: input.continuation,
      program: nextProgram,
      proposal: nextProposal,
      repositoryRevision: nextRepositoryRevision,
      reviewedHead: input.reviewedHead,
    }),
  });
  return { kind: "committed", aggregate };
}

function agentRunReceiptMatchesTerminalV3(
  aggregate: ProgramRepositoryAggregateV3,
  receipt: ProgramAgentRunReceiptV3,
  terminal: CreatorAgentTerminalRunV1,
): boolean {
  const userMessage = aggregate.snapshot.messages.find((message) =>
    message.messageId === receipt.userMessageId
  );
  if (
    aggregate.programId !== terminal.run.programId ||
    receipt.agentRunId !== terminal.run.agentRunId ||
    receipt.proposalId !== terminal.run.proposalId ||
    receipt.baseProgramRevision !== terminal.run.baseProgramRevision ||
    receipt.baseRepositoryRevision !== terminal.run.baseRepositoryRevision ||
    receipt.outcome !== terminal.outcome || userMessage?.role !== "user" ||
    userMessage.text !== terminal.run.text
  ) return false;
  if (terminal.outcome === "completed") {
    const creatorMessage = aggregate.snapshot.messages.find((message) =>
      message.messageId === receipt.creatorMessageId
    );
    const resultingProgram = receipt.resultingProgramRevision === null
      ? undefined
      : aggregate.programRevisions[receipt.resultingProgramRevision - 1];
    return receipt.diagnosticCode === null &&
      receipt.resultingProgramRevision === terminal.run.baseProgramRevision + 1 &&
      creatorMessage?.role === "creator" &&
      creatorMessage.text === terminal.finalAssistantReply &&
      resultingProgram?.requirements.at(-1) === terminal.candidate.requirement;
  }
  if (receipt.creatorMessageId !== null || receipt.resultingProgramRevision !== null) return false;
  return terminal.outcome === "failed"
    ? receipt.diagnosticCode === terminal.diagnosticCode
    : receipt.diagnosticCode === null;
}

function snapshotIsDurablePrefixV3(
  current: ProgramRepositoryAggregateV3,
  snapshot: CreatorSessionSnapshotV1,
): boolean {
  const program = snapshot.program;
  return program !== null && equalV1(snapshot.workspace, current.snapshot.workspace) &&
    hasPrefixV1(current.snapshot.messages, snapshot.messages) &&
    hasPrefixV1(current.snapshot.activity, snapshot.activity) &&
    equalV1(current.programRevisions[program.revision - 1], program);
}

export function applyProgramRepositoryAgentRunTerminalV3(
  currentValue: ProgramRepositoryAggregateV3,
  inputValue: ProgramRepositorySettleAgentRunInputV3,
): ProgramRepositoryCommitResultV3 {
  const current = cloneProgramRepositoryAggregateV3(currentValue);
  const input = normalizeProgramRepositorySettleAgentRunInputV3(inputValue);
  const { terminal } = input;
  const { run } = terminal;
  const existingReceipt = current.agentRunReceipts.find((receipt) =>
    receipt.agentRunId === run.agentRunId
  );
  if (existingReceipt !== undefined) {
    const workspace = current.snapshot.workspace;
    const inputContinuation = input.continuation;
    const reviewBinding = current.reviewBinding;
    const acceptedVolumeMismatch = current.decisions.some((decision) =>
      decision.status === "accepted" &&
      (decision.snapshot.volumeId !== inputContinuation.volumeId ||
        decision.snapshot.workspaceFormat !== inputContinuation.workspaceFormat)
    );
    const acceptedHead = current.decisions.find((decision) =>
      decision.status === "accepted" &&
      decision.proposalId === existingReceipt.proposalId &&
      decision.programRevision === existingReceipt.resultingProgramRevision
    );
    const durableReviewedHead = reviewBinding !== null &&
        reviewBinding.proposalId === existingReceipt.proposalId &&
        reviewBinding.programRevision === existingReceipt.resultingProgramRevision
      ? reviewBinding
      : acceptedHead?.status === "accepted"
      ? acceptedHead.snapshot
      : null;
    const reviewedHeadMatchesReplay = terminal.outcome !== "completed" ||
      (input.reviewedHead !== null && durableReviewedHead !== null &&
        input.reviewedHead.checkpointId === durableReviewedHead.checkpointId &&
        input.reviewedHead.generation === durableReviewedHead.generation);
    const continuationMatchesReplay = workspace !== null &&
      current.repositoryRevision > input.expectedRepositoryRevision &&
      input.expectedRepositoryRevision === existingReceipt.baseRepositoryRevision &&
      inputContinuation.repositoryRevision === input.expectedRepositoryRevision &&
      inputContinuation.programId === run.programId &&
      inputContinuation.programRevision === run.baseProgramRevision &&
      inputContinuation.workspaceId === workspace.workspaceId &&
      !acceptedVolumeMismatch &&
      (reviewBinding === null ||
        (reviewBinding.volumeId === inputContinuation.volumeId &&
          reviewBinding.workspaceFormat === inputContinuation.workspaceFormat));
    return continuationMatchesReplay &&
        reviewedHeadMatchesReplay &&
        agentRunReceiptMatchesTerminalV3(current, existingReceipt, terminal) &&
        snapshotIsDurablePrefixV3(current, input.snapshot)
      ? { kind: "unchanged", aggregate: current }
      : { kind: "conflict", current };
  }

  const currentProgram = current.snapshot.program;
  const currentProposal = current.snapshot.proposal;
  const nextProgram = input.snapshot.program;
  const nextProposal = input.snapshot.proposal;
  if (currentProgram === null || currentProposal === null) {
    throw new TypeError("invalid current Program aggregate");
  }
  const currentReviewStateMatchesProposal = currentProposal.status === "pending"
    ? current.reviewBinding !== null
    : current.reviewBinding === null;
  if (
    current.programId !== input.programId || run.programId !== input.programId ||
    current.repositoryRevision !== input.expectedRepositoryRevision ||
    run.baseRepositoryRevision !== input.expectedRepositoryRevision ||
    run.proposalId !== currentProposal.proposalId ||
    run.baseProgramRevision !== currentProgram.revision ||
    currentProposal.programRevision !== currentProgram.revision ||
    !currentReviewStateMatchesProposal ||
    !browserProgramContinuationMatchesAggregateV1(input.continuation, current)
  ) return { kind: "conflict", current };

  const messages = input.snapshot.messages;
  const activity = input.snapshot.activity;
  const appendedUserMessage = messages[current.snapshot.messages.length];
  if (
    input.updatedAt < current.updatedAt ||
    input.snapshot.revision !== current.snapshot.revision + 1 ||
    !equalV1(input.snapshot.workspace, current.snapshot.workspace) ||
    !hasPrefixV1(messages, current.snapshot.messages) ||
    !hasPrefixV1(activity, current.snapshot.activity) ||
    appendedUserMessage?.role !== "user" || appendedUserMessage.text !== run.text
  ) throw new TypeError("sillyos.program_repository.settle_agent_run.invalid_transition");

  let creatorMessageId: string | null = null;
  let resultingProgramRevision: number | null = null;
  let diagnosticCode: CreatorAgentDiagnosticCodeV1 | null = null;
  let programRevisions = current.programRevisions;
  const nextRepositoryRevision = current.repositoryRevision + 1;
  let reviewBinding: ProgramRepositoryReviewBindingV3 | null;
  if (terminal.outcome === "completed") {
    const appendedCreatorMessage = messages[current.snapshot.messages.length + 1];
    const firstActivity = activity[current.snapshot.activity.length];
    const secondActivity = activity[current.snapshot.activity.length + 1];
    if (
      messages.length !== current.snapshot.messages.length + 2 ||
      activity.length !== current.snapshot.activity.length + 2 ||
      appendedCreatorMessage?.role !== "creator" ||
      appendedCreatorMessage.text !== terminal.finalAssistantReply ||
      firstActivity?.kind !== "follow_up_submitted" ||
      secondActivity?.kind !== "proposal_revised" || nextProgram === null ||
      nextProposal === null || nextProposal.proposalId !== currentProposal.proposalId ||
      nextProposal.status !== "pending" ||
      !isLogicalSuccessorV1(currentProgram, nextProgram) ||
      nextProgram.requirements.at(-1) !== terminal.candidate.requirement
    ) throw new TypeError("sillyos.program_repository.settle_agent_run.invalid_transition");
    creatorMessageId = appendedCreatorMessage.messageId;
    resultingProgramRevision = nextProgram.revision;
    programRevisions = [...current.programRevisions, nextProgram];
    if (input.reviewedHead === null) {
      throw new TypeError("sillyos.program_repository.settle_agent_run.invalid/reviewedHead");
    }
    reviewBinding = successorReviewBindingV3({
      current,
      continuation: input.continuation,
      program: nextProgram,
      proposal: nextProposal,
      repositoryRevision: nextRepositoryRevision,
      reviewedHead: input.reviewedHead,
    });
  } else {
    const expectedActivityKind = terminal.outcome === "failed"
      ? "agent_run_failed"
      : terminal.outcome === "cancelled"
      ? "agent_run_cancelled"
      : "agent_run_replaced";
    const appendedActivity = activity[current.snapshot.activity.length];
    if (
      messages.length !== current.snapshot.messages.length + 1 ||
      activity.length !== current.snapshot.activity.length + 1 ||
      appendedActivity?.kind !== expectedActivityKind ||
      !equalV1(nextProgram, currentProgram) || !equalV1(nextProposal, currentProposal)
    ) throw new TypeError("sillyos.program_repository.settle_agent_run.invalid_transition");
    diagnosticCode = terminal.outcome === "failed" ? terminal.diagnosticCode : null;
    reviewBinding = current.reviewBinding === null ? null : cloneProgramRepositoryReviewBindingV3({
      ...current.reviewBinding,
      repositoryRevision: nextRepositoryRevision,
    });
  }

  const receipt: ProgramAgentRunReceiptV3 = {
    agentRunId: run.agentRunId,
    sequence: current.agentRunReceipts.length + 1,
    proposalId: run.proposalId,
    userMessageId: appendedUserMessage.messageId,
    creatorMessageId,
    baseProgramRevision: run.baseProgramRevision,
    baseRepositoryRevision: run.baseRepositoryRevision,
    resultingProgramRevision,
    outcome: terminal.outcome,
    diagnosticCode,
  };
  const aggregate = cloneProgramRepositoryAggregateV3({
    ...current,
    repositoryRevision: nextRepositoryRevision,
    updatedAt: input.updatedAt,
    snapshot: input.snapshot,
    programRevisions,
    agentRunReceipts: [...current.agentRunReceipts, receipt],
    reviewBinding,
  });
  return { kind: "committed", aggregate };
}

export function applyProgramRepositoryDecisionV3(
  currentValue: ProgramRepositoryAggregateV3,
  inputValue: ProgramRepositoryDecideInputV3,
): ProgramRepositoryCommitResultV3 {
  const current = cloneProgramRepositoryAggregateV3(currentValue);
  const input = normalizeProgramRepositoryDecideInputV3(inputValue);
  const currentProposal = current.snapshot.proposal;
  const nextProposal = input.snapshot.proposal;
  if (currentProposal === null) throw new TypeError("invalid current Program aggregate");
  const existingDecision = current.decisions.find((decision) =>
    decision.proposalId === input.expectedProposal.proposalId &&
    decision.programRevision === input.expectedProposal.programRevision
  );
  const exactDecisionReplay = existingDecision?.status === input.status &&
    (input.status === "rejected" ||
      (existingDecision.status === "accepted" &&
        programWorkspaceSnapshotReceiptsEqualV1(
          existingDecision.snapshot,
          input.snapshotReceipt,
        )));
  if (
    current.programId === input.programId &&
    current.repositoryRevision === input.expectedRepositoryRevision + 1 &&
    current.updatedAt === input.updatedAt &&
    exactDecisionReplay &&
    existingDecision.repositoryRevision === current.repositoryRevision &&
    equalV1(current.snapshot, input.snapshot) &&
    input.continuation.programId === current.programId &&
    input.continuation.workspaceId === current.snapshot.workspace?.workspaceId &&
    input.continuation.programRevision === current.snapshot.program?.revision &&
    input.continuation.repositoryRevision === input.expectedRepositoryRevision
  ) return { kind: "unchanged", aggregate: current };
  if (
    current.programId !== input.programId ||
    current.repositoryRevision !== input.expectedRepositoryRevision ||
    currentProposal.proposalId !== input.expectedProposal.proposalId ||
    currentProposal.programRevision !== input.expectedProposal.programRevision ||
    currentProposal.status !== "pending" || current.reviewBinding === null ||
    !browserProgramContinuationMatchesAggregateV1(input.continuation, current)
  ) return { kind: "conflict", current };
  if (
    input.updatedAt < current.updatedAt || nextProposal === null ||
    input.snapshot.revision !== current.snapshot.revision + 1 ||
    !equalV1(input.snapshot.workspace, current.snapshot.workspace) ||
    !equalV1(input.snapshot.program, current.snapshot.program) ||
    !hasPrefixV1(input.snapshot.messages, current.snapshot.messages) ||
    input.snapshot.messages.length !== current.snapshot.messages.length + 1 ||
    !hasPrefixV1(input.snapshot.activity, current.snapshot.activity) ||
    input.snapshot.activity.length !== current.snapshot.activity.length + 1 ||
    nextProposal.proposalId !== currentProposal.proposalId ||
    nextProposal.programRevision !== currentProposal.programRevision ||
    nextProposal.status !== input.status
  ) throw new TypeError("sillyos.program_repository.decide.invalid_transition");
  if (input.status === "accepted") {
    const binding = current.reviewBinding;
    const receipt = input.snapshotReceipt;
    if (
      receipt.programId !== binding.programId ||
      receipt.workspaceId !== binding.workspaceId || receipt.volumeId !== binding.volumeId ||
      receipt.workspaceFormat !== binding.workspaceFormat ||
      receipt.proposalId !== binding.proposalId ||
      receipt.programRevision !== binding.programRevision ||
      receipt.baseRepositoryRevision !== current.repositoryRevision ||
      receipt.baseRepositoryRevision !== binding.repositoryRevision ||
      receipt.checkpointId !== binding.checkpointId ||
      receipt.generation !== binding.generation
    ) return { kind: "conflict", current };
  }
  const nextRepositoryRevision = current.repositoryRevision + 1;
  const decision: ProgramRepositoryDecisionV3 = input.status === "accepted"
    ? {
      proposalId: input.expectedProposal.proposalId,
      programRevision: input.expectedProposal.programRevision,
      status: "accepted",
      repositoryRevision: nextRepositoryRevision,
      snapshot: input.snapshotReceipt,
    }
    : {
      proposalId: input.expectedProposal.proposalId,
      programRevision: input.expectedProposal.programRevision,
      status: "rejected",
      repositoryRevision: nextRepositoryRevision,
    };
  const aggregate = cloneProgramRepositoryAggregateV3({
    ...current,
    repositoryRevision: nextRepositoryRevision,
    updatedAt: input.updatedAt,
    snapshot: input.snapshot,
    decisions: [...current.decisions, decision],
    reviewBinding: null,
  });
  return { kind: "committed", aggregate };
}

export function admitProgramRepositorySummaryV3(
  value: unknown,
): ProgramRepositoryAdmissionResultV3<ProgramRepositorySummaryV3> {
  const record = exactRecordV1(value, [
    "programId",
    "name",
    "kind",
    "programRevision",
    "proposalStatus",
    "updatedAt",
    "repositoryRevision",
  ]);
  if (record === null) return rejectV1("/");
  if (!identifierV1(record.programId)) return rejectV1("/programId");
  if (!boundedTextV1(record.name, 256, { trimmed: true })) return rejectV1("/name");
  if (
    record.kind !== "translation" && record.kind !== "writing" &&
    record.kind !== "roleplay" && record.kind !== "general"
  ) return rejectV1("/kind");
  if (!positiveSafeIntegerV1(record.programRevision)) return rejectV1("/programRevision");
  if (
    record.proposalStatus !== "pending" && record.proposalStatus !== "accepted" &&
    record.proposalStatus !== "rejected"
  ) return rejectV1("/proposalStatus");
  if (!nonNegativeSafeIntegerV1(record.updatedAt)) return rejectV1("/updatedAt");
  if (!positiveSafeIntegerV1(record.repositoryRevision)) {
    return rejectV1("/repositoryRevision");
  }
  return admittedV1({
    programId: record.programId,
    name: record.name,
    kind: record.kind,
    programRevision: record.programRevision,
    proposalStatus: record.proposalStatus,
    updatedAt: record.updatedAt,
    repositoryRevision: record.repositoryRevision,
  });
}

export function admitProgramRepositoryCommitResultV3(
  value: unknown,
): ProgramRepositoryAdmissionResultV3<ProgramRepositoryCommitResultV3> {
  const base = exactRecordV1(value, ["kind", "aggregate"]);
  if (base !== null && (base.kind === "committed" || base.kind === "unchanged")) {
    const aggregate = admitProgramRepositoryAggregateV3(base.aggregate);
    return aggregate.kind === "rejected"
      ? rejectV1(`/aggregate${aggregate.path}`)
      : admittedV1({ kind: base.kind, aggregate: aggregate.value });
  }
  const conflict = exactRecordV1(value, ["kind", "current"]);
  if (conflict === null || conflict.kind !== "conflict") return rejectV1("/");
  if (conflict.current === null) return admittedV1({ kind: "conflict", current: null });
  const current = admitProgramRepositoryAggregateV3(conflict.current);
  return current.kind === "rejected"
    ? rejectV1(`/current${current.path}`)
    : admittedV1({ kind: "conflict", current: current.value });
}

export function createProgramRepositoryFailureV3(
  code: ProgramRepositoryFailureCodeV3,
  operation: ProgramRepositoryOperationV3,
): ProgramRepositoryFailureV3 {
  const failure = new Error(`sillyos.program_repository.${code}`) as ProgramRepositoryFailureV3;
  failure.name = "ProgramRepositoryFailureV3";
  Object.defineProperties(failure, {
    code: { value: code, enumerable: true },
    operation: { value: operation, enumerable: true },
  });
  delete failure.stack;
  return failure;
}

export function isProgramRepositoryFailureV3(
  value: unknown,
): value is ProgramRepositoryFailureV3 {
  return value instanceof Error && value.name === "ProgramRepositoryFailureV3" &&
    typeof (value as Partial<ProgramRepositoryFailureV3>).code === "string";
}
