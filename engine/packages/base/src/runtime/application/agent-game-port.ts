// SPDX-License-Identifier: MIT
import type {
  PlayerWritableSaveSlotIdV1,
  SemanticGamePortV1,
  SemanticPublicationV1,
} from "../../contracts/application.ts";
import type { RuntimeSessionStatusV1 } from "../../contracts/session-status.ts";
import type { DeepReadonly, NonNegativeSafeInteger } from "../../contracts/values.ts";
import { parseNonNegativeSafeInteger } from "../../contracts/values.ts";

/**
 * Player-safe identity an agent may know about the game it is driving. It
 * carries no digests, no build internals, and no State.
 */
export interface AgentIdentityV1 {
  readonly storyId: string;
  readonly storyRevision: number;
}

export interface AgentWaitOptionsV1 {
  readonly afterRevision?: number;
  readonly timeoutMs?: number;
  readonly signal?: AbortSignal;
}

export type AgentWaitResultV1<TPublication> =
  | { readonly kind: "idle"; readonly publication: TPublication }
  | { readonly kind: "timed_out" }
  | { readonly kind: "aborted" };

/**
 * The host-neutral, player-safe agent operation contract. It reuses the
 * SemanticGamePort semantics and adds identity plus a bounded
 * session/publication wait. `waitForIdle` means the Session command queue
 * drained and the corresponding semantic revision was published; it says
 * nothing about transitions, asset decoding, or actual audio.
 */
export interface AgentGamePortV1<
  TGameView,
  TNarrativeView,
  TActionDescriptor,
  TInvocation,
  TPreview,
  TResult,
  TStatus = RuntimeSessionStatusV1,
> {
  identity(): AgentIdentityV1;
  observe(): DeepReadonly<
    SemanticPublicationV1<TGameView, TNarrativeView, TActionDescriptor, TStatus>
  >;
  describeActions(): readonly DeepReadonly<TActionDescriptor>[];
  preview(invocation: DeepReadonly<TInvocation>): Promise<TPreview>;
  dispatch(invocation: DeepReadonly<TInvocation>): Promise<TResult>;
  waitForIdle(
    options?: AgentWaitOptionsV1,
  ): Promise<
    AgentWaitResultV1<
      DeepReadonly<SemanticPublicationV1<TGameView, TNarrativeView, TActionDescriptor, TStatus>>
    >
  >;
}

export interface CreateInProcessAgentGamePortInputV1<
  TGameView,
  TNarrativeView,
  TActionDescriptor,
  TInvocation,
  TPreview,
  TResult,
  TStatus = RuntimeSessionStatusV1,
> {
  readonly identity: AgentIdentityV1;
  readonly semantic: SemanticGamePortV1<
    TGameView,
    TNarrativeView,
    TActionDescriptor,
    TInvocation,
    TPreview,
    TResult,
    TStatus
  >;
}

const timedOutResultV1 = Object.freeze({ kind: "timed_out" as const });
const abortedResultV1 = Object.freeze({ kind: "aborted" as const });

export function createInProcessAgentGamePortV1<
  TGameView,
  TNarrativeView,
  TActionDescriptor,
  TInvocation,
  TPreview,
  TResult,
  TStatus = RuntimeSessionStatusV1,
>(
  input: CreateInProcessAgentGamePortInputV1<
    TGameView,
    TNarrativeView,
    TActionDescriptor,
    TInvocation,
    TPreview,
    TResult,
    TStatus
  >,
): AgentGamePortV1<
  TGameView,
  TNarrativeView,
  TActionDescriptor,
  TInvocation,
  TPreview,
  TResult,
  TStatus
