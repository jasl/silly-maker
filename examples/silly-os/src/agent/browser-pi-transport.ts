// SPDX-License-Identifier: MIT

import type {
  AgentSessionCancelInputV1,
  AgentSessionConnectionV1,
  AgentSessionConnectorV1,
  AgentSessionSubmitInputV1,
} from "@sillymaker/agent/session";

// Vite supplies the default URL export for this query module at build time.
// oxlint-disable-next-line import/default
import browserPiWorkerUrlV1 from "./browser-pi.worker.ts?worker&url";

import type {
  BrowserProgramWorkspaceAuthorityV1,
  BrowserProgramWorkspaceFatalV1,
} from "../product/browser-program-workspace-authority.ts";
import type { ProgramNetworkAccessV1 } from "../product/program-network-access.ts";
import type { BrowserWorkspaceHostSnapshotWireV1 } from "../workspace/browser-workspace-host-protocol.ts";
import type { BrowserNetworkBrokerLeaseV1 } from "../network/browser-network-broker-frame-transport.ts";
import {
  credentialVaultBindingsEqualV2,
  normalizeCredentialVaultBindingV2,
  type CredentialVaultBindingV2,
} from "../credential/credential-vault-contracts.ts";
import { credentialVaultBindingForSelectionV2 } from "../credential/provider-credential-binding.ts";
import {
  admitBrowserPiWorkerSessionRequestV1,
  admitBrowserPiWorkerAnyOutboundMessageV1,
  browserPiDefaultReasoningEffortV1,
  browserPiSelectionEndpointOriginV1,
  isBrowserPiReasoningEffortV1,
  type BrowserPiModelSelectionFailureCodeV1,
  type BrowserPiReasoningEffortSelectionFailureCodeV1,
  type BrowserPiReasoningEffortV1,
  type BrowserPiWorkerConfigureV1,
  type BrowserPiModelSelectionV1,
  type BrowserPiWorkspaceMutationReceiptWireV1,
  type BrowserPiWorkspaceRequestRecordV1,
  type BrowserPiWorkspaceSnapshotWireV1,
} from "./browser-pi-worker-protocol.ts";

type BrowserPiWorkerMessageListenerV1 = (event: { readonly data: unknown }) => void;
type BrowserPiWorkerErrorListenerV1 = (event: unknown) => void;

export interface BrowserPiWorkerLikeV1 {
  postMessage(message: unknown, transfer?: Transferable[]): void;
  addEventListener(type: "message", listener: BrowserPiWorkerMessageListenerV1): void;
  addEventListener(type: "error", listener: BrowserPiWorkerErrorListenerV1): void;
  removeEventListener(type: "message", listener: BrowserPiWorkerMessageListenerV1): void;
  removeEventListener(type: "error", listener: BrowserPiWorkerErrorListenerV1): void;
  terminate(): void;
}

export type BrowserPiWorkerFactoryV1 = (input: {
  readonly endpointOrigin: string | null;
}) => BrowserPiWorkerLikeV1;

export type BrowserPiOpenNetworkBrokerV1 = () => Promise<BrowserNetworkBrokerLeaseV1>;

export type BrowserPiCredentialHandoffV1 = (
  binding: CredentialVaultBindingV2,
  handoffId: string,
  deliveryPort: MessagePort,
) => Promise<void>;

export interface BrowserPiWorkspaceFailureV1 {
  readonly revision: 1;
  readonly code: BrowserProgramWorkspaceFatalV1["code"];
  readonly programId: string;
  readonly workspaceId: string;
  readonly workspaceSessionId: string;
  readonly generation: number;
}

export type BrowserPiWorkerSelectModelResultV1 =
  | {
    readonly kind: "selected";
    readonly selection: BrowserPiModelSelectionV1;
    readonly effectiveReasoningEffort: BrowserPiReasoningEffortV1;
  }
  | {
    readonly kind: "unavailable";
    readonly reason: BrowserPiModelSelectionFailureCodeV1;
  };

export type BrowserPiWorkerSetReasoningEffortResultV1 =
  | {
    readonly kind: "selected";
    readonly preferredReasoningEffort: BrowserPiReasoningEffortV1;
    readonly effectiveReasoningEffort: BrowserPiReasoningEffortV1;
  }
  | {
    readonly kind: "unavailable";
    readonly reason: BrowserPiReasoningEffortSelectionFailureCodeV1;
  };

export interface BrowserPiWorkerConnectorV1 extends AgentSessionConnectorV1 {
  configureCredential(apiKey: string): Promise<
    | {
      readonly kind: "configured";
      readonly effectiveReasoningEffort: BrowserPiReasoningEffortV1;
    }
    | { readonly kind: "unavailable"; readonly reason: "failed" }
  >;
  configureCredentialHandoff(input: {
    readonly binding: CredentialVaultBindingV2;
    readonly handoff: BrowserPiCredentialHandoffV1;
  }): Promise<
    | {
      readonly kind: "configured";
      readonly effectiveReasoningEffort: BrowserPiReasoningEffortV1;
    }
    | { readonly kind: "unavailable"; readonly reason: "failed" }
  >;
  testConnection(selection?: BrowserPiModelSelectionV1 | null): Promise<
    { readonly kind: "ready" } | { readonly kind: "unavailable"; readonly reason: "failed" }
  >;
  selectModel(selection: BrowserPiModelSelectionV1): Promise<BrowserPiWorkerSelectModelResultV1>;
  setReasoningEffort(
    preferredReasoningEffort: BrowserPiReasoningEffortV1,
  ): Promise<BrowserPiWorkerSetReasoningEffortResultV1>;
  openWorkspace(input: {
    readonly programId: string;
    readonly workspaceId: string;
  }): Promise<BrowserPiWorkspaceSnapshotWireV1>;
  closeWorkspace(workspaceSessionId: string): Promise<BrowserPiWorkspaceSnapshotWireV1>;
  queryWorkspace(workspaceSessionId: string): Promise<BrowserPiWorkspaceSnapshotWireV1>;
  acknowledgeWorkspaceReceipts(input: {
    readonly workspaceSessionId: string;
    readonly throughSequence: number;
  }): Promise<BrowserPiWorkspaceSnapshotWireV1>;
  replaceNetworkAccess(input: {
    readonly access: ProgramNetworkAccessV1;
    readonly workspaceSessionId: string;
  }): Promise<BrowserPiWorkspaceSnapshotWireV1>;
  subscribeWorkspaceReceipts(
    listener: (receipt: BrowserPiWorkspaceMutationReceiptWireV1) => void,
  ): () => void;
  subscribeWorkspaceFailures(
    listener: (failure: BrowserPiWorkspaceFailureV1) => void,
  ): () => void;
  /** Immediately terminates the Worker that owns the in-memory credential. */
  revokeCredential(): void;
  /** Terminates the configured or connected Worker and clears its in-memory credential. */
  forget(): Promise<void>;
}

