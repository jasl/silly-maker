// SPDX-License-Identifier: MIT

import {
  normalizeProcessIdV1,
  operationalStructuredPayloadMaximumBytesV1,
  type ProcessHeadV1,
  type ProgramProcessRepositoryV1,
  type TranscriptEntryV1,
  type TranscriptPageV1,
} from "./program-process-repository.ts";

export interface ReadOnlyProcessConversationTranscriptV1 {
  /** Chronological entries in the currently mounted window only. */
  readonly entries: readonly TranscriptEntryV1[];
  readonly byteLength: number;
  readonly nextBeforeSequence: number | null;
  /** True when newer pages were evicted from the bounded mounted window. */
  readonly newerOmitted: boolean;
  readonly phase: "loading" | "loading_older" | "ready" | "failed";
}

export interface ReadOnlyProcessConversationProjectionV1 {
  /** Durable Process metadata. Package availability is deliberately not resolved here. */
  readonly process: ProcessHeadV1;
  readonly transcript: ReadOnlyProcessConversationTranscriptV1;
  /** Why the full Program surface could not be restored, when applicable. */
  readonly degradation: ReadOnlyProcessConversationDegradationV1 | null;
}

export interface ReadOnlyProcessConversationDegradationV1 {
  readonly capability: "package" | "runtime" | "workspace";
  readonly code: string;
}

export type ReadOnlyProcessConversationOperationV1 = "open" | "load_older";

export interface ReadOnlyProcessConversationFailureV1 {
  readonly operation: ReadOnlyProcessConversationOperationV1;
  readonly code: string;
}

export interface ReadOnlyProcessConversationSnapshotV1 {
  readonly revision: number;
  readonly phase: "idle" | "loading" | "loading_older" | "ready" | "failed" | "disposed";
  readonly conversation: ReadOnlyProcessConversationProjectionV1 | null;
  readonly failure: ReadOnlyProcessConversationFailureV1 | null;
}

export type ReadOnlyProcessConversationResultV1 =
  | { readonly kind: "completed"; readonly value: boolean }
  | { readonly kind: "failed"; readonly code: string };

export interface ReadOnlyProcessConversationControllerV1 {
  getSnapshot(): ReadOnlyProcessConversationSnapshotV1;
  subscribe(listener: () => void): () => void;
  openProcess(
    processId: string,
    degradation?: ReadOnlyProcessConversationDegradationV1 | null,
  ): Promise<ReadOnlyProcessConversationResultV1>;
  loadOlderTranscript(): Promise<ReadOnlyProcessConversationResultV1>;
  reloadLatestTranscript(): Promise<ReadOnlyProcessConversationResultV1>;
  close(): void;
  dispose(): void;
}

export interface ReadOnlyProcessConversationBudgetsV1 {
  /** Work budget for one repository page, never a total Conversation limit. */
  readonly transcriptPageMaximumBytes: number;
  /** Mounted UI window budget; older durable pages remain pageable. */
  readonly transcriptWindowMaximumBytes: number;
}

const defaultTranscriptPageMaximumBytesV1 = 128 * 1_024;
const defaultTranscriptWindowMaximumBytesV1 = defaultTranscriptPageMaximumBytesV1 * 3;

interface TranscriptWindowPageV1 {
  readonly entries: readonly TranscriptEntryV1[];
  readonly byteLength: number;
  readonly nextBeforeSequence: number | null;
}

interface TranscriptWindowV1 {
  readonly processId: string;
  readonly pages: readonly TranscriptWindowPageV1[];
  readonly newerOmitted: boolean;
}

type ConversationRepositoryV1 = Pick<
  ProgramProcessRepositoryV1,
  "loadProcess" | "loadTranscriptPage"
>;

