// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";

import type { AuthoringDocumentIoV1 } from "./authoring-session.ts";
import { createAuthoringDocumentSessionV1 } from "./authoring-session.ts";

interface Doc {
  readonly value: number;
  readonly note?: string;
}

function fakeIoV1(initial: Readonly<Record<string, Doc>>): {
  readonly io: AuthoringDocumentIoV1<Doc>;
  readonly writes: { path: string; expectedDigest: string; document: Doc }[];
  set(path: string, document: Doc, digest: string): void;
  failNextWrite(code: string): void;
  deferNextRead(): () => void;
  deferNextWrite(): () => void;
} {
  const documents = new Map<string, { document: Doc; digest: string }>(
    Object.entries(initial).map(([path, document]) => [path, { document, digest: `d1:${path}` }]),
  );
  const writes: { path: string; expectedDigest: string; document: Doc }[] = [];
  let failWrite: string | null = null;
  let deferNext = false;
  let deferredResolve: (() => void) | null = null;
  let deferWrite = false;
  let deferredWriteResolve: (() => void) | null = null;
  return {
    io: {
      async read(path) {
        if (deferNext) {
          deferNext = false;
          await new Promise<void>((resolve) => {
            deferredResolve = resolve;
          });
        }
        const entry = documents.get(path);
        if (entry === undefined) return { kind: "error", code: "not_found" };
        return { kind: "ok", digest: entry.digest, document: entry.document };
      },
      async write(input) {
        if (deferWrite) {
          deferWrite = false;
          await new Promise<void>((resolve) => {
            deferredWriteResolve = resolve;
          });
        }
        if (failWrite !== null) {
          const code = failWrite;
          failWrite = null;
          return { kind: "error", code };
        }
        writes.push({ ...input });
        const digest = `d${String(writes.length + 1)}:${input.path}`;
        documents.set(input.path, { document: input.document, digest });
        return { kind: "ok", digest };
      },
    },
    writes,
    set(path, document, digest) {
      documents.set(path, { document, digest });
    },
    failNextWrite(code) {
      failWrite = code;
    },
    deferNextRead() {
      deferNext = true;
      return () => {
        deferredResolve?.();
        deferredResolve = null;
      };
    },
    deferNextWrite() {
      deferWrite = true;
      return () => {
        deferredWriteResolve?.();
        deferredWriteResolve = null;
      };
    },
  };
}