> {
  const identity = Object.freeze({
    storyId: input.identity.storyId,
    storyRevision: input.identity.storyRevision,
  });
  return Object.freeze({
    identity: () => identity,
    observe: () => input.semantic.observe(),
    describeActions: () => input.semantic.availableActions(),
    preview: (invocation: DeepReadonly<TInvocation>) => input.semantic.preview(invocation),
    dispatch: (invocation: DeepReadonly<TInvocation>) => input.semantic.dispatch(invocation),
    async waitForIdle(options: AgentWaitOptionsV1 = {}) {
      if (options.signal?.aborted === true) return abortedResultV1;
      const afterRevision = options.afterRevision === undefined
        ? undefined
        : parseNonNegativeSafeInteger(options.afterRevision);
      const wait = input.semantic
        .waitForIdle(afterRevision as NonNegativeSafeInteger | undefined)
        .then((publication) => Object.freeze({ kind: "idle" as const, publication }));
      if (options.timeoutMs === undefined && options.signal === undefined) {
        return wait;
      }

      let cancelTimer: (() => void) | undefined;
      let removeAbortListener: (() => void) | undefined;
      try {
        return await Promise.race([
          // The underlying wait is a read-only subscription; discarding it on
          // timeout/abort cannot change gameplay State.
          wait,
          ...(options.timeoutMs === undefined ? [] : [
            new Promise<typeof timedOutResultV1>((resolve) => {
              const handle = setTimeout(() => resolve(timedOutResultV1), options.timeoutMs);
              cancelTimer = () => clearTimeout(handle);
            }),
          ]),
          ...(options.signal === undefined ? [] : [
            new Promise<typeof abortedResultV1>((resolve) => {
              const signal = options.signal as AbortSignal;
              const onAbort = () => resolve(abortedResultV1);
              signal.addEventListener("abort", onAbort, { once: true });
              removeAbortListener = () => signal.removeEventListener("abort", onAbort);
            }),
          ]),
        ]);
      } finally {
        cancelTimer?.();
        removeAbortListener?.();
      }
    },
  });
}

export type AgentCapabilityRevokedV1 = { readonly kind: "capability_revoked" };

export const agentCapabilityRevokedV1: AgentCapabilityRevokedV1 = Object.freeze({
  kind: "capability_revoked" as const,
});

export interface AgentCapabilityHandleV1<TCapability> {
  readonly capability: TCapability;
  isRevoked(): boolean;
  revoke(): void;
}

/**
 * Save/import/export as an independent, revocable capability. A revoked
 * capability answers every call with a structured result instead of
 * throwing or silently proceeding.
 */
export interface AgentPersistenceCapabilityV1<TPersistenceResult, TExportedSave> {
  save(slot: PlayerWritableSaveSlotIdV1): Promise<TPersistenceResult | AgentCapabilityRevokedV1>;
  load(slot: string): Promise<TPersistenceResult | AgentCapabilityRevokedV1>;
  exportCurrentSave(): Promise<TExportedSave | AgentCapabilityRevokedV1>;
  importSave(bytes: Uint8Array): Promise<TPersistenceResult | AgentCapabilityRevokedV1>;
}

export interface CreateAgentPersistenceCapabilityInputV1<TPersistenceResult, TExportedSave> {
  save(slot: PlayerWritableSaveSlotIdV1): Promise<TPersistenceResult>;
  load(slot: string): Promise<TPersistenceResult>;
  exportCurrentSave(): Promise<TExportedSave>;
  importSave(bytes: Uint8Array): Promise<TPersistenceResult>;
}

export function createAgentPersistenceCapabilityV1<TPersistenceResult, TExportedSave>(
  input: CreateAgentPersistenceCapabilityInputV1<TPersistenceResult, TExportedSave>,
): AgentCapabilityHandleV1<AgentPersistenceCapabilityV1<TPersistenceResult, TExportedSave>> {
  let revoked = false;
  const guard = async <TValue>(
    operation: () => Promise<TValue>,
  ): Promise<TValue | AgentCapabilityRevokedV1> => revoked ? agentCapabilityRevokedV1 : operation();
  return Object.freeze({
    capability: Object.freeze({
      save: (slot: PlayerWritableSaveSlotIdV1) => guard(() => input.save(slot)),
      load: (slot: string) => guard(() => input.load(slot)),
      exportCurrentSave: () => guard(() => input.exportCurrentSave()),
      importSave: (bytes: Uint8Array) => guard(() => input.importSave(bytes)),
    }),
    isRevoked: () => revoked,
    revoke: () => {
      revoked = true;
    },
  });
}

/** Read-only diagnostics export as an independent, revocable capability. */
export interface AgentDiagnosticsCapabilityV1<TDiagnostics> {
  exportDiagnostics(): Promise<TDiagnostics | AgentCapabilityRevokedV1>;
}

