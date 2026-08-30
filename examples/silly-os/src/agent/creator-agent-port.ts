// SPDX-License-Identifier: MIT

import {
  createAgentSessionClientV1,
  type AgentSessionCallFailureV1,
  type AgentSessionDiagnosticV1,
  type AgentSessionStreamEventV1,
} from "@sillymaker/agent/session";

import {
  admitCreatorAgentSubmitV1,
  admitCreatorProgramRevisionCandidateV1,
  serializeCreatorAgentSubmitV1,
} from "../product/creator-agent-admission.ts";
import {
  creatorAgentFinalReplyMaximumCharactersV1,
  type CreatorAgentDiagnosticCodeV1,
  type CreatorAgentRunRequestV1,
  type CreatorAgentSubmitV1,
  type CreatorAgentTerminalRunV1,
  type CreatorProgramRevisionCandidateV1,
} from "../product/contracts.ts";
import {
  type BrowserProgramWorkspaceExportProgressV1,
  type BrowserProgramWorkspaceExportReadyV1,
  type BrowserProgramWorkspaceAuthorityV1,
} from "../product/browser-program-workspace-authority.ts";
import {
  admitProgramNetworkAccessV1,
  type ProgramNetworkAccessV1,
} from "../product/program-network-access.ts";
import {
  browserPiDistributionIdentityV1,
  type BrowserPiDistributionIdentityV1,
} from "./browser-pi-distribution.ts";
import type {
  WorkspaceExecutionDescriptorV1,
  WorkspaceMutationReceiptV1,
} from "../workspace/contracts.ts";
import {
  createBrowserPiWorkerConnectorV1,
  type BrowserPiCredentialHandoffV1,
  type BrowserPiOpenNetworkBrokerV1,
  type BrowserPiWorkerFactoryV1,
  type BrowserPiWorkerConnectorV1,
} from "./browser-pi-transport.ts";
import type { CredentialVaultBindingV2 } from "../credential/credential-vault-contracts.ts";
import type {
  BrowserPiModelSelectionV1,
  BrowserPiReasoningEffortV1,
  BrowserPiWorkspaceMutationReceiptWireV1,
  BrowserPiWorkspaceSnapshotWireV1,
} from "./browser-pi-worker-protocol.ts";

export type CreatorAgentPhaseV1 =
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

export interface CreatorAgentDiagnosticV1 {
  readonly code: CreatorAgentDiagnosticCodeV1;
  readonly path: string;
}

export type CreatorAgentWorkspacePhaseV1 =
  | "closed"
  | "opening"
  | "open"
  | "closing"
  | "failed"
  | "forgotten"
  | "disposed";

export type CreatorAgentWorkspaceDiagnosticCodeV1 =
  | "request_failed"
  | "protocol_invalid"
  | "workspace_busy"
  | "storage_unavailable"
  | "volume_missing"
  | "volume_corrupt"
  | "capacity_exceeded"
  | "recovery_required"
  | "disposed";

export interface CreatorAgentWorkspaceDiagnosticV1 {
  readonly code: CreatorAgentWorkspaceDiagnosticCodeV1;
  readonly path: string;
}

export interface CreatorAgentWorkspaceSnapshotV1 {
  readonly phase: CreatorAgentWorkspacePhaseV1;
  readonly descriptor: WorkspaceExecutionDescriptorV1 | null;
  readonly receipts: readonly WorkspaceMutationReceiptV1[];
  readonly lastReceipt: WorkspaceMutationReceiptV1 | null;
  readonly diagnostic: CreatorAgentWorkspaceDiagnosticV1 | null;
}

export interface CreatorAgentSnapshotV1 {
  readonly revision: number;
  readonly phase: CreatorAgentPhaseV1;
  readonly distribution: BrowserPiDistributionIdentityV1;
  /** Product-owned identity. Pi session and run identities remain private to this port. */
  readonly activeRunId: string | null;
  readonly draft: string;
  readonly candidate: CreatorProgramRevisionCandidateV1 | null;
  /** Unacknowledged terminal product projections, in arrival order. */
  readonly terminalRuns: readonly CreatorAgentTerminalRunV1[];
  readonly diagnostic: CreatorAgentDiagnosticV1 | null;
  /** Session-local execution projection; durable bytes remain owned by the Workspace Host. */
  readonly workspace: CreatorAgentWorkspaceSnapshotV1;
}

export type CreatorAgentConfigureCredentialResultV1 =
  | {
    readonly kind: "configured";
    readonly effectiveReasoningEffort: BrowserPiReasoningEffortV1;
  }
  | { readonly kind: "unavailable"; readonly diagnostic: CreatorAgentDiagnosticV1 };

export type CreatorAgentTestConnectionResultV1 =
  | { readonly kind: "ready" }
  | { readonly kind: "unavailable"; readonly diagnostic: CreatorAgentDiagnosticV1 };

export type CreatorAgentSelectModelResultV1 =
  | {
    readonly kind: "selected";
    readonly selection: BrowserPiModelSelectionV1;
    readonly effectiveReasoningEffort: BrowserPiReasoningEffortV1;
  }
  | { readonly kind: "unavailable"; readonly diagnostic: CreatorAgentDiagnosticV1 };

export type CreatorAgentSelectReasoningEffortResultV1 =
  | {
    readonly kind: "selected";
    readonly preferredReasoningEffort: BrowserPiReasoningEffortV1;
    readonly effectiveReasoningEffort: BrowserPiReasoningEffortV1;
  }
  | { readonly kind: "unavailable"; readonly diagnostic: CreatorAgentDiagnosticV1 };

export type CreatorAgentPortSubmitResultV1 =
  | { readonly kind: "submitted"; readonly agentRunId: string }
  | { readonly kind: "unavailable"; readonly diagnostic: CreatorAgentDiagnosticV1 };

export type CreatorAgentPortCancelResultV1 =
  | { readonly kind: "cancel_requested" }
  | { readonly kind: "idle" }
  | { readonly kind: "unavailable"; readonly diagnostic: CreatorAgentDiagnosticV1 };

export type CreatorAgentSynchronizeNetworkAccessResultV1 =
  | { readonly kind: "synchronized" }
  | { readonly kind: "unavailable"; readonly diagnostic: CreatorAgentDiagnosticV1 };

export type CreatorAgentOpenWorkspaceResultV1 =
  | { readonly kind: "opened"; readonly descriptor: WorkspaceExecutionDescriptorV1 }
  | { readonly kind: "unavailable"; readonly diagnostic: CreatorAgentWorkspaceDiagnosticV1 };

export type CreatorAgentCloseWorkspaceResultV1 =
  | { readonly kind: "closed"; readonly descriptor: WorkspaceExecutionDescriptorV1 }
  | { readonly kind: "idle" }
  | { readonly kind: "unavailable"; readonly diagnostic: CreatorAgentWorkspaceDiagnosticV1 };

type CreatorAgentAcknowledgeWorkspaceReceiptsResultV1 =
  | { readonly kind: "acknowledged"; readonly throughSequence: number }
  | { readonly kind: "unavailable"; readonly diagnostic: CreatorAgentWorkspaceDiagnosticV1 };

export type CreatorAgentAcknowledgeTerminalResultV1 =
  | { readonly kind: "acknowledged" }
  | { readonly kind: "idle" }
  | {
    readonly kind: "workspace_unavailable";
    readonly diagnostic: CreatorAgentWorkspaceDiagnosticV1;
  };

export type CreatorAgentExportWorkspaceResultV1 =
  | ({
    readonly kind: "released";
    readonly checkpointId: string;
    readonly generation: number;
  } & BrowserProgramWorkspaceExportProgressV1)
  | ({ readonly kind: "cancelled" } & BrowserProgramWorkspaceExportProgressV1)
  | { readonly kind: "unavailable"; readonly diagnostic: CreatorAgentWorkspaceDiagnosticV1 };

export interface CreatorAgentPortV1 {
  getSnapshot(): CreatorAgentSnapshotV1;
  subscribe(listener: () => void): () => void;
  configureCredential(apiKey: string): Promise<CreatorAgentConfigureCredentialResultV1>;
  configureCredentialHandoff(input: {
    readonly binding: CredentialVaultBindingV2;
    readonly handoff: BrowserPiCredentialHandoffV1;
  }): Promise<CreatorAgentConfigureCredentialResultV1>;
  testConnection(
    selection?: BrowserPiModelSelectionV1 | null,
  ): Promise<CreatorAgentTestConnectionResultV1>;
  selectModel(selection: BrowserPiModelSelectionV1): Promise<CreatorAgentSelectModelResultV1>;
  selectReasoningEffort(
    preferredReasoningEffort: BrowserPiReasoningEffortV1,
  ): Promise<CreatorAgentSelectReasoningEffortResultV1>;
  openWorkspace(input: {
    readonly programId: string;
    readonly workspaceId: string;
  }): Promise<CreatorAgentOpenWorkspaceResultV1>;
  closeWorkspace(workspaceSessionId?: string): Promise<CreatorAgentCloseWorkspaceResultV1>;
  exportWorkspace(input: {
    readonly workspaceSessionId: string;
    readonly fileName: string;
    readonly signal: AbortSignal;
    readonly onProgress?: (progress: BrowserProgramWorkspaceExportProgressV1) => void;
    readonly onReady: (
      ready: BrowserProgramWorkspaceExportReadyV1,
      startDownload: () => Promise<void>,
    ) => "release" | "cancel" | Promise<"release" | "cancel">;
  }): Promise<CreatorAgentExportWorkspaceResultV1>;
  submit(input: CreatorAgentRunRequestV1): Promise<CreatorAgentPortSubmitResultV1>;
  cancel(agentRunId?: string): Promise<CreatorAgentPortCancelResultV1>;
  synchronizeNetworkAccess(
    access: ProgramNetworkAccessV1,
  ): Promise<CreatorAgentSynchronizeNetworkAccessResultV1>;
  acknowledgeTerminal(agentRunId: string): Promise<CreatorAgentAcknowledgeTerminalResultV1>;
  /** Fail-closed credential revocation; cleanup continues through forget(). */
  revokeCredential(): void;
  /** Explicitly terminates the Worker that owns the in-memory credential. */
  forget(): Promise<void>;
  dispose(): Promise<void>;
}

