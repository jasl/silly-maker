// SPDX-License-Identifier: MIT

import {
  createBashTool,
  createEditTool,
  createReadTool,
  createWriteTool,
} from "./pi-workspace-runtime-bridge.js";

import {
  admitCreatorAgentSubmitTextV1,
  admitCreatorProgramRevisionCandidateV1,
} from "../product/creator-agent-admission.ts";
import {
  creatorAgentFinalReplyMaximumCharactersV1,
  type CreatorAgentSubmitV1,
  type CreatorProgramRevisionCandidateV1,
} from "../product/contracts.ts";
import {
  type WorkspaceAgentRunV1,
  type WorkspaceExecutionDescriptorV1,
  type WorkspaceMutationRecordV1,
} from "../workspace/index.ts";
import { browserPiDistributionIdentityV1 } from "./browser-pi-distribution.ts";
import {
  createBrowserPiProviderAgentV1,
  isBrowserPiSelectionAvailableV1,
  probeBrowserPiProviderSelectionV1,
  projectBrowserPiProviderCatalogV1,
} from "./browser-pi-provider-runtime-bridge.js";
import { createDeterministicPiAgentV1 } from "./browser-pi-runtime-bridge.js";
import {
  admitBrowserPiEngineRequestV1,
  admitBrowserPiWorkerInboundMessageV1,
  type BrowserPiWorkerAnyOutboundMessageV1,
  type BrowserPiWorkerExecutionBindingV1,
  type BrowserPiModelSelectionV1,
  type BrowserPiWorkerRuntimeV1,
  type BrowserPiWorkspaceFailureCodeV1,
  type BrowserPiWorkspaceMutationReceiptWireV1,
  type BrowserPiWorkspaceSnapshotWireV1,
} from "./browser-pi-worker-protocol.ts";
import {
  bindPiWorkspaceBashToolV1,
  bindPiWorkspaceEditToolV1,
  bindPiWorkspaceReadToolV1,
  bindPiWorkspaceWriteToolV1,
} from "./pi-workspace-tool-binder.ts";
import {
  createBrowserWorkspaceEnvironmentClientV1,
  type BrowserWorkspaceEnvironmentClientV1,
  type BrowserWorkspaceEnvironmentMessagePortV1,
} from "./browser-workspace-environment-client.ts";

type RunFailureCodeV1 =
  | "cancelled"
  | "replaced"
  | "draft_limit"
  | "candidate_missing"
  | "candidate_invalid"
  | "candidate_context_mismatch"
  | "candidate_duplicate"
  | "pi_failed";

interface ActivePiRunV1 {
  readonly sessionId: string;
  readonly runId: string;
  readonly agent: PiAgentPortV1;
  readonly workspaceRun: WorkspaceAgentRunV1;
  readonly workspaceSessionId: string;
  readonly admittedWorkspaceGeneration: number;
  sequence: number;
  draft: string;
  candidate: CreatorProgramRevisionCandidateV1 | null;
  candidateFailure:
    | "candidate_invalid"
    | "candidate_context_mismatch"
    | "candidate_duplicate"
    | null;
  requestedFailure: RunFailureCodeV1 | null;
  terminal: boolean;
  settlement: Promise<void> | null;
}

interface PiAgentPortV1 {
  prompt(text: string): Promise<{ readonly stopReason: "stop" | "error" | "aborted" }>;
  abort(): void;
  dispose(): void;
}

const providerProbeTimeoutMillisecondsV1 = 30_000;

export interface BrowserPiWorkerRuntimePortV1 {
  receive(message: unknown, ports?: readonly BrowserWorkspaceEnvironmentMessagePortV1[]): void;
  dispose(): void;
}

