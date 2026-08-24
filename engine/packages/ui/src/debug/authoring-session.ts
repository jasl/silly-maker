// SPDX-License-Identifier: MIT
import { useSyncExternalStore } from "react";

/**
 * The shared authoring document session: one framework-free state machine
 * for the read → draft → edit → dirty → CAS write → conflict loop that the
 * Scene workspace and the Motion Workbench each used to hand-roll. It owns
 * the author-trust semantics — a monotonic open fence (a stale read or a
 * save completing after a newer open never applies), compare-and-swap
 * saves, discard, and bounded undo/redo with gesture coalescing — while
 * the workspaces keep their own edit vocabulary and note texts. Drafts
 * live only in session memory; nothing here is a second config authority.
 */

export interface AuthoringDocumentIoV1<TDocument> {
  read(path: string): Promise<
    | { readonly kind: "ok"; readonly digest: string; readonly document: TDocument }
    | { readonly kind: "error"; readonly code: string }
  >;
  write(input: {
    readonly path: string;
    readonly expectedDigest: string;
    readonly document: TDocument;
  }): Promise<
    | { readonly kind: "ok"; readonly digest: string }
    | { readonly kind: "error"; readonly code: string }
  >;
}

export interface AuthoringSessionSnapshotV1<TDocument> {
  /** Opaque identity for this installed/opened document successor. */
  readonly documentIdentity: string | null;
  /** Monotonic within one session; every successful draft transition advances it. */
  readonly draftRevision: number;
  readonly path: string | null;
  /** The saved bytes' digest; null until a read supplies one (no CAS save). */
  readonly digest: string | null;
  readonly saved: TDocument | null;
  readonly draft: TDocument | null;
  readonly dirty: boolean;
  readonly loading: boolean;
  readonly saving: boolean;
  readonly canUndo: boolean;
  readonly canRedo: boolean;
}

export type AuthoringSessionOpenResultV1 =
  | { readonly kind: "ok" }
  /** A newer open superseded this one; nothing was applied. */
  | { readonly kind: "stale" }
  | { readonly kind: "error"; readonly code: string };

export type AuthoringSessionSaveResultV1 =
  | { readonly kind: "ok"; readonly digest: string }
  /** A newer open superseded this save; nothing was applied. */
  | { readonly kind: "stale" }
  /** No loaded document/digest/io (or a load or save is in flight). */
  | { readonly kind: "not_ready" }
  | { readonly kind: "error"; readonly code: string };

export type AuthoringDraftReplaceResultV1 =
  | { readonly kind: "ok"; readonly draftRevision: number }
  | { readonly kind: "not_ready" }
  | { readonly kind: "stale_document" }
  | { readonly kind: "stale_revision" }
  | { readonly kind: "unchanged" };

export interface AuthoringDocumentSessionV1<TDocument> {
  getSnapshot(): AuthoringSessionSnapshotV1<TDocument>;
  subscribe(listener: () => void): () => void;
  /**
   * Installs an already-loaded document (for example the import-time value
   * a Story binding ships). A null digest keeps CAS saves disabled until
   * `refreshSaved` reads the file's real digest.
   */
  installSaved(input: {
    readonly path: string;
    readonly document: TDocument;
    readonly digest: string | null;
  }): void;
  /** Reads and installs a document; the draft and history reset. */
  open(path: string): Promise<AuthoringSessionOpenResultV1>;
  /**
   * Re-reads saved + digest while keeping the draft and history — the 409
   * recovery path (compare the draft against what the file became).
   */
  refreshSaved(): Promise<AuthoringSessionOpenResultV1>;
  /**
   * CAS-writes `input.document ?? draft`. Success installs the written
   * document as saved. If no newer draft revision appeared while the write
   * was pending, it also becomes the draft (a caller-adjusted payload, e.g.
   * a human_tuned graduation, lands as one undoable draft step); otherwise
   * the newer draft and its history remain current and dirty.
   */
  save(input?: { readonly document?: TDocument }): Promise<AuthoringSessionSaveResultV1>;
  /** Draft returns to saved; the abandoned draft stays one undo away. */
  discard(): void;
  /**
   * Replaces the draft and pushes one undo step. Consecutive replaces with
   * the same `coalesceKey` collapse into that step, so a drag gesture or a
   * typed field edits as one undoable unit.
   */
  replaceDraft(next: TDocument, options?: { readonly coalesceKey?: string }): void;
  /**
   * Replaces the draft only while the caller's opaque document identity and
   * draft revision still name the current value. Rejections publish nothing
   * and leave draft/history/dirty state byte-for-byte untouched.
   */
  replaceDraftIfCurrent(input: {
    readonly documentIdentity: string;
    readonly expectedDraftRevision: number;
    readonly document: TDocument;
    readonly coalesceKey?: string;
  }): AuthoringDraftReplaceResultV1;
  undo(): void;
  redo(): void;
}