function validateBudgetsV1(
  value: ReadOnlyProcessConversationBudgetsV1 | undefined,
): ReadOnlyProcessConversationBudgetsV1 {
  const selected = value ?? {
    transcriptPageMaximumBytes: defaultTranscriptPageMaximumBytesV1,
    transcriptWindowMaximumBytes: defaultTranscriptWindowMaximumBytesV1,
  };
  if (
    !Number.isSafeInteger(selected.transcriptPageMaximumBytes) ||
    selected.transcriptPageMaximumBytes <= 0 ||
    selected.transcriptPageMaximumBytes > operationalStructuredPayloadMaximumBytesV1 ||
    !Number.isSafeInteger(selected.transcriptWindowMaximumBytes) ||
    selected.transcriptWindowMaximumBytes < selected.transcriptPageMaximumBytes ||
    selected.transcriptWindowMaximumBytes > operationalStructuredPayloadMaximumBytesV1
  ) throw new TypeError("invalid read-only Conversation budgets");
  return { ...selected };
}

function failureCodeV1(error: unknown): string {
  if (error !== null && typeof error === "object") {
    const code = Reflect.get(error, "code");
    if (typeof code === "string" && code.length > 0) return code;
  }
  return "repository_failed";
}

function transcriptPageV1(page: TranscriptPageV1): TranscriptWindowPageV1 {
  return {
    entries: page.entries,
    byteLength: page.byteLength,
    nextBeforeSequence: page.nextBeforeSequence,
  };
}

function transcriptProjectionV1(
  window: TranscriptWindowV1,
  phase: ReadOnlyProcessConversationTranscriptV1["phase"],
): ReadOnlyProcessConversationTranscriptV1 {
  return {
    entries: window.pages.flatMap((page) => page.entries),
    byteLength: window.pages.reduce((sum, page) => sum + page.byteLength, 0),
    nextBeforeSequence: window.pages[0]?.nextBeforeSequence ?? null,
    newerOmitted: window.newerOmitted,
    phase,
  };
}

function prependTranscriptPageV1(input: {
  readonly current: TranscriptWindowV1;
  readonly page: TranscriptPageV1;
  readonly maximumBytes: number;
}): TranscriptWindowV1 {
  const pages = [transcriptPageV1(input.page), ...input.current.pages];
  let byteLength = pages.reduce((sum, page) => sum + page.byteLength, 0);
  let newerOmitted = input.current.newerOmitted;
  while (pages.length > 1 && byteLength > input.maximumBytes) {
    const removed = pages.pop();
    if (removed !== undefined) byteLength -= removed.byteLength;
    newerOmitted = true;
  }
  return { processId: input.current.processId, pages, newerOmitted };
}

/**
 * Creates a package- and Workspace-independent read projection for one durable
 * Process Conversation. The repository remains the sole authority; this
 * controller owns only a bounded mounted window and asynchronous currentness.
 */
