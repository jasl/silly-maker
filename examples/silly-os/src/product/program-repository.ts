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

export const programRepositorySchemaVersionV2 = 2 as const;
export const programRepositoryAggregateMaximumBytesV2 = 512 * 1024;
export const programRepositoryMaximumProgramsV2 = 64;
export const programRepositoryMaximumProgramRevisionsV2 = 32;
export const programRepositoryMaximumDecisionsV2 = 32;
export const programRepositoryMaximumMessagesV2 = 96;
export const programRepositoryMaximumActivitiesV2 = 96;
export const programRepositoryMaximumRequirementsV2 = 32;
export const programRepositoryMaximumCapabilitiesV2 = 32;
export const programRepositoryMaximumAgentRunReceiptsV2 = 32;

const identifierPatternV1 = /^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,127}$/u;

export type ProgramRepositoryOperationV2 =
  | "initialize"
  | "list"
  | "load"
  | "create"
  | "apply_revision"
  | "decide"
  | "settle_agent_run"
  | "dispose";

export type ProgramRepositoryFailureCodeV2 =
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

export interface ProgramRepositoryFailureV2 extends Error {
  readonly code: ProgramRepositoryFailureCodeV2;
  readonly operation: ProgramRepositoryOperationV2;
}

export interface ProgramRepositoryDecisionV2 {
  readonly proposalId: string;
  readonly programRevision: number;
  readonly status: "accepted" | "rejected";
  /** Repository revision at which this exact decision became durable. */
  readonly repositoryRevision: number;
}