const defaultHistoryLimitV1 = 100;
let nextAuthoringSessionIdentityV1 = 0;

function jsonCloneV1<TDocument>(document: TDocument): TDocument {
  return JSON.parse(JSON.stringify(document)) as TDocument;
}

function jsonEqualsV1<TDocument>(a: TDocument, b: TDocument): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function createAuthoringDocumentSessionV1<TDocument>(input: {
  readonly io?: AuthoringDocumentIoV1<TDocument>;
  readonly clone?: (document: TDocument) => TDocument;
  readonly equals?: (a: TDocument, b: TDocument) => boolean;
  readonly historyLimit?: number;
} = {}): AuthoringDocumentSessionV1<TDocument> {
  const io = input.io ?? null;
  const clone = input.clone ?? jsonCloneV1<TDocument>;
  const equals = input.equals ?? jsonEqualsV1<TDocument>;
  const historyLimit = input.historyLimit ?? defaultHistoryLimitV1;
  const sessionIdentity = ++nextAuthoringSessionIdentityV1;

  let documentIdentity: string | null = null;
  let documentSuccessor = 0;
  let draftRevision = 0;
  let path: string | null = null;
  let digest: string | null = null;
  let saved: TDocument | null = null;
  let draft: TDocument | null = null;
  let loading = false;
  let saving = false;
  let undoStack: TDocument[] = [];
  let redoStack: TDocument[] = [];
  let lastCoalesceKey: string | null = null;
  let refreshRequest = 0;
  // Monotonic fence: opens and installs bump it; async results from an
  // older generation are discarded instead of overwriting newer state.
  let generation = 0;

  const listeners = new Set<() => void>();
  let snapshot: AuthoringSessionSnapshotV1<TDocument> = {
    documentIdentity: null,
    draftRevision: 0,
    path: null,
    digest: null,
    saved: null,
    draft: null,
    dirty: false,
    loading: false,
    saving: false,
    canUndo: false,
    canRedo: false,
  };

  const publish = (): void => {
    snapshot = {
      documentIdentity,
      draftRevision,
      path,
      digest,
      saved,
      draft,
      dirty: saved !== null && draft !== null && !equals(saved, draft),
      loading,
      saving,
      canUndo: undoStack.length > 0,
      canRedo: redoStack.length > 0,
    };
    for (const listener of [...listeners]) listener();
  };

  const resetHistory = (): void => {
    undoStack = [];
    redoStack = [];
    lastCoalesceKey = null;
  };

  const advanceDraftRevision = (): void => {
    draftRevision += 1;
  };

  const advanceDocumentIdentity = (): void => {
    documentSuccessor += 1;
    documentIdentity = `authoring-document:${String(sessionIdentity)}:${String(documentSuccessor)}`;
  };

  const applyDraftReplacement = (
    next: TDocument,
    coalesceKey: string | null,
  ): boolean => {
    if (draft === null || equals(draft, next)) return false;
    if (coalesceKey === null || coalesceKey !== lastCoalesceKey) {
      undoStack.push(draft);
      if (undoStack.length > historyLimit) undoStack.shift();
      redoStack = [];
    }
    lastCoalesceKey = coalesceKey;
    draft = next;
    advanceDraftRevision();
    publish();
    return true;
  };

  const install = (
    nextPath: string,
    document: TDocument,
    nextDigest: string | null,
  ): void => {
    generation += 1;
    refreshRequest += 1;
    path = nextPath;
    digest = nextDigest;
    saved = document;
    draft = clone(document);
    loading = false;
    resetHistory();
    advanceDocumentIdentity();
    advanceDraftRevision();
    publish();
  };

  const session: AuthoringDocumentSessionV1<TDocument> = {
    getSnapshot: () => snapshot,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    installSaved(installInput) {
      install(installInput.path, installInput.document, installInput.digest);
    },
    async open(nextPath: string): Promise<AuthoringSessionOpenResultV1> {
      if (io === null) return { kind: "error", code: "io_missing" };
      const requestGeneration = ++generation;
      refreshRequest += 1;
      loading = true;
      publish();
      const result = await io.read(nextPath);
      if (generation !== requestGeneration) return { kind: "stale" };
      loading = false;
      if (result.kind !== "ok") {
        publish();
        return { kind: "error", code: result.code };
      }
      path = nextPath;
      digest = result.digest;
      saved = result.document;
      draft = clone(result.document);
      resetHistory();
      advanceDocumentIdentity();
      advanceDraftRevision();
      publish();
      return { kind: "ok" };
    },
    async refreshSaved(): Promise<AuthoringSessionOpenResultV1> {
      if (io === null || path === null) return { kind: "error", code: "io_missing" };
      const requestGeneration = generation;
      const requestRefresh = ++refreshRequest;
      const requestPath = path;
      const requestDocumentIdentity = documentIdentity;
      const result = await io.read(requestPath);
      if (
        generation !== requestGeneration || refreshRequest !== requestRefresh ||
        path !== requestPath || documentIdentity !== requestDocumentIdentity
      ) {
        return { kind: "stale" };
      }
      if (result.kind !== "ok") return { kind: "error", code: result.code };
      digest = result.digest;
      saved = result.document;
      lastCoalesceKey = null;
      advanceDraftRevision();
      publish();
      return { kind: "ok" };
    },
    async save(saveInput = {}): Promise<AuthoringSessionSaveResultV1> {
      if (
        io === null || path === null || digest === null || draft === null ||
        loading || saving
      ) {
        return { kind: "not_ready" };
      }
      const requestGeneration = generation;
      const requestDocumentIdentity = documentIdentity;
      const requestDraftRevision = draftRevision;
      const written = saveInput.document ?? draft;
      saving = true;
      publish();
      const result = await io.write({ path, expectedDigest: digest, document: written });
      if (
        generation !== requestGeneration ||
        documentIdentity !== requestDocumentIdentity
      ) {
        // A newer open owns the session now; only the flag is ours to clear.
        saving = false;
        publish();
        return { kind: "stale" };
      }
      saving = false;
      if (result.kind !== "ok") {
        publish();
        return { kind: "error", code: result.code };
      }
      refreshRequest += 1;
      const draftAdvanced = draftRevision !== requestDraftRevision;
      digest = result.digest;
      saved = clone(written);
      if (draftAdvanced) {
        publish();
        return { kind: "ok", digest: result.digest };
      }
      // A caller-adjusted payload replaces the draft as one undoable step.
      const draftChanged = draft !== null && !equals(draft, written);
      if (draftChanged && draft !== null) {
        undoStack.push(draft);
        if (undoStack.length > historyLimit) undoStack.shift();
        redoStack = [];
      }
      draft = clone(written);
      lastCoalesceKey = null;
      if (draftChanged) advanceDraftRevision();
      publish();
      return { kind: "ok", digest: result.digest };
    },
    discard() {
      if (saved === null || draft === null || equals(saved, draft)) return;
      undoStack.push(draft);
      if (undoStack.length > historyLimit) undoStack.shift();
      redoStack = [];
      lastCoalesceKey = null;
      draft = clone(saved);
      advanceDraftRevision();
      publish();
    },
    replaceDraft(next: TDocument, options = {}) {
      applyDraftReplacement(next, options.coalesceKey ?? null);
    },
    replaceDraftIfCurrent(replaceInput) {
      if (draft === null || documentIdentity === null) return { kind: "not_ready" };
      if (replaceInput.documentIdentity !== documentIdentity) {
        return { kind: "stale_document" };
      }
      if (replaceInput.expectedDraftRevision !== draftRevision) {
        return { kind: "stale_revision" };
      }
      const applied = applyDraftReplacement(
        replaceInput.document,
        replaceInput.coalesceKey ?? null,
      );
      return applied ? { kind: "ok", draftRevision } : { kind: "unchanged" };
    },
    undo() {
      const previous = undoStack.pop();
      if (previous === undefined || draft === null) return;
      redoStack.push(draft);
      draft = previous;
      lastCoalesceKey = null;
      advanceDraftRevision();
      publish();
    },
    redo() {
      const next = redoStack.pop();
      if (next === undefined || draft === null) return;
      undoStack.push(draft);
      draft = next;
      lastCoalesceKey = null;
      advanceDraftRevision();
      publish();
    },
  };
  return session;
}

/** React binding: subscribe a component to the session's snapshot. */
export function useAuthoringDocumentSessionV1<TDocument>(
  session: AuthoringDocumentSessionV1<TDocument>,
): AuthoringSessionSnapshotV1<TDocument> {
  return useSyncExternalStore(session.subscribe, session.getSnapshot, session.getSnapshot);
}