interface PendingCallV1 {
  readonly method:
    | "start"
    | "submit"
    | "cancel"
    | BrowserPiWorkspaceRequestRecordV1["method"];
  readonly resolve: (value: unknown) => void;
  readonly reject: (reason: Error) => void;
}

type BufferedWorkerEventV1 =
  | { readonly kind: "session_event"; readonly candidate: unknown }
  | {
    readonly kind: "workspace_receipt";
    readonly receipt: BrowserPiWorkspaceMutationReceiptWireV1;
  };

interface ConnectionStateV1 {
  readonly worker: BrowserPiWorkerLikeV1;
  readonly networkBrokerLease: BrowserNetworkBrokerLeaseV1;
  readonly whenClosed: Promise<void>;
  readonly resolveClosed: () => void;
  readonly pending: Map<number, PendingCallV1>;
  readonly bufferedEvents: BufferedWorkerEventV1[];
  onEvent: ((record: unknown) => void) | null;
  setup:
    | {
      readonly kind: "configure";
      readonly requestId: number;
      readonly resolve: (accepted: boolean) => void;
    }
    | {
      readonly kind: "test_connection";
      readonly requestId: number;
      readonly selection: BrowserPiModelSelectionV1 | null;
      readonly resolve: (accepted: boolean) => void;
    }
    | {
      readonly kind: "select_model";
      readonly requestId: number;
      readonly selection: BrowserPiModelSelectionV1;
      readonly resolve: (result: BrowserPiWorkerSelectModelResultV1) => void;
    }
    | {
      readonly kind: "set_reasoning_effort";
      readonly requestId: number;
      readonly preferredReasoningEffort: BrowserPiReasoningEffortV1;
      readonly resolve: (result: BrowserPiWorkerSetReasoningEffortResultV1) => void;
    }
    | null;
  messageListener: BrowserPiWorkerMessageListenerV1;
  errorListener: BrowserPiWorkerErrorListenerV1;
  cancelSetupTimer: (() => void) | null;
  nextCallId: number;
  pendingSubmitGates: number;
  activeWorkspace: BrowserPiWorkspaceSnapshotWireV1 | null;
  workspaceReceiptSequence: number;
  activeSelection: BrowserPiModelSelectionV1 | null;
  activePreferredReasoningEffort: BrowserPiReasoningEffortV1;
  activeEffectiveReasoningEffort: BrowserPiReasoningEffortV1 | null;
  credentialAccepted: boolean;
  connectionIssued: boolean;
  ready: boolean;
  closed: boolean;
}

const readyTimeoutMillisecondsV1 = 35_000;
const bufferedRecordMaximumV1 = 2_048;
const credentialMaximumCharactersV1 = 64 * 1024;

export function createDefaultBrowserPiWorkerV1(input: {
  readonly endpointOrigin: string | null;
}): BrowserPiWorkerLikeV1 {
  let workerUrlReference = browserPiWorkerUrlV1;
  if (input.endpointOrigin !== null) {
    const endpoint = new URL(input.endpointOrigin);
    if (
      endpoint.protocol !== "https:" || endpoint.origin !== input.endpointOrigin ||
      endpoint.pathname !== "/" || endpoint.search.length !== 0 || endpoint.hash.length !== 0 ||
      endpoint.username.length !== 0 || endpoint.password.length !== 0
    ) throw transportErrorV1("endpoint_origin_invalid");
    const separator = workerUrlReference.includes("?") ? "&" : "?";
    workerUrlReference += `${separator}endpoint-origin=${encodeURIComponent(input.endpointOrigin)}`;
  }
  const workerUrl = new URL(workerUrlReference, import.meta.url);
  return new Worker(workerUrl, {
    type: "module",
    name: "sillyos-browser-pi",
  }) as unknown as BrowserPiWorkerLikeV1;
}

function copySelectionV1(
  selection: BrowserPiModelSelectionV1,
): BrowserPiModelSelectionV1 {
  return selection.kind === "builtin"
    ? Object.freeze({
      kind: "builtin",
      providerId: selection.providerId,
      modelId: selection.modelId,
      api: selection.api,
      baseUrl: selection.baseUrl,
    })
    : Object.freeze({
      kind: "custom",
      profile: Object.freeze({ ...selection.profile }),
    });
}

function selectionsEqualV1(
  left: BrowserPiModelSelectionV1 | null,
  right: BrowserPiModelSelectionV1 | null,
): boolean {
  if (left === null || right === null) return left === right;
  if (left.kind !== right.kind) return false;
  if (left.kind === "builtin" && right.kind === "builtin") {
    return left.providerId === right.providerId && left.modelId === right.modelId &&
      left.api === right.api && left.baseUrl === right.baseUrl;
  }
  if (left.kind !== "custom" || right.kind !== "custom") return false;
  const leftProfile = left.profile;
  const rightProfile = right.profile;
  return leftProfile.profileId === rightProfile.profileId &&
    leftProfile.displayName === rightProfile.displayName && leftProfile.api === rightProfile.api &&
    leftProfile.baseUrl === rightProfile.baseUrl && leftProfile.modelId === rightProfile.modelId &&
    leftProfile.contextWindow === rightProfile.contextWindow &&
    leftProfile.maxTokens === rightProfile.maxTokens;
}