function selectionsShareCredentialScopeV1(
  configured: BrowserPiModelSelectionV1,
  requested: BrowserPiModelSelectionV1,
): boolean {
  if (configured.kind !== requested.kind) return false;
  if (configured.kind === "builtin" && requested.kind === "builtin") {
    return configured.providerId === requested.providerId &&
      configured.baseUrl === requested.baseUrl;
  }
  if (configured.kind !== "custom" || requested.kind !== "custom") return false;
  const configuredProfile = configured.profile;
  const requestedProfile = requested.profile;
  return configuredProfile.profileId === requestedProfile.profileId &&
    configuredProfile.displayName === requestedProfile.displayName &&
    configuredProfile.api === requestedProfile.api &&
    configuredProfile.baseUrl === requestedProfile.baseUrl &&
    configuredProfile.modelId === requestedProfile.modelId &&
    configuredProfile.contextWindow === requestedProfile.contextWindow &&
    configuredProfile.maxTokens === requestedProfile.maxTokens;
}

/**
 * The product-owned deterministic fixture exercises only the admitted Pi-native
 * read/write/edit/bash slice through the independent Workspace Sandbox. Live
 * Provider runs remain tool-less until their separate enablement gate.
 */
export function createBrowserPiWorkspaceToolsForRuntimeV1<T>(
  runtime: BrowserPiWorkerRuntimeV1,
  factories: readonly (() => T)[],
): readonly T[] {
  return runtime === "deterministic_test"
    ? Object.freeze(factories.map((factory) => factory()))
    : Object.freeze([]);
}