interface TrackedCreatorAgentRunV1 {
  readonly run: CreatorAgentRunRequestV1;
  readonly sessionId: string;
  readonly ordinal: number;
  piRunId: string | null;
  draft: string;
  candidate: CreatorProgramRevisionCandidateV1 | null;
}

interface NormalizedCreatorAgentRunV1 {
  readonly run: CreatorAgentRunRequestV1;
  readonly submit: CreatorAgentSubmitV1;
}

interface FailedTerminalProjectionV1 {
  readonly terminalRun: Extract<CreatorAgentTerminalRunV1, { readonly outcome: "failed" }>;
  readonly diagnostic: CreatorAgentDiagnosticV1;
}

export const creatorAgentTerminalRunMaximumV1 = 32;
const creatorAgentPendingStreamEventMaximumV1 = 2_048;
const creatorAgentPendingWorkspaceReceiptMaximumV1 = 64;

const identifierPatternV1 = /^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,127}$/u;

function diagnosticV1(code: CreatorAgentDiagnosticCodeV1, path: string): CreatorAgentDiagnosticV1 {
  return Object.freeze({ code, path });
}

function workspaceDiagnosticV1(
  code: CreatorAgentWorkspaceDiagnosticCodeV1,
  path: string,
): CreatorAgentWorkspaceDiagnosticV1 {
  return Object.freeze({ code, path });
}

function mapEngineDiagnosticV1(
  value: AgentSessionDiagnosticV1,
): CreatorAgentDiagnosticV1 {
  switch (value.code) {
    case "agent_session.unconfigured":
      return diagnosticV1("unconfigured", value.path);
    case "agent_session.offline":
    case "agent_session.connection_failed":
      return diagnosticV1("connection_failed", value.path);
    case "agent_session.operation_failed":
      return diagnosticV1("request_failed", value.path);
    default:
      return diagnosticV1("protocol_invalid", value.path);
  }
}

function mapCallFailureV1(value: AgentSessionCallFailureV1): CreatorAgentDiagnosticV1 {
  return value.kind === "unavailable"
    ? mapEngineDiagnosticV1(value.diagnostic)
    : diagnosticV1(value.kind === "disposed" ? "disposed" : "request_failed", "/request");
}

function isFatalBrowserConnectorStreamDiagnosticV1(
  value: AgentSessionDiagnosticV1,
): boolean {
  switch (value.code) {
    case "agent_session.record_invalid":
    case "agent_session.record_too_large":
    case "agent_session.sequence_gap":
      return true;
    case "agent_session.unconfigured":
    case "agent_session.offline":
    case "agent_session.connection_failed":
    case "agent_session.operation_failed":
    case "agent_session.sequence_duplicate":
    case "agent_session.unknown_run":
      return false;
  }
  return false;
}

function exactRecordV1(
  value: unknown,
  keys: readonly string[],
): Readonly<Record<string, unknown>> | null {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return null;
  try {
    if (Object.getPrototypeOf(value) !== Object.prototype) return null;
    if (Object.getOwnPropertySymbols(value).length !== 0) return null;
    const descriptors = Object.getOwnPropertyDescriptors(value);
    if (
      Object.keys(descriptors).length !== keys.length ||
      !keys.every((key) => Object.hasOwn(descriptors, key))
    ) return null;
    const entries: [string, unknown][] = [];
    for (const key of keys) {
      const descriptor = descriptors[key];
      if (
        descriptor === undefined || !descriptor.enumerable ||
        !Object.hasOwn(descriptor, "value")
      ) return null;
      entries.push([key, descriptor.value]);
    }
    return Object.fromEntries(entries);
  } catch {
    return null;
  }
}

function normalizeCreatorAgentRunV1(value: unknown): NormalizedCreatorAgentRunV1 | null {
  const record = exactRecordV1(value, [
    "agentRunId",
    "processId",
    "processAttemptGeneration",
    "workspaceCheckpointId",
    "workspaceGeneration",
    "proposalId",
    "programId",
    "baseProgramRevision",
    "baseRepositoryRevision",
    "text",
  ]);
  if (
    record === null || typeof record.agentRunId !== "string" ||
    !identifierPatternV1.test(record.agentRunId) ||
    typeof record.processId !== "string" || !identifierPatternV1.test(record.processId) ||
    typeof record.processAttemptGeneration !== "number" ||
    !Number.isSafeInteger(record.processAttemptGeneration) ||
    record.processAttemptGeneration <= 0 ||
    typeof record.workspaceCheckpointId !== "string" ||
    !identifierPatternV1.test(record.workspaceCheckpointId) ||
    typeof record.workspaceGeneration !== "number" ||
    !Number.isSafeInteger(record.workspaceGeneration) || record.workspaceGeneration <= 0 ||
    typeof record.baseRepositoryRevision !== "number" ||
    !Number.isSafeInteger(record.baseRepositoryRevision) || record.baseRepositoryRevision <= 0
  ) return null;
  const admitted = admitCreatorAgentSubmitV1({
    revision: 1,
    proposalId: record.proposalId,
    programId: record.programId,
    baseProgramRevision: record.baseProgramRevision,
    text: record.text,
  });
  if (admitted.kind === "rejected") return null;
  const run = Object.freeze({
    agentRunId: record.agentRunId,
    processId: record.processId,
    processAttemptGeneration: record.processAttemptGeneration,
    workspaceCheckpointId: record.workspaceCheckpointId,
    workspaceGeneration: record.workspaceGeneration,
    proposalId: admitted.value.proposalId,
    programId: admitted.value.programId,
    baseProgramRevision: admitted.value.baseProgramRevision,
    baseRepositoryRevision: record.baseRepositoryRevision,
    text: admitted.value.text,
  });
  return { run, submit: Object.freeze(admitted.value) };
}

function piRunKeyV1(sessionId: string, piRunId: string): string {
  return `${sessionId}\u0000${piRunId}`;
}

function workspaceDescriptorV1(
  value: BrowserPiWorkspaceSnapshotWireV1,
): WorkspaceExecutionDescriptorV1 {
  return Object.freeze({
    revision: 1,
    programId: value.programId,
    workspaceId: value.workspaceId,
    workspaceSessionId: value.workspaceSessionId,
    generation: value.generation,
  });
}

function mapWorkspaceFailureV1(value: unknown, path: string): CreatorAgentWorkspaceDiagnosticV1 {
  const code = value !== null && typeof value === "object" ? Reflect.get(value, "code") : null;
  const message = value instanceof Error ? value.message : "";
  if (code === "workspace_busy" || code === "volume_busy") {
    return workspaceDiagnosticV1("workspace_busy", path);
  }
  if (code === "environment_attached") {
    return workspaceDiagnosticV1("workspace_busy", path);
  }
  if (
    code === "storage_unavailable" || code === "volume_missing" ||
    code === "volume_corrupt" || code === "capacity_exceeded" || code === "disposed"
  ) return workspaceDiagnosticV1(code, path);
  if (code === "workspace_mismatch") {
    return workspaceDiagnosticV1("volume_corrupt", path);
  }
  if (
    code === "invalid_request" || code === "invalid_response" || message.includes("protocol") ||
    message.includes("_mismatch") ||
    message.includes("receipt_sequence_invalid")
  ) {
    return workspaceDiagnosticV1("protocol_invalid", path);
  }
  if (
    code === "outcome_unknown" || code === "unavailable" ||
    code === "workspace_host_unavailable" || code === "candidate_mismatch"
  ) return workspaceDiagnosticV1("recovery_required", path);
  return workspaceDiagnosticV1("request_failed", path);
}

function mapAgentFailureToWorkspaceV1(
  value: CreatorAgentDiagnosticV1,
): CreatorAgentWorkspaceDiagnosticV1 {
  if (value.code === "disposed") return workspaceDiagnosticV1("disposed", value.path);
  if (value.code === "protocol_invalid") {
    return workspaceDiagnosticV1("protocol_invalid", value.path);
  }
  return workspaceDiagnosticV1("request_failed", value.path);
}

function matchesRunV1(
  candidate: CreatorProgramRevisionCandidateV1,
  run: CreatorAgentRunRequestV1,
): boolean {
  return candidate.revision === 1 && candidate.proposalId === run.proposalId &&
    candidate.programId === run.programId &&
    candidate.baseProgramRevision === run.baseProgramRevision && candidate.text === run.text;
}

function mapRemoteFailureV1(
  run: CreatorAgentRunRequestV1,
  value: AgentSessionDiagnosticV1,
): CreatorAgentTerminalRunV1 | FailedTerminalProjectionV1 {
  const remoteCode = value.path.startsWith("/remote/") ? value.path.slice("/remote/".length) : "";
  if (remoteCode === "cancelled" || remoteCode === "replaced") {
    return Object.freeze({ run, outcome: remoteCode });
  }
  let diagnosticCode: CreatorAgentDiagnosticCodeV1;
  switch (remoteCode) {
    case "draft_limit":
      diagnosticCode = "draft_too_large";
      break;
    case "candidate_invalid":
    case "candidate_context_mismatch":
    case "candidate_duplicate":
      diagnosticCode = "candidate_invalid";
      break;
    case "candidate_missing":
      diagnosticCode = "protocol_invalid";
      break;
    default:
      diagnosticCode = "run_failed";
      break;
  }
  return {
    terminalRun: Object.freeze({ run, outcome: "failed", diagnosticCode }),
    diagnostic: diagnosticV1(diagnosticCode, value.path),
  };
}