function transportErrorV1(code: string): TypeError {
  return new TypeError(`sillyos.browser_pi_transport.${code}`);
}

function isWorkspaceMethodV1(method: PendingCallV1["method"]): boolean {
  return method.endsWith("_workspace") || method === "acknowledge_workspace_receipts" ||
    method === "replace_network_access";
}

function hostDescriptorMatchesPiSnapshotV1(
  host: BrowserWorkspaceHostSnapshotWireV1,
  pi: BrowserPiWorkspaceSnapshotWireV1,
): boolean {
  return host.phase === pi.phase && host.descriptor.programId === pi.programId &&
    host.descriptor.workspaceId === pi.workspaceId &&
    host.descriptor.workspaceSessionId === pi.workspaceSessionId &&
    host.descriptor.generation === pi.generation;
}

function executionBindingFromHostV1(
  host: BrowserWorkspaceHostSnapshotWireV1,
): Extract<BrowserPiWorkspaceRequestRecordV1, { readonly method: "attach_workspace" }>[
  "descriptor"
] {
  return Object.freeze({
    revision: 1,
    programId: host.descriptor.programId,
    workspaceId: host.descriptor.workspaceId,
    workspaceSessionId: host.descriptor.workspaceSessionId,
    expectedGeneration: host.descriptor.generation,
  });
}