export function createBrowserPiWorkerRuntimeV1(input: {
  readonly postMessage: (message: BrowserPiWorkerAnyOutboundMessageV1) => void;
  readonly probeProviderSelection?: typeof probeBrowserPiProviderSelectionV1;
  readonly createProviderAgent?: typeof createBrowserPiProviderAgentV1;
}): BrowserPiWorkerRuntimePortV1 {
  const probeProviderSelection = input.probeProviderSelection ??
    probeBrowserPiProviderSelectionV1;
  const createProviderAgent = input.createProviderAgent ?? createBrowserPiProviderAgentV1;
  let credentialKey: string | null = null;
  let configuredRuntime: BrowserPiWorkerRuntimeV1 | null = null;
  let configuredSelection: BrowserPiModelSelectionV1 | null = null;
  let connectionTestInProgress = false;
  let connectionTestAbort: AbortController | null = null;
  let connectionReady = false;
  let disposed = false;
  let nextSessionId = 1;
  let nextRunId = 1;
  let activeSessionId: string | null = null;
  let activeRun: ActivePiRunV1 | null = null;
  let workspaceClient: BrowserWorkspaceEnvironmentClientV1 | null = null;
  let workspacePhase: "open" | "closed" = "closed";
  let operationQueue = Promise.resolve();
  const emittedWorkspaceReceipts = new Set<string>();

  const post = (message: BrowserPiWorkerAnyOutboundMessageV1): void => {
    // This is a Worker-port callback, not Window.postMessage.
    // oxlint-disable-next-line unicorn/require-post-message-target-origin -- Worker port has no targetOrigin
    if (!disposed) input.postMessage(message);
  };

  const enqueue = (operation: () => Promise<void> | void): void => {
    operationQueue = operationQueue.then(operation, operation).catch(() => undefined);
  };

  const postProtocolFailure = (
    code:
      | "invalid_message"
      | "already_configured"
      | "test_in_progress"
      | "distribution_mismatch",
  ): void => {
    post(Object.freeze({ revision: 1, kind: "protocol_failure", code }));
  };

  const respondRpcFailure = (
    requestId: number,
    code: "not_initialized" | "invalid_request" | "session_mismatch",
  ): void => {
    post(Object.freeze({ revision: 1, kind: "rpc_response", requestId, ok: false, code }));
  };

  const respondWorkspaceFailure = (
    requestId: number,
    code: BrowserPiWorkspaceFailureCodeV1,
  ): void => {
    post(Object.freeze({ revision: 1, kind: "workspace_response", requestId, ok: false, code }));
  };

  const emitRecord = (
    run: ActivePiRunV1,
    record: Readonly<Record<string, unknown>>,
  ): void => {
    if (run.terminal) return;
    run.sequence += 1;
    post(Object.freeze({
      revision: 1,
      kind: "rpc_record",
      record: Object.freeze({
        ...record,
        sessionId: run.sessionId,
        runId: run.runId,
        sequence: run.sequence,
      }),
    }));
  };

  const mutationReceiptWireV1 = (
    record: WorkspaceMutationRecordV1,
  ): BrowserPiWorkspaceMutationReceiptWireV1 =>
    Object.freeze({
      revision: 1,
      sequence: record.sequence,
      programId: record.programId,
      workspaceId: record.workspaceId,
      workspaceSessionId: record.workspaceSessionId,
      sessionId: record.piSessionId,
      runId: record.piRunId,
      toolCallId: record.toolCallId,
      tool: record.tool,
      expectedGeneration: record.expectedGeneration,
      baseGeneration: record.baseGeneration,
      resultingGeneration: record.resultingGeneration,
      outcome: record.outcome,
      effect: record.effect,
      changedPaths: Object.freeze([...record.changedPaths]),
      diagnosticCode: record.diagnosticCode,
    });

  const workspaceSnapshotV1 = (
    descriptor: WorkspaceExecutionDescriptorV1,
    phase: "open" | "closed",
  ): BrowserPiWorkspaceSnapshotWireV1 =>
    Object.freeze({
      revision: 1,
      phase,
      programId: descriptor.programId,
      workspaceId: descriptor.workspaceId,
      workspaceSessionId: descriptor.workspaceSessionId,
      generation: descriptor.generation,
      receipts: Object.freeze(
        (workspaceClient?.queryMutationRecords() ?? []).map(
          mutationReceiptWireV1,
        ),
      ),
    });

  const handleMutationRecordV1 = (record: WorkspaceMutationRecordV1): void => {
    queueMicrotask(() => {
      if (disposed) return;
      const key = `${record.workspaceSessionId}\u0000${String(record.sequence)}`;
      if (emittedWorkspaceReceipts.has(key)) return;
      emittedWorkspaceReceipts.add(key);
      post(Object.freeze({
        revision: 1,
        kind: "workspace_receipt",
        receipt: mutationReceiptWireV1(record),
      }));
    });
  };

  const flushWorkspaceReceipts = (run: ActivePiRunV1): void => {
    const records = workspaceClient?.queryMutationRecords() ?? [];
    for (const record of records) {
      if (record.piSessionId !== run.sessionId || record.piRunId !== run.runId) continue;
      const key = `${record.workspaceSessionId}\u0000${String(record.sequence)}`;
      if (emittedWorkspaceReceipts.has(key)) continue;
      emittedWorkspaceReceipts.add(key);
      post(Object.freeze({
        revision: 1,
        kind: "workspace_receipt",
        receipt: mutationReceiptWireV1(record),
      }));
    }
  };

  const settleRun = async (
    run: ActivePiRunV1,
    submitText: string,
  ): Promise<void> => {
    let outcome: Awaited<ReturnType<PiAgentPortV1["prompt"]>> | null = null;
    let promptFailed = false;
    try {
      outcome = await run.agent.prompt(submitText);
    } catch {
      promptFailed = true;
    }

    await run.workspaceRun.abortAndDrain();
    flushWorkspaceReceipts(run);
    let failure = run.requestedFailure;
    if (failure === null && run.candidateFailure !== null) failure = run.candidateFailure;
    if (failure === null && (promptFailed || outcome?.stopReason === "error")) {
      failure = "pi_failed";
    }
    if (failure === null && outcome?.stopReason === "aborted") failure = "cancelled";
    if (failure === null && run.candidate === null) failure = "candidate_missing";

    if (failure !== null) {
      emitRecord(run, { kind: "run_failed", code: failure });
    } else {
      emitRecord(run, { kind: "artifact_complete", candidate: run.candidate });
      emitRecord(run, { kind: "run_completed" });
    }
    run.terminal = true;
    run.workspaceRun.finish();
    run.agent.dispose();
    if (activeRun === run) activeRun = null;
  };

  const requestRunFailure = (
    run: ActivePiRunV1,
    code: RunFailureCodeV1,
  ): Promise<void> => {
    if (!run.terminal && run.requestedFailure === null) {
      run.requestedFailure = code;
      run.agent.abort();
      void run.workspaceRun.abortAndDrain();
    }
    return run.settlement ?? Promise.resolve();
  };

  const createRun = async (
    submit: CreatorAgentSubmitV1,
    execution: BrowserPiWorkerExecutionBindingV1,
    sessionId: string,
    runId: string,
  ): Promise<ActivePiRunV1 | null> => {
    const runtime = configuredRuntime;
    const apiKey = credentialKey;
    const selection = configuredSelection;
    const client = workspaceClient;
    if (
      runtime === null || apiKey === null || client === null || workspacePhase !== "open" ||
      (runtime === "pi_provider" && selection === null)
    ) {
      return null;
    }
    const begun = await client.beginAgentRun({
      binding: execution,
      piSessionId: sessionId,
      piRunId: runId,
    });
    if (begun.kind !== "started") return null;
    const workspaceRun = begun.run;
    const workspaceTools = createBrowserPiWorkspaceToolsForRuntimeV1(runtime, [
      () => bindPiWorkspaceReadToolV1(createReadTool(), workspaceRun),
      () => bindPiWorkspaceWriteToolV1(createWriteTool(), workspaceRun),
      () => bindPiWorkspaceEditToolV1(createEditTool(), workspaceRun),
      () => bindPiWorkspaceBashToolV1(createBashTool(), workspaceRun),
    ]);
    let run!: ActivePiRunV1;
    const agentInput = {
      submit,
      workspaceTools,
      onCandidate(value: unknown): void {
        if (activeRun !== run || run.terminal || run.requestedFailure !== null) {
          throw new Error("Creator run was cancelled");
        }
        if (run.candidate !== null) {
          run.candidateFailure = "candidate_duplicate";
          throw new Error("Only one Program revision candidate is allowed");
        }
        const admitted = admitCreatorProgramRevisionCandidateV1(value);
        if (admitted.kind === "rejected") {
          run.candidateFailure = "candidate_invalid";
          throw new TypeError(`Invalid Program revision candidate${admitted.path}`);
        }
        if (
          admitted.value.revision !== submit.revision ||
          admitted.value.proposalId !== submit.proposalId ||
          admitted.value.programId !== submit.programId ||
          admitted.value.baseProgramRevision !== submit.baseProgramRevision ||
          admitted.value.text !== submit.text
        ) {
          run.candidateFailure = "candidate_context_mismatch";
          throw new TypeError(
            "Program revision candidate does not match the admitted submit context",
          );
        }
        run.candidate = Object.freeze(admitted.value);
      },
      onTextDelta(delta: string): void {
        if (
          activeRun !== run || run.terminal || run.requestedFailure !== null || delta.length === 0
        ) return;
        if (run.draft.length + delta.length > creatorAgentFinalReplyMaximumCharactersV1) {
          void requestRunFailure(run, "draft_limit");
          return;
        }
        run.draft += delta;
        emitRecord(run, { kind: "artifact_chunk", text: delta });
      },
    };
    let agent: PiAgentPortV1;
    try {
      const runNumber = Number(runId.slice(runId.lastIndexOf(".") + 1));
      agent = (runtime === "deterministic_test"
        ? createDeterministicPiAgentV1({ ...agentInput, runNumber })
        : createProviderAgent({
          ...agentInput,
          apiKey,
          selection: selection as BrowserPiModelSelectionV1,
        })) as PiAgentPortV1;
    } catch {
      workspaceRun.finish();
      return null;
    }
    run = {
      sessionId,
      runId,
      agent,
      workspaceRun,
      workspaceSessionId: execution.workspaceSessionId,
      admittedWorkspaceGeneration: execution.expectedGeneration,
      sequence: 0,
      draft: "",
      candidate: null,
      candidateFailure: null,
      requestedFailure: null,
      terminal: false,
      settlement: null,
    };
    return run;
  };

  type SubmitRequestV1 = Extract<
    NonNullable<ReturnType<typeof admitBrowserPiEngineRequestV1>>,
    { method: "submit" }
  >;

  const handleSubmit = async (
    requestId: number,
    request: SubmitRequestV1,
    execution: BrowserPiWorkerExecutionBindingV1,
  ): Promise<void> => {
    if (disposed) return;
    if (activeSessionId === null || request.params.sessionId !== activeSessionId) {
      respondRpcFailure(requestId, "session_mismatch");
      return;
    }
    const admittedSubmit = admitCreatorAgentSubmitTextV1(request.params.text);
    if (admittedSubmit.kind === "rejected") {
      respondRpcFailure(requestId, "invalid_request");
      return;
    }
    const predecessor = activeRun;
    const client = workspaceClient;
    const descriptorBeforeDrain = client?.getDescriptor() ?? null;
    const matchesCurrentWorkspace = workspacePhase === "open" && descriptorBeforeDrain !== null &&
      descriptorBeforeDrain.programId === execution.programId &&
      descriptorBeforeDrain.workspaceId === execution.workspaceId &&
      descriptorBeforeDrain.workspaceSessionId === execution.workspaceSessionId;
    const followsUnpublishedPredecessorGeneration = predecessor !== null &&
      !predecessor.terminal &&
      predecessor.workspaceSessionId === execution.workspaceSessionId &&
      predecessor.admittedWorkspaceGeneration === execution.expectedGeneration;
    if (
      !matchesCurrentWorkspace ||
      (descriptorBeforeDrain.generation !== execution.expectedGeneration &&
        !followsUnpublishedPredecessorGeneration)
    ) {
      respondRpcFailure(requestId, "invalid_request");
      return;
    }
    if (predecessor !== null && !predecessor.terminal) {
      await requestRunFailure(predecessor, "replaced");
    }
    if (disposed || activeSessionId !== request.params.sessionId) return;
    const descriptorAfterDrain = workspaceClient?.getDescriptor() ?? null;
    if (
      descriptorAfterDrain === null ||
      descriptorAfterDrain.programId !== execution.programId ||
      descriptorAfterDrain.workspaceId !== execution.workspaceId ||
      descriptorAfterDrain.workspaceSessionId !== execution.workspaceSessionId
    ) {
      respondRpcFailure(requestId, "invalid_request");
      return;
    }
    const effectiveExecution = descriptorAfterDrain.generation === execution.expectedGeneration
      ? execution
      : Object.freeze({
        ...execution,
        expectedGeneration: descriptorAfterDrain.generation,
      });
    const runId = `sillyos.run.${String(nextRunId++)}`;
    const run = await createRun(
      admittedSubmit.value,
      effectiveExecution,
      request.params.sessionId,
      runId,
    );
    if (run === null) {
      respondRpcFailure(requestId, "invalid_request");
      return;
    }
    activeRun = run;
    post(Object.freeze({
      revision: 1,
      kind: "rpc_response",
      requestId,
      ok: true,
      response: Object.freeze({ kind: "submitted", runId }),
    }));
    run.settlement = Promise.resolve().then(() => settleRun(run, admittedSubmit.value.text));
  };

  type WorkspaceRequestV1 = Extract<
    NonNullable<ReturnType<typeof admitBrowserPiWorkerInboundMessageV1>>,
    { kind: "workspace_request" }
  >;

  const handleWorkspaceRequest = async (
    message: WorkspaceRequestV1,
    ports: readonly BrowserWorkspaceEnvironmentMessagePortV1[],
  ): Promise<void> => {
    if (!connectionReady || credentialKey === null) {
      respondWorkspaceFailure(message.requestId, "not_initialized");
      return;
    }
    const record = message.record;
    if (record.method === "attach_workspace") {
      const environmentPort = ports[0];
      if (ports.length !== 1 || environmentPort === undefined || workspacePhase === "open") {
        respondWorkspaceFailure(message.requestId, "workspace_busy");
        return;
      }
      workspaceClient?.dispose();
      emittedWorkspaceReceipts.clear();
      const descriptor: WorkspaceExecutionDescriptorV1 = Object.freeze({
        revision: 1,
        programId: record.descriptor.programId,
        workspaceId: record.descriptor.workspaceId,
        workspaceSessionId: record.descriptor.workspaceSessionId,
        generation: record.descriptor.expectedGeneration,
      });
      workspaceClient = createBrowserWorkspaceEnvironmentClientV1({
        port: environmentPort,
        descriptor,
        onMutationRecord: handleMutationRecordV1,
      });
      workspacePhase = "open";
      post(Object.freeze({
        revision: 1,
        kind: "workspace_response",
        requestId: message.requestId,
        ok: true,
        response: Object.freeze({
          method: "attach_workspace",
          snapshot: workspaceSnapshotV1(descriptor, "open"),
        }),
      }));
      return;
    }
    if (record.method === "close_workspace") {
      if (ports.length !== 0) {
        respondWorkspaceFailure(message.requestId, "invalid_request");
        return;
      }
      const client = workspaceClient;
      const descriptor = client?.getDescriptor() ?? null;
      if (
        client === null || descriptor === null ||
        descriptor.workspaceSessionId !== record.workspaceSessionId
      ) {
        respondWorkspaceFailure(message.requestId, "workspace_mismatch");
        return;
      }
      const run = activeRun;
      if (run !== null && !run.terminal && run.workspaceSessionId === record.workspaceSessionId) {
        await requestRunFailure(run, "cancelled");
      }
      workspacePhase = "closed";
      post(Object.freeze({
        revision: 1,
        kind: "workspace_response",
        requestId: message.requestId,
        ok: true,
        response: Object.freeze({
          method: "close_workspace",
          snapshot: workspaceSnapshotV1(client.getDescriptor(), "closed"),
        }),
      }));
      return;
    }
    if (ports.length !== 0) {
      respondWorkspaceFailure(message.requestId, "invalid_request");
      return;
    }
    const client = workspaceClient;
    const descriptor = client?.getDescriptor() ?? null;
    if (
      client === null || descriptor === null ||
      descriptor.workspaceSessionId !== record.workspaceSessionId
    ) {
      respondWorkspaceFailure(message.requestId, "workspace_mismatch");
      return;
    }
    if (record.method === "acknowledge_workspace_receipts") {
      if (
        !client.queryMutationRecords().some(({ sequence }) => sequence === record.throughSequence)
      ) {
        respondWorkspaceFailure(message.requestId, "receipt_sequence_invalid");
        return;
      }
      try {
        await client.acknowledgeMutationRecords(record.throughSequence);
      } catch {
        respondWorkspaceFailure(message.requestId, "workspace_failed");
        return;
      }
      post(Object.freeze({
        revision: 1,
        kind: "workspace_response",
        requestId: message.requestId,
        ok: true,
        response: Object.freeze({
          method: "acknowledge_workspace_receipts",
          throughSequence: record.throughSequence,
          snapshot: workspaceSnapshotV1(client.getDescriptor(), workspacePhase),
        }),
      }));
      return;
    }
    post(Object.freeze({
      revision: 1,
      kind: "workspace_response",
      requestId: message.requestId,
      ok: true,
      response: Object.freeze({
        method: "query_workspace",
        snapshot: workspaceSnapshotV1(client.getDescriptor(), workspacePhase),
      }),
    }));
  };

  const receive = (
    raw: unknown,
    ports: readonly BrowserWorkspaceEnvironmentMessagePortV1[] = [],
  ): void => {
    if (disposed) return;
    const message = admitBrowserPiWorkerInboundMessageV1(raw);
    if (message === null) {
      postProtocolFailure("invalid_message");
      return;
    }
    if (message.kind === "catalog_request") {
      if (
        ports.length !== 0 || connectionTestInProgress || configuredRuntime !== null ||
        credentialKey !== null
      ) {
        postProtocolFailure("invalid_message");
        return;
      }
      try {
        post(Object.freeze({
          revision: 1,
          kind: "catalog_response",
          requestId: message.requestId,
          ok: true,
          catalog: projectBrowserPiProviderCatalogV1(),
        }));
      } catch {
        post(Object.freeze({
          revision: 1,
          kind: "catalog_response",
          requestId: message.requestId,
          ok: false,
          code: "catalog_unavailable",
        }));
      }
      return;
    }
    if (message.kind === "configure") {
      if (
        ports.length !== 0 || connectionTestInProgress || configuredRuntime !== null ||
        credentialKey !== null
      ) {
        postProtocolFailure("already_configured");
        return;
      }
      if (
        message.runtime === "pi_provider" &&
        (message.selection === null || !isBrowserPiSelectionAvailableV1(message.selection))
      ) {
        post(Object.freeze({
          revision: 1,
          kind: "configuration_failure",
          requestId: message.requestId,
          code: "selection_unavailable",
        }));
        return;
      }
      const selection = message.selection;
      credentialKey = message.credential.value;
      configuredRuntime = message.runtime;
      configuredSelection = selection;
      connectionReady = true;
      post(Object.freeze({
        revision: 1,
        kind: "configured",
        requestId: message.requestId,
        runtime: message.runtime,
        selection,
        distribution: browserPiDistributionIdentityV1,
      }));
      return;
    }
    if (message.kind === "test_connection") {
      if (ports.length !== 0) {
        postProtocolFailure("invalid_message");
        return;
      }
      const runtime = configuredRuntime;
      const selection = configuredSelection;
      const credential = credentialKey;
      if (runtime === null || credential === null) {
        post(Object.freeze({
          revision: 1,
          kind: "connection_test_failure",
          requestId: message.requestId,
          code: "not_configured",
        }));
        return;
      }
      if (connectionTestInProgress) {
        postProtocolFailure("test_in_progress");
        return;
      }
      if (runtime === "deterministic_test") {
        connectionReady = true;
        post(Object.freeze({
          revision: 1,
          kind: "ready",
          requestId: message.requestId,
          runtime,
          selection: null,
          distribution: browserPiDistributionIdentityV1,
        }));
        return;
      }
      if (selection === null) {
        post(Object.freeze({
          revision: 1,
          kind: "connection_test_failure",
          requestId: message.requestId,
          code: "connection_failed",
        }));
        return;
      }
      const previouslyReady = connectionReady;
      const abort = new AbortController();
      connectionTestInProgress = true;
      connectionTestAbort = abort;
      enqueue(async () => {
        let verified = false;
        let timeout: ReturnType<typeof setTimeout> | null = null;
        try {
          const timedOut = new Promise<boolean>((resolve) => {
            timeout = setTimeout(() => {
              abort.abort();
              resolve(false);
            }, providerProbeTimeoutMillisecondsV1);
          });
          verified = await Promise.race([
            probeProviderSelection({
              apiKey: credential,
              selection,
              signal: abort.signal,
            }),
            timedOut,
          ]);
        } catch {
          verified = false;
        } finally {
          if (timeout !== null) clearTimeout(timeout);
          try {
            if (!disposed && verified && !abort.signal.aborted) {
              connectionReady = true;
              post(Object.freeze({
                revision: 1,
                kind: "ready",
                requestId: message.requestId,
                runtime,
                selection,
                distribution: browserPiDistributionIdentityV1,
              }));
            } else if (!disposed) {
              connectionReady = previouslyReady;
              post(Object.freeze({
                revision: 1,
                kind: "connection_test_failure",
                requestId: message.requestId,
                code: "connection_failed",
              }));
            }
          } finally {
            if (connectionTestAbort === abort) connectionTestAbort = null;
            connectionTestInProgress = false;
          }
        }
      });
      return;
    }
    if (message.kind === "select_model") {
      if (ports.length !== 0) {
        postProtocolFailure("invalid_message");
        return;
      }
      const respondUnavailable = (
        code:
          | "not_configured"
          | "selection_unavailable"
          | "credential_scope_mismatch"
          | "busy",
      ): void => {
        post(Object.freeze({
          revision: 1,
          kind: "model_selection_failure",
          requestId: message.requestId,
          code,
        }));
      };
      if (
        configuredRuntime !== "pi_provider" || credentialKey === null ||
        configuredSelection === null
      ) {
        respondUnavailable("not_configured");
        return;
      }
      if (connectionTestInProgress) {
        respondUnavailable("busy");
        return;
      }
      enqueue(() => {
        const currentSelection = configuredSelection;
        if (
          configuredRuntime !== "pi_provider" || credentialKey === null ||
          currentSelection === null
        ) {
          respondUnavailable("not_configured");
          return;
        }
        if (connectionTestInProgress || (activeRun !== null && !activeRun.terminal)) {
          respondUnavailable("busy");
          return;
        }
        if (!selectionsShareCredentialScopeV1(currentSelection, message.selection)) {
          respondUnavailable("credential_scope_mismatch");
          return;
        }
        if (!isBrowserPiSelectionAvailableV1(message.selection)) {
          respondUnavailable("selection_unavailable");
          return;
        }
        configuredSelection = message.selection;
        post(Object.freeze({
          revision: 1,
          kind: "model_selected",
          requestId: message.requestId,
          selection: message.selection,
        }));
      });
      return;
    }
    if (message.kind === "workspace_request") {
      enqueue(() => handleWorkspaceRequest(message, ports));
      return;
    }
    if (!connectionReady || credentialKey === null) {
      respondRpcFailure(message.requestId, "not_initialized");
      return;
    }
    const request = admitBrowserPiEngineRequestV1(message.record);
    if (request === null) {
      respondRpcFailure(message.requestId, "invalid_request");
      return;
    }
    if (request.method === "start") {
      enqueue(async () => {
        const predecessor = activeRun;
        if (predecessor !== null && !predecessor.terminal) {
          await requestRunFailure(predecessor, "replaced");
        }
        activeRun = null;
        activeSessionId = `sillyos.session.${String(nextSessionId++)}`;
        post(Object.freeze({
          revision: 1,
          kind: "rpc_response",
          requestId: message.requestId,
          ok: true,
          response: Object.freeze({ kind: "started", sessionId: activeSessionId }),
        }));
      });
      return;
    }
    if (activeSessionId === null || request.params.sessionId !== activeSessionId) {
      respondRpcFailure(message.requestId, "session_mismatch");
      return;
    }
    if (request.method === "cancel") {
      const run = activeRun;
      if (run === null || run.runId !== request.params.runId) {
        respondRpcFailure(message.requestId, "session_mismatch");
        return;
      }
      post(Object.freeze({
        revision: 1,
        kind: "rpc_response",
        requestId: message.requestId,
        ok: true,
        response: Object.freeze({ kind: "cancel_requested" }),
      }));
      void requestRunFailure(run, "cancelled");
      return;
    }
    if (!("execution" in message)) {
      respondRpcFailure(message.requestId, "invalid_request");
      return;
    }
    enqueue(() => handleSubmit(message.requestId, request, message.execution));
  };

  return {
    receive,
    dispose(): void {
      if (disposed) return;
      disposed = true;
      connectionTestAbort?.abort();
      connectionTestAbort = null;
      connectionTestInProgress = false;
      credentialKey = null;
      configuredRuntime = null;
      configuredSelection = null;
      connectionReady = false;
      const run = activeRun;
      activeRun = null;
      activeSessionId = null;
      if (run !== null && !run.terminal) {
        run.requestedFailure ??= "cancelled";
        run.agent.abort();
        void run.workspaceRun.abortAndDrain();
        run.agent.dispose();
      }
      workspacePhase = "closed";
      workspaceClient?.dispose();
      workspaceClient = null;
    },
  };
}

export { creatorProgramRevisionToolNameV1 } from "./browser-pi-runtime-bridge.js";
