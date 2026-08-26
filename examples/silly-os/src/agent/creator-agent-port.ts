// SPDX-License-Identifier: MIT

import {
  createAgentRpcClientInternalV1,
  type AgentRpcCallFailureInternalV1,
  type AgentRpcDiagnosticInternalV1,
  type AgentRpcStreamEventInternalV1,
} from "@sillymaker/agent/internal";

import {
  admitCreatorAgentSubmitV1,
  admitCreatorProgramRevisionCandidateV1,
  serializeCreatorAgentSubmitV1,
} from "../product/creator-agent-admission.ts";
import {
  creatorAgentFinalReplyMaximumCharactersV1,
  type CreatorAgentSubmitV1,
  type CreatorProgramRevisionCandidateV1,
} from "../product/contracts.ts";
import {
  browserPiDistributionIdentityV1,
  type BrowserPiDistributionIdentityV1,
} from "./browser-pi-distribution.ts";
import {
  createBrowserPiWorkerRawTransportV1,
  type BrowserPiWorkerFactoryV1,
} from "./browser-pi-transport.ts";

export type CreatorAgentPhaseV1 =
  | "uninitialized"
  | "initializing"
  | "ready"
  | "running"
  | "completed"
  | "failed"
  | "forgotten"
  | "disposed";

export type CreatorAgentDiagnosticCodeV1 =
  | "unconfigured"
  | "connection_failed"
  | "request_failed"
  | "protocol_invalid"
  | "submit_invalid"
  | "candidate_invalid"
  | "draft_too_large"
  | "run_failed"
  | "disposed";

export interface CreatorAgentDiagnosticV1 {
  readonly code: CreatorAgentDiagnosticCodeV1;
  readonly path: string;
}

export interface CreatorAgentSnapshotV1 {
  readonly revision: number;
  readonly phase: CreatorAgentPhaseV1;
  readonly distribution: BrowserPiDistributionIdentityV1;
  readonly activeRunId: string | null;
  readonly draft: string;
  readonly candidate: CreatorProgramRevisionCandidateV1 | null;
  readonly diagnostic: CreatorAgentDiagnosticV1 | null;
}

export type CreatorAgentInitializeResultV1 =
  | { readonly kind: "ready" }
  | { readonly kind: "unavailable"; readonly diagnostic: CreatorAgentDiagnosticV1 };

export type CreatorAgentPortSubmitResultV1 =
  | { readonly kind: "submitted"; readonly runId: string }
  | { readonly kind: "unavailable"; readonly diagnostic: CreatorAgentDiagnosticV1 };

export type CreatorAgentPortCancelResultV1 =
  | { readonly kind: "cancel_requested" }
  | { readonly kind: "idle" }
  | { readonly kind: "unavailable"; readonly diagnostic: CreatorAgentDiagnosticV1 };

export interface CreatorAgentPortV1 {
  getSnapshot(): CreatorAgentSnapshotV1;
  subscribe(listener: () => void): () => void;
  initialize(): Promise<CreatorAgentInitializeResultV1>;
  submit(input: CreatorAgentSubmitV1): Promise<CreatorAgentPortSubmitResultV1>;
  cancel(): Promise<CreatorAgentPortCancelResultV1>;
  /** Explicitly terminates the Worker that owns the in-memory credential. */
  forget(): Promise<void>;
  dispose(): Promise<void>;
}

function diagnosticV1(code: CreatorAgentDiagnosticCodeV1, path: string): CreatorAgentDiagnosticV1 {
  return Object.freeze({ code, path });
}

function mapEngineDiagnosticV1(
  value: AgentRpcDiagnosticInternalV1,
): CreatorAgentDiagnosticV1 {
  switch (value.code) {
    case "rpc.unconfigured":
      return diagnosticV1("unconfigured", value.path);
    case "rpc.offline":
    case "rpc.connection_failed":
      return diagnosticV1("connection_failed", value.path);
    case "rpc.request_failed":
      return diagnosticV1("request_failed", value.path);
    default:
      return diagnosticV1("protocol_invalid", value.path);
  }
}

