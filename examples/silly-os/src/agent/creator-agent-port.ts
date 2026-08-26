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
  type CreatorAgentDiagnosticCodeV1,
  type CreatorAgentRunRequestV1,
  type CreatorAgentSubmitV1,
  type CreatorAgentTerminalRunV1,
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
import type { BrowserPiWorkerRuntimeV1 } from "./browser-pi-worker-protocol.ts";

export type CreatorAgentPhaseV1 =
  | "uninitialized"
  | "initializing"
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
}

export type CreatorAgentInitializeResultV1 =
  | { readonly kind: "ready" }
  | { readonly kind: "unavailable"; readonly diagnostic: CreatorAgentDiagnosticV1 };

export type CreatorAgentPortSubmitResultV1 =
  | { readonly kind: "submitted"; readonly agentRunId: string }
  | { readonly kind: "unavailable"; readonly diagnostic: CreatorAgentDiagnosticV1 };

export type CreatorAgentPortCancelResultV1 =
  | { readonly kind: "cancel_requested" }
  | { readonly kind: "idle" }
  | { readonly kind: "unavailable"; readonly diagnostic: CreatorAgentDiagnosticV1 };

export interface CreatorAgentPortV1 {
  getSnapshot(): CreatorAgentSnapshotV1;
  subscribe(listener: () => void): () => void;
  initialize(): Promise<CreatorAgentInitializeResultV1>;
  submit(input: CreatorAgentRunRequestV1): Promise<CreatorAgentPortSubmitResultV1>;
  cancel(agentRunId?: string): Promise<CreatorAgentPortCancelResultV1>;
  acknowledgeTerminal(agentRunId: string): boolean;
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

const identifierPatternV1 = /^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,127}$/u;

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
    "proposalId",
    "programId",
    "baseProgramRevision",
    "baseRepositoryRevision",
    "text",
  ]);
  if (
    record === null || typeof record.agentRunId !== "string" ||
    !identifierPatternV1.test(record.agentRunId) ||
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
  value: AgentRpcDiagnosticInternalV1,
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

export function createBrowserCreatorAgentPortV1(input: {
  readonly apiKey: string;
  readonly runtime: BrowserPiWorkerRuntimeV1;
  readonly workerFactory?: BrowserPiWorkerFactoryV1;
}): CreatorAgentPortV1 {
  const transport = createBrowserPiWorkerRawTransportV1(input);
  const client = createAgentRpcClientInternalV1({ transport });
  const listeners = new Set<() => void>();
  const trackedByProductRunId = new Map<string, TrackedCreatorAgentRunV1>();
  const trackedByPiRun = new Map<string, TrackedCreatorAgentRunV1>();
  const pendingStreamEvents = new Map<string, AgentRpcStreamEventInternalV1[]>();
  const submitSettlementGates = new Set<string>();
  const terminalDiagnostics = new Map<string, CreatorAgentDiagnosticV1>();
  let lifecycleEpoch = 0;
  let terminal = false;
  let revision = 0;
  let nextRunOrdinal = 1;
  let pendingStreamEventCount = 0;
  let phase: CreatorAgentPhaseV1 = "uninitialized";
  let sessionId: string | null = null;
  let activeRunId: string | null = null;
  let draft = "";
  let candidate: CreatorProgramRevisionCandidateV1 | null = null;
  let terminalRuns: readonly CreatorAgentTerminalRunV1[] = [];
  let diagnostic: CreatorAgentDiagnosticV1 | null = null;
  let initializePromise: Promise<CreatorAgentInitializeResultV1> | null = null;
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
    }
    discardOrphanedStreamEventsV1(tracked.sessionId);
  };

  const settleTrackedRunV1 = (
    tracked: TrackedCreatorAgentRunV1,
    terminalRun: CreatorAgentTerminalRunV1,
    terminalDiagnostic: CreatorAgentDiagnosticV1 | null = null,
  ): void => {
    if (!trackedByProductRunId.has(tracked.run.agentRunId)) return;
    removeTrackedRunV1(tracked);
    if (terminalRuns.length >= creatorAgentTerminalRunMaximumV1) {
      failFacadeV1(diagnosticV1("protocol_invalid", "/terminalRuns"));
      return;
    }
    terminalRuns = Object.freeze([...terminalRuns, Object.freeze(terminalRun)]);
    if (terminalDiagnostic !== null) {
      terminalDiagnostics.set(tracked.run.agentRunId, terminalDiagnostic);
    }
    refreshFacadeV1();
    publish();
  };

  rebuildSnapshot();

  const handleStreamEventV1 = (
    tracked: TrackedCreatorAgentRunV1,
    event: AgentRpcStreamEventInternalV1,
  ): void => {
    if (!trackedByProductRunId.has(tracked.run.agentRunId)) return;
    switch (event.kind) {
      case "artifact_chunk":
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
      case "artifact_complete": {
        const admitted = admitCreatorProgramRevisionCandidateV1(event.candidate);
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
    event: AgentRpcStreamEventInternalV1,
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

  client.subscribeStream((event: AgentRpcStreamEventInternalV1) => {
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
        failFacadeV1(mapped);
        return { kind: "unavailable", diagnostic: mapped };
      }
      const started = await client.start();
      if (terminal || lifecycleEpoch !== expectedEpoch) {
        return { kind: "unavailable", diagnostic: diagnosticV1("disposed", "/") };
      }
      if (started.kind !== "started") {
        const mapped = mapCallFailureV1(started);
        failFacadeV1(mapped);
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
    trackedByProductRunId.clear();
    trackedByPiRun.clear();
    pendingStreamEvents.clear();
    submitSettlementGates.clear();
    pendingStreamEventCount = 0;
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
    async submit(rawRun: CreatorAgentRunRequestV1): Promise<CreatorAgentPortSubmitResultV1> {
      if (terminal) {
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
      const initialized = await initialize();
      if (initialized.kind !== "ready") return initialized;
      if (sessionId === null) {
        return {
          kind: "unavailable",
          diagnostic: diagnosticV1("protocol_invalid", "/sessionId"),
        };
      }
      // Concurrent callers can pass the pre-initialize checks together. Repeat
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
        // Product-only agentRunId/baseRepositoryRevision never cross the Pi RPC boundary.
        serializedSubmit = serializeCreatorAgentSubmitV1(normalized.submit);
      } catch {
        removeTrackedRunV1(tracked);
        refreshFacadeV1();
        const invalid = diagnosticV1("submit_invalid", "/run");
        diagnostic = invalid;
        publish();
        return { kind: "unavailable", diagnostic: invalid };
      }
      const result = await client.submit({
        sessionId: expectedSessionId,
        text: serializedSubmit,
      });
      if (terminal || lifecycleEpoch !== expectedEpoch) {
        removeTrackedRunV1(tracked);
        return { kind: "unavailable", diagnostic: diagnosticV1("disposed", "/") };
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
          if (!terminal) flushStreamEventsV1(key);
        })
      );
      return { kind: "submitted", agentRunId: tracked.run.agentRunId };
    },
    async cancel(agentRunId?: string): Promise<CreatorAgentPortCancelResultV1> {
      if (terminal) {
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
    acknowledgeTerminal(agentRunId: string): boolean {
      const index = terminalRuns.findIndex(({ run }) => run.agentRunId === agentRunId);
      if (index < 0) return false;
      terminalRuns = Object.freeze([
        ...terminalRuns.slice(0, index),
        ...terminalRuns.slice(index + 1),
      ]);
      terminalDiagnostics.delete(agentRunId);
      if (!terminal) refreshFacadeV1();
      publish();
      return true;
    },
    forget: () => finish("forgotten"),
    dispose: () => finish("disposed"),
  };
}