export interface ProgramAgentRunReceiptV2 {
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

/** The only durable P2 unit: one bounded aggregate per Program. */
export interface ProgramRepositoryAggregateV2 {
  readonly schemaVersion: 2;
  readonly programId: string;
  readonly repositoryRevision: number;
  /** Caller-supplied Unix epoch milliseconds. The repository owns no clock. */
  readonly updatedAt: number;
  readonly snapshot: CreatorSessionSnapshotV1;
  readonly programRevisions: readonly PreviewProgramV1[];
  readonly decisions: readonly ProgramRepositoryDecisionV2[];
  readonly agentRunReceipts: readonly ProgramAgentRunReceiptV2[];
}

export interface ProgramRepositorySummaryV2 {
  readonly programId: string;
  readonly name: string;
  readonly kind: PreviewProgramKindV1;
  readonly programRevision: number;
  readonly proposalStatus: ProgramProposalStatusV1;
  readonly updatedAt: number;
  readonly repositoryRevision: number;
}

export interface ProgramRepositoryCreateInputV2 {
  readonly snapshot: CreatorSessionSnapshotV1;
  readonly updatedAt: number;
}

export interface ProgramRepositoryApplyRevisionInputV2 {
  readonly programId: string;
  readonly expectedRepositoryRevision: number;
  readonly expectedBase: CreatorProgramRevisionBaseV1;
  readonly snapshot: CreatorSessionSnapshotV1;
  readonly updatedAt: number;
}

export interface ProgramRepositoryDecideInputV2 {
  readonly programId: string;
  readonly expectedRepositoryRevision: number;
  readonly expectedProposal: ProgramProposalReferenceV1;
  readonly status: "accepted" | "rejected";
  readonly snapshot: CreatorSessionSnapshotV1;
  readonly updatedAt: number;
}

export interface ProgramRepositorySettleAgentRunInputV2 {
  readonly programId: string;
  readonly expectedRepositoryRevision: number;
  readonly terminal: CreatorAgentTerminalRunV1;
  readonly snapshot: CreatorSessionSnapshotV1;
  readonly updatedAt: number;
}

export type ProgramRepositoryCommitResultV2 =
  | { readonly kind: "committed"; readonly aggregate: ProgramRepositoryAggregateV2 }
  | { readonly kind: "unchanged"; readonly aggregate: ProgramRepositoryAggregateV2 }
  | {
    readonly kind: "conflict";
    readonly current: ProgramRepositoryAggregateV2 | null;
  };

export interface ProgramRepositoryV2 {
  initialize(): Promise<void>;
  list(): Promise<readonly ProgramRepositorySummaryV2[]>;
  load(programId: string): Promise<ProgramRepositoryAggregateV2 | null>;
  create(input: ProgramRepositoryCreateInputV2): Promise<ProgramRepositoryCommitResultV2>;
  applyRevision(
    input: ProgramRepositoryApplyRevisionInputV2,
  ): Promise<ProgramRepositoryCommitResultV2>;
  decide(input: ProgramRepositoryDecideInputV2): Promise<ProgramRepositoryCommitResultV2>;
  settleAgentRun(
    input: ProgramRepositorySettleAgentRunInputV2,
  ): Promise<ProgramRepositoryCommitResultV2>;
  dispose(): Promise<void>;
}

export type ProgramRepositoryAdmissionResultV2<TValue> =
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

function rejectV1<TValue>(path: string): ProgramRepositoryAdmissionResultV2<TValue> {
  return { kind: "rejected", path };
}

function admittedV1<TValue>(value: TValue): ProgramRepositoryAdmissionResultV2<TValue> {
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

function admitCapabilityV1(
  value: unknown,
  path: string,
): ProgramRepositoryAdmissionResultV2<PreviewProgramV1["suggestedCapabilities"][number]> {
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
): ProgramRepositoryAdmissionResultV2<PreviewProgramV1> {
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
  const rawRequirements = arrayV1(record.requirements, programRepositoryMaximumRequirementsV2);
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
    programRepositoryMaximumCapabilitiesV2,
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
): ProgramRepositoryAdmissionResultV2<CreatorSessionSnapshotV1> {
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

  const rawMessages = arrayV1(record.messages, programRepositoryMaximumMessagesV2);
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

  const rawActivity = arrayV1(record.activity, programRepositoryMaximumActivitiesV2);
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

export function admitProgramRepositoryAggregateV2(
  value: unknown,
): ProgramRepositoryAdmissionResultV2<ProgramRepositoryAggregateV2> {
  const record = exactRecordV1(value, [
    "schemaVersion",
    "programId",
    "repositoryRevision",
    "updatedAt",
    "snapshot",
    "programRevisions",
    "decisions",
    "agentRunReceipts",
  ]);
  if (record === null) return rejectV1("/");
  if (record.schemaVersion !== programRepositorySchemaVersionV2) {
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
    programRepositoryMaximumProgramRevisionsV2,
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

  const rawDecisions = arrayV1(record.decisions, programRepositoryMaximumDecisionsV2);
  if (rawDecisions === null) return rejectV1("/decisions");
  const decisions: ProgramRepositoryDecisionV2[] = [];
  for (let index = 0; index < rawDecisions.length; index += 1) {
    const decisionRecord = exactRecordV1(rawDecisions[index], [
      "proposalId",
      "programRevision",
      "status",
      "repositoryRevision",
    ]);
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
    if (decisionRecord.status !== "accepted" && decisionRecord.status !== "rejected") {
      return rejectV1(`${decisionPath}/status`);
    }
    if (
      !positiveSafeIntegerV1(decisionRecord.repositoryRevision) ||
      decisionRecord.repositoryRevision > record.repositoryRevision ||
      (decisions.at(-1)?.repositoryRevision ?? 0) >= decisionRecord.repositoryRevision
    ) return rejectV1(`${decisionPath}/repositoryRevision`);
    decisions.push({
      proposalId: decisionRecord.proposalId,
      programRevision: decisionRecord.programRevision,
      status: decisionRecord.status,
      repositoryRevision: decisionRecord.repositoryRevision,
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
    (currentProposal.status !== "pending" && currentDecision?.status !== currentProposal.status)
  ) return rejectV1("/snapshot/proposal/status");

  const rawReceipts = arrayV1(
    record.agentRunReceipts,
    programRepositoryMaximumAgentRunReceiptsV2,
  );
  if (rawReceipts === null) return rejectV1("/agentRunReceipts");
  const agentRunReceipts: ProgramAgentRunReceiptV2[] = [];
  const usedUserMessageIds = new Set<string>();
  const usedCreatorMessageIds = new Set<string>();
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
      receiptRecord.baseRepositoryRevision > record.repositoryRevision
    ) return rejectV1(`${receiptPath}/baseRepositoryRevision`);
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
        receiptRecord.resultingProgramRevision > currentProgram.revision
      ) return rejectV1(`${receiptPath}/resultingProgramRevision`);
      if (receiptRecord.diagnosticCode !== null) {
        return rejectV1(`${receiptPath}/diagnosticCode`);
      }
      creatorMessageId = receiptRecord.creatorMessageId;
      resultingProgramRevision = receiptRecord.resultingProgramRevision;
      usedCreatorMessageIds.add(creatorMessageId);
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

  const aggregate: ProgramRepositoryAggregateV2 = {
    schemaVersion: 2,
    programId: record.programId,
    repositoryRevision: record.repositoryRevision,
    updatedAt: record.updatedAt,
    snapshot: snapshot.value,
    programRevisions,
    decisions,
    agentRunReceipts,
  };
  if (utf8ByteLengthV1(JSON.stringify(aggregate)) > programRepositoryAggregateMaximumBytesV2) {
    return rejectV1("/");
  }
  return admittedV1(aggregate);
}

function requireAdmittedV1<TValue>(
  result: ProgramRepositoryAdmissionResultV2<TValue>,
  label: string,
): TValue {
  if (result.kind === "rejected") {
    throw new TypeError(`sillyos.program_repository.${label}.invalid${result.path}`);
  }
  return result.value;
}

export function cloneProgramRepositoryAggregateV2(
  aggregate: ProgramRepositoryAggregateV2,
): ProgramRepositoryAggregateV2 {
  return requireAdmittedV1(admitProgramRepositoryAggregateV2(aggregate), "aggregate");
}

export function findProgramAgentRunReceiptV2(
  aggregate: ProgramRepositoryAggregateV2,
  agentRunId: string,
): ProgramAgentRunReceiptV2 | null {
  const admitted = cloneProgramRepositoryAggregateV2(aggregate);
  if (!identifierV1(agentRunId)) return null;
  return admitted.agentRunReceipts.find((receipt) => receipt.agentRunId === agentRunId) ?? null;
}

export function programRepositoryAggregatesEqualV2(
  left: ProgramRepositoryAggregateV2,
  right: ProgramRepositoryAggregateV2,
): boolean {
  return equalV1(
    cloneProgramRepositoryAggregateV2(left),
    cloneProgramRepositoryAggregateV2(right),
  );
}

export function summarizeProgramRepositoryAggregateV2(
  aggregate: ProgramRepositoryAggregateV2,
): ProgramRepositorySummaryV2 {
  const admitted = cloneProgramRepositoryAggregateV2(aggregate);
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

export function sortProgramRepositorySummariesV2(
  summaries: readonly ProgramRepositorySummaryV2[],
): readonly ProgramRepositorySummaryV2[] {
  return summaries.toSorted((left, right) =>
    right.updatedAt - left.updatedAt || left.programId.localeCompare(right.programId, "en")
  );
}

export function normalizeProgramRepositoryProgramIdV2(value: unknown): string {
  if (!identifierV1(value)) throw new TypeError("sillyos.program_repository.program_id.invalid");
  return value;
}

export function normalizeProgramRepositoryCreateInputV2(
  value: unknown,
): ProgramRepositoryCreateInputV2 {
  const record = exactRecordV1(value, ["snapshot", "updatedAt"]);
  if (record === null) throw new TypeError("sillyos.program_repository.create.invalid/");
  const snapshot = requireAdmittedV1(admitSnapshotV1(record.snapshot, "/snapshot"), "create");
  if (!nonNegativeSafeIntegerV1(record.updatedAt)) {
    throw new TypeError("sillyos.program_repository.create.invalid/updatedAt");
  }
  return { snapshot, updatedAt: record.updatedAt };
}

export function normalizeProgramRepositoryApplyRevisionInputV2(
  value: unknown,
): ProgramRepositoryApplyRevisionInputV2 {
  const record = exactRecordV1(value, [
    "programId",
    "expectedRepositoryRevision",
    "expectedBase",
    "snapshot",
    "updatedAt",
  ]);
  if (record === null) throw new TypeError("sillyos.program_repository.apply.invalid/");
  const programId = normalizeProgramRepositoryProgramIdV2(record.programId);
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
    updatedAt: record.updatedAt,
  };
}

export function normalizeProgramRepositoryDecideInputV2(
  value: unknown,
): ProgramRepositoryDecideInputV2 {
  const record = exactRecordV1(value, [
    "programId",
    "expectedRepositoryRevision",
    "expectedProposal",
    "status",
    "snapshot",
    "updatedAt",
  ]);
  if (record === null) throw new TypeError("sillyos.program_repository.decide.invalid/");
  const programId = normalizeProgramRepositoryProgramIdV2(record.programId);
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
  if (record.status !== "accepted" && record.status !== "rejected") {
    throw new TypeError("sillyos.program_repository.decide.invalid/status");
  }
  const snapshot = requireAdmittedV1(admitSnapshotV1(record.snapshot, "/snapshot"), "decide");
  if (!nonNegativeSafeIntegerV1(record.updatedAt)) {
    throw new TypeError("sillyos.program_repository.decide.invalid/updatedAt");
  }
  return {
    programId,
    expectedRepositoryRevision: record.expectedRepositoryRevision,
    expectedProposal: {
      proposalId: proposal.proposalId,
      programRevision: proposal.programRevision,
    },
    status: record.status,
    snapshot,
    updatedAt: record.updatedAt,
  };
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

export function normalizeProgramRepositorySettleAgentRunInputV2(
  value: unknown,
): ProgramRepositorySettleAgentRunInputV2 {
  const record = exactRecordV1(value, [
    "programId",
    "expectedRepositoryRevision",
    "terminal",
    "snapshot",
    "updatedAt",
  ]);
  if (record === null) {
    throw new TypeError("sillyos.program_repository.settle_agent_run.invalid/");
  }
  const programId = normalizeProgramRepositoryProgramIdV2(record.programId);
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
  if (!nonNegativeSafeIntegerV1(record.updatedAt)) {
    throw new TypeError("sillyos.program_repository.settle_agent_run.invalid/updatedAt");
  }
  return {
    programId,
    expectedRepositoryRevision: record.expectedRepositoryRevision,
    terminal,
    snapshot,
    updatedAt: record.updatedAt,
  };
}

export function buildProgramRepositoryCreateV2(
  input: ProgramRepositoryCreateInputV2,
): ProgramRepositoryAggregateV2 {
  const normalized = normalizeProgramRepositoryCreateInputV2(input);
  const program = normalized.snapshot.program;
  if (program === null || program.revision !== 1) {
    throw new TypeError("sillyos.program_repository.create.invalid/snapshot/program/revision");
  }
  return cloneProgramRepositoryAggregateV2({
    schemaVersion: 2,
    programId: program.programId,
    repositoryRevision: 1,
    updatedAt: normalized.updatedAt,
    snapshot: normalized.snapshot,
    programRevisions: [program],
    decisions: [],
    agentRunReceipts: [],
  });
}

function hasPrefixV1<TValue>(
  next: readonly TValue[],
  previous: readonly TValue[],
): boolean {
  return next.length >= previous.length && equalV1(next.slice(0, previous.length), previous);
}

export function applyProgramRepositoryRevisionV2(
  currentValue: ProgramRepositoryAggregateV2,
  inputValue: ProgramRepositoryApplyRevisionInputV2,
): ProgramRepositoryCommitResultV2 {
  const current = cloneProgramRepositoryAggregateV2(currentValue);
  const input = normalizeProgramRepositoryApplyRevisionInputV2(inputValue);
  const currentProgram = current.snapshot.program;
  const currentProposal = current.snapshot.proposal;
  const nextProgram = input.snapshot.program;
  const nextProposal = input.snapshot.proposal;
  if (currentProgram === null || currentProposal === null) {
    throw new TypeError("invalid current Program aggregate");
  }
  const previousProgram = current.programRevisions.at(-2);
  if (
    current.programId === input.programId &&
    current.repositoryRevision === input.expectedRepositoryRevision + 1 &&
    current.updatedAt === input.updatedAt && equalV1(current.snapshot, input.snapshot) &&
    currentProgram.revision === input.expectedBase.baseProgramRevision + 1 &&
    currentProposal.proposalId === input.expectedBase.proposalId &&
    input.expectedBase.programId === current.programId &&
    previousProgram?.revision === input.expectedBase.baseProgramRevision
  ) return { kind: "unchanged", aggregate: current };
  if (
    current.programId !== input.programId ||
    current.repositoryRevision !== input.expectedRepositoryRevision ||
    input.expectedBase.programId !== current.programId ||
    input.expectedBase.proposalId !== currentProposal.proposalId ||
    input.expectedBase.baseProgramRevision !== currentProgram.revision ||
    currentProposal.programRevision !== currentProgram.revision
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
  const aggregate = cloneProgramRepositoryAggregateV2({
    ...current,
    repositoryRevision: current.repositoryRevision + 1,
    updatedAt: input.updatedAt,
    snapshot: input.snapshot,
    programRevisions: [...current.programRevisions, nextProgram],
  });
  return { kind: "committed", aggregate };
}

function agentRunReceiptMatchesTerminalV2(
  aggregate: ProgramRepositoryAggregateV2,
  receipt: ProgramAgentRunReceiptV2,
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

function snapshotIsDurablePrefixV2(
  current: ProgramRepositoryAggregateV2,
  snapshot: CreatorSessionSnapshotV1,
): boolean {
  const program = snapshot.program;
  return program !== null && equalV1(snapshot.workspace, current.snapshot.workspace) &&
    hasPrefixV1(current.snapshot.messages, snapshot.messages) &&
    hasPrefixV1(current.snapshot.activity, snapshot.activity) &&
    equalV1(current.programRevisions[program.revision - 1], program);
}

export function applyProgramRepositoryAgentRunTerminalV2(
  currentValue: ProgramRepositoryAggregateV2,
  inputValue: ProgramRepositorySettleAgentRunInputV2,
): ProgramRepositoryCommitResultV2 {
  const current = cloneProgramRepositoryAggregateV2(currentValue);
  const input = normalizeProgramRepositorySettleAgentRunInputV2(inputValue);
  const { terminal } = input;
  const { run } = terminal;
  const existingReceipt = current.agentRunReceipts.find((receipt) =>
    receipt.agentRunId === run.agentRunId
  );
  if (existingReceipt !== undefined) {
    return agentRunReceiptMatchesTerminalV2(current, existingReceipt, terminal) &&
        snapshotIsDurablePrefixV2(current, input.snapshot)
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
  if (
    current.programId !== input.programId || run.programId !== input.programId ||
    current.repositoryRevision !== input.expectedRepositoryRevision ||
    run.baseRepositoryRevision > input.expectedRepositoryRevision ||
    run.proposalId !== currentProposal.proposalId ||
    run.baseProgramRevision !== currentProgram.revision ||
    currentProposal.programRevision !== currentProgram.revision
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
  }

  const receipt: ProgramAgentRunReceiptV2 = {
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
  const aggregate = cloneProgramRepositoryAggregateV2({
    ...current,
    repositoryRevision: current.repositoryRevision + 1,
    updatedAt: input.updatedAt,
    snapshot: input.snapshot,
    programRevisions,
    agentRunReceipts: [...current.agentRunReceipts, receipt],
  });
  return { kind: "committed", aggregate };
}

export function applyProgramRepositoryDecisionV2(
  currentValue: ProgramRepositoryAggregateV2,
  inputValue: ProgramRepositoryDecideInputV2,
): ProgramRepositoryCommitResultV2 {
  const current = cloneProgramRepositoryAggregateV2(currentValue);
  const input = normalizeProgramRepositoryDecideInputV2(inputValue);
  const currentProposal = current.snapshot.proposal;
  const nextProposal = input.snapshot.proposal;
  if (currentProposal === null) throw new TypeError("invalid current Program aggregate");
  const existingDecision = current.decisions.find((decision) =>
    decision.proposalId === input.expectedProposal.proposalId &&
    decision.programRevision === input.expectedProposal.programRevision
  );
  if (
    current.programId === input.programId &&
    current.repositoryRevision === input.expectedRepositoryRevision + 1 &&
    current.updatedAt === input.updatedAt &&
    existingDecision?.status === input.status &&
    existingDecision.repositoryRevision === current.repositoryRevision &&
    equalV1(current.snapshot, input.snapshot)
  ) return { kind: "unchanged", aggregate: current };
  if (
    current.programId !== input.programId ||
    current.repositoryRevision !== input.expectedRepositoryRevision ||
    currentProposal.proposalId !== input.expectedProposal.proposalId ||
    currentProposal.programRevision !== input.expectedProposal.programRevision ||
    currentProposal.status !== "pending"
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
  const nextRepositoryRevision = current.repositoryRevision + 1;
  const aggregate = cloneProgramRepositoryAggregateV2({
    ...current,
    repositoryRevision: nextRepositoryRevision,
    updatedAt: input.updatedAt,
    snapshot: input.snapshot,
    decisions: [
      ...current.decisions,
      {
        proposalId: input.expectedProposal.proposalId,
        programRevision: input.expectedProposal.programRevision,
        status: input.status,
        repositoryRevision: nextRepositoryRevision,
      },
    ],
  });
  return { kind: "committed", aggregate };
}

export function admitProgramRepositorySummaryV2(
  value: unknown,
): ProgramRepositoryAdmissionResultV2<ProgramRepositorySummaryV2> {
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

export function admitProgramRepositoryCommitResultV2(
  value: unknown,
): ProgramRepositoryAdmissionResultV2<ProgramRepositoryCommitResultV2> {
  const base = exactRecordV1(value, ["kind", "aggregate"]);
  if (base !== null && (base.kind === "committed" || base.kind === "unchanged")) {
    const aggregate = admitProgramRepositoryAggregateV2(base.aggregate);
    return aggregate.kind === "rejected"
      ? rejectV1(`/aggregate${aggregate.path}`)
      : admittedV1({ kind: base.kind, aggregate: aggregate.value });
  }
  const conflict = exactRecordV1(value, ["kind", "current"]);
  if (conflict === null || conflict.kind !== "conflict") return rejectV1("/");
  if (conflict.current === null) return admittedV1({ kind: "conflict", current: null });
  const current = admitProgramRepositoryAggregateV2(conflict.current);
  return current.kind === "rejected"
    ? rejectV1(`/current${current.path}`)
    : admittedV1({ kind: "conflict", current: current.value });
}

export function createProgramRepositoryFailureV2(
  code: ProgramRepositoryFailureCodeV2,
  operation: ProgramRepositoryOperationV2,
): ProgramRepositoryFailureV2 {
  const failure = new Error(`sillyos.program_repository.${code}`) as ProgramRepositoryFailureV2;
  failure.name = "ProgramRepositoryFailureV2";
  Object.defineProperties(failure, {
    code: { value: code, enumerable: true },
    operation: { value: operation, enumerable: true },
  });
  delete failure.stack;
  return failure;
}

export function isProgramRepositoryFailureV2(
  value: unknown,
): value is ProgramRepositoryFailureV2 {
  return value instanceof Error && value.name === "ProgramRepositoryFailureV2" &&
    typeof (value as Partial<ProgramRepositoryFailureV2>).code === "string";
}
