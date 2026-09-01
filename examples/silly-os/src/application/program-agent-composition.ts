// SPDX-License-Identifier: MIT

import {
  createAgentSessionClientV1,
  type AgentSessionCallFailureV1,
  type AgentSessionDiagnosticV1,
  type AgentSessionStreamEventV1,
} from "@sillymaker/agent/session";

import {
  type BrowserProgramWorkspaceExportProgressV1,
  type BrowserProgramWorkspaceExportReadyV1,
  type BrowserProgramWorkspaceAuthorityV1,
} from "../application/workspace/browser-program-workspace-authority.ts";
import {
  cloneProcessNetworkAccessV1,
  type ProcessNetworkAccessV1,
} from "../program-platform/capabilities/process-network-access.ts";
import { browserPiDistributionIdentityV1 } from "../agent/browser-pi-distribution.ts";
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
} from "../agent/browser-pi-transport.ts";
import type { CredentialVaultBindingV2 } from "../credential/credential-vault-contracts.ts";
import type {
  BrowserPiModelSelectionV1,
  BrowserPiReasoningEffortV1,
  BrowserPiWorkspaceMutationReceiptWireV1,
  BrowserPiWorkspaceSnapshotWireV1,
} from "../agent/browser-pi-worker-protocol.ts";
import type {
  BrowserProgramAgentAcknowledgeTerminalResultV1,
  BrowserProgramAgentAcknowledgeWorkspaceReceiptsResultV1,
  BrowserProgramAgentCloseWorkspaceResultV1,
  BrowserProgramAgentConfigureCredentialResultV1,
  BrowserProgramAgentDiagnosticCodeV1,
  BrowserProgramAgentDiagnosticV1,
  BrowserProgramAgentExportWorkspaceResultV1,
  BrowserProgramAgentOpenWorkspaceResultV1,
  BrowserProgramAgentPhaseV1,
  BrowserProgramAgentPortCancelResultV1,
  BrowserProgramAgentPortSubmitResultV1,
  BrowserProgramAgentSelectModelResultV1,
  BrowserProgramAgentSelectReasoningEffortResultV1,
  BrowserProgramAgentSynchronizeNetworkAccessResultV1,
  BrowserProgramAgentTestConnectionResultV1,
  BrowserProgramAgentWorkspaceDiagnosticCodeV1,
  BrowserProgramAgentWorkspaceDiagnosticV1,
  BrowserProgramAgentWorkspacePhaseV1,
  BrowserProgramAgentWorkspaceSnapshotV1,
} from "../agent/browser-program-agent-port-contracts.ts";
import type {
  BrowserProgramAgentAdapterLoadV1,
  BrowserProgramAgentAdapterV1,
  BrowserProgramAgentPreparedRunV1,
  BrowserProgramAgentTerminalProjectionV1,
} from "../agent/browser-program-agent-adapter.ts";
import type {
  BrowserProgramAgentControlPortV1,
  BrowserProgramAgentControlSnapshotV1,
  BrowserProgramAgentHostV1,
  BrowserProgramAgentPortV1,
} from "../agent/browser-program-agent-host-contracts.ts";

interface TrackedProgramAgentRunV1 {
  readonly facade: ProgramAgentFacadeV1;
  readonly prepared: BrowserProgramAgentPreparedRunV1;
  readonly sessionId: string;
  readonly ordinal: number;
  piRunId: string | null;
  state: object;
}

interface ProgramAgentFacadeV1 {
  readonly adapterLoad: BrowserProgramAgentAdapterLoadV1;
  readonly projectPendingSnapshot: (
    input: Parameters<BrowserProgramAgentAdapterV1["projectSnapshot"]>[0],
  ) => unknown;
  adapter: BrowserProgramAgentAdapterV1 | null;
  adapterLoadPromise: Promise<BrowserProgramAgentAdapterV1> | null;
  revision: number;
  snapshot: unknown;
  terminalRuns: BrowserProgramAgentTerminalProjectionV1[];
  diagnostic: BrowserProgramAgentDiagnosticV1 | null;
  readonly listeners: Set<() => void>;
  detachPromise: Promise<void> | null;
}

export type { BrowserProgramAgentHostV1, BrowserProgramAgentPortV1 };

/**
 * Shared in-memory drain boundary for terminal records that the product has not
 * durably acknowledged yet. It protects one Worker/Session owner; it is not a
 * Program domain state, Process, or document-size limit.
 */
export const programAgentUnacknowledgedTerminalDrainMaximumV1 = 32;
const programAgentPendingStreamEventMaximumV1 = 2_048;
const programAgentPendingWorkspaceReceiptMaximumV1 = 64;

const identifierPatternV1 = /^[a-zA-Z0-9][a-zA-Z0-9._:-]*$/u;

function diagnosticV1(
  code: BrowserProgramAgentDiagnosticCodeV1,
  path: string,
): BrowserProgramAgentDiagnosticV1 {
  return Object.freeze({ code, path });
}