export function createBrowserPiWorkerConnectorV1({
  openNetworkBroker,
  runtime,
  selection: suppliedSelection = null,
  preferredReasoningEffort: suppliedPreferredReasoningEffort = browserPiDefaultReasoningEffortV1,
  workspaceAuthority,
  workerFactory = createDefaultBrowserPiWorkerV1,
  createCredentialHandoffId = () => `credential.handoff.${crypto.randomUUID()}`,
}:
  & {
    readonly openNetworkBroker: BrowserPiOpenNetworkBrokerV1;
    readonly workspaceAuthority: BrowserProgramWorkspaceAuthorityV1;
    readonly workerFactory?: BrowserPiWorkerFactoryV1;
    readonly createCredentialHandoffId?: () => string;
    readonly preferredReasoningEffort?: BrowserPiReasoningEffortV1;
  }
  & (
    | { readonly runtime: "deterministic_test"; readonly selection?: null }
    | { readonly runtime: "pi_provider"; readonly selection: BrowserPiModelSelectionV1 }
  )): BrowserPiWorkerConnectorV1 {
  const preferredReasoningEffort = isBrowserPiReasoningEffortV1(suppliedPreferredReasoningEffort)
    ? suppliedPreferredReasoningEffort
    : browserPiDefaultReasoningEffortV1;
  const selection = suppliedSelection === null ? null : copySelectionV1(suppliedSelection);
  const endpointOrigin = selection === null ? null : browserPiSelectionEndpointOriginV1(selection);
  const selectionHasValidEndpoint = selection === null || endpointOrigin !== null;
  const expectedCredentialBinding = selection === null
    ? null
    : credentialVaultBindingForSelectionV2(selection);
  let activeState: ConnectionStateV1 | null = null;
  let credentialRevoked = false;
  let workspaceEnvironmentDetachSettlement = Promise.resolve();
  const workspaceReceiptListeners = new Set<
    (receipt: BrowserPiWorkspaceMutationReceiptWireV1) => void
  >();
  const workspaceFailureListeners = new Set<(failure: BrowserPiWorkspaceFailureV1) => void>();
  const detachWorkspaceEnvironment = (workspaceSessionId: string): Promise<void> => {
    const settlement = workspaceEnvironmentDetachSettlement.then(() =>
      workspaceAuthority.detachWorkspaceEnvironment(workspaceSessionId)
    );
    workspaceEnvironmentDetachSettlement = settlement.catch(() => undefined);
    return settlement;
  };

  const closeState = (
    state: ConnectionStateV1,
    reason: string,
    options: {
      readonly detachEnvironment?: boolean;
    } = {},
  ): void => {
    if (state.closed) return;
    state.closed = true;
    state.resolveClosed();
    const workspaceSessionId = state.activeWorkspace?.phase === "open"
      ? state.activeWorkspace.workspaceSessionId
      : null;
    if (state.cancelSetupTimer !== null) {
      state.cancelSetupTimer();
      state.cancelSetupTimer = null;
    }
    state.worker.removeEventListener("message", state.messageListener);
    state.worker.removeEventListener("error", state.errorListener);
    for (const pending of state.pending.values()) {
      pending.reject(transportErrorV1(reason));
    }
    state.pending.clear();
    state.bufferedEvents.length = 0;
    if (state.setup?.kind === "select_model") {
      state.setup.resolve({ kind: "unavailable", reason: "not_configured" });
    } else if (state.setup?.kind === "set_reasoning_effort") {
      state.setup.resolve({ kind: "unavailable", reason: "not_configured" });
    } else state.setup?.resolve(false);
    state.setup = null;
    try {
      state.worker.terminate();
    } catch {
      // Termination is best-effort after the Worker has become unreachable.
    }
    try {
      state.networkBrokerLease.terminate();
    } catch {
      // Broker teardown is best-effort after either realm has failed.
    }
    if (options.detachEnvironment !== false && workspaceSessionId !== null) {
      void detachWorkspaceEnvironment(workspaceSessionId).catch(() => undefined);
    }
    if (activeState === state) activeState = null;
  };

  const unsubscribeWorkspaceAuthorityFatal = workspaceAuthority.subscribeFatal((fatal) => {
    const state = activeState;
    if (state === null || state.closed) return;
    const workspace = state.activeWorkspace?.phase === "open" ? state.activeWorkspace : null;
    closeState(state, "workspace_host_unavailable");
    if (workspace === null) return;
    const failure = Object.freeze(
      {
        revision: 1,
        code: fatal.code,
        programId: workspace.programId,
        workspaceId: workspace.workspaceId,
        workspaceSessionId: workspace.workspaceSessionId,
        generation: workspace.generation,
      } satisfies BrowserPiWorkspaceFailureV1,
    );
    for (const listener of [...workspaceFailureListeners]) {
      try {
        listener(failure);
      } catch {
        // Workspace failure observers cannot change transport lifecycle.
      }
    }
  });

  const settleSetupV1 = (state: ConnectionStateV1, accepted: boolean): void => {
    const setup = state.setup;
    if (
      setup === null || setup.kind === "select_model" || setup.kind === "set_reasoning_effort"
    ) return;
    state.setup = null;
    if (state.cancelSetupTimer !== null) {
      state.cancelSetupTimer();
      state.cancelSetupTimer = null;
    }
    setup.resolve(accepted);
  };

  const settleModelSelectionV1 = (
    state: ConnectionStateV1,
    result: BrowserPiWorkerSelectModelResultV1,
  ): void => {
    const setup = state.setup;
    if (setup === null || setup.kind !== "select_model") return;
    state.setup = null;
    if (state.cancelSetupTimer !== null) {
      state.cancelSetupTimer();
      state.cancelSetupTimer = null;
    }
    setup.resolve(result);
  };

  const settleReasoningEffortSelectionV1 = (
    state: ConnectionStateV1,
    result: BrowserPiWorkerSetReasoningEffortResultV1,
  ): void => {
    const setup = state.setup;
    if (setup === null || setup.kind !== "set_reasoning_effort") return;
    state.setup = null;
    if (state.cancelSetupTimer !== null) {
      state.cancelSetupTimer();
      state.cancelSetupTimer = null;
    }
    setup.resolve(result);
  };

  const beginSetupV1 = (
    state: ConnectionStateV1,
    kind: "configure" | "test_connection",
    postRequest: (requestId: number) => void,
    testedSelection: BrowserPiModelSelectionV1 | null = state.activeSelection,
  ): Promise<boolean> => {
    if (state.closed || state.setup !== null) return Promise.resolve(false);
    const requestId = state.nextCallId++;
    let resolveSetup!: (accepted: boolean) => void;
    const result = new Promise<boolean>((resolve) => {
      resolveSetup = resolve;
    });
    state.setup = kind === "test_connection"
      ? {
        kind,
        requestId,
        selection: testedSelection === null ? null : copySelectionV1(testedSelection),
        resolve: resolveSetup,
      }
      : { kind, requestId, resolve: resolveSetup };
    const timer = setTimeout(
      () => closeState(state, `${kind}_timeout`),
      readyTimeoutMillisecondsV1,
    );
    state.cancelSetupTimer = () => clearTimeout(timer);
    try {
      postRequest(requestId);
    } catch {
      closeState(state, `${kind}_post_failed`);
    }
    return result;
  };

  const createStateV1 = (
    worker: BrowserPiWorkerLikeV1,
    networkBrokerLease: BrowserNetworkBrokerLeaseV1,
  ): ConnectionStateV1 => {
    let resolveClosed!: () => void;
    const whenClosed = new Promise<void>((resolve) => {
      resolveClosed = resolve;
    });
    const state: ConnectionStateV1 = {
      worker,
      networkBrokerLease,
      whenClosed,
      resolveClosed,
      pending: new Map<number, PendingCallV1>(),
      bufferedEvents: [],
      onEvent: null,
      setup: null,
      messageListener: undefined as unknown as BrowserPiWorkerMessageListenerV1,
      errorListener: undefined as unknown as BrowserPiWorkerErrorListenerV1,
      cancelSetupTimer: null,
      nextCallId: 1,
      pendingSubmitGates: 0,
      activeWorkspace: null,
      workspaceReceiptSequence: 0,
      activeSelection: selection,
      activePreferredReasoningEffort: preferredReasoningEffort,
      activeEffectiveReasoningEffort: null,
      credentialAccepted: false,
      connectionIssued: false,
      ready: false,
      closed: false,
    };

    const deliverWorkspaceReceipt = (
      receipt: BrowserPiWorkspaceMutationReceiptWireV1,
    ): void => {
      const current = state.activeWorkspace;
      if (
        current === null || current.phase !== "open" ||
        receipt.programId !== current.programId ||
        receipt.workspaceId !== current.workspaceId ||
        receipt.workspaceSessionId !== current.workspaceSessionId ||
        receipt.baseGeneration !== current.generation ||
        receipt.sequence !== state.workspaceReceiptSequence + 1 ||
        current.receipts.length >= 32
      ) {
        closeState(state, "workspace_receipt_invalid");
        return;
      }
      state.activeWorkspace = Object.freeze({
        ...current,
        generation: receipt.resultingGeneration,
        receipts: Object.freeze([...current.receipts, receipt]),
      });
      state.workspaceReceiptSequence = receipt.sequence;
      for (const listener of [...workspaceReceiptListeners]) {
        try {
          listener(receipt);
        } catch {
          // Workspace receipt observers cannot change transport lifecycle.
        }
      }
    };

    const flushEvents = (): void => {
      if (state.closed || state.pendingSubmitGates !== 0) return;
      const events = state.bufferedEvents.splice(0);
      for (const event of events) {
        if (event.kind === "workspace_receipt") {
          deliverWorkspaceReceipt(event.receipt);
        } else if (state.onEvent !== null) {
          try {
            state.onEvent(event.candidate);
          } catch {
            // The semantic Session event consumer is observational at this boundary.
          }
        } else {
          closeState(state, "record_without_connection");
        }
        if (state.closed) return;
      }
    };

    state.messageListener = (event: { readonly data: unknown }): void => {
      if (state.closed) return;
      const message = admitBrowserPiWorkerAnyOutboundMessageV1(event.data);
      if (message === null || message.kind === "protocol_failure") {
        closeState(state, "protocol_failure");
        return;
      }
      if (message.kind === "model_selected" || message.kind === "model_selection_failure") {
        const setup = state.setup;
        if (
          setup === null || setup.kind !== "select_model" ||
          message.requestId !== setup.requestId
        ) {
          closeState(state, "model_selection_response_unexpected");
          return;
        }
        if (message.kind === "model_selection_failure") {
          settleModelSelectionV1(state, { kind: "unavailable", reason: message.code });
          return;
        }
        if (!selectionsEqualV1(message.selection, setup.selection)) {
          closeState(state, "model_selection_response_invalid");
          return;
        }
        state.activeSelection = copySelectionV1(message.selection);
        state.activeEffectiveReasoningEffort = message.effectiveReasoningEffort;
        settleModelSelectionV1(state, {
          kind: "selected",
          selection: copySelectionV1(message.selection),
          effectiveReasoningEffort: message.effectiveReasoningEffort,
        });
        return;
      }
      if (
        message.kind === "reasoning_effort_selected" ||
        message.kind === "reasoning_effort_selection_failure"
      ) {
        const setup = state.setup;
        if (
          setup === null || setup.kind !== "set_reasoning_effort" ||
          message.requestId !== setup.requestId
        ) {
          closeState(state, "reasoning_effort_response_unexpected");
          return;
        }
        if (message.kind === "reasoning_effort_selection_failure") {
          settleReasoningEffortSelectionV1(state, {
            kind: "unavailable",
            reason: message.code,
          });
          return;
        }
        if (message.preferredReasoningEffort !== setup.preferredReasoningEffort) {
          closeState(state, "reasoning_effort_response_invalid");
          return;
        }
        state.activePreferredReasoningEffort = message.preferredReasoningEffort;
        state.activeEffectiveReasoningEffort = message.effectiveReasoningEffort;
        settleReasoningEffortSelectionV1(state, {
          kind: "selected",
          preferredReasoningEffort: message.preferredReasoningEffort,
          effectiveReasoningEffort: message.effectiveReasoningEffort,
        });
        return;
      }
      if (
        message.kind === "configured" || message.kind === "configuration_failure" ||
        message.kind === "connection_test_failure" || message.kind === "ready"
      ) {
        const setup = state.setup;
        if (setup === null || message.requestId !== setup.requestId) {
          closeState(state, "setup_response_unexpected");
          return;
        }
        if (message.kind === "configured") {
          if (
            setup.kind !== "configure" || message.runtime !== runtime ||
            !selectionsEqualV1(message.selection, state.activeSelection)
          ) {
            closeState(state, "configuration_response_invalid");
            return;
          }
          state.credentialAccepted = true;
          state.ready = true;
          state.activeEffectiveReasoningEffort = message.effectiveReasoningEffort;
          settleSetupV1(state, true);
          return;
        }
        if (message.kind === "configuration_failure") {
          if (setup.kind !== "configure") {
            closeState(state, "configuration_failure_unexpected");
            return;
          }
          settleSetupV1(state, false);
          closeState(state, `configure_${message.code}`);
          return;
        }
        if (message.kind === "connection_test_failure") {
          if (setup.kind !== "test_connection") {
            closeState(state, "connection_test_failure_unexpected");
            return;
          }
          settleSetupV1(state, false);
          if (message.code === "not_configured") {
            closeState(state, "worker_credential_missing");
          }
          return;
        }
        if (
          setup.kind !== "test_connection" || message.runtime !== runtime ||
          !selectionsEqualV1(message.selection, setup.selection)
        ) {
          closeState(state, "ready_invalid");
          return;
        }
        state.ready = true;
        settleSetupV1(state, true);
        return;
      }
      if (!state.ready) {
        closeState(state, "message_before_ready");
        return;
      }
      if (message.kind === "rpc_record" || message.kind === "workspace_receipt") {
        const buffered: BufferedWorkerEventV1 = message.kind === "rpc_record"
          ? { kind: "session_event", candidate: message.record }
          : { kind: "workspace_receipt", receipt: message.receipt };
        if (state.pendingSubmitGates !== 0) {
          if (state.bufferedEvents.length >= bufferedRecordMaximumV1) {
            closeState(state, "record_buffer_limit");
            return;
          }
          state.bufferedEvents.push(buffered);
        } else if (buffered.kind === "workspace_receipt") {
          deliverWorkspaceReceipt(buffered.receipt);
        } else if (state.onEvent !== null) {
          try {
            state.onEvent(buffered.candidate);
          } catch {
            // The semantic Session event consumer is observational at this boundary.
          }
        } else {
          closeState(state, "record_without_connection");
        }
        return;
      }
      const pending = state.pending.get(message.requestId);
      if (pending === undefined) {
        closeState(state, "unknown_response");
        return;
      }
      state.pending.delete(message.requestId);
      if (message.kind === "workspace_response") {
        if (!isWorkspaceMethodV1(pending.method)) {
          closeState(state, "workspace_response_mismatch");
          return;
        }
        if (message.ok) {
          const previousWorkspaceSessionId = state.activeWorkspace?.workspaceSessionId;
          state.activeWorkspace = message.response.snapshot;
          const lastReceipt = message.response.snapshot.receipts.at(-1);
          if (message.response.method === "acknowledge_workspace_receipts") {
            state.workspaceReceiptSequence = Math.max(
              state.workspaceReceiptSequence,
              message.response.throughSequence,
              lastReceipt?.sequence ?? 0,
            );
          } else if (
            previousWorkspaceSessionId !== message.response.snapshot.workspaceSessionId
          ) {
            state.workspaceReceiptSequence = lastReceipt?.sequence ?? 0;
          } else if (lastReceipt !== undefined) {
            state.workspaceReceiptSequence = Math.max(
              state.workspaceReceiptSequence,
              lastReceipt.sequence,
            );
          }
          pending.resolve(message.response);
        } else pending.reject(transportErrorV1(`workspace_${message.code}`));
      } else {
        if (message.kind !== "rpc_response") {
          closeState(state, "rpc_response_mismatch");
          return;
        }
        if (isWorkspaceMethodV1(pending.method)) {
          closeState(state, "rpc_response_mismatch");
          return;
        }
        if (message.ok) pending.resolve(message.response);
        else pending.reject(transportErrorV1(`rpc_${message.code}`));
      }
      if (pending.method === "submit") {
        // Engine request settlement/tracking and the product facade continuation
        // both run before a synchronously delivered Worker record is released.
        queueMicrotask(() =>
          queueMicrotask(() => {
            if (state.closed) return;
            state.pendingSubmitGates -= 1;
            flushEvents();
          })
        );
      }
    };
    state.errorListener = (): void => closeState(state, "worker_error");
    worker.addEventListener("message", state.messageListener);
    worker.addEventListener("error", state.errorListener);
    return state;
  };

  const createConnectionV1 = (state: ConnectionStateV1): AgentSessionConnectionV1 => {
    const requestV1 = (
      method: "start" | "submit" | "cancel",
      input?: AgentSessionSubmitInputV1 | AgentSessionCancelInputV1,
    ): Promise<unknown> => {
      if (state.closed || activeState !== state || !state.ready) {
        return Promise.reject(transportErrorV1("connection_closed"));
      }
      const callId = state.nextCallId++;
      const request = admitBrowserPiWorkerSessionRequestV1(
        method === "start" ? { revision: 1, method } : { revision: 1, method, params: input },
      );
      if (request === null) return Promise.reject(transportErrorV1("request_invalid"));
      if (request.method === "submit") state.pendingSubmitGates += 1;
      return new Promise<unknown>((resolve, reject) => {
        state.pending.set(callId, { method: request.method, resolve, reject });
        try {
          const envelope = request.method === "submit"
            ? (() => {
              const workspace = state.activeWorkspace;
              if (workspace === null || workspace.phase !== "open") {
                throw transportErrorV1("workspace_unavailable");
              }
              return Object.freeze({
                revision: 1,
                kind: "rpc_request",
                requestId: callId,
                record: request,
                execution: Object.freeze({
                  revision: 1,
                  programId: workspace.programId,
                  workspaceId: workspace.workspaceId,
                  workspaceSessionId: workspace.workspaceSessionId,
                  expectedGeneration: workspace.generation,
                }),
              });
            })()
            : Object.freeze({
              revision: 1,
              kind: "rpc_request",
              requestId: callId,
              record: request,
            });
          // Worker.postMessage has no targetOrigin parameter.
          // oxlint-disable-next-line unicorn/require-post-message-target-origin -- Worker has no targetOrigin
          state.worker.postMessage(envelope);
        } catch {
          state.pending.delete(callId);
          if (request.method === "submit") state.pendingSubmitGates -= 1;
          reject(transportErrorV1("post_failed"));
        }
      });
    };
    return {
      whenClosed: state.whenClosed,
      start: () => requestV1("start"),
      submit: (input) => requestV1("submit", input),
      cancel: (input) => requestV1("cancel", input),
      async close(): Promise<void> {
        closeState(state, "connection_closed");
      },
    };
  };

  const connector: BrowserPiWorkerConnectorV1 = {
    isConfigured(): boolean {
      return activeState?.credentialAccepted === true && !activeState.closed;
    },
    async configureCredential(apiKey) {
      if (
        activeState !== null || apiKey.length === 0 ||
        apiKey.length > credentialMaximumCharactersV1 || !selectionHasValidEndpoint
      ) return { kind: "unavailable", reason: "failed" };
      let networkBrokerLease: BrowserNetworkBrokerLeaseV1;
      try {
        networkBrokerLease = await openNetworkBroker();
      } catch {
        return { kind: "unavailable", reason: "failed" };
      }
      let worker: BrowserPiWorkerLikeV1;
      try {
        worker = workerFactory({ endpointOrigin });
      } catch {
        networkBrokerLease.terminate();
        return { kind: "unavailable", reason: "failed" };
      }
      const state = createStateV1(worker, networkBrokerLease);
      activeState = state;
      let credential = apiKey;
      const accepted = beginSetupV1(state, "configure", (requestId) => {
        const configure: BrowserPiWorkerConfigureV1 = {
          revision: 1,
          kind: "configure",
          requestId,
          runtime,
          selection,
          preferredReasoningEffort: state.activePreferredReasoningEffort,
          credential: { kind: "api_key", value: credential },
        };
        worker.postMessage(configure, [networkBrokerLease.agentPort]);
      });
      credential = "";
      if (!await accepted || state.closed || !state.credentialAccepted) {
        if (!state.closed) closeState(state, "configuration_failed");
        return { kind: "unavailable", reason: "failed" };
      }
      const effectiveReasoningEffort = state.activeEffectiveReasoningEffort;
      return effectiveReasoningEffort === null
        ? { kind: "unavailable", reason: "failed" }
        : { kind: "configured", effectiveReasoningEffort };
    },
    async configureCredentialHandoff(input) {
      if (
        activeState !== null || runtime !== "pi_provider" || selection === null ||
        expectedCredentialBinding === null || !selectionHasValidEndpoint ||
        typeof input.handoff !== "function"
      ) return { kind: "unavailable", reason: "failed" };
      let binding: CredentialVaultBindingV2;
      try {
        binding = normalizeCredentialVaultBindingV2(input.binding);
      } catch {
        return { kind: "unavailable", reason: "failed" };
      }
      if (!credentialVaultBindingsEqualV2(binding, expectedCredentialBinding)) {
        return { kind: "unavailable", reason: "failed" };
      }
      let handoffId: string;
      try {
        handoffId = createCredentialHandoffId();
        if (!/^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,255}$/u.test(handoffId)) {
          return { kind: "unavailable", reason: "failed" };
        }
      } catch {
        return { kind: "unavailable", reason: "failed" };
      }
      let networkBrokerLease: BrowserNetworkBrokerLeaseV1;
      try {
        networkBrokerLease = await openNetworkBroker();
      } catch {
        return { kind: "unavailable", reason: "failed" };
      }
      let worker: BrowserPiWorkerLikeV1;
      try {
        worker = workerFactory({ endpointOrigin });
      } catch {
        networkBrokerLease.terminate();
        return { kind: "unavailable", reason: "failed" };
      }
      const state = createStateV1(worker, networkBrokerLease);
      activeState = state;
      const channel = new MessageChannel();
      const accepted = beginSetupV1(state, "configure", (requestId) => {
        const configure: BrowserPiWorkerConfigureV1 = {
          revision: 1,
          kind: "configure",
          requestId,
          runtime,
          selection,
          preferredReasoningEffort: state.activePreferredReasoningEffort,
          credential: { kind: "vault_handoff", handoffId, binding },
        };
        worker.postMessage(configure, [networkBrokerLease.agentPort, channel.port1]);
      });
      if (state.closed) {
        channel.port2.close();
        return { kind: "unavailable", reason: "failed" };
      }
      const handoffSettlement = Promise.resolve().then(() =>
        input.handoff(binding, handoffId, channel.port2)
      ).then(
        () => ({ kind: "handed_off" as const }),
        () => ({ kind: "handoff_failed" as const }),
      );
      const firstSettlement = await Promise.race([
        handoffSettlement,
        accepted.then((value) => ({ kind: "setup_settled" as const, value })),
      ]);
      if (firstSettlement.kind === "setup_settled" && !firstSettlement.value) {
        try {
          channel.port2.close();
        } catch {
          // The callback may already have transferred the one-time delivery port.
        }
        return { kind: "unavailable", reason: "failed" };
      }
      const handoffResult = firstSettlement.kind === "handed_off"
        ? firstSettlement
        : firstSettlement.kind === "handoff_failed"
        ? firstSettlement
        : await handoffSettlement;
      if (handoffResult.kind === "handoff_failed") {
        try {
          channel.port2.close();
        } catch {
          // The callback may already have transferred the one-time delivery port.
        }
        if (!state.closed) closeState(state, "credential_handoff_failed");
        return { kind: "unavailable", reason: "failed" };
      }
      if (!await accepted || state.closed || !state.credentialAccepted) {
        if (!state.closed) closeState(state, "configuration_failed");
        return { kind: "unavailable", reason: "failed" };
      }
      const effectiveReasoningEffort = state.activeEffectiveReasoningEffort;
      return effectiveReasoningEffort === null
        ? { kind: "unavailable", reason: "failed" }
        : { kind: "configured", effectiveReasoningEffort };
    },
    async testConnection(requestedSelection = activeState?.activeSelection ?? null) {
      const state = activeState;
      if (
        state === null || state.closed || !state.credentialAccepted || state.setup !== null
      ) return { kind: "unavailable", reason: "failed" };
      const testedSelection = requestedSelection === null ? null : copySelectionV1(
        requestedSelection,
      );
      const ready = await beginSetupV1(state, "test_connection", (requestId) => {
        const request = Object.freeze({
          revision: 1,
          kind: "test_connection",
          requestId,
          selection: testedSelection,
        });
        // Worker.postMessage has no targetOrigin parameter.
        // oxlint-disable-next-line unicorn/require-post-message-target-origin -- Worker has no targetOrigin
        state.worker.postMessage(request);
      }, testedSelection);
      return ready && !state.closed ? { kind: "ready" } : { kind: "unavailable", reason: "failed" };
    },
    selectModel(requestedSelection) {
      const state = activeState;
      if (state === null || state.closed || !state.credentialAccepted) {
        return Promise.resolve({ kind: "unavailable", reason: "not_configured" });
      }
      if (state.setup !== null) {
        return Promise.resolve({ kind: "unavailable", reason: "busy" });
      }
      const nextSelection = copySelectionV1(requestedSelection);
      const requestId = state.nextCallId++;
      let resolveSelection!: (result: BrowserPiWorkerSelectModelResultV1) => void;
      const result = new Promise<BrowserPiWorkerSelectModelResultV1>((resolve) => {
        resolveSelection = resolve;
      });
      state.setup = {
        kind: "select_model",
        requestId,
        selection: nextSelection,
        resolve: resolveSelection,
      };
      const timer = setTimeout(
        () => closeState(state, "select_model_timeout"),
        readyTimeoutMillisecondsV1,
      );
      state.cancelSetupTimer = () => clearTimeout(timer);
      try {
        const request = Object.freeze({
          revision: 1,
          kind: "select_model",
          requestId,
          selection: nextSelection,
        });
        // Worker.postMessage has no targetOrigin parameter.
        // oxlint-disable-next-line unicorn/require-post-message-target-origin -- Worker has no targetOrigin
        state.worker.postMessage(request);
      } catch {
        closeState(state, "select_model_post_failed");
      }
      return result;
    },
    setReasoningEffort(requestedPreferredReasoningEffort) {
      const state = activeState;
      if (state === null || state.closed || !state.credentialAccepted) {
        return Promise.resolve({ kind: "unavailable", reason: "not_configured" });
      }
      if (state.setup !== null) {
        return Promise.resolve({ kind: "unavailable", reason: "busy" });
      }
      const requestId = state.nextCallId++;
      let resolveReasoningEffort!: (result: BrowserPiWorkerSetReasoningEffortResultV1) => void;
      const result = new Promise<BrowserPiWorkerSetReasoningEffortResultV1>((resolve) => {
        resolveReasoningEffort = resolve;
      });
      state.setup = {
        kind: "set_reasoning_effort",
        requestId,
        preferredReasoningEffort: requestedPreferredReasoningEffort,
        resolve: resolveReasoningEffort,
      };
      const timer = setTimeout(
        () => closeState(state, "set_reasoning_effort_timeout"),
        readyTimeoutMillisecondsV1,
      );
      state.cancelSetupTimer = () => clearTimeout(timer);
      try {
        const request = Object.freeze({
          revision: 1,
          kind: "set_reasoning_effort",
          requestId,
          preferredReasoningEffort: requestedPreferredReasoningEffort,
        });
        // Worker.postMessage has no targetOrigin parameter.
        // oxlint-disable-next-line unicorn/require-post-message-target-origin -- Worker has no targetOrigin
        state.worker.postMessage(request);
      } catch {
        closeState(state, "set_reasoning_effort_post_failed");
      }
      return result;
    },
    async connect({ onEvent }) {
      const state = activeState;
      if (state === null || state.closed || !state.credentialAccepted) {
        return { kind: "unconfigured" };
      }
      if (state.connectionIssued || state.setup !== null || !state.ready) {
        return { kind: "unavailable", reason: "failed" };
      }
      state.onEvent = onEvent;
      state.connectionIssued = true;
      return { kind: "connected", connection: createConnectionV1(state) };
    },
    async openWorkspace(input): Promise<BrowserPiWorkspaceSnapshotWireV1> {
      const opened = await workspaceAuthority.openWorkspace(input);
      try {
        const snapshot = await workspaceRequestV1(
          {
            method: "attach_workspace",
            descriptor: executionBindingFromHostV1(opened.snapshot),
          },
          [opened.environmentPort],
        );
        if (!hostDescriptorMatchesPiSnapshotV1(opened.snapshot, snapshot)) {
          throw transportErrorV1("workspace_attachment_mismatch");
        }
        return snapshot;
      } catch (error) {
        try {
          opened.environmentPort.close();
        } catch {
          // The port may already have transferred to Pi; detachment remains best-effort.
        }
        const workspaceSessionId = opened.snapshot.descriptor.workspaceSessionId;
        const state = activeState;
        if (
          state !== null && !state.closed &&
          state.activeWorkspace?.workspaceSessionId === workspaceSessionId
        ) {
          await workspaceRequestV1({ method: "close_workspace", workspaceSessionId }).catch(() => {
            closeState(state, "workspace_attachment_failed");
          });
        }
        await detachWorkspaceEnvironment(workspaceSessionId).catch(() => undefined);
        throw error;
      }
    },
    async closeWorkspace(workspaceSessionId): Promise<BrowserPiWorkspaceSnapshotWireV1> {
      let piSnapshot: BrowserPiWorkspaceSnapshotWireV1;
      try {
        piSnapshot = await workspaceRequestV1({ method: "close_workspace", workspaceSessionId });
      } catch (error) {
        const state = activeState;
        if (state !== null) closeState(state, "workspace_close_failed");
        await workspaceEnvironmentDetachSettlement;
        await workspaceAuthority.closeWorkspace(workspaceSessionId).catch(() => undefined);
        throw error;
      }
      await detachWorkspaceEnvironment(workspaceSessionId);
      const hostSnapshot = await workspaceAuthority.closeWorkspace(workspaceSessionId);
      if (!hostDescriptorMatchesPiSnapshotV1(hostSnapshot, piSnapshot)) {
        throw transportErrorV1("workspace_close_mismatch");
      }
      return piSnapshot;
    },
    async queryWorkspace(workspaceSessionId): Promise<BrowserPiWorkspaceSnapshotWireV1> {
      const [piSnapshot, hostSnapshot] = await Promise.all([
        workspaceRequestV1({ method: "query_workspace", workspaceSessionId }),
        workspaceAuthority.queryWorkspace(workspaceSessionId),
      ]);
      if (!hostDescriptorMatchesPiSnapshotV1(hostSnapshot, piSnapshot)) {
        throw transportErrorV1("workspace_query_mismatch");
      }
      return piSnapshot;
    },
    acknowledgeWorkspaceReceipts(input): Promise<BrowserPiWorkspaceSnapshotWireV1> {
      return workspaceRequestV1({
        method: "acknowledge_workspace_receipts",
        workspaceSessionId: input.workspaceSessionId,
        throughSequence: input.throughSequence,
      });
    },
    replaceNetworkAccess(input): Promise<BrowserPiWorkspaceSnapshotWireV1> {
      return workspaceRequestV1({
        method: "replace_network_access",
        programId: input.access.programId,
        workspaceSessionId: input.workspaceSessionId,
        enabled: input.access.enabled,
      });
    },
    subscribeWorkspaceReceipts(listener): () => void {
      workspaceReceiptListeners.add(listener);
      return () => workspaceReceiptListeners.delete(listener);
    },
    subscribeWorkspaceFailures(listener): () => void {
      workspaceFailureListeners.add(listener);
      return () => workspaceFailureListeners.delete(listener);
    },
    revokeCredential(): void {
      credentialRevoked = true;
      const state = activeState;
      if (state !== null) {
        closeState(state, "credential_revoked");
      }
    },
    async forget(): Promise<void> {
      unsubscribeWorkspaceAuthorityFatal();
      workspaceFailureListeners.clear();
      const state = activeState;
      if (state !== null) {
        const workspace = state.activeWorkspace;
        const workspaceSessionId = workspace?.phase === "open"
          ? workspace.workspaceSessionId
          : null;
        if (workspace?.phase === "open") {
          await workspaceRequestV1({
            method: "close_workspace",
            workspaceSessionId: workspace.workspaceSessionId,
          }).catch(() => undefined);
        }
        if (workspaceSessionId !== null) {
          await detachWorkspaceEnvironment(workspaceSessionId).catch(() => undefined);
        }
        closeState(state, "forgotten", { detachEnvironment: false });
      }
      if (!credentialRevoked) await workspaceEnvironmentDetachSettlement;
    },
  };

  const workspaceRequestV1 = async (
    record: BrowserPiWorkspaceRequestRecordV1,
    transfer: Transferable[] = [],
  ): Promise<BrowserPiWorkspaceSnapshotWireV1> => {
    const state = activeState;
    if (state === null || state.closed || !state.ready) {
      throw transportErrorV1("workspace_connection_unavailable");
    }
    const requestId = state.nextCallId++;
    const response = await new Promise<unknown>((resolve, reject) => {
      state.pending.set(requestId, { method: record.method, resolve, reject });
      try {
        const envelope = Object.freeze({
          revision: 1,
          kind: "workspace_request",
          requestId,
          record: Object.freeze(record),
        });
        state.worker.postMessage(envelope, transfer);
      } catch {
        state.pending.delete(requestId);
        reject(transportErrorV1("workspace_post_failed"));
      }
    });
    if (
      response === null || typeof response !== "object" ||
      !Object.hasOwn(response, "snapshot")
    ) throw transportErrorV1("workspace_response_invalid");
    return (response as { readonly snapshot: BrowserPiWorkspaceSnapshotWireV1 }).snapshot;
  };
  return connector;
}