function isFailedProjectionV1(
  value: CreatorAgentTerminalRunV1 | FailedTerminalProjectionV1,
): value is FailedTerminalProjectionV1 {
  return Object.hasOwn(value, "terminalRun");
}

export function createBrowserCreatorAgentPortV1(
  input:
    & {
      readonly onConnectionLost?: () => void;
      readonly workerFactory?: BrowserPiWorkerFactoryV1;
      readonly createCredentialHandoffId?: () => string;
      readonly workspaceAuthority: BrowserProgramWorkspaceAuthorityV1;
      readonly openNetworkBroker: BrowserPiOpenNetworkBrokerV1;
      readonly preferredReasoningEffort?: BrowserPiReasoningEffortV1;
    }
    & (
      | { readonly runtime: "deterministic_test"; readonly selection?: null }
      | { readonly runtime: "pi_provider"; readonly selection: BrowserPiModelSelectionV1 }
    ),
): CreatorAgentPortV1 {
  const { onConnectionLost: notifyConnectionLost, workspaceAuthority, ...connectorInput } = input;
  let providerCredentialConfigured = false;
  let configuredEffectiveReasoningEffort: BrowserPiReasoningEffortV1 | null = null;
  let credentialRevoked = false;
  const connector = createBrowserPiWorkerConnectorV1({
    ...connectorInput,
    workspaceAuthority,
  });
  const client = createAgentSessionClientV1({ connector });
  const listeners = new Set<() => void>();
  const trackedByProductRunId = new Map<string, TrackedCreatorAgentRunV1>();
  const trackedByPiRun = new Map<string, TrackedCreatorAgentRunV1>();
  const pendingStreamEvents = new Map<string, AgentSessionStreamEventV1[]>();
  const pendingWorkspaceReceipts = new Map<
    string,
    BrowserPiWorkspaceMutationReceiptWireV1[]
  >();
  const workspaceReceiptWatermarksByRunId = new Map<string, number>();
  const submitSettlementGates = new Set<string>();
  const terminalDiagnostics = new Map<string, CreatorAgentDiagnosticV1>();
  let lifecycleEpoch = 0;
  let terminal = false;
  let revision = 0;
  let nextRunOrdinal = 1;
  let pendingStreamEventCount = 0;
  let pendingWorkspaceReceiptCount = 0;
  let phase: CreatorAgentPhaseV1 = "uninitialized";
  let sessionId: string | null = null;
  let activeRunId: string | null = null;
  let draft = "";
  let candidate: CreatorProgramRevisionCandidateV1 | null = null;
  let terminalRuns: readonly CreatorAgentTerminalRunV1[] = [];
  let diagnostic: CreatorAgentDiagnosticV1 | null = null;
  let connectionFailureDiagnostic: CreatorAgentDiagnosticV1 | null = null;
  let workspacePhase: CreatorAgentWorkspacePhaseV1 = "closed";
  let workspaceDescriptor: WorkspaceExecutionDescriptorV1 | null = null;
  let workspaceReceipts: readonly WorkspaceMutationReceiptV1[] = [];
  let workspaceLastReceipt: WorkspaceMutationReceiptV1 | null = null;
  let workspaceDiagnostic: CreatorAgentWorkspaceDiagnosticV1 | null = null;
  let workspaceLastObservedSequence = 0;
  let workspaceAcknowledgedSequence = 0;
  let workspaceAcknowledgementTargetSequence = 0;
  let workspaceAcknowledgementEpoch = 0;
  let workspaceAcknowledgementScheduled = false;
  let workspaceAcknowledgementSettlement:
    | Promise<
      CreatorAgentAcknowledgeWorkspaceReceiptsResultV1
    >
    | null = null;
  let workspaceControlBusy = false;
  let workspaceExportAbort: AbortController | null = null;
  let workspaceExportSettlement: Promise<void> | null = null;
  let configurePromise: Promise<CreatorAgentConfigureCredentialResultV1> | null = null;
  let testConnectionPromise: Promise<CreatorAgentTestConnectionResultV1> | null = null;
  let finishPromise: Promise<void> | null = null;
  let unsubscribeClientSnapshots: (() => void) | null = null;
  let unsubscribeWorkspaceReceipts: (() => void) | null = null;
  let unsubscribeWorkspaceFailures: (() => void) | null = null;
  let snapshot!: CreatorAgentSnapshotV1;

  const latestTrackedRunV1 = (): TrackedCreatorAgentRunV1 | null => {
    let latest: TrackedCreatorAgentRunV1 | null = null;
    for (const run of trackedByProductRunId.values()) {
      if (latest === null || run.ordinal > latest.ordinal) latest = run;
    }
    return latest;
  };

  const refreshFacadeV1 = (): void => {
    const active = latestTrackedRunV1();
    if (active !== null) {
      activeRunId = active.run.agentRunId;
      draft = active.draft;
      candidate = active.candidate;
      phase = "running";
      diagnostic = null;
      return;
    }
    activeRunId = null;
    draft = "";
    candidate = null;
    const latestTerminal = terminalRuns.at(-1);
    if (connectionFailureDiagnostic !== null) {
      phase = "failed";
      diagnostic = connectionFailureDiagnostic;
      return;
    }
    if (latestTerminal?.outcome === "completed") {
      phase = "completed";
      diagnostic = null;
      return;
    }
    if (latestTerminal?.outcome === "failed") {
      phase = "failed";
      diagnostic = terminalDiagnostics.get(latestTerminal.run.agentRunId) ??
        diagnosticV1(latestTerminal.diagnosticCode, "/terminal");
      return;
    }
    phase = "ready";
    diagnostic = null;
  };

  const rebuildSnapshot = (): void => {
    revision += 1;
    snapshot = Object.freeze({
      revision,
      phase,
      distribution: browserPiDistributionIdentityV1,
      activeRunId,
      draft,
      candidate,
      terminalRuns: Object.freeze([...terminalRuns]),
      diagnostic,
      workspace: Object.freeze({
        phase: workspacePhase,
        descriptor: workspaceDescriptor,
        receipts: Object.freeze([...workspaceReceipts]),
        lastReceipt: workspaceLastReceipt,
        diagnostic: workspaceDiagnostic,
      }),
    });
  };
  const publish = (): void => {
    rebuildSnapshot();
    for (const listener of [...listeners]) {
      try {
        listener();
      } catch {
        // Product observers, including terminal consumers, cannot alter Agent lifecycle state.
      }
    }
  };
  const failFacadeV1 = (nextDiagnostic: CreatorAgentDiagnosticV1): void => {
    phase = "failed";
    activeRunId = null;
    draft = "";
    candidate = null;
    diagnostic = nextDiagnostic;
    publish();
  };
  const retireCredentialOwnerV1 = (closeConnector: boolean): boolean => {
    if (credentialRevoked) return false;
    credentialRevoked = true;
    lifecycleEpoch += 1;
    providerCredentialConfigured = false;
    configuredEffectiveReasoningEffort = null;
    sessionId = null;
    workspaceExportAbort?.abort();
    workspaceExportAbort = null;
    if (closeConnector) connector.revokeCredential();
    return true;
  };
  const failWorkspaceV1 = (nextDiagnostic: CreatorAgentWorkspaceDiagnosticV1): void => {
    workspacePhase = "failed";
    workspaceDiagnostic = nextDiagnostic;
    publish();
  };
  const workspaceFailedV1 = (): boolean => workspacePhase === "failed";

  const hasUnmappedSubmitForSessionV1 = (expectedSessionId: string): boolean => {
    for (const tracked of trackedByProductRunId.values()) {
      if (tracked.sessionId === expectedSessionId && tracked.piRunId === null) return true;
    }
    return false;
  };

  const discardOrphanedStreamEventsV1 = (expectedSessionId: string): void => {
    if (hasUnmappedSubmitForSessionV1(expectedSessionId)) return;
    const prefix = `${expectedSessionId}\u0000`;
    for (const [key, events] of pendingStreamEvents) {
      if (!key.startsWith(prefix) || trackedByPiRun.has(key)) continue;
      pendingStreamEvents.delete(key);
      pendingStreamEventCount -= events.length;
    }
  };

  const discardOrphanedWorkspaceReceiptsV1 = (expectedSessionId: string): void => {
    if (hasUnmappedSubmitForSessionV1(expectedSessionId)) return;
    const prefix = `${expectedSessionId}\u0000`;
    for (const [key, receipts] of pendingWorkspaceReceipts) {
      if (!key.startsWith(prefix) || trackedByPiRun.has(key)) continue;
      pendingWorkspaceReceipts.delete(key);
      pendingWorkspaceReceiptCount -= receipts.length;
    }
  };

  const resetWorkspaceAcknowledgementV1 = (): void => {
    workspaceAcknowledgementEpoch += 1;
    workspaceAcknowledgementScheduled = false;
    workspaceAcknowledgementSettlement = null;
    workspaceAcknowledgedSequence = 0;
    workspaceAcknowledgementTargetSequence = 0;
    workspaceReceiptWatermarksByRunId.clear();
  };

  const drainWorkspaceAcknowledgementsV1 = (): Promise<
    CreatorAgentAcknowledgeWorkspaceReceiptsResultV1
  > => {
    if (workspaceAcknowledgementSettlement !== null) {
      return workspaceAcknowledgementSettlement;
    }
    const descriptor = workspaceDescriptor;
    if (descriptor === null) {
      return Promise.resolve({
        kind: "unavailable",
        diagnostic: workspaceDiagnosticV1("protocol_invalid", "/workspace/acknowledge"),
      });
    }
    if (workspaceAcknowledgementTargetSequence <= workspaceAcknowledgedSequence) {
      return Promise.resolve({
        kind: "acknowledged",
        throughSequence: workspaceAcknowledgedSequence,
      });
    }
    const expectedEpoch = workspaceAcknowledgementEpoch;
    const expectedProgramId = descriptor.programId;
    const expectedWorkspaceId = descriptor.workspaceId;
    const expectedWorkspaceSessionId = descriptor.workspaceSessionId;
    const attempt = (async (): Promise<CreatorAgentAcknowledgeWorkspaceReceiptsResultV1> => {
      while (workspaceAcknowledgementTargetSequence > workspaceAcknowledgedSequence) {
        if (terminal || expectedEpoch !== workspaceAcknowledgementEpoch) {
          return {
            kind: "unavailable",
            diagnostic: workspaceDiagnosticV1("disposed", "/workspace/acknowledge"),
          };
        }
        const throughSequence = workspaceAcknowledgementTargetSequence;
        const targetReceipt = workspaceReceipts.find(({ sequence }) =>
          sequence === throughSequence
        );
        try {
          const result = await connector.acknowledgeWorkspaceReceipts({
            workspaceSessionId: expectedWorkspaceSessionId,
            throughSequence,
          });
          const current = workspaceDescriptor;
          if (
            expectedEpoch !== workspaceAcknowledgementEpoch || current === null ||
            current.programId !== expectedProgramId ||
            current.workspaceId !== expectedWorkspaceId ||
            current.workspaceSessionId !== expectedWorkspaceSessionId
          ) {
            return {
              kind: "unavailable",
              diagnostic: workspaceDiagnosticV1("disposed", "/workspace/acknowledge"),
            };
          }
          if (
            result.programId !== expectedProgramId || result.workspaceId !== expectedWorkspaceId ||
            result.workspaceSessionId !== expectedWorkspaceSessionId ||
            (targetReceipt !== undefined &&
              result.generation < targetReceipt.resultingGeneration)
          ) {
            const invalid = workspaceDiagnosticV1(
              "protocol_invalid",
              "/workspace/acknowledge/response",
            );
            failWorkspaceV1(invalid);
            return { kind: "unavailable", diagnostic: invalid };
          }
          workspaceAcknowledgedSequence = throughSequence;
          workspaceReceipts = Object.freeze(
            workspaceReceipts.filter((receipt) => receipt.sequence > throughSequence),
          );
          workspaceDescriptor = Object.freeze({
            ...current,
            generation: Math.max(current.generation, result.generation),
          });
          if (finishPromise === null) workspacePhase = result.phase;
          workspaceDiagnostic = null;
          publish();
        } catch (error) {
          const mapped = mapWorkspaceFailureV1(error, "/workspace/acknowledge");
          if (!workspaceFailedV1()) workspaceDiagnostic = mapped;
          publish();
          return { kind: "unavailable", diagnostic: mapped };
        }
      }
      return {
        kind: "acknowledged",
        throughSequence: workspaceAcknowledgedSequence,
      };
    })();
    workspaceAcknowledgementSettlement = attempt;
    void attempt.then((result) => {
      if (workspaceAcknowledgementSettlement === attempt) {
        workspaceAcknowledgementSettlement = null;
        if (result.kind === "acknowledged") scheduleWorkspaceAcknowledgementV1();
      }
    }, () => {
      if (workspaceAcknowledgementSettlement === attempt) {
        workspaceAcknowledgementSettlement = null;
      }
    });
    return attempt;
  };

  const scheduleWorkspaceAcknowledgementV1 = (): void => {
    if (
      terminal || workspaceAcknowledgementScheduled || workspaceDescriptor === null ||
      workspaceAcknowledgementTargetSequence <= workspaceAcknowledgedSequence
    ) return;
    workspaceAcknowledgementScheduled = true;
    queueMicrotask(() => {
      workspaceAcknowledgementScheduled = false;
      if (
        terminal || workspaceDescriptor === null ||
        workspaceAcknowledgementTargetSequence <= workspaceAcknowledgedSequence
      ) return;
      void drainWorkspaceAcknowledgementsV1();
    });
  };

  const acknowledgeWorkspaceReceiptWatermarkV1 = async (
    throughSequence: number,
  ): Promise<CreatorAgentAcknowledgeWorkspaceReceiptsResultV1> => {
    if (
      workspaceDescriptor === null || !Number.isSafeInteger(throughSequence) ||
      throughSequence <= 0 || throughSequence > workspaceLastObservedSequence
    ) {
      return {
        kind: "unavailable",
        diagnostic: workspaceDiagnosticV1(
          "protocol_invalid",
          "/workspace/acknowledge/throughSequence",
        ),
      };
    }
    if (throughSequence <= workspaceAcknowledgedSequence) {
      return { kind: "acknowledged", throughSequence };
    }
    workspaceAcknowledgementTargetSequence = Math.max(
      workspaceAcknowledgementTargetSequence,
      throughSequence,
    );
    const result = await drainWorkspaceAcknowledgementsV1();
    return workspaceAcknowledgedSequence >= throughSequence
      ? { kind: "acknowledged", throughSequence }
      : result;
  };

  const projectWorkspaceReceiptV1 = (
    tracked: TrackedCreatorAgentRunV1,
    value: BrowserPiWorkspaceMutationReceiptWireV1,
  ): void => {
    const descriptor = workspaceDescriptor;
    if (
      descriptor === null || value.programId !== descriptor.programId ||
      value.workspaceId !== descriptor.workspaceId ||
      value.workspaceSessionId !== descriptor.workspaceSessionId ||
      value.programId !== tracked.run.programId ||
      value.sequence !== workspaceLastObservedSequence + 1
    ) {
      failWorkspaceV1(workspaceDiagnosticV1("protocol_invalid", "/workspace/receipt"));
      return;
    }
    const receipt: WorkspaceMutationReceiptV1 = Object.freeze({
      revision: 1,
      sequence: value.sequence,
      programId: value.programId,
      workspaceId: value.workspaceId,
      workspaceSessionId: value.workspaceSessionId,
      agentRunId: tracked.run.agentRunId,
      toolCallId: value.toolCallId,
      tool: value.tool,
      expectedGeneration: value.expectedGeneration,
      baseGeneration: value.baseGeneration,
      resultingGeneration: value.resultingGeneration,
      outcome: value.outcome,
      effect: value.effect,
      changedPaths: Object.freeze([...value.changedPaths]),
      diagnosticCode: value.diagnosticCode,
    });
    workspaceLastObservedSequence = receipt.sequence;
    workspaceDescriptor = Object.freeze({
      ...descriptor,
      generation: receipt.resultingGeneration,
    });
    workspaceReceipts = Object.freeze([...workspaceReceipts, receipt]);
    workspaceLastReceipt = receipt;
    workspaceReceiptWatermarksByRunId.set(tracked.run.agentRunId, receipt.sequence);
    workspaceAcknowledgementTargetSequence = receipt.sequence;
    workspaceDiagnostic = null;
    publish();
    scheduleWorkspaceAcknowledgementV1();
  };

  const bufferWorkspaceReceiptV1 = (
    key: string,
    receipt: BrowserPiWorkspaceMutationReceiptWireV1,
  ): void => {
    if (pendingWorkspaceReceiptCount >= creatorAgentPendingWorkspaceReceiptMaximumV1) {
      failWorkspaceV1(workspaceDiagnosticV1("protocol_invalid", "/workspace/receiptBuffer"));
      return;
    }
    const receipts = pendingWorkspaceReceipts.get(key);
    if (receipts === undefined) pendingWorkspaceReceipts.set(key, [receipt]);
    else receipts.push(receipt);
    pendingWorkspaceReceiptCount += 1;
  };

  const flushWorkspaceReceiptsV1 = (key: string): void => {
    const receipts = pendingWorkspaceReceipts.get(key);
    if (receipts === undefined) return;
    pendingWorkspaceReceipts.delete(key);
    pendingWorkspaceReceiptCount -= receipts.length;
    for (const receipt of receipts) {
      const tracked = trackedByPiRun.get(key);
      if (tracked === undefined) return;
      projectWorkspaceReceiptV1(tracked, receipt);
    }
  };

  const removeTrackedRunV1 = (tracked: TrackedCreatorAgentRunV1): void => {
    trackedByProductRunId.delete(tracked.run.agentRunId);
    if (tracked.piRunId !== null) {
      const key = piRunKeyV1(tracked.sessionId, tracked.piRunId);
      trackedByPiRun.delete(key);
      submitSettlementGates.delete(key);
      const pending = pendingStreamEvents.get(key);
      if (pending !== undefined) {
        pendingStreamEvents.delete(key);
        pendingStreamEventCount -= pending.length;
      }
      const pendingReceipts = pendingWorkspaceReceipts.get(key);
      if (pendingReceipts !== undefined) {
        pendingWorkspaceReceipts.delete(key);
        pendingWorkspaceReceiptCount -= pendingReceipts.length;
      }
    }
    discardOrphanedStreamEventsV1(tracked.sessionId);
    discardOrphanedWorkspaceReceiptsV1(tracked.sessionId);
  };

  const settleTrackedRunV1 = (
    tracked: TrackedCreatorAgentRunV1,
    terminalRun: CreatorAgentTerminalRunV1,
    terminalDiagnostic: CreatorAgentDiagnosticV1 | null = null,
  ): void => {
    if (!trackedByProductRunId.has(tracked.run.agentRunId)) return;
    if (tracked.piRunId !== null) {
      flushWorkspaceReceiptsV1(piRunKeyV1(tracked.sessionId, tracked.piRunId));
    }
    if (terminalRuns.length >= creatorAgentTerminalRunMaximumV1) {
      removeTrackedRunV1(tracked);
      failFacadeV1(diagnosticV1("protocol_invalid", "/terminalRuns"));
      return;
    }
    // The terminal snapshot no longer treats this run as active, while the
    // private Pi correlation remains available through terminal publication.
    trackedByProductRunId.delete(tracked.run.agentRunId);
    terminalRuns = Object.freeze([...terminalRuns, Object.freeze(terminalRun)]);
    if (terminalDiagnostic !== null) {
      terminalDiagnostics.set(tracked.run.agentRunId, terminalDiagnostic);
    }
    refreshFacadeV1();
    publish();
    removeTrackedRunV1(tracked);
  };

  rebuildSnapshot();

  const handleStreamEventV1 = (
    tracked: TrackedCreatorAgentRunV1,
    event: AgentSessionStreamEventV1,
  ): void => {
    if (!trackedByProductRunId.has(tracked.run.agentRunId)) return;
    switch (event.kind) {
      case "output_text_delta":
        if (tracked.draft.length + event.text.length > creatorAgentFinalReplyMaximumCharactersV1) {
          const nextDiagnostic = diagnosticV1("draft_too_large", "/draft");
          settleTrackedRunV1(
            tracked,
            Object.freeze({
              run: tracked.run,
              outcome: "failed",
              diagnosticCode: "draft_too_large",
            }),
            nextDiagnostic,
          );
          void client.cancel({ sessionId: tracked.sessionId, runId: event.runId });
          return;
        }
        tracked.draft += event.text;
        if (activeRunId === tracked.run.agentRunId) {
          draft = tracked.draft;
          publish();
        }
        return;
      case "output_data": {
        const admitted = admitCreatorProgramRevisionCandidateV1(event.value);
        if (
          admitted.kind === "rejected" || tracked.candidate !== null ||
          !matchesRunV1(admitted.value, tracked.run)
        ) {
          const path = admitted.kind === "rejected" ? admitted.path : "/candidate";
          const nextDiagnostic = diagnosticV1("candidate_invalid", path);
          settleTrackedRunV1(
            tracked,
            Object.freeze({
              run: tracked.run,
              outcome: "failed",
              diagnosticCode: "candidate_invalid",
            }),
            nextDiagnostic,
          );
          void client.cancel({ sessionId: tracked.sessionId, runId: event.runId });
          return;
        }
        tracked.candidate = Object.freeze(admitted.value);
        if (activeRunId === tracked.run.agentRunId) {
          candidate = tracked.candidate;
          publish();
        }
        return;
      }
      case "run_completed": {
        const finalAssistantReply = tracked.draft.trim();
        if (tracked.candidate === null || finalAssistantReply.length === 0) {
          const nextDiagnostic = diagnosticV1("protocol_invalid", "/run_completed");
          settleTrackedRunV1(
            tracked,
            Object.freeze({
              run: tracked.run,
              outcome: "failed",
              diagnosticCode: "protocol_invalid",
            }),
            nextDiagnostic,
          );
          return;
        }
        settleTrackedRunV1(
          tracked,
          Object.freeze({
            run: tracked.run,
            outcome: "completed",
            candidate: tracked.candidate,
            finalAssistantReply,
          }),
        );
        return;
      }
      case "run_failed": {
        const projected = mapRemoteFailureV1(tracked.run, event.diagnostic);
        if (isFailedProjectionV1(projected)) {
          settleTrackedRunV1(tracked, projected.terminalRun, projected.diagnostic);
        } else {
          settleTrackedRunV1(tracked, projected);
        }
        return;
      }
    }
  };

  const bufferStreamEventV1 = (
    key: string,
    event: AgentSessionStreamEventV1,
  ): void => {
    if (pendingStreamEventCount >= creatorAgentPendingStreamEventMaximumV1) {
      failFacadeV1(diagnosticV1("protocol_invalid", "/streamBuffer"));
      return;
    }
    const events = pendingStreamEvents.get(key);
    if (events === undefined) pendingStreamEvents.set(key, [event]);
    else events.push(event);
    pendingStreamEventCount += 1;
  };

  const flushStreamEventsV1 = (key: string): void => {
    const events = pendingStreamEvents.get(key);
    if (events === undefined) return;
    pendingStreamEvents.delete(key);
    pendingStreamEventCount -= events.length;
    for (const event of events) {
      const tracked = trackedByPiRun.get(key);
      if (tracked === undefined) return;
      handleStreamEventV1(tracked, event);
    }
  };

  let lastHandledSessionDiagnostic: AgentSessionDiagnosticV1 | null = null;
  unsubscribeClientSnapshots = client.subscribe(() => {
    if (terminal) return;
    const sessionSnapshot = client.getSnapshot();
    const sessionDiagnostic = sessionSnapshot.diagnostic;
    if (sessionDiagnostic === null) {
      lastHandledSessionDiagnostic = null;
      return;
    }
    if (sessionDiagnostic === lastHandledSessionDiagnostic) return;
    lastHandledSessionDiagnostic = sessionDiagnostic;
    if (
      sessionSnapshot.status.kind === "unavailable" &&
      sessionDiagnostic.code === "agent_session.connection_failed" &&
      sessionDiagnostic.path === "/connection"
    ) {
      if (!providerCredentialConfigured) return;
      const retired = retireCredentialOwnerV1(false);
      if (!retired) return;
      if (connectionFailureDiagnostic === null) {
        connectionFailureDiagnostic = mapEngineDiagnosticV1(sessionDiagnostic);
        failFacadeV1(connectionFailureDiagnostic);
      }
      try {
        notifyConnectionLost?.();
      } catch {
        // The product observer cannot alter Agent lifecycle cleanup.
      }
      return;
    }
    if (!isFatalBrowserConnectorStreamDiagnosticV1(sessionDiagnostic)) return;

    // The public Session intentionally does not attach product or wire identity
    // to rejected records. Invalid, oversized, or out-of-order records are fatal
    // for this ordered Browser Worker channel, so invalidate every product run
    // on the connector instead of duplicating Engine sequence admission or
    // guessing which Program run was affected.
    const nextDiagnostic = mapEngineDiagnosticV1(sessionDiagnostic);
    connectionFailureDiagnostic = nextDiagnostic;
    const retired = retireCredentialOwnerV1(true);
    const interrupted = [...trackedByProductRunId.values()];
    const acceptedRuns: TrackedCreatorAgentRunV1[] = [];
    for (const tracked of interrupted) {
      if (tracked.piRunId === null) removeTrackedRunV1(tracked);
      else acceptedRuns.push(tracked);
    }
    if (acceptedRuns.length === 0) {
      failFacadeV1(nextDiagnostic);
      return;
    }
    for (const tracked of acceptedRuns) {
      const piRunId = tracked.piRunId;
      if (piRunId === null) continue;
      settleTrackedRunV1(
        tracked,
        Object.freeze({
          run: tracked.run,
          outcome: "failed",
          diagnosticCode: "protocol_invalid",
        }),
        nextDiagnostic,
      );
    }
    if (retired) {
      try {
        notifyConnectionLost?.();
      } catch {
        // The product observer cannot alter connector retirement.
      }
    }
  });

  client.subscribeStream((event: AgentSessionStreamEventV1) => {
    if (terminal) return;
    const key = piRunKeyV1(event.sessionId, event.runId);
    const tracked = trackedByPiRun.get(key);
    if (tracked === undefined) {
      if (hasUnmappedSubmitForSessionV1(event.sessionId)) bufferStreamEventV1(key, event);
      return;
    }
    if (submitSettlementGates.has(key)) {
      bufferStreamEventV1(key, event);
      return;
    }
    handleStreamEventV1(tracked, event);
  });

  unsubscribeWorkspaceReceipts = connector.subscribeWorkspaceReceipts((receipt) => {
    if (terminal) return;
    const key = piRunKeyV1(receipt.sessionId, receipt.runId);
    const tracked = trackedByPiRun.get(key);
    if (tracked === undefined) {
      if (hasUnmappedSubmitForSessionV1(receipt.sessionId)) {
        bufferWorkspaceReceiptV1(key, receipt);
      } else {
        failWorkspaceV1(workspaceDiagnosticV1("protocol_invalid", "/workspace/receipt/run"));
      }
      return;
    }
    if (submitSettlementGates.has(key)) {
      bufferWorkspaceReceiptV1(key, receipt);
      return;
    }
    projectWorkspaceReceiptV1(tracked, receipt);
  });

  unsubscribeWorkspaceFailures = connector.subscribeWorkspaceFailures((failure) => {
    if (terminal) return;
    const current = workspaceDescriptor;
    const exactWorkspace = current === null ||
      (current.programId === failure.programId && current.workspaceId === failure.workspaceId &&
        current.workspaceSessionId === failure.workspaceSessionId);
    workspaceDescriptor = exactWorkspace
      ? Object.freeze({
        revision: 1,
        programId: failure.programId,
        workspaceId: failure.workspaceId,
        workspaceSessionId: failure.workspaceSessionId,
        generation: failure.generation,
      })
      : current;
    const hostFailureDiagnostic = workspaceDiagnosticV1(
      !exactWorkspace || failure.code === "invalid_response"
        ? "protocol_invalid"
        : "recovery_required",
      "/workspace/host",
    );
    workspacePhase = "failed";
    workspaceDiagnostic = hostFailureDiagnostic;

    const interrupted = [...trackedByProductRunId.values()];
    connectionFailureDiagnostic = diagnosticV1("connection_failed", "/workspace/host");
    const acceptedRuns: TrackedCreatorAgentRunV1[] = [];
    for (const tracked of interrupted) {
      if (tracked.piRunId === null) removeTrackedRunV1(tracked);
      else acceptedRuns.push(tracked);
    }
    if (acceptedRuns.length === 0) {
      failFacadeV1(connectionFailureDiagnostic);
      return;
    }
    for (const tracked of acceptedRuns) {
      settleTrackedRunV1(
        tracked,
        Object.freeze({
          run: tracked.run,
          outcome: "failed",
          diagnosticCode: "connection_failed",
        }),
        diagnosticV1("connection_failed", "/workspace/host"),
      );
    }
    workspacePhase = "failed";
    workspaceDiagnostic = hostFailureDiagnostic;
    publish();
  });

  const configureCredentialWithV1 = (
    begin: () => ReturnType<BrowserPiWorkerConnectorV1["configureCredential"]>,
  ): Promise<CreatorAgentConfigureCredentialResultV1> => {
    if (terminal || finishPromise !== null || credentialRevoked) {
      return Promise.resolve({ kind: "unavailable", diagnostic: diagnosticV1("disposed", "/") });
    }
    if (providerCredentialConfigured && configuredEffectiveReasoningEffort !== null) {
      return Promise.resolve({
        kind: "configured",
        effectiveReasoningEffort: configuredEffectiveReasoningEffort,
      });
    }
    if (configurePromise !== null) return configurePromise;
    const expectedEpoch = lifecycleEpoch;
    phase = "configuring";
    diagnostic = null;
    publish();
    const attempt = (async (): Promise<CreatorAgentConfigureCredentialResultV1> => {
      const configured = await begin();
      if (terminal || lifecycleEpoch !== expectedEpoch) {
        return { kind: "unavailable", diagnostic: diagnosticV1("disposed", "/") };
      }
      if (configured.kind !== "configured") {
        const mapped = diagnosticV1("connection_failed", "/configure");
        failFacadeV1(mapped);
        return { kind: "unavailable", diagnostic: mapped };
      }
      providerCredentialConfigured = true;
      configuredEffectiveReasoningEffort = configured.effectiveReasoningEffort;
      const connected = await client.connect();
      if (terminal || lifecycleEpoch !== expectedEpoch) {
        return { kind: "unavailable", diagnostic: diagnosticV1("disposed", "/") };
      }
      if (connected.kind !== "ready") {
        const mapped = mapCallFailureV1(connected);
        connectionFailureDiagnostic = mapped;
        failFacadeV1(mapped);
        return { kind: "unavailable", diagnostic: mapped };
      }
      const started = await client.start();
      if (terminal || lifecycleEpoch !== expectedEpoch) {
        return { kind: "unavailable", diagnostic: diagnosticV1("disposed", "/") };
      }
      if (started.kind !== "started") {
        const mapped = mapCallFailureV1(started);
        connectionFailureDiagnostic = mapped;
        failFacadeV1(mapped);
        return { kind: "unavailable", diagnostic: mapped };
      }
      sessionId = started.sessionId;
      connectionFailureDiagnostic = null;
      phase = "ready";
      diagnostic = null;
      publish();
      return {
        kind: "configured",
        effectiveReasoningEffort: configured.effectiveReasoningEffort,
      };
    })();
    configurePromise = attempt;
    void attempt.finally(() => {
      if (configurePromise === attempt) configurePromise = null;
    });
    return attempt;
  };

  const configureCredential = (
    apiKey: string,
  ): Promise<CreatorAgentConfigureCredentialResultV1> => {
    let credential = apiKey;
    const result = configureCredentialWithV1(() => {
      const configuration = connector.configureCredential(credential);
      credential = "";
      return configuration;
    });
    credential = "";
    return result;
  };

  const configureCredentialHandoff = (handoffInput: {
    readonly binding: CredentialVaultBindingV2;
    readonly handoff: BrowserPiCredentialHandoffV1;
  }): Promise<CreatorAgentConfigureCredentialResultV1> =>
    configureCredentialWithV1(() => connector.configureCredentialHandoff(handoffInput));

  const testConnection = (
    selection?: BrowserPiModelSelectionV1 | null,
  ): Promise<CreatorAgentTestConnectionResultV1> => {
    if (terminal || finishPromise !== null) {
      return Promise.resolve({ kind: "unavailable", diagnostic: diagnosticV1("disposed", "/") });
    }
    if (!providerCredentialConfigured) {
      return Promise.resolve({
        kind: "unavailable",
        diagnostic: diagnosticV1("unconfigured", "/credential"),
      });
    }
    if (testConnectionPromise !== null) return testConnectionPromise;
    const expectedEpoch = lifecycleEpoch;
    if (sessionId === null) {
      return Promise.resolve({
        kind: "unavailable",
        diagnostic: diagnosticV1("unconfigured", "/connection"),
      });
    }
    if (phase === "configured" || phase === "ready") {
      phase = "testing";
      diagnostic = null;
      publish();
    }
    const attempt = (async (): Promise<CreatorAgentTestConnectionResultV1> => {
      const tested = await connector.testConnection(selection);
      if (terminal || lifecycleEpoch !== expectedEpoch) {
        return { kind: "unavailable", diagnostic: diagnosticV1("disposed", "/") };
      }
      if (tested.kind !== "ready") {
        const mapped = diagnosticV1("connection_failed", "/test_connection");
        if (phase === "testing") phase = "ready";
        diagnostic = null;
        publish();
        return { kind: "unavailable", diagnostic: mapped };
      }
      connectionFailureDiagnostic = null;
      if (phase === "testing") phase = "ready";
      diagnostic = null;
      publish();
      return { kind: "ready" };
    })();
    testConnectionPromise = attempt;
    void attempt.finally(() => {
      if (testConnectionPromise === attempt) testConnectionPromise = null;
    });
    return attempt;
  };

  const selectModel = async (
    selection: BrowserPiModelSelectionV1,
  ): Promise<CreatorAgentSelectModelResultV1> => {
    if (terminal || finishPromise !== null) {
      return {
        kind: "unavailable",
        diagnostic: diagnosticV1("disposed", "/selection"),
      };
    }
    if (!providerCredentialConfigured) {
      return {
        kind: "unavailable",
        diagnostic: diagnosticV1("unconfigured", "/selection"),
      };
    }
    const expectedEpoch = lifecycleEpoch;
    let result: Awaited<ReturnType<BrowserPiWorkerConnectorV1["selectModel"]>>;
    try {
      result = await connector.selectModel(selection);
    } catch {
      return {
        kind: "unavailable",
        diagnostic: diagnosticV1("request_failed", "/selection"),
      };
    }
    if (terminal || lifecycleEpoch !== expectedEpoch) {
      return {
        kind: "unavailable",
        diagnostic: diagnosticV1("disposed", "/selection"),
      };
    }
    if (result.kind === "selected") {
      configuredEffectiveReasoningEffort = result.effectiveReasoningEffort;
      return {
        kind: "selected",
        selection: result.selection,
        effectiveReasoningEffort: result.effectiveReasoningEffort,
      };
    }
    const code = result.reason === "not_configured"
      ? "unconfigured"
      : result.reason === "busy"
      ? "request_failed"
      : "protocol_invalid";
    return {
      kind: "unavailable",
      diagnostic: diagnosticV1(code, "/selection"),
    };
  };

  const selectReasoningEffort = async (
    preferredReasoningEffort: BrowserPiReasoningEffortV1,
  ): Promise<CreatorAgentSelectReasoningEffortResultV1> => {
    if (terminal || finishPromise !== null) {
      return {
        kind: "unavailable",
        diagnostic: diagnosticV1("disposed", "/reasoningEffort"),
      };
    }
    if (!providerCredentialConfigured) {
      return {
        kind: "unavailable",
        diagnostic: diagnosticV1("unconfigured", "/reasoningEffort"),
      };
    }
    const expectedEpoch = lifecycleEpoch;
    let result: Awaited<ReturnType<BrowserPiWorkerConnectorV1["setReasoningEffort"]>>;
    try {
      result = await connector.setReasoningEffort(preferredReasoningEffort);
    } catch {
      return {
        kind: "unavailable",
        diagnostic: diagnosticV1("request_failed", "/reasoningEffort"),
      };
    }
    if (terminal || lifecycleEpoch !== expectedEpoch) {
      return {
        kind: "unavailable",
        diagnostic: diagnosticV1("disposed", "/reasoningEffort"),
      };
    }
    if (result.kind === "selected") {
      configuredEffectiveReasoningEffort = result.effectiveReasoningEffort;
      return result;
    }
    return {
      kind: "unavailable",
      diagnostic: diagnosticV1(
        result.reason === "not_configured" ? "unconfigured" : "request_failed",
        "/reasoningEffort",
      ),
    };
  };

  const adoptWorkspaceSnapshotV1 = (value: BrowserPiWorkspaceSnapshotWireV1): void => {
    const nextDescriptor = workspaceDescriptorV1(value);
    if (workspaceDescriptor?.workspaceSessionId !== nextDescriptor.workspaceSessionId) {
      resetWorkspaceAcknowledgementV1();
      workspaceReceipts = [];
      workspaceLastReceipt = null;
      workspaceLastObservedSequence = 0;
    }
    workspaceDescriptor = nextDescriptor;
    workspacePhase = value.phase;
    workspaceDiagnostic = null;
  };

  const openWorkspace = async (raw: {
    readonly programId: string;
    readonly workspaceId: string;
  }): Promise<CreatorAgentOpenWorkspaceResultV1> => {
    if (terminal || finishPromise !== null) {
      return {
        kind: "unavailable",
        diagnostic: workspaceDiagnosticV1("disposed", "/"),
      };
    }
    if (
      !identifierPatternV1.test(raw.programId) || !identifierPatternV1.test(raw.workspaceId)
    ) {
      return {
        kind: "unavailable",
        diagnostic: workspaceDiagnosticV1("protocol_invalid", "/workspace/open"),
      };
    }
    if (sessionId === null) {
      const unavailable = mapAgentFailureToWorkspaceV1(
        connectionFailureDiagnostic ?? diagnosticV1("unconfigured", "/connection"),
      );
      return { kind: "unavailable", diagnostic: unavailable };
    }
    if (workspaceControlBusy) {
      return {
        kind: "unavailable",
        diagnostic: workspaceDiagnosticV1("workspace_busy", "/workspace/busy"),
      };
    }
    workspaceControlBusy = true;
    const previousPhase = workspacePhase;
    if (previousPhase === "closed") {
      workspaceDescriptor = null;
      workspaceReceipts = [];
      workspaceLastReceipt = null;
      workspaceLastObservedSequence = 0;
    }
    workspacePhase = "opening";
    workspaceDiagnostic = null;
    publish();
    try {
      if (terminal || finishPromise !== null) {
        return {
          kind: "unavailable",
          diagnostic: workspaceDiagnosticV1("disposed", "/"),
        };
      }
      const result = await connector.openWorkspace(raw);
      adoptWorkspaceSnapshotV1(result);
      publish();
      return { kind: "opened", descriptor: workspaceDescriptorV1(result) };
    } catch (error) {
      const mapped = mapWorkspaceFailureV1(error, "/workspace/open");
      if (!workspaceFailedV1()) {
        workspacePhase = "failed";
        workspaceDiagnostic = mapped;
      }
      publish();
      return { kind: "unavailable", diagnostic: mapped };
    } finally {
      workspaceControlBusy = false;
    }
  };

  const closeWorkspace = async (
    requestedWorkspaceSessionId?: string,
  ): Promise<CreatorAgentCloseWorkspaceResultV1> => {
    if (terminal || finishPromise !== null) {
      return {
        kind: "unavailable",
        diagnostic: workspaceDiagnosticV1("disposed", "/"),
      };
    }
    const descriptor = workspaceDescriptor;
    if (descriptor === null || workspacePhase === "closed") return { kind: "idle" };
    if (
      requestedWorkspaceSessionId !== undefined &&
      requestedWorkspaceSessionId !== descriptor.workspaceSessionId
    ) {
      return {
        kind: "unavailable",
        diagnostic: workspaceDiagnosticV1(
          "protocol_invalid",
          "/workspace/close/workspaceSessionId",
        ),
      };
    }
    if (workspaceControlBusy && workspaceExportSettlement !== null) {
      workspaceExportAbort?.abort();
      await workspaceExportSettlement.catch(() => undefined);
    }
    if (workspaceLastObservedSequence > workspaceAcknowledgedSequence) {
      const acknowledged = await acknowledgeWorkspaceReceiptWatermarkV1(
        workspaceLastObservedSequence,
      );
      if (acknowledged.kind === "unavailable") return acknowledged;
    } else {
      await workspaceAcknowledgementSettlement;
    }
    if (terminal || finishPromise !== null) {
      return {
        kind: "unavailable",
        diagnostic: workspaceDiagnosticV1("disposed", "/"),
      };
    }
    if (workspaceControlBusy) {
      return {
        kind: "unavailable",
        diagnostic: workspaceDiagnosticV1("workspace_busy", "/workspace/busy"),
      };
    }
    workspaceControlBusy = true;
    const previousPhase = workspacePhase;
    workspacePhase = "closing";
    workspaceDiagnostic = null;
    publish();
    try {
      const result = await connector.closeWorkspace(descriptor.workspaceSessionId);
      if (result.workspaceSessionId !== descriptor.workspaceSessionId) {
        throw new TypeError("sillyos.creator_agent.workspace_close_mismatch");
      }
      adoptWorkspaceSnapshotV1(result);
      workspacePhase = "closed";
      publish();
      return { kind: "closed", descriptor: workspaceDescriptorV1(result) };
    } catch (error) {
      const mapped = mapWorkspaceFailureV1(error, "/workspace/close");
      if (!workspaceFailedV1()) {
        workspacePhase = previousPhase;
        workspaceDiagnostic = mapped;
      }
      publish();
      return { kind: "unavailable", diagnostic: mapped };
    } finally {
      workspaceControlBusy = false;
    }
  };

  const exportWorkspace = async (exportInput: {
    readonly workspaceSessionId: string;
    readonly fileName: string;
    readonly signal: AbortSignal;
    readonly onProgress?: (progress: BrowserProgramWorkspaceExportProgressV1) => void;
    readonly onReady: (
      ready: BrowserProgramWorkspaceExportReadyV1,
      startDownload: () => Promise<void>,
    ) => "release" | "cancel" | Promise<"release" | "cancel">;
  }): Promise<CreatorAgentExportWorkspaceResultV1> => {
    if (terminal || finishPromise !== null) {
      return {
        kind: "unavailable",
        diagnostic: workspaceDiagnosticV1("disposed", "/workspace/export"),
      };
    }
    const descriptor = workspaceDescriptor;
    if (
      descriptor === null || workspacePhase !== "open" ||
      descriptor.workspaceSessionId !== exportInput.workspaceSessionId
    ) {
      return {
        kind: "unavailable",
        diagnostic: workspaceDiagnosticV1("protocol_invalid", "/workspace/export/session"),
      };
    }
    if (workspaceControlBusy || trackedByProductRunId.size !== 0) {
      return {
        kind: "unavailable",
        diagnostic: workspaceDiagnosticV1("workspace_busy", "/workspace/export/busy"),
      };
    }
    workspaceControlBusy = true;
    const abortController = new AbortController();
    workspaceExportAbort = abortController;
    const abort = () => abortController.abort(exportInput.signal.reason);
    if (exportInput.signal.aborted) abort();
    else exportInput.signal.addEventListener("abort", abort, { once: true });
    const operation = workspaceAuthority.exportWorkspace({
      workspaceSessionId: descriptor.workspaceSessionId,
      fileName: exportInput.fileName,
      signal: abortController.signal,
      ...(exportInput.onProgress === undefined ? {} : { onProgress: exportInput.onProgress }),
      onReady: exportInput.onReady,
    });
    workspaceExportSettlement = operation.then(() => undefined, () => undefined);
    try {
      return await operation;
    } catch (error) {
      return {
        kind: "unavailable",
        diagnostic: mapWorkspaceFailureV1(error, "/workspace/export"),
      };
    } finally {
      exportInput.signal.removeEventListener("abort", abort);
      if (workspaceExportAbort === abortController) workspaceExportAbort = null;
      workspaceExportSettlement = null;
      workspaceControlBusy = false;
    }
  };

  const synchronizeNetworkAccess = async (
    raw: ProgramNetworkAccessV1,
  ): Promise<CreatorAgentSynchronizeNetworkAccessResultV1> => {
    if (terminal || finishPromise !== null) {
      return { kind: "unavailable", diagnostic: diagnosticV1("disposed", "/networkAccess") };
    }
    const admitted = admitProgramNetworkAccessV1(raw);
    const descriptor = workspaceDescriptor;
    if (
      admitted.kind === "rejected" || descriptor === null || workspacePhase !== "open" ||
      admitted.value.programId !== descriptor.programId
    ) {
      return {
        kind: "unavailable",
        diagnostic: diagnosticV1("request_failed", "/networkAccess/scope"),
      };
    }
    const expectedEpoch = lifecycleEpoch;
    try {
      await connector.replaceNetworkAccess({
        access: admitted.value,
        workspaceSessionId: descriptor.workspaceSessionId,
      });
    } catch {
      return {
        kind: "unavailable",
        diagnostic: diagnosticV1("request_failed", "/networkAccess/synchronize"),
      };
    }
    if (terminal || lifecycleEpoch !== expectedEpoch) {
      return { kind: "unavailable", diagnostic: diagnosticV1("disposed", "/networkAccess") };
    }
    return { kind: "synchronized" };
  };

  const finish = async (finalPhase: "forgotten" | "disposed"): Promise<void> => {
    if (terminal) return;
    if (finishPromise !== null) return finishPromise;
    lifecycleEpoch += 1;
    providerCredentialConfigured = false;
    configuredEffectiveReasoningEffort = null;
    workspacePhase = workspaceDescriptor === null ? "closed" : "closing";
    workspaceDiagnostic = null;
    publish();
    const attempt = (async (): Promise<void> => {
      workspaceExportAbort?.abort();
      if (!credentialRevoked) {
        await workspaceExportSettlement?.catch(() => undefined);
        if (workspaceLastObservedSequence > workspaceAcknowledgedSequence) {
          await acknowledgeWorkspaceReceiptWatermarkV1(workspaceLastObservedSequence).catch(
            () => undefined,
          );
        } else {
          await workspaceAcknowledgementSettlement?.catch(() => undefined);
        }
      }
      // Keep subscriptions and Pi-to-product correlation alive until close has
      // drained its final receipt and Agent terminal records.
      await connector.forget().catch(() => undefined);
      unsubscribeClientSnapshots?.();
      unsubscribeClientSnapshots = null;
      await client.dispose().catch(() => undefined);
      unsubscribeWorkspaceReceipts?.();
      unsubscribeWorkspaceReceipts = null;
      unsubscribeWorkspaceFailures?.();
      unsubscribeWorkspaceFailures = null;
      terminal = true;
      sessionId = null;
      trackedByProductRunId.clear();
      trackedByPiRun.clear();
      pendingStreamEvents.clear();
      pendingWorkspaceReceipts.clear();
      workspaceReceiptWatermarksByRunId.clear();
      submitSettlementGates.clear();
      pendingStreamEventCount = 0;
      pendingWorkspaceReceiptCount = 0;
      activeRunId = null;
      draft = "";
      candidate = null;
      diagnostic = null;
      connectionFailureDiagnostic = null;
      phase = finalPhase;
      workspacePhase = finalPhase;
      workspaceDescriptor = null;
      workspaceReceipts = [];
      workspaceLastReceipt = null;
      workspaceAcknowledgementSettlement = null;
      workspaceDiagnostic = null;
      publish();
      listeners.clear();
    })();
    finishPromise = attempt;
    return attempt;
  };

  return {
    getSnapshot: () => snapshot,
    subscribe(listener: () => void): () => void {
      if (terminal) return () => {};
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    configureCredential,
    configureCredentialHandoff,
    testConnection,
    selectModel,
    selectReasoningEffort,
    openWorkspace,
    closeWorkspace,
    exportWorkspace,
    revokeCredential(): void {
      if (terminal) return;
      retireCredentialOwnerV1(true);
    },
    async submit(rawRun: CreatorAgentRunRequestV1): Promise<CreatorAgentPortSubmitResultV1> {
      if (terminal || finishPromise !== null) {
        return { kind: "unavailable", diagnostic: diagnosticV1("disposed", "/") };
      }
      const normalized = normalizeCreatorAgentRunV1(rawRun);
      if (normalized === null) {
        return {
          kind: "unavailable",
          diagnostic: diagnosticV1("submit_invalid", "/run"),
        };
      }
      if (
        trackedByProductRunId.has(normalized.run.agentRunId) ||
        terminalRuns.some(({ run }) => run.agentRunId === normalized.run.agentRunId)
      ) {
        return {
          kind: "unavailable",
          diagnostic: diagnosticV1("submit_invalid", "/run/agentRunId"),
        };
      }
      if (
        trackedByProductRunId.size + terminalRuns.length >= creatorAgentTerminalRunMaximumV1
      ) {
        return {
          kind: "unavailable",
          diagnostic: diagnosticV1("protocol_invalid", "/terminalRuns"),
        };
      }
      if (sessionId === null) {
        return {
          kind: "unavailable",
          diagnostic: connectionFailureDiagnostic ?? diagnosticV1("unconfigured", "/connection"),
        };
      }
      // Concurrent callers can pass the pre-connection checks together. Repeat
      // identity and capacity admission immediately before reserving the run.
      if (
        trackedByProductRunId.has(normalized.run.agentRunId) ||
        terminalRuns.some(({ run }) => run.agentRunId === normalized.run.agentRunId)
      ) {
        return {
          kind: "unavailable",
          diagnostic: diagnosticV1("submit_invalid", "/run/agentRunId"),
        };
      }
      if (
        trackedByProductRunId.size + terminalRuns.length >= creatorAgentTerminalRunMaximumV1
      ) {
        return {
          kind: "unavailable",
          diagnostic: diagnosticV1("protocol_invalid", "/terminalRuns"),
        };
      }
      const submitWorkspace = workspaceDescriptor;
      if (
        workspacePhase !== "open" || submitWorkspace === null ||
        submitWorkspace.programId !== normalized.run.programId
      ) {
        return {
          kind: "unavailable",
          diagnostic: diagnosticV1("request_failed", "/workspace/submit"),
        };
      }
      if (workspaceControlBusy) {
        return {
          kind: "unavailable",
          diagnostic: diagnosticV1("request_failed", "/workspace/busy"),
        };
      }
      const expectedEpoch = lifecycleEpoch;
      const expectedSessionId = sessionId;
      const tracked: TrackedCreatorAgentRunV1 = {
        run: normalized.run,
        sessionId: expectedSessionId,
        ordinal: nextRunOrdinal++,
        piRunId: null,
        draft: "",
        candidate: null,
      };
      trackedByProductRunId.set(tracked.run.agentRunId, tracked);
      refreshFacadeV1();
      publish();
      let serializedSubmit: string;
      try {
        // Product-only Process/Workspace currentness and Repository identity
        // never cross the Pi RPC boundary.
        serializedSubmit = serializeCreatorAgentSubmitV1(normalized.submit);
      } catch {
        removeTrackedRunV1(tracked);
        refreshFacadeV1();
        const invalid = diagnosticV1("submit_invalid", "/run");
        diagnostic = invalid;
        publish();
        return { kind: "unavailable", diagnostic: invalid };
      }
      const admittedSubmit = await (async () => {
        try {
          // This product facade, not the semantic Pi connector, owns submit
          // admission. Holding the shared Authority operation through the RPC
          // response prevents submit from crossing a review-head/Repository CAS.
          const result = await workspaceAuthority.withAgentSubmitAdmission({
            programId: normalized.run.programId,
            workspaceSessionId: submitWorkspace.workspaceSessionId,
            expectedProgramRevision: normalized.run.baseProgramRevision,
            expectedRepositoryRevision: normalized.run.baseRepositoryRevision,
            expectedCheckpointId: normalized.run.workspaceCheckpointId,
            expectedGeneration: normalized.run.workspaceGeneration,
            operation: async (access) => {
              await connector.replaceNetworkAccess({
                access,
                workspaceSessionId: submitWorkspace.workspaceSessionId,
              });
              return await client.submit({
                sessionId: expectedSessionId,
                text: serializedSubmit,
              });
            },
          });
          return { kind: "settled" as const, result };
        } catch {
          return { kind: "rejected" as const };
        }
      })();
      if (admittedSubmit.kind === "rejected") {
        removeTrackedRunV1(tracked);
        refreshFacadeV1();
        const rejected = diagnosticV1("request_failed", "/workspace/submit/admission");
        diagnostic = rejected;
        publish();
        return { kind: "unavailable", diagnostic: rejected };
      }
      const result = admittedSubmit.result;
      if (terminal || lifecycleEpoch !== expectedEpoch) {
        removeTrackedRunV1(tracked);
        return {
          kind: "unavailable",
          diagnostic: terminal
            ? diagnosticV1("disposed", "/")
            : connectionFailureDiagnostic ?? diagnosticV1("disposed", "/"),
        };
      }
      if (!trackedByProductRunId.has(tracked.run.agentRunId)) {
        return {
          kind: "unavailable",
          diagnostic: connectionFailureDiagnostic ??
            diagnosticV1("request_failed", "/workspace/submit"),
        };
      }
      if (result.kind !== "submitted") {
        removeTrackedRunV1(tracked);
        refreshFacadeV1();
        const mapped = mapCallFailureV1(result);
        diagnostic = mapped;
        publish();
        return { kind: "unavailable", diagnostic: mapped };
      }
      tracked.piRunId = result.runId;
      const key = piRunKeyV1(expectedSessionId, result.runId);
      trackedByPiRun.set(key, tracked);
      submitSettlementGates.add(key);
      discardOrphanedStreamEventsV1(expectedSessionId);
      refreshFacadeV1();
      publish();
      // The caller must observe `submitted` before a buffered terminal projection.
      // Two microtasks place the async-function continuation ahead of the release.
      queueMicrotask(() =>
        queueMicrotask(() => {
          submitSettlementGates.delete(key);
          if (!terminal) {
            flushWorkspaceReceiptsV1(key);
            flushStreamEventsV1(key);
          }
        })
      );
      return { kind: "submitted", agentRunId: tracked.run.agentRunId };
    },
    async cancel(agentRunId?: string): Promise<CreatorAgentPortCancelResultV1> {
      if (terminal || finishPromise !== null) {
        return { kind: "unavailable", diagnostic: diagnosticV1("disposed", "/") };
      }
      if (agentRunId === undefined) return { kind: "idle" };
      const tracked = trackedByProductRunId.get(agentRunId);
      if (tracked === undefined || tracked.piRunId === null) return { kind: "idle" };
      const expectedSessionId = tracked.sessionId;
      const expectedPiRunId = tracked.piRunId;
      const result = await client.cancel({
        sessionId: expectedSessionId,
        runId: expectedPiRunId,
      });
      if (result.kind !== "cancel_requested") {
        const mapped = mapCallFailureV1(result);
        diagnostic = mapped;
        publish();
        return { kind: "unavailable", diagnostic: mapped };
      }
      // cancel_requested is not terminal. Preserve the run until the Worker emits
      // run_failed(cancelled), which becomes the durable product projection.
      return { kind: "cancel_requested" };
    },
    synchronizeNetworkAccess,
    async acknowledgeTerminal(
      agentRunId: string,
    ): Promise<CreatorAgentAcknowledgeTerminalResultV1> {
      const index = terminalRuns.findIndex(({ run }) => run.agentRunId === agentRunId);
      if (index < 0) return { kind: "idle" };
      const receiptWatermark = workspaceReceiptWatermarksByRunId.get(agentRunId) ?? 0;
      if (receiptWatermark > 0) {
        const workspaceAcknowledged = await acknowledgeWorkspaceReceiptWatermarkV1(
          receiptWatermark,
        );
        if (workspaceAcknowledged.kind === "unavailable") {
          return {
            kind: "workspace_unavailable",
            diagnostic: workspaceAcknowledged.diagnostic,
          };
        }
      }
      const currentIndex = terminalRuns.findIndex(({ run }) => run.agentRunId === agentRunId);
      if (currentIndex < 0) return { kind: "idle" };
      terminalRuns = Object.freeze([
        ...terminalRuns.slice(0, currentIndex),
        ...terminalRuns.slice(currentIndex + 1),
      ]);
      terminalDiagnostics.delete(agentRunId);
      workspaceReceiptWatermarksByRunId.delete(agentRunId);
      if (!terminal) refreshFacadeV1();
      publish();
      return { kind: "acknowledged" };
    },
    forget: () => finish("forgotten"),
    dispose: () => finish("disposed"),
  };
}