function workspaceDiagnosticV1(
  code: BrowserProgramAgentWorkspaceDiagnosticCodeV1,
  path: string,
): BrowserProgramAgentWorkspaceDiagnosticV1 {
  return Object.freeze({ code, path });
}

function mapEngineDiagnosticV1(
  value: AgentSessionDiagnosticV1,
): BrowserProgramAgentDiagnosticV1 {
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

function mapCallFailureV1(value: AgentSessionCallFailureV1): BrowserProgramAgentDiagnosticV1 {
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

function mapWorkspaceFailureV1(
  value: unknown,
  path: string,
): BrowserProgramAgentWorkspaceDiagnosticV1 {
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
  value: BrowserProgramAgentDiagnosticV1,
): BrowserProgramAgentWorkspaceDiagnosticV1 {
  if (value.code === "disposed") return workspaceDiagnosticV1("disposed", value.path);
  if (value.code === "protocol_invalid") {
    return workspaceDiagnosticV1("protocol_invalid", value.path);
  }
  return workspaceDiagnosticV1("request_failed", value.path);
}

export type BrowserProgramAgentPortInputV1 =
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
  );

/** One fixed Browser harness owner shared by lazily attached Program facades. */
export function createBrowserProgramAgentHostV1(
  input: BrowserProgramAgentPortInputV1,
): BrowserProgramAgentHostV1 {
  const { onConnectionLost: notifyConnectionLost, workspaceAuthority, ...connectorInput } = input;
  let providerCredentialConfigured = false;
  let configuredEffectiveReasoningEffort: BrowserPiReasoningEffortV1 | null = null;
  let credentialRevoked = false;
  const connector = createBrowserPiWorkerConnectorV1({
    ...connectorInput,
    workspaceAuthority,
  });
  const client = createAgentSessionClientV1({ connector });
  const trackedByProductRunId = new Map<string, TrackedProgramAgentRunV1>();
  const trackedByPiRun = new Map<string, TrackedProgramAgentRunV1>();
  const pendingStreamEvents = new Map<string, AgentSessionStreamEventV1[]>();
  const pendingWorkspaceReceipts = new Map<
    string,
    BrowserPiWorkspaceMutationReceiptWireV1[]
  >();
  const workspaceReceiptWatermarksByRunId = new Map<string, number>();
  const submitSettlementGates = new Set<string>();
  const facades = new Set<ProgramAgentFacadeV1>();
  let lifecycleEpoch = 0;
  let terminal = false;
  let nextRunOrdinal = 1;
  let pendingStreamEventCount = 0;
  let pendingWorkspaceReceiptCount = 0;
  let phase: BrowserProgramAgentPhaseV1 = "uninitialized";
  let sessionId: string | null = null;
  let diagnostic: BrowserProgramAgentDiagnosticV1 | null = null;
  let connectionFailureDiagnostic: BrowserProgramAgentDiagnosticV1 | null = null;
  let workspacePhase: BrowserProgramAgentWorkspacePhaseV1 = "closed";
  let workspaceDescriptor: WorkspaceExecutionDescriptorV1 | null = null;
  let workspaceProcessId: string | null = null;
  let workspaceReceipts: readonly WorkspaceMutationReceiptV1[] = [];
  let workspaceLastReceipt: WorkspaceMutationReceiptV1 | null = null;
  let workspaceDiagnostic: BrowserProgramAgentWorkspaceDiagnosticV1 | null = null;
  let workspaceLastObservedSequence = 0;
  let workspaceAcknowledgedSequence = 0;
  let workspaceAcknowledgementTargetSequence = 0;
  let workspaceAcknowledgementEpoch = 0;
  let workspaceAcknowledgementScheduled = false;
  let workspaceAcknowledgementSettlement:
    | Promise<
      BrowserProgramAgentAcknowledgeWorkspaceReceiptsResultV1
    >
    | null = null;
  let workspaceControlBusy = false;
  let workspaceExportAbort: AbortController | null = null;
  let workspaceExportSettlement: Promise<void> | null = null;
  let configurePromise: Promise<BrowserProgramAgentConfigureCredentialResultV1> | null = null;
  let testConnectionPromise: Promise<BrowserProgramAgentTestConnectionResultV1> | null = null;
  let finishPromise: Promise<void> | null = null;
  let unsubscribeClientSnapshots: (() => void) | null = null;
  let unsubscribeWorkspaceReceipts: (() => void) | null = null;
  let unsubscribeWorkspaceFailures: (() => void) | null = null;
  const latestTrackedRunV1 = (facade?: ProgramAgentFacadeV1): TrackedProgramAgentRunV1 | null => {
    let latest: TrackedProgramAgentRunV1 | null = null;
    for (const run of trackedByProductRunId.values()) {
      if (facade !== undefined && run.facade !== facade) continue;
      if (latest === null || run.ordinal > latest.ordinal) latest = run;
    }
    return latest;
  };

  const refreshFacadeV1 = (): void => {
    const active = latestTrackedRunV1();
    if (active !== null) {
      phase = "running";
      diagnostic = null;
      return;
    }
    if (connectionFailureDiagnostic !== null) {
      phase = "failed";
      diagnostic = connectionFailureDiagnostic;
      return;
    }
    if (!providerCredentialConfigured) {
      phase = "uninitialized";
      diagnostic = null;
      return;
    }
    phase = "ready";
    diagnostic = null;
  };

  const projectFacadePhaseV1 = (facade: ProgramAgentFacadeV1): BrowserProgramAgentPhaseV1 => {
    if (
      phase === "uninitialized" || phase === "configuring" || phase === "configured" ||
      phase === "testing" || phase === "forgotten" || phase === "disposed"
    ) return phase;
    if (connectionFailureDiagnostic !== null) return "failed";
    const active = latestTrackedRunV1(facade);
    if (active !== null) return "running";
    const latest = facade.terminalRuns.at(-1);
    if (latest?.outcome === "completed") return "completed";
    if (latest?.outcome === "failed") return "failed";
    if (phase === "failed") return "failed";
    return "ready";
  };

  const projectFacadeDiagnosticV1 = (
    facade: ProgramAgentFacadeV1,
    facadePhase: BrowserProgramAgentPhaseV1,
  ): BrowserProgramAgentDiagnosticV1 | null => {
    if (facadePhase !== "failed") return null;
    if (connectionFailureDiagnostic !== null) return connectionFailureDiagnostic;
    const latest = facade.terminalRuns.at(-1);
    if (latest?.outcome === "failed") {
      return latest.diagnostic ?? diagnosticV1("run_failed", "/terminal");
    }
    if (facade.diagnostic !== null) return facade.diagnostic;
    return diagnostic;
  };

  const workspaceSnapshotV1 = (): BrowserProgramAgentWorkspaceSnapshotV1 =>
    Object.freeze({
      phase: workspacePhase,
      descriptor: workspaceDescriptor,
      receipts: Object.freeze([...workspaceReceipts]),
      lastReceipt: workspaceLastReceipt,
      diagnostic: workspaceDiagnostic,
    });

  const rebuildSnapshotsV1 = (): void => {
    const workspace = workspaceSnapshotV1();
    for (const facade of facades) {
      facade.revision += 1;
      const facadePhase = projectFacadePhaseV1(facade);
      const active = latestTrackedRunV1(facade);
      const projectedActive = facadePhase === "running" ? active : null;
      const projection = {
        revision: facade.revision,
        phase: facadePhase,
        distribution: browserPiDistributionIdentityV1,
        activeRunId: projectedActive?.prepared.run.agentRunId ?? null,
        activeState: projectedActive?.state ?? null,
        terminalRuns: Object.freeze(facade.terminalRuns.map(({ value }) => value)),
        diagnostic: projectFacadeDiagnosticV1(facade, facadePhase),
        workspace,
      };
      facade.snapshot = facade.adapter === null
        ? facade.projectPendingSnapshot(projection)
        : facade.adapter.projectSnapshot(projection);
    }
  };
  const publish = (): void => {
    rebuildSnapshotsV1();
    for (const facade of facades) {
      for (const listener of [...facade.listeners]) {
        try {
          listener();
        } catch {
          // Product observers, including terminal consumers, cannot alter Agent lifecycle state.
        }
      }
    }
  };
  const failFacadeV1 = (nextDiagnostic: BrowserProgramAgentDiagnosticV1): void => {
    phase = "failed";
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
  const failWorkspaceV1 = (nextDiagnostic: BrowserProgramAgentWorkspaceDiagnosticV1): void => {
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
    BrowserProgramAgentAcknowledgeWorkspaceReceiptsResultV1
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
    const attempt = (async (): Promise<BrowserProgramAgentAcknowledgeWorkspaceReceiptsResultV1> => {
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
  ): Promise<BrowserProgramAgentAcknowledgeWorkspaceReceiptsResultV1> => {
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
    tracked: TrackedProgramAgentRunV1,
    value: BrowserPiWorkspaceMutationReceiptWireV1,
  ): void => {
    const descriptor = workspaceDescriptor;
    if (
      descriptor === null || value.programId !== descriptor.programId ||
      value.workspaceId !== descriptor.workspaceId ||
      value.workspaceSessionId !== descriptor.workspaceSessionId ||
      value.programId !== tracked.prepared.run.programId ||
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
      agentRunId: tracked.prepared.run.agentRunId,
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
    workspaceReceiptWatermarksByRunId.set(tracked.prepared.run.agentRunId, receipt.sequence);
    workspaceAcknowledgementTargetSequence = receipt.sequence;
    workspaceDiagnostic = null;
    publish();
    scheduleWorkspaceAcknowledgementV1();
  };

  const bufferWorkspaceReceiptV1 = (
    key: string,
    receipt: BrowserPiWorkspaceMutationReceiptWireV1,
  ): void => {
    if (pendingWorkspaceReceiptCount >= programAgentPendingWorkspaceReceiptMaximumV1) {
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

  const removeTrackedRunV1 = (tracked: TrackedProgramAgentRunV1): void => {
    trackedByProductRunId.delete(tracked.prepared.run.agentRunId);
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
    tracked: TrackedProgramAgentRunV1,
    terminalRun: BrowserProgramAgentTerminalProjectionV1,
  ): void => {
    if (!trackedByProductRunId.has(tracked.prepared.run.agentRunId)) return;
    if (tracked.piRunId !== null) {
      flushWorkspaceReceiptsV1(piRunKeyV1(tracked.sessionId, tracked.piRunId));
    }
    if (
      [...facades].reduce((count, facade) => count + facade.terminalRuns.length, 0) >=
        programAgentUnacknowledgedTerminalDrainMaximumV1
    ) {
      removeTrackedRunV1(tracked);
      failFacadeV1(diagnosticV1("protocol_invalid", "/terminalRuns"));
      return;
    }
    // The terminal snapshot no longer treats this run as active, while the
    // private Pi correlation remains available through terminal publication.
    trackedByProductRunId.delete(tracked.prepared.run.agentRunId);
    tracked.facade.terminalRuns.push(terminalRun);
    tracked.facade.diagnostic = terminalRun.diagnostic;
    refreshFacadeV1();
    publish();
    removeTrackedRunV1(tracked);
  };

  const failTrackedRunV1 = (
    tracked: TrackedProgramAgentRunV1,
    diagnosticCode: "connection_failed" | "protocol_invalid",
    terminalDiagnostic: BrowserProgramAgentDiagnosticV1,
  ): void => {
    const adapter = tracked.facade.adapter;
    if (adapter === null) {
      removeTrackedRunV1(tracked);
      failFacadeV1(terminalDiagnostic);
      return;
    }
    settleTrackedRunV1(
      tracked,
      adapter.projectInterruption({
        prepared: tracked.prepared,
        state: tracked.state,
        diagnosticCode,
        diagnostic: terminalDiagnostic,
      }),
    );
  };

  const handleStreamEventV1 = (
    tracked: TrackedProgramAgentRunV1,
    event: AgentSessionStreamEventV1,
  ): void => {
    if (!trackedByProductRunId.has(tracked.prepared.run.agentRunId)) return;
    const adapter = tracked.facade.adapter;
    if (adapter === null) {
      failTrackedRunV1(
        tracked,
        "protocol_invalid",
        diagnosticV1("protocol_invalid", "/run/adapter"),
      );
      return;
    }
    const transition = adapter.projectStream({
      prepared: tracked.prepared,
      state: tracked.state,
      event,
    });
    switch (transition.kind) {
      case "ignored":
        return;
      case "active":
        tracked.state = transition.state;
        publish();
        return;
      case "terminal":
        settleTrackedRunV1(tracked, transition.terminal);
        if (transition.cancelRemote) {
          void client.cancel({ sessionId: tracked.sessionId, runId: event.runId });
        }
        return;
    }
  };

  const bufferStreamEventV1 = (
    key: string,
    event: AgentSessionStreamEventV1,
  ): void => {
    if (pendingStreamEventCount >= programAgentPendingStreamEventMaximumV1) {
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
    const acceptedRuns: TrackedProgramAgentRunV1[] = [];
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
      failTrackedRunV1(tracked, "protocol_invalid", nextDiagnostic);
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
    const acceptedRuns: TrackedProgramAgentRunV1[] = [];
    for (const tracked of interrupted) {
      if (tracked.piRunId === null) removeTrackedRunV1(tracked);
      else acceptedRuns.push(tracked);
    }
    if (acceptedRuns.length === 0) {
      failFacadeV1(connectionFailureDiagnostic);
      return;
    }
    for (const tracked of acceptedRuns) {
      failTrackedRunV1(
        tracked,
        "connection_failed",
        diagnosticV1("connection_failed", "/workspace/host"),
      );
    }
    workspacePhase = "failed";
    workspaceDiagnostic = hostFailureDiagnostic;
    publish();
  });

  const configureCredentialWithV1 = (
    begin: () => ReturnType<BrowserPiWorkerConnectorV1["configureCredential"]>,
  ): Promise<BrowserProgramAgentConfigureCredentialResultV1> => {
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
    const attempt = (async (): Promise<BrowserProgramAgentConfigureCredentialResultV1> => {
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
  ): Promise<BrowserProgramAgentConfigureCredentialResultV1> => {
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
  }): Promise<BrowserProgramAgentConfigureCredentialResultV1> =>
    configureCredentialWithV1(() => connector.configureCredentialHandoff(handoffInput));

  const testConnection = (
    selection?: BrowserPiModelSelectionV1 | null,
  ): Promise<BrowserProgramAgentTestConnectionResultV1> => {
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
    const attempt = (async (): Promise<BrowserProgramAgentTestConnectionResultV1> => {
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
  ): Promise<BrowserProgramAgentSelectModelResultV1> => {
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
  ): Promise<BrowserProgramAgentSelectReasoningEffortResultV1> => {
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

  const openWorkspaceForV1 = async (
    raw: {
      readonly processId: string;
      readonly programId: string;
      readonly workspaceId: string;
    },
  ): Promise<BrowserProgramAgentOpenWorkspaceResultV1> => {
    if (terminal || finishPromise !== null) {
      return {
        kind: "unavailable",
        diagnostic: workspaceDiagnosticV1("disposed", "/"),
      };
    }
    if (
      !identifierPatternV1.test(raw.processId) || !identifierPatternV1.test(raw.programId) ||
      !identifierPatternV1.test(raw.workspaceId)
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
      workspaceProcessId = null;
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
      const result = await connector.openWorkspace(
        { processId: raw.processId, workspaceId: raw.workspaceId },
      );
      if (result.programId !== raw.programId) {
        await connector.closeWorkspace(result.workspaceSessionId).catch(() => undefined);
        throw new TypeError("sillyos.program_agent.workspace_subject_mismatch");
      }
      adoptWorkspaceSnapshotV1(result);
      workspaceProcessId = raw.processId;
      publish();
      return { kind: "opened", descriptor: workspaceDescriptorV1(result) };
    } catch (error) {
      const mapped = mapWorkspaceFailureV1(error, "/workspace/open");
      if (!workspaceFailedV1()) {
        workspacePhase = previousPhase === "closed" && mapped.code === "workspace_busy"
          ? "closed"
          : "failed";
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
  ): Promise<BrowserProgramAgentCloseWorkspaceResultV1> => {
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
        throw new TypeError("sillyos.program_agent.workspace_close_mismatch");
      }
      adoptWorkspaceSnapshotV1(result);
      workspacePhase = "closed";
      workspaceProcessId = null;
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
  }): Promise<BrowserProgramAgentExportWorkspaceResultV1> => {
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
    raw: ProcessNetworkAccessV1,
  ): Promise<BrowserProgramAgentSynchronizeNetworkAccessResultV1> => {
    if (terminal || finishPromise !== null) {
      return { kind: "unavailable", diagnostic: diagnosticV1("disposed", "/networkAccess") };
    }
    const descriptor = workspaceDescriptor;
    if (
      descriptor === null || workspacePhase !== "open" || raw.processId !== workspaceProcessId
    ) {
      return {
        kind: "unavailable",
        diagnostic: diagnosticV1("request_failed", "/networkAccess/scope"),
      };
    }
    const expectedEpoch = lifecycleEpoch;
    try {
      await connector.replaceNetworkAccess({
        access: cloneProcessNetworkAccessV1(raw),
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

  const finish = (finalPhase: "forgotten" | "disposed"): Promise<void> => {
    if (terminal) return Promise.resolve();
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
      for (const facade of facades) {
        facade.terminalRuns = [];
        facade.diagnostic = null;
      }
      diagnostic = null;
      connectionFailureDiagnostic = null;
      phase = finalPhase;
      workspacePhase = finalPhase;
      workspaceDescriptor = null;
      workspaceProcessId = null;
      workspaceReceipts = [];
      workspaceLastReceipt = null;
      workspaceAcknowledgementSettlement = null;
      workspaceDiagnostic = null;
      publish();
      for (const facade of facades) {
        facade.listeners.clear();
        facade.adapter = null;
        facade.adapterLoadPromise = null;
      }
      facades.clear();
    })();
    finishPromise = attempt;
    return attempt;
  };

  const hasTerminalRunIdV1 = (agentRunId: string): boolean =>
    [...facades].some((facade) => facade.terminalRuns.some(({ runId }) => runId === agentRunId));

  const terminalRunCountV1 = (): number =>
    [...facades].reduce((count, facade) => count + facade.terminalRuns.length, 0);

  const loadFacadeAdapterV1 = async (
    facade: ProgramAgentFacadeV1,
  ): Promise<BrowserProgramAgentAdapterV1 | null> => {
    if (!facades.has(facade)) return null;
    if (facade.adapter !== null) return facade.adapter;
    if (facade.adapterLoadPromise === null) {
      facade.adapterLoadPromise = facade.adapterLoad().then((adapter) => {
        if (facades.has(facade)) {
          facade.adapter = adapter;
          publish();
        }
        return adapter;
      });
    }
    try {
      return await facade.adapterLoadPromise;
    } catch {
      facade.adapterLoadPromise = null;
      facade.diagnostic = diagnosticV1("request_failed", "/run/runtime");
      publish();
      return null;
    }
  };

  const submitTrackedRunV1 = async (
    facade: ProgramAgentFacadeV1,
    prepared: BrowserProgramAgentPreparedRunV1,
  ): Promise<BrowserProgramAgentPortSubmitResultV1> => {
    const run = prepared.run;
    if (!facades.has(facade) || terminal || finishPromise !== null) {
      return { kind: "unavailable", diagnostic: diagnosticV1("disposed", "/") };
    }
    if (trackedByProductRunId.has(run.agentRunId) || hasTerminalRunIdV1(run.agentRunId)) {
      return {
        kind: "unavailable",
        diagnostic: diagnosticV1("submit_invalid", "/run/agentRunId"),
      };
    }
    if (
      trackedByProductRunId.size + terminalRunCountV1() >=
        programAgentUnacknowledgedTerminalDrainMaximumV1
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
    const submitWorkspace = workspaceDescriptor;
    if (
      workspacePhase !== "open" || submitWorkspace === null ||
      submitWorkspace.programId !== run.programId ||
      (prepared.requireWorkspaceGeneration &&
        submitWorkspace.generation !== run.workspaceGeneration)
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
    const tracked: TrackedProgramAgentRunV1 = {
      facade,
      prepared,
      sessionId: expectedSessionId,
      ordinal: nextRunOrdinal++,
      piRunId: null,
      state: prepared.state,
    };
    trackedByProductRunId.set(run.agentRunId, tracked);
    refreshFacadeV1();
    publish();
    let result: Awaited<ReturnType<typeof client.submit>>;
    try {
      result = await workspaceAuthority.withAgentSubmitAdmission({
        agentRunId: run.agentRunId,
        processAttemptGeneration: run.processAttemptGeneration,
        programPackage: run.programPackage,
        processId: run.processId,
        programId: run.programId,
        workspaceSessionId: submitWorkspace.workspaceSessionId,
        expectedCheckpointId: run.workspaceCheckpointId,
        expectedGeneration: run.workspaceGeneration,
        operation: async (access) => {
          await connector.replaceNetworkAccess({
            access,
            workspaceSessionId: submitWorkspace.workspaceSessionId,
          });
          return await client.submit({
            sessionId: expectedSessionId,
            text: prepared.serializedSubmit,
          });
        },
      });
    } catch {
      removeTrackedRunV1(tracked);
      refreshFacadeV1();
      const rejected = diagnosticV1("request_failed", "/workspace/submit/admission");
      diagnostic = rejected;
      publish();
      return { kind: "unavailable", diagnostic: rejected };
    }
    if (terminal || lifecycleEpoch !== expectedEpoch) {
      removeTrackedRunV1(tracked);
      return {
        kind: "unavailable",
        diagnostic: terminal
          ? diagnosticV1("disposed", "/")
          : connectionFailureDiagnostic ?? diagnosticV1("disposed", "/"),
      };
    }
    if (!trackedByProductRunId.has(run.agentRunId)) {
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
    return { kind: "submitted", agentRunId: run.agentRunId };
  };

  const submitProgramRunV1 = async (
    facade: ProgramAgentFacadeV1,
    rawRun: unknown,
  ): Promise<BrowserProgramAgentPortSubmitResultV1> => {
    if (!facades.has(facade)) {
      return { kind: "unavailable", diagnostic: diagnosticV1("disposed", "/") };
    }
    const adapter = await loadFacadeAdapterV1(facade);
    if (!facades.has(facade)) {
      return { kind: "unavailable", diagnostic: diagnosticV1("disposed", "/") };
    }
    if (adapter === null) {
      return { kind: "unavailable", diagnostic: diagnosticV1("request_failed", "/run/runtime") };
    }
    let admission;
    try {
      admission = await adapter.prepareRun(rawRun);
    } catch {
      return { kind: "unavailable", diagnostic: diagnosticV1("submit_invalid", "/run") };
    }
    if (admission.kind === "rejected") {
      return { kind: "unavailable", diagnostic: diagnosticV1("submit_invalid", "/run") };
    }
    return await submitTrackedRunV1(facade, admission.prepared);
  };

  const cancelRunV1 = async (
    facade: ProgramAgentFacadeV1,
    agentRunId?: string,
  ): Promise<BrowserProgramAgentPortCancelResultV1> => {
    if (terminal || finishPromise !== null) {
      return { kind: "unavailable", diagnostic: diagnosticV1("disposed", "/") };
    }
    if (agentRunId === undefined) return { kind: "idle" };
    const tracked = trackedByProductRunId.get(agentRunId);
    if (tracked === undefined || tracked.facade !== facade || tracked.piRunId === null) {
      return { kind: "idle" };
    }
    const result = await client.cancel({ sessionId: tracked.sessionId, runId: tracked.piRunId });
    if (result.kind !== "cancel_requested") {
      const mapped = mapCallFailureV1(result);
      diagnostic = mapped;
      publish();
      return { kind: "unavailable", diagnostic: mapped };
    }
    return { kind: "cancel_requested" };
  };

  const acknowledgeTerminalV1 = async (
    facade: ProgramAgentFacadeV1,
    agentRunId: string,
  ): Promise<BrowserProgramAgentAcknowledgeTerminalResultV1> => {
    if (!facade.terminalRuns.some(({ runId }) => runId === agentRunId)) return { kind: "idle" };
    const receiptWatermark = workspaceReceiptWatermarksByRunId.get(agentRunId) ?? 0;
    if (receiptWatermark > 0) {
      const workspaceAcknowledged = await acknowledgeWorkspaceReceiptWatermarkV1(receiptWatermark);
      if (workspaceAcknowledged.kind === "unavailable") {
        return { kind: "workspace_unavailable", diagnostic: workspaceAcknowledged.diagnostic };
      }
    }
    const index = facade.terminalRuns.findIndex(({ runId }) => runId === agentRunId);
    if (index < 0) return { kind: "idle" };
    facade.terminalRuns.splice(index, 1);
    facade.diagnostic = facade.terminalRuns.at(-1)?.diagnostic ?? null;
    workspaceReceiptWatermarksByRunId.delete(agentRunId);
    if (!terminal) refreshFacadeV1();
    publish();
    return { kind: "acknowledged" };
  };

  const revokeCredential = (): void => {
    if (!terminal) retireCredentialOwnerV1(true);
  };

  const detachFacadeV1 = (
    facade: ProgramAgentFacadeV1,
    finalPhase: "forgotten" | "disposed",
  ): Promise<void> => {
    if (finishPromise !== null) return finishPromise;
    if (terminal) return Promise.resolve();
    if (facade.detachPromise !== null) return facade.detachPromise;
    if (!facades.has(facade)) return Promise.resolve();
    const attempt = (async (): Promise<void> => {
      const remoteRuns: { readonly sessionId: string; readonly runId: string }[] = [];
      for (const tracked of [...trackedByProductRunId.values()]) {
        if (tracked.facade !== facade) continue;
        if (tracked.piRunId !== null) {
          remoteRuns.push({ sessionId: tracked.sessionId, runId: tracked.piRunId });
        }
        workspaceReceiptWatermarksByRunId.delete(tracked.prepared.run.agentRunId);
        removeTrackedRunV1(tracked);
      }
      for (const terminalRun of facade.terminalRuns) {
        workspaceReceiptWatermarksByRunId.delete(terminalRun.runId);
      }
      facade.terminalRuns = [];
      facade.diagnostic = null;
      facades.delete(facade);
      refreshFacadeV1();

      facade.revision += 1;
      const projection = {
        revision: facade.revision,
        phase: finalPhase,
        distribution: browserPiDistributionIdentityV1,
        activeRunId: null,
        activeState: null,
        terminalRuns: Object.freeze([]),
        diagnostic: null,
        workspace: Object.freeze({
          phase: finalPhase,
          descriptor: null,
          receipts: Object.freeze([]),
          lastReceipt: null,
          diagnostic: null,
        }) satisfies BrowserProgramAgentWorkspaceSnapshotV1,
      };
      facade.snapshot = facade.adapter === null
        ? facade.projectPendingSnapshot(projection)
        : facade.adapter.projectSnapshot(projection);
      for (const listener of [...facade.listeners]) {
        try {
          listener();
        } catch {
          // A detached Program observer cannot alter the shared Agent owner.
        }
      }
      facade.listeners.clear();
      facade.adapter = null;
      facade.adapterLoadPromise = null;
      publish();
      await Promise.all(
        remoteRuns.map(({ sessionId: remoteSessionId, runId }) =>
          client.cancel({ sessionId: remoteSessionId, runId }).catch(() => undefined)
        ),
      );
    })();
    facade.detachPromise = attempt;
    return attempt;
  };

  const createPort = (portInput: {
    readonly loadAdapter: BrowserProgramAgentAdapterLoadV1;
    readonly projectPendingSnapshot: ProgramAgentFacadeV1["projectPendingSnapshot"];
  }): BrowserProgramAgentPortV1 => {
    const facade: ProgramAgentFacadeV1 = {
      adapterLoad: portInput.loadAdapter,
      projectPendingSnapshot: portInput.projectPendingSnapshot,
      adapter: null,
      adapterLoadPromise: null,
      revision: 0,
      snapshot: Object.freeze({}),
      terminalRuns: [],
      diagnostic: null,
      listeners: new Set(),
      detachPromise: null,
    };
    facades.add(facade);
    rebuildSnapshotsV1();
    return Object.freeze({
      getSnapshot: () => facade.snapshot,
      subscribe: (listener: () => void) => {
        if (!facades.has(facade)) return () => {};
        facade.listeners.add(listener);
        return () => facade.listeners.delete(listener);
      },
      configureCredential: (apiKey: string) =>
        facades.has(facade) ? configureCredential(apiKey) : Promise.resolve({
          kind: "unavailable" as const,
          diagnostic: diagnosticV1("disposed", "/"),
        }),
      configureCredentialHandoff: (value: {
        readonly binding: CredentialVaultBindingV2;
        readonly handoff: BrowserPiCredentialHandoffV1;
      }) =>
        facades.has(facade) ? configureCredentialHandoff(value) : Promise.resolve({
          kind: "unavailable" as const,
          diagnostic: diagnosticV1("disposed", "/"),
        }),
      testConnection: (selection?: BrowserPiModelSelectionV1 | null) =>
        facades.has(facade) ? testConnection(selection) : Promise.resolve({
          kind: "unavailable" as const,
          diagnostic: diagnosticV1("disposed", "/"),
        }),
      selectModel: (selection: BrowserPiModelSelectionV1) =>
        facades.has(facade) ? selectModel(selection) : Promise.resolve({
          kind: "unavailable" as const,
          diagnostic: diagnosticV1("disposed", "/selection"),
        }),
      selectReasoningEffort: (effort: BrowserPiReasoningEffortV1) =>
        facades.has(facade) ? selectReasoningEffort(effort) : Promise.resolve({
          kind: "unavailable" as const,
          diagnostic: diagnosticV1("disposed", "/reasoningEffort"),
        }),
      openWorkspace: (value: {
        readonly processId: string;
        readonly programId: string;
        readonly workspaceId: string;
      }) =>
        facades.has(facade) ? openWorkspaceForV1(value) : Promise.resolve({
          kind: "unavailable" as const,
          diagnostic: workspaceDiagnosticV1("disposed", "/"),
        }),
      closeWorkspace: (workspaceSessionId?: string) =>
        facades.has(facade) ? closeWorkspace(workspaceSessionId) : Promise.resolve({
          kind: "unavailable" as const,
          diagnostic: workspaceDiagnosticV1("disposed", "/"),
        }),
      exportWorkspace: (value: Parameters<typeof exportWorkspace>[0]) =>
        facades.has(facade) ? exportWorkspace(value) : Promise.resolve({
          kind: "unavailable" as const,
          diagnostic: workspaceDiagnosticV1("disposed", "/workspace/export"),
        }),
      submit: (value: unknown) => submitProgramRunV1(facade, value),
      cancel: (agentRunId?: string) => cancelRunV1(facade, agentRunId),
      synchronizeNetworkAccess: (access: ProcessNetworkAccessV1) =>
        facades.has(facade) ? synchronizeNetworkAccess(access) : Promise.resolve({
          kind: "unavailable" as const,
          diagnostic: diagnosticV1("disposed", "/networkAccess"),
        }),
      acknowledgeTerminal: (agentRunId: string) => acknowledgeTerminalV1(facade, agentRunId),
      revokeCredential: () => {
        if (facades.has(facade)) revokeCredential();
      },
      forget: () => detachFacadeV1(facade, "forgotten"),
      dispose: () => detachFacadeV1(facade, "disposed"),
    });
  };
  const createControlPort = (): BrowserProgramAgentControlPortV1 => {
    const projectSnapshotV1 = (
      projection: Parameters<BrowserProgramAgentAdapterV1["projectSnapshot"]>[0],
    ): BrowserProgramAgentControlSnapshotV1 =>
      Object.freeze({
        revision: projection.revision,
        phase: projection.phase,
        distribution: projection.distribution,
        diagnostic: projection.diagnostic,
        workspace: projection.workspace,
      });
    const port = createPort({
      loadAdapter: async () => ({
        prepareRun: async () => ({ kind: "rejected" }),
        projectStream: () => ({ kind: "ignored" }),
        projectInterruption: () => {
          throw new TypeError("Program-neutral Agent control cannot own a run");
        },
        projectSnapshot: projectSnapshotV1,
      }),
      projectPendingSnapshot: projectSnapshotV1,
    });
    return Object.freeze({
      getSnapshot: () => port.getSnapshot() as BrowserProgramAgentControlSnapshotV1,
      subscribe: port.subscribe,
      configureCredential: port.configureCredential,
      configureCredentialHandoff: port.configureCredentialHandoff,
      testConnection: port.testConnection,
      selectModel: port.selectModel,
      selectReasoningEffort: port.selectReasoningEffort,
      revokeCredential: port.revokeCredential,
      forget: port.forget,
      dispose: port.dispose,
    });
  };
  return Object.freeze({
    createControlPort,
    createPort,
    forget: () => finish("forgotten"),
    dispose: () => finish("disposed"),
  });
}