export function createAgentDiagnosticsCapabilityV1<TDiagnostics>(input: {
  exportDiagnostics(): Promise<TDiagnostics>;
}): AgentCapabilityHandleV1<AgentDiagnosticsCapabilityV1<TDiagnostics>> {
  let revoked = false;
  return Object.freeze({
    capability: Object.freeze({
      exportDiagnostics: async () => revoked ? agentCapabilityRevokedV1 : input.exportDiagnostics(),
    }),
    isRevoked: () => revoked,
    revoke: () => {
      revoked = true;
    },
  });
}

export interface AgentTranscriptEntryV1 {
  readonly ordinal: number;
  readonly method: "observe" | "describeActions" | "preview" | "dispatch" | "waitForIdle";
  readonly input?: unknown;
  readonly output: unknown;
}

export interface AgentTranscriptRecorderV1<TAgent> {
  readonly agent: TAgent;
  transcript(): readonly AgentTranscriptEntryV1[];
}

export type AgentTranscriptComparisonV1 =
  | { readonly kind: "matching"; readonly entries: number }
  | {
    readonly kind: "diverged";
    readonly ordinal: number;
    readonly left: AgentTranscriptEntryV1 | null;
    readonly right: AgentTranscriptEntryV1 | null;
  };

/**
 * Compares two agent transcripts (for example in-process Node versus the
 * JSONL host) for semantic parity: same operations, same player-safe
 * outputs, in the same order.
 */
export function compareAgentTranscriptsV1(
  left: readonly AgentTranscriptEntryV1[],
  right: readonly AgentTranscriptEntryV1[],
): AgentTranscriptComparisonV1 {
  const length = Math.max(left.length, right.length);
  for (let index = 0; index < length; index += 1) {
    const leftEntry = left[index] ?? null;
    const rightEntry = right[index] ?? null;
    if (JSON.stringify(leftEntry) !== JSON.stringify(rightEntry)) {
      return Object.freeze({
        kind: "diverged" as const,
        ordinal: index + 1,
        left: leftEntry,
        right: rightEntry,
      });
    }
  }
  return Object.freeze({ kind: "matching" as const, entries: left.length });
}

/**
 * Wraps an agent port so every operation and its player-safe output land in
 * an in-memory transcript. Different hosts replaying the same invocation
 * sequence can compare transcripts for semantic parity.
 */
export function createAgentTranscriptRecorderV1<
  TGameView,
  TNarrativeView,
  TActionDescriptor,
  TInvocation,
  TPreview,
  TResult,
  TStatus,
>(
  agent: AgentGamePortV1<
    TGameView,
    TNarrativeView,
    TActionDescriptor,
    TInvocation,
    TPreview,
    TResult,
    TStatus
  >,
): AgentTranscriptRecorderV1<
  AgentGamePortV1<
    TGameView,
    TNarrativeView,
    TActionDescriptor,
    TInvocation,
    TPreview,
    TResult,
    TStatus
  >
> {
  const entries: AgentTranscriptEntryV1[] = [];
  const record = (
    method: AgentTranscriptEntryV1["method"],
    output: unknown,
    input?: unknown,
  ): void => {
    entries.push(
      Object.freeze({
        ordinal: entries.length + 1,
        method,
        ...(input === undefined ? {} : { input }),
        output,
      }),
    );
  };
  return Object.freeze({
    agent: Object.freeze({
      identity: () => agent.identity(),
      observe: () => {
        const publication = agent.observe();
        record("observe", publication);
        return publication;
      },
      describeActions: () => {
        const actions = agent.describeActions();
        record("describeActions", actions);
        return actions;
      },
      preview: async (invocation: DeepReadonly<TInvocation>) => {
        const preview = await agent.preview(invocation);
        record("preview", preview, invocation);
        return preview;
      },
      dispatch: async (invocation: DeepReadonly<TInvocation>) => {
        const result = await agent.dispatch(invocation);
        record("dispatch", result, invocation);
        return result;
      },
      waitForIdle: async (options?: AgentWaitOptionsV1) => {
        const result = await agent.waitForIdle(options);
        record("waitForIdle", result.kind);
        return result;
      },
    }),
    transcript: () => Object.freeze([...entries]),
  });
}