export function createReadOnlyProcessConversationControllerV1(input: {
  readonly repository: ConversationRepositoryV1;
  readonly budgets?: ReadOnlyProcessConversationBudgetsV1;
}): ReadOnlyProcessConversationControllerV1 {
  const budgets = validateBudgetsV1(input.budgets);
  const listeners = new Set<() => void>();
  let disposed = false;
  let operationEpoch = 0;
  let transcriptWindow: TranscriptWindowV1 | null = null;
  let snapshot: ReadOnlyProcessConversationSnapshotV1 = {
    revision: 0,
    phase: "idle",
    conversation: null,
    failure: null,
  };

  const publishV1 = (
    next: Omit<ReadOnlyProcessConversationSnapshotV1, "revision">,
  ): void => {
    snapshot = { revision: snapshot.revision + 1, ...next };
    for (const listener of [...listeners]) {
      try {
        listener();
      } catch {
        // An observer cannot change the precedence of an already-published read projection.
      }
    }
  };

  const failedV1 = (
    operation: ReadOnlyProcessConversationOperationV1,
    code: string,
    conversation: ReadOnlyProcessConversationProjectionV1 | null,
  ): ReadOnlyProcessConversationResultV1 => {
    publishV1({
      phase: "failed",
      conversation: conversation === null ? null : {
        ...conversation,
        transcript: { ...conversation.transcript, phase: "failed" },
      },
      failure: { operation, code },
    });
    return { kind: "failed", code };
  };

  const openProcessV1 = async (
    rawProcessId: string,
    degradation: ReadOnlyProcessConversationDegradationV1 | null = null,
  ): Promise<ReadOnlyProcessConversationResultV1> => {
    if (disposed) return { kind: "failed", code: "disposed" };
    const epoch = ++operationEpoch;
    transcriptWindow = null;
    publishV1({ phase: "loading", conversation: null, failure: null });
    let processId: string;
    try {
      processId = normalizeProcessIdV1(rawProcessId);
    } catch {
      return failedV1("open", "process_id_invalid", null);
    }
    try {
      const process = await input.repository.loadProcess(processId);
      if (disposed || epoch !== operationEpoch) return { kind: "failed", code: "superseded" };
      if (process === null) return failedV1("open", "process_not_found", null);
      const page = await input.repository.loadTranscriptPage({
        processId,
        beforeSequence: null,
        maximumBytes: budgets.transcriptPageMaximumBytes,
      });
      if (disposed || epoch !== operationEpoch) return { kind: "failed", code: "superseded" };
      if (page === null) return failedV1("open", "process_transcript_not_found", null);
      transcriptWindow = {
        processId,
        pages: [transcriptPageV1(page)],
        newerOmitted: false,
      };
      publishV1({
        phase: "ready",
        conversation: {
          process,
          transcript: transcriptProjectionV1(transcriptWindow, "ready"),
          degradation,
        },
        failure: null,
      });
      return { kind: "completed", value: true };
    } catch (error) {
      if (disposed || epoch !== operationEpoch) return { kind: "failed", code: "superseded" };
      return failedV1("open", failureCodeV1(error), null);
    }
  };

  const loadOlderTranscriptV1 = async (): Promise<ReadOnlyProcessConversationResultV1> => {
    if (disposed) return { kind: "failed", code: "disposed" };
    const conversation = snapshot.conversation;
    const currentWindow = transcriptWindow;
    if (
      conversation === null || currentWindow === null ||
      currentWindow.processId !== conversation.process.processId
    ) return { kind: "completed", value: false };
    if (snapshot.phase === "loading_older") return { kind: "completed", value: false };
    const beforeSequence = conversation.transcript.nextBeforeSequence;
    if (beforeSequence === null) return { kind: "completed", value: false };
    const epoch = ++operationEpoch;
    publishV1({
      phase: "loading_older",
      conversation: {
        ...conversation,
        transcript: transcriptProjectionV1(currentWindow, "loading_older"),
      },
      failure: null,
    });
    try {
      const page = await input.repository.loadTranscriptPage({
        processId: conversation.process.processId,
        beforeSequence,
        maximumBytes: budgets.transcriptPageMaximumBytes,
      });
      if (disposed || epoch !== operationEpoch) return { kind: "failed", code: "superseded" };
      if (page === null) {
        return failedV1("load_older", "process_transcript_not_found", conversation);
      }
      transcriptWindow = prependTranscriptPageV1({
        current: currentWindow,
        page,
        maximumBytes: budgets.transcriptWindowMaximumBytes,
      });
      publishV1({
        phase: "ready",
        conversation: {
          process: conversation.process,
          transcript: transcriptProjectionV1(transcriptWindow, "ready"),
          degradation: conversation.degradation,
        },
        failure: null,
      });
      return { kind: "completed", value: page.entries.length > 0 };
    } catch (error) {
      if (disposed || epoch !== operationEpoch) return { kind: "failed", code: "superseded" };
      return failedV1("load_older", failureCodeV1(error), conversation);
    }
  };

  return {
    getSnapshot: () => snapshot,
    subscribe(listener) {
      if (disposed) return () => {};
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    openProcess: openProcessV1,
    loadOlderTranscript: loadOlderTranscriptV1,
    async reloadLatestTranscript() {
      const conversation = snapshot.conversation;
      if (conversation === null) return { kind: "completed", value: false };
      return await openProcessV1(
        conversation.process.processId,
        conversation.degradation,
      );
    },
    close() {
      if (disposed) return;
      operationEpoch += 1;
      transcriptWindow = null;
      publishV1({ phase: "idle", conversation: null, failure: null });
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      operationEpoch += 1;
      transcriptWindow = null;
      publishV1({ phase: "disposed", conversation: null, failure: null });
      listeners.clear();
    },
  };
}