describe("createAuthoringDocumentSessionV1", () => {
  it("opens, edits, saves by CAS, and lands the written document as saved+draft", async () => {
    const fake = fakeIoV1({ "a.json": { value: 1 } });
    const session = createAuthoringDocumentSessionV1<Doc>({ io: fake.io });
    await session.open("a.json");
    expect(session.getSnapshot()).toMatchObject({
      path: "a.json",
      digest: "d1:a.json",
      dirty: false,
      loading: false,
    });

    session.replaceDraft({ value: 2 });
    expect(session.getSnapshot().dirty).toBe(true);

    // The caller may adjust the payload (e.g. a human_tuned graduation):
    // the written document becomes saved AND draft, one undo step apart.
    const result = await session.save({ document: { value: 2, note: "tuned" } });
    expect(result).toMatchObject({ kind: "ok", digest: "d2:a.json" });
    expect(fake.writes[0]).toMatchObject({ expectedDigest: "d1:a.json" });
    expect(session.getSnapshot().dirty).toBe(false);
    expect(session.getSnapshot().draft).toEqual({ value: 2, note: "tuned" });
    session.undo();
    expect(session.getSnapshot().draft).toEqual({ value: 2 });
  });

  it("keeps the draft on a write conflict and recovers via refreshSaved", async () => {
    const fake = fakeIoV1({ "a.json": { value: 1 } });
    const session = createAuthoringDocumentSessionV1<Doc>({ io: fake.io });
    await session.open("a.json");
    session.replaceDraft({ value: 5 });

    fake.failNextWrite("digest_conflict");
    const failed = await session.save();
    expect(failed).toEqual({ kind: "error", code: "digest_conflict" });
    expect(session.getSnapshot().draft).toEqual({ value: 5 });

    // The file moved on underneath: refreshSaved re-reads saved + digest
    // while the dirty draft survives for comparison.
    fake.set("a.json", { value: 9 }, "d9:a.json");
    await session.refreshSaved();
    expect(session.getSnapshot()).toMatchObject({ digest: "d9:a.json", dirty: true });
    expect(session.getSnapshot().saved).toEqual({ value: 9 });
    expect(session.getSnapshot().draft).toEqual({ value: 5 });

    const retried = await session.save();
    expect(retried).toMatchObject({ kind: "ok" });
    expect(fake.writes.at(-1)).toMatchObject({ expectedDigest: "d9:a.json" });
  });

  it("keeps a newer draft when an older captured save completes", async () => {
    const fake = fakeIoV1({ "a.json": { value: 1 } });
    const session = createAuthoringDocumentSessionV1<Doc>({ io: fake.io });
    await session.open("a.json");
    session.replaceDraft({ value: 2 });

    const release = fake.deferNextWrite();
    const save = session.save();
    session.replaceDraft({ value: 3 });
    const revisionAfterNewerEdit = session.getSnapshot().draftRevision;
    release();

    await expect(save).resolves.toMatchObject({ kind: "ok", digest: "d2:a.json" });
    expect(session.getSnapshot()).toMatchObject({
      saved: { value: 2 },
      draft: { value: 3 },
      dirty: true,
      draftRevision: revisionAfterNewerEdit,
    });
    session.undo();
    expect(session.getSnapshot().draft).toEqual({ value: 2 });
  });

  it("drops a stale read behind a newer open and a save behind a newer open", async () => {
    const fake = fakeIoV1({ "slow.json": { value: 1 }, "fast.json": { value: 2 } });
    const session = createAuthoringDocumentSessionV1<Doc>({ io: fake.io });

    const release = fake.deferNextRead();
    const slow = session.open("slow.json");
    const fast = session.open("fast.json");
    await fast;
    release();
    expect(await slow).toEqual({ kind: "stale" });
    expect(session.getSnapshot().path).toBe("fast.json");

    // A save that resolves after another open applies nothing.
    session.replaceDraft({ value: 3 });
    const save = session.save();
    await session.open("slow.json");
    expect(await save).toEqual({ kind: "stale" });
    expect(session.getSnapshot()).toMatchObject({ path: "slow.json", saving: false });
    expect(session.getSnapshot().draft).toEqual({ value: 1 });
  });

  it("drops a refresh result that completes behind a document successor", async () => {
    const releases: { open?: () => void; refresh?: () => void } = {};
    let initialRead = true;
    const io: AuthoringDocumentIoV1<Doc> = {
      async read(path) {
        if (initialRead) {
          initialRead = false;
        } else if (path === "b.json") {
          await new Promise<void>((resolve) => {
            releases.open = resolve;
          });
        } else {
          await new Promise<void>((resolve) => {
            releases.refresh = resolve;
          });
        }
        return {
          kind: "ok",
          digest: path === "a.json" ? "d2:a.json" : "d1:b.json",
          document: { value: path === "a.json" ? 9 : 2 },
        };
      },
      write() {
        return Promise.resolve({ kind: "error", code: "unused" });
      },
    };
    const session = createAuthoringDocumentSessionV1<Doc>({ io });
    await session.open("a.json");

    const opening = session.open("b.json");
    const refreshing = session.refreshSaved();
    await Promise.resolve();
    const finishOpen = releases.open;
    const finishRefresh = releases.refresh;
    if (finishOpen === undefined || finishRefresh === undefined) {
      throw new TypeError("missing deferred read releases");
    }
    finishOpen();
    await expect(opening).resolves.toEqual({ kind: "ok" });
    finishRefresh();

    await expect(refreshing).resolves.toEqual({ kind: "stale" });
    expect(session.getSnapshot()).toMatchObject({
      path: "b.json",
      digest: "d1:b.json",
      saved: { value: 2 },
      draft: { value: 2 },
    });
  });

  it("coalesces gesture edits into one undo step and bounds the history", () => {
    const session = createAuthoringDocumentSessionV1<Doc>({ historyLimit: 3 });
    session.installSaved({ path: "a.json", document: { value: 0 }, digest: null });

    // One drag gesture = many replaces under one key = one undo step.
    session.replaceDraft({ value: 1 }, { coalesceKey: "drag:1" });
    session.replaceDraft({ value: 2 }, { coalesceKey: "drag:1" });
    session.replaceDraft({ value: 3 }, { coalesceKey: "drag:1" });
    expect(session.getSnapshot().draft).toEqual({ value: 3 });
    session.undo();
    expect(session.getSnapshot().draft).toEqual({ value: 0 });
    session.redo();
    expect(session.getSnapshot().draft).toEqual({ value: 3 });

    // A different key breaks the run; the limit drops the oldest step.
    session.replaceDraft({ value: 4 }, { coalesceKey: "drag:2" });
    session.replaceDraft({ value: 5 });
    session.replaceDraft({ value: 6 });
    session.replaceDraft({ value: 7 });
    session.undo();
    session.undo();
    session.undo();
    expect(session.getSnapshot().canUndo).toBe(false);
    expect(session.getSnapshot().draft).toEqual({ value: 4 });
  });

  it("advances one monotonic draft revision across edits and document-session successors", async () => {
    const fake = fakeIoV1({ "a.json": { value: 1 }, "b.json": { value: 2 } });
    const session = createAuthoringDocumentSessionV1<Doc>({ io: fake.io });

    expect(session.getSnapshot()).toMatchObject({
      documentIdentity: null,
      draftRevision: 0,
    });

    session.installSaved({ path: "a.json", document: { value: 1 }, digest: "d1:a.json" });
    const installed = session.getSnapshot();
    expect(installed.documentIdentity).not.toBeNull();
    expect(installed.draftRevision).toBe(1);

    session.replaceDraft({ value: 2 }, { coalesceKey: "drag:1" });
    expect(session.getSnapshot().draftRevision).toBe(2);
    session.replaceDraft({ value: 3 }, { coalesceKey: "drag:1" });
    expect(session.getSnapshot().draftRevision).toBe(3);
    session.undo();
    expect(session.getSnapshot().draftRevision).toBe(4);
    session.redo();
    expect(session.getSnapshot().draftRevision).toBe(5);
    session.discard();
    expect(session.getSnapshot().draftRevision).toBe(6);

    await session.refreshSaved();
    expect(session.getSnapshot()).toMatchObject({
      documentIdentity: installed.documentIdentity,
      draftRevision: 7,
    });

    await session.open("b.json");
    const opened = session.getSnapshot();
    expect(opened.documentIdentity).not.toBe(installed.documentIdentity);
    expect(opened.draftRevision).toBe(8);

    session.installSaved({ path: "a.json", document: { value: 9 }, digest: "d9:a.json" });
    expect(session.getSnapshot().documentIdentity).not.toBe(opened.documentIdentity);
    expect(session.getSnapshot().draftRevision).toBe(9);
  });

  it("atomically rejects stale or unchanged compare-and-replace attempts", () => {
    const session = createAuthoringDocumentSessionV1<Doc>();
    session.installSaved({ path: "a.json", document: { value: 1 }, digest: null });
    const current = session.getSnapshot();
    if (current.documentIdentity === null) throw new TypeError("missing document identity");

    expect(session.replaceDraftIfCurrent({
      documentIdentity: "authoring-document:stale",
      expectedDraftRevision: current.draftRevision,
      document: { value: 2 },
    })).toEqual({ kind: "stale_document" });
    expect(session.getSnapshot()).toBe(current);

    expect(session.replaceDraftIfCurrent({
      documentIdentity: current.documentIdentity,
      expectedDraftRevision: current.draftRevision + 1,
      document: { value: 2 },
    })).toEqual({ kind: "stale_revision" });
    expect(session.getSnapshot()).toBe(current);

    expect(session.replaceDraftIfCurrent({
      documentIdentity: current.documentIdentity,
      expectedDraftRevision: current.draftRevision,
      document: { value: 1 },
    })).toEqual({ kind: "unchanged" });
    expect(session.getSnapshot()).toBe(current);

    expect(session.replaceDraftIfCurrent({
      documentIdentity: current.documentIdentity,
      expectedDraftRevision: current.draftRevision,
      document: { value: 2 },
      coalesceKey: "drag:1",
    })).toEqual({ kind: "ok", draftRevision: current.draftRevision + 1 });
    expect(session.getSnapshot()).toMatchObject({
      draft: { value: 2 },
      dirty: true,
      canUndo: true,
      canRedo: false,
      draftRevision: current.draftRevision + 1,
    });
  });

  it("keeps the current document when a later open fails", async () => {
    const fake = fakeIoV1({ "a.json": { value: 1 } });
    const session = createAuthoringDocumentSessionV1<Doc>({ io: fake.io });
    await session.open("a.json");
    session.replaceDraft({ value: 4 });

    const failed = await session.open("missing.json");
    expect(failed).toEqual({ kind: "error", code: "not_found" });
    expect(session.getSnapshot()).toMatchObject({
      path: "a.json",
      dirty: true,
      loading: false,
    });
    expect(session.getSnapshot().draft).toEqual({ value: 4 });
  });

  it("makes discard recoverable and clears history on open", async () => {
    const fake = fakeIoV1({ "a.json": { value: 1 }, "b.json": { value: 2 } });
    const session = createAuthoringDocumentSessionV1<Doc>({ io: fake.io });
    await session.open("a.json");
    session.replaceDraft({ value: 8 });

    session.discard();
    expect(session.getSnapshot().dirty).toBe(false);
    session.undo();
    expect(session.getSnapshot().draft).toEqual({ value: 8 });

    await session.open("b.json");
    expect(session.getSnapshot()).toMatchObject({ canUndo: false, canRedo: false });
    expect(session.getSnapshot().draft).toEqual({ value: 2 });
  });

  it("stays save-disabled without io or digest", async () => {
    const detached = createAuthoringDocumentSessionV1<Doc>();
    detached.installSaved({ path: "a.json", document: { value: 1 }, digest: null });
    detached.replaceDraft({ value: 2 });
    expect(await detached.save()).toEqual({ kind: "not_ready" });

    const fake = fakeIoV1({ "a.json": { value: 1 } });
    const withIo = createAuthoringDocumentSessionV1<Doc>({ io: fake.io });
    withIo.installSaved({ path: "a.json", document: { value: 1 }, digest: null });
    withIo.replaceDraft({ value: 2 });
    expect(await withIo.save()).toEqual({ kind: "not_ready" });
    // refreshSaved supplies the real digest; saving unlocks.
    await withIo.refreshSaved();
    expect(await withIo.save()).toMatchObject({ kind: "ok" });
  });
});
