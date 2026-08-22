// SPDX-License-Identifier: MIT
import {
  admitUiArtifactCandidateInternalV1,
  admitUiIntentInternalV1,
  createUiArtifactRevisionInternalV1,
} from "../artifact/admission.ts";
import type {
  UiArtifactDiagnosticInternalV1,
  UiArtifactRevisionInternalV1,
  UiIntentAdmissionResultInternalV1,
} from "../artifact/contract.ts";
import type {
  AgentRpcClientPortInternalV1,
  AgentRpcClientSnapshotInternalV1,
  AgentRpcDiagnosticInternalV1,
  AgentRpcStreamEventInternalV1,
} from "../rpc/contracts.ts";

export type AgentHostReadinessInternalV1 =
  | "unconfigured"
  | "connecting"
  | "ready"
  | "unavailable"
  | "disposed";

export type AgentHostDiagnosticInternalV1 =
  | { readonly source: "rpc"; readonly diagnostic: AgentRpcDiagnosticInternalV1 }
  | { readonly source: "artifact"; readonly diagnostic: UiArtifactDiagnosticInternalV1 }
  | {
    readonly source: "host";
    readonly diagnostic: {
      readonly code: "agent.draft_limit" | "agent.operation_unavailable";
      readonly path: string;
    };
  };

export interface AgentHostRunSnapshotInternalV1 {
  readonly runId: string;
  readonly generation: number;
  readonly status: "streaming" | "cancel_requested" | "completed" | "failed";
  readonly lastSequence: number;
}

export interface AgentHostDraftSnapshotInternalV1 {
  readonly runId: string;
  readonly text: string;
  readonly status: "streaming" | "cancelled" | "invalid" | "completed" | "failed";
}

export interface AgentHostSnapshotInternalV1 {
  readonly identity: number;
  readonly revision: number;
  readonly readiness: AgentHostReadinessInternalV1;
  readonly rpc: AgentRpcClientSnapshotInternalV1;
  readonly sessionId: string | null;
  readonly run: AgentHostRunSnapshotInternalV1 | null;
  readonly draft: AgentHostDraftSnapshotInternalV1 | null;
  readonly artifact: UiArtifactRevisionInternalV1 | null;
  readonly artifactRevisions: readonly number[];
  readonly diagnostic: AgentHostDiagnosticInternalV1 | null;
}

export interface AgentHostInternalV1 {
  getSnapshot(): AgentHostSnapshotInternalV1;
  subscribe(listener: () => void): () => void;
  connect(): Promise<void>;
  retry(): Promise<void>;
  start(): Promise<void>;
  submit(text: string): Promise<void>;
  cancel(): Promise<void>;
  reopenArtifact(revision: number): boolean;
  admitIntent(value: unknown): UiIntentAdmissionResultInternalV1;
  dispose(): Promise<void>;
}

const maxDraftBytesInternalV1 = 65_536;
const maxRetainedArtifactsInternalV1 = 16;
const encoderInternalV1 = new TextEncoder();
let nextAgentHostIdentityInternalV1 = 0;

function readinessInternalV1(
  rpc: AgentRpcClientSnapshotInternalV1,
): AgentHostReadinessInternalV1 {
  switch (rpc.status.kind) {
    case "unconfigured":
      return "unconfigured";
    case "connecting":
      return "connecting";
    case "ready":
      return "ready";
    case "disposed":
      return "disposed";
    case "disconnected":
    case "unavailable":
      return "unavailable";
  }
  const exhaustive: never = rpc.status;
  throw new TypeError(`Unknown RPC readiness ${String(exhaustive)}`);
}

function rpcDiagnosticInternalV1(
  diagnostic: AgentRpcDiagnosticInternalV1,
): AgentHostDiagnosticInternalV1 {
  return Object.freeze({ source: "rpc", diagnostic });
}

function artifactDiagnosticInternalV1(
  diagnostic: UiArtifactDiagnosticInternalV1,
): AgentHostDiagnosticInternalV1 {
  return Object.freeze({ source: "artifact", diagnostic });
}

function hostDiagnosticInternalV1(
  code: "agent.draft_limit" | "agent.operation_unavailable",
  path: string,
): AgentHostDiagnosticInternalV1 {
  return Object.freeze({ source: "host", diagnostic: Object.freeze({ code, path }) });
}