function mapCallFailureV1(value: AgentRpcCallFailureInternalV1): CreatorAgentDiagnosticV1 {
  return value.kind === "unavailable"
    ? mapEngineDiagnosticV1(value.diagnostic)
    : diagnosticV1(value.kind === "disposed" ? "disposed" : "request_failed", "/request");
}

export function createBrowserCreatorAgentPortV1(input: {
  readonly apiKey: string;
  readonly runtime: "deterministic_test";
  readonly workerFactory?: BrowserPiWorkerFactoryV1;
}): CreatorAgentPortV1 {
  const transport = createBrowserPiWorkerRawTransportV1(input);
  const client = createAgentRpcClientInternalV1({ transport });
  const listeners = new Set<() => void>();
  let lifecycleEpoch = 0;
  let terminal = false;
  let revision = 0;
  let phase: CreatorAgentPhaseV1 = "uninitialized";
  let sessionId: string | null = null;
  let activeRunId: string | null = null;
  let draft = "";
  let candidate: CreatorProgramRevisionCandidateV1 | null = null;
  let diagnostic: CreatorAgentDiagnosticV1 | null = null;
  let initializePromise: Promise<CreatorAgentInitializeResultV1> | null = null;
  let snapshot!: CreatorAgentSnapshotV1;

  const rebuildSnapshot = (): void => {
    revision += 1;
    snapshot = Object.freeze({
      revision,
      phase,
      distribution: browserPiDistributionIdentityV1,
      activeRunId,
      draft,
      candidate,
      diagnostic,
    });
  };
  const publish = (): void => {
    rebuildSnapshot();
    for (const listener of [...listeners]) {
      try {
        listener();
      } catch {
        // Product observers cannot alter Agent lifecycle state.
      }
    }
  };
  const fail = (nextDiagnostic: CreatorAgentDiagnosticV1): void => {
    phase = "failed";
    activeRunId = null;
    draft = "";
    candidate = null;
    diagnostic = nextDiagnostic;
    publish();
  };
  rebuildSnapshot();

  client.subscribeStream((event: AgentRpcStreamEventInternalV1) => {
    if (
      terminal || sessionId === null || activeRunId === null ||
      event.sessionId !== sessionId || event.runId !== activeRunId
    ) return;
    switch (event.kind) {
      case "artifact_chunk":
        if (draft.length + event.text.length > creatorAgentFinalReplyMaximumCharactersV1) {
          fail(diagnosticV1("draft_too_large", "/draft"));
          return;
        }
        draft += event.text;
        publish();
        return;
      case "artifact_complete": {
        const admitted = admitCreatorProgramRevisionCandidateV1(event.candidate);
        if (admitted.kind === "rejected") {
          fail(diagnosticV1("candidate_invalid", admitted.path));
          return;
        }
        candidate = Object.freeze(admitted.value);
        publish();
        return;
      }
      case "run_completed":
        if (candidate === null || draft.length === 0) {
          fail(diagnosticV1("protocol_invalid", "/run_completed"));
          return;
        }
        phase = "completed";
        diagnostic = null;
        publish();
        return;
      case "run_failed":
        fail(diagnosticV1("run_failed", event.diagnostic.path));
        return;
    }
  });

  const initialize = (): Promise<CreatorAgentInitializeResultV1> => {
    if (terminal) {
      return Promise.resolve({ kind: "unavailable", diagnostic: diagnosticV1("disposed", "/") });
    }
    if (sessionId !== null) return Promise.resolve({ kind: "ready" });
    if (initializePromise !== null) return initializePromise;
    const expectedEpoch = lifecycleEpoch;
    phase = "initializing";
    diagnostic = null;
    publish();
    const attempt = (async (): Promise<CreatorAgentInitializeResultV1> => {
      const connected = await client.connect();
      if (terminal || lifecycleEpoch !== expectedEpoch) {
        return { kind: "unavailable", diagnostic: diagnosticV1("disposed", "/") };
      }
      if (connected.kind !== "ready") {
        const mapped = mapCallFailureV1(connected);
        fail(mapped);
        return { kind: "unavailable", diagnostic: mapped };
      }
      const started = await client.start();
      if (terminal || lifecycleEpoch !== expectedEpoch) {
        return { kind: "unavailable", diagnostic: diagnosticV1("disposed", "/") };
      }
      if (started.kind !== "started") {
        const mapped = mapCallFailureV1(started);
        fail(mapped);
        return { kind: "unavailable", diagnostic: mapped };
      }
      sessionId = started.sessionId;
      phase = "ready";
      diagnostic = null;
      publish();
      return { kind: "ready" };
    })();
    initializePromise = attempt;
    void attempt.finally(() => {
      if (initializePromise === attempt) initializePromise = null;
    });
    return attempt;
  };

  const finish = async (finalPhase: "forgotten" | "disposed"): Promise<void> => {
    if (terminal) return;
    terminal = true;
    lifecycleEpoch += 1;
    sessionId = null;
    activeRunId = null;
    draft = "";
    candidate = null;
    diagnostic = null;
    phase = finalPhase;
    await Promise.allSettled([client.dispose(), transport.forget()]);
    publish();
    listeners.clear();
  };

  return {
    getSnapshot: () => snapshot,
    subscribe(listener: () => void): () => void {
      if (terminal) return () => {};
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    initialize,
    async submit(submitInput: CreatorAgentSubmitV1): Promise<CreatorAgentPortSubmitResultV1> {
      if (terminal) {
        return { kind: "unavailable", diagnostic: diagnosticV1("disposed", "/") };
      }
      const admitted = admitCreatorAgentSubmitV1(submitInput);
      if (admitted.kind === "rejected") {
        const invalid = diagnosticV1("submit_invalid", admitted.path);
        return { kind: "unavailable", diagnostic: invalid };
      }
      const initialized = await initialize();
      if (initialized.kind !== "ready") return initialized;
      if (sessionId === null) {
        return {
          kind: "unavailable",
          diagnostic: diagnosticV1("protocol_invalid", "/sessionId"),
        };
      }
      const expectedEpoch = lifecycleEpoch;
      const expectedSessionId = sessionId;
      activeRunId = null;
      draft = "";
      candidate = null;
      phase = "running";
      diagnostic = null;
      publish();
      let serializedSubmit: string;
      try {
        serializedSubmit = serializeCreatorAgentSubmitV1(admitted.value);
      } catch {
        const invalid = diagnosticV1("submit_invalid", "/");
        fail(invalid);
        return { kind: "unavailable", diagnostic: invalid };
      }
      const result = await client.submit({
        sessionId: expectedSessionId,
        text: serializedSubmit,
      });
      if (terminal || lifecycleEpoch !== expectedEpoch) {
        return { kind: "unavailable", diagnostic: diagnosticV1("disposed", "/") };
      }
      if (result.kind !== "submitted") {
        const mapped = mapCallFailureV1(result);
        fail(mapped);
        return { kind: "unavailable", diagnostic: mapped };
      }
      activeRunId = result.runId;
      phase = "running";
      diagnostic = null;
      publish();
      return { kind: "submitted", runId: result.runId };
    },
    async cancel(): Promise<CreatorAgentPortCancelResultV1> {
      if (terminal) {
        return { kind: "unavailable", diagnostic: diagnosticV1("disposed", "/") };
      }
      if (phase !== "running" || sessionId === null || activeRunId === null) {
        return { kind: "idle" };
      }
      const expectedSessionId = sessionId;
      const expectedRunId = activeRunId;
      const result = await client.cancel({
        sessionId: expectedSessionId,
        runId: expectedRunId,
      });
      if (result.kind !== "cancel_requested") {
        const mapped = mapCallFailureV1(result);
        fail(mapped);
        return { kind: "unavailable", diagnostic: mapped };
      }
      if (sessionId === expectedSessionId && activeRunId === expectedRunId) {
        activeRunId = null;
        draft = "";
        candidate = null;
        phase = "ready";
        diagnostic = null;
        publish();
      }
      return { kind: "cancel_requested" };
    },
    forget: () => finish("forgotten"),
    dispose: () => finish("disposed"),
  };
}