export function createAgentHostInternalV1(input: {
  readonly client: AgentRpcClientPortInternalV1;
  readonly allowedActionIds: readonly string[];
}): AgentHostInternalV1 {
  const identity = ++nextAgentHostIdentityInternalV1;
  const listeners = new Set<() => void>();
  const artifacts = new Map<number, UiArtifactRevisionInternalV1>();
  let disposed = false;
  let revision = 0;
  let operationGeneration = 0;
  let runGeneration = 0;
  let nextArtifactRevision = 0;
  let sessionId: string | null = null;
  let run: AgentHostRunSnapshotInternalV1 | null = null;
  let draft: AgentHostDraftSnapshotInternalV1 | null = null;
  let artifact: UiArtifactRevisionInternalV1 | null = null;
  let diagnostic: AgentHostDiagnosticInternalV1 | null = null;
  let snapshot!: AgentHostSnapshotInternalV1;

  const rebuildSnapshot = (): void => {
    revision += 1;
    const rpc = input.client.getSnapshot();
    snapshot = Object.freeze({
      identity,
      revision,
      readiness: disposed ? "disposed" : readinessInternalV1(rpc),
      rpc,
      sessionId,
      run,
      draft,
      artifact,
      artifactRevisions: Object.freeze([...artifacts.keys()]),
      diagnostic,
    });
  };
  const publish = (): void => {
    if (disposed) return;
    rebuildSnapshot();
    for (const listener of [...listeners]) {
      try {
        listener();
      } catch {
        // Host observers are observational.
      }
    }
  };
  rebuildSnapshot();

  const onClientSnapshot = (): void => {
    const clientSnapshot = input.client.getSnapshot();
    if (clientSnapshot.diagnostic !== null) {
      diagnostic = rpcDiagnosticInternalV1(clientSnapshot.diagnostic);
    } else if (clientSnapshot.status.kind === "ready" && diagnostic?.source === "rpc") {
      diagnostic = null;
    }
    publish();
  };

  const matchesActiveRun = (event: AgentRpcStreamEventInternalV1): boolean =>
    !disposed && sessionId === event.sessionId && run?.runId === event.runId &&
    run.status === "streaming";

  const onStream = (event: AgentRpcStreamEventInternalV1): void => {
    if (!matchesActiveRun(event)) return;
    const currentRun = run;
    if (currentRun === null) return;
    run = Object.freeze({ ...currentRun, lastSequence: event.sequence });
    switch (event.kind) {
      case "artifact_chunk": {
        const text = `${draft?.text ?? ""}${event.text}`;
        if (encoderInternalV1.encode(text).byteLength > maxDraftBytesInternalV1) {
          run = Object.freeze({ ...run, status: "failed" });
          draft = Object.freeze({ runId: event.runId, text: draft?.text ?? "", status: "invalid" });
          diagnostic = hostDiagnosticInternalV1("agent.draft_limit", "/draft");
        } else {
          draft = Object.freeze({ runId: event.runId, text, status: "streaming" });
        }
        publish();
        return;
      }
      case "artifact_complete": {
        const admitted = admitUiArtifactCandidateInternalV1(
          event.candidate,
          input.allowedActionIds,
        );
        if (admitted.kind === "rejected") {
          run = Object.freeze({ ...run, status: "failed" });
          draft = Object.freeze({
            runId: event.runId,
            text: draft?.text ?? "",
            status: "invalid",
          });
          diagnostic = artifactDiagnosticInternalV1(admitted.diagnostic);
          publish();
          return;
        }
        nextArtifactRevision += 1;
        const admittedRevision = createUiArtifactRevisionInternalV1({
          hostIdentity: identity,
          revision: nextArtifactRevision,
          sessionId: event.sessionId,
          runId: event.runId,
          completedSequence: event.sequence,
          document: admitted.document,
        });
        artifacts.set(admittedRevision.revision, admittedRevision);
        while (artifacts.size > maxRetainedArtifactsInternalV1) {
          const oldest = artifacts.keys().next().value as number | undefined;
          if (oldest === undefined) break;
          artifacts.delete(oldest);
        }
        artifact = admittedRevision;
        draft = Object.freeze({
          runId: event.runId,
          text: draft?.text ?? "",
          status: "completed",
        });
        diagnostic = null;
        publish();
        return;
      }
      case "run_completed":
        run = Object.freeze({ ...run, status: "completed" });
        if (draft !== null && draft.status === "streaming") {
          draft = Object.freeze({ ...draft, status: "completed" });
        }
        publish();
        return;
      case "run_failed":
        run = Object.freeze({ ...run, status: "failed" });
        if (draft !== null && draft.status === "streaming") {
          draft = Object.freeze({ ...draft, status: "failed" });
        }
        diagnostic = rpcDiagnosticInternalV1(event.diagnostic);
        publish();
        return;
    }
  };

  const unsubscribeClient = input.client.subscribe(onClientSnapshot);
  const unsubscribeStream = input.client.subscribeStream(onStream);

  return Object.freeze({
    getSnapshot: () => snapshot,
    subscribe(listener: () => void): () => void {
      if (disposed) return () => {};
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    async connect(): Promise<void> {
      const expected = ++operationGeneration;
      await input.client.connect();
      if (disposed || expected !== operationGeneration) return;
      onClientSnapshot();
    },
    async retry(): Promise<void> {
      const expected = ++operationGeneration;
      await input.client.reconnect();
      if (disposed || expected !== operationGeneration) return;
      onClientSnapshot();
    },
    async start(): Promise<void> {
      const expected = ++operationGeneration;
      const result = await input.client.start();
      if (disposed || expected !== operationGeneration) return;
      if (result.kind !== "started") {
        diagnostic = result.kind === "unavailable"
          ? rpcDiagnosticInternalV1(result.diagnostic)
          : hostDiagnosticInternalV1("agent.operation_unavailable", "/start");
        publish();
        return;
      }
      sessionId = result.sessionId;
      runGeneration += 1;
      run = null;
      draft = null;
      diagnostic = null;
      publish();
    },
    async submit(text: string): Promise<void> {
      const currentSessionId = sessionId;
      if (currentSessionId === null || text.length === 0 || text.length > 8_192) {
        diagnostic = hostDiagnosticInternalV1("agent.operation_unavailable", "/submit");
        publish();
        return;
      }
      const expected = ++operationGeneration;
      const result = await input.client.submit({ sessionId: currentSessionId, text });
      if (disposed || expected !== operationGeneration || sessionId !== currentSessionId) return;
      if (result.kind !== "submitted") {
        diagnostic = result.kind === "unavailable"
          ? rpcDiagnosticInternalV1(result.diagnostic)
          : hostDiagnosticInternalV1("agent.operation_unavailable", "/submit");
        publish();
        return;
      }
      runGeneration += 1;
      run = Object.freeze({
        runId: result.runId,
        generation: runGeneration,
        status: "streaming",
        lastSequence: 0,
      });
      draft = Object.freeze({ runId: result.runId, text: "", status: "streaming" });
      diagnostic = null;
      publish();
    },
    async cancel(): Promise<void> {
      const currentSessionId = sessionId;
      const currentRun = run;
      if (currentSessionId === null || currentRun === null || currentRun.status !== "streaming") {
        diagnostic = hostDiagnosticInternalV1("agent.operation_unavailable", "/cancel");
        publish();
        return;
      }
      operationGeneration += 1;
      runGeneration += 1;
      run = Object.freeze({ ...currentRun, generation: runGeneration, status: "cancel_requested" });
      if (draft !== null) draft = Object.freeze({ ...draft, status: "cancelled" });
      publish();
      const result = await input.client.cancel({
        sessionId: currentSessionId,
        runId: currentRun.runId,
      });
      if (disposed || result.kind === "cancel_requested") return;
      if (result.kind === "unavailable") {
        diagnostic = rpcDiagnosticInternalV1(result.diagnostic);
        publish();
      }
    },
    reopenArtifact(targetRevision: number): boolean {
      if (disposed) return false;
      const target = artifacts.get(targetRevision);
      if (target === undefined) return false;
      artifact = target;
      publish();
      return true;
    },
    admitIntent: (value: unknown) => admitUiIntentInternalV1(value, artifact),
    async dispose(): Promise<void> {
      if (disposed) return;
      disposed = true;
      operationGeneration += 1;
      runGeneration += 1;
      unsubscribeStream();
      unsubscribeClient();
      listeners.clear();
      await input.client.dispose();
      rebuildSnapshot();
    },
  });
}
