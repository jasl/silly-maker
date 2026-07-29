// SPDX-License-Identifier: MIT
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { createRecordFileStoreV1 } from "./record-file-store.mts";

let cleanupDir: string | null = null;

afterEach(async () => {
  if (cleanupDir !== null) await rm(cleanupDir, { recursive: true, force: true });
  cleanupDir = null;
});

async function storeV1() {
  const dir = await mkdtemp(join(tmpdir(), "sillymaker-records-"));
  cleanupDir = dir;
  return createRecordFileStoreV1(dir);
}

describe("the desktop record file store", () => {
  it("commits with optimistic revisions and survives keys with slashes", async () => {
    const store = await storeV1();
    const key = "player-profile/story.example.cat-cafe";

    const first = await store.commit([
      { kind: "put", namespace: "settings", key, expectedRevision: null, bytesBase64: "YQ==" },
    ]);
    expect(first).toMatchObject({ kind: "committed" });
    const read = await store.read("settings", key);
    expect(read).toMatchObject({ revision: 1, bytesBase64: "YQ==" });

    // Stale expectations conflict without touching the stored record.
    const stale = await store.commit([
      { kind: "put", namespace: "settings", key, expectedRevision: null, bytesBase64: "Yg==" },
    ]);
    expect(stale).toMatchObject({ kind: "conflict", actualRevision: 1 });
    expect(await store.read("settings", key)).toMatchObject({ bytesBase64: "YQ==" });

    const second = await store.commit([
      { kind: "put", namespace: "settings", key, expectedRevision: 1, bytesBase64: "Yg==" },
    ]);
    expect(second).toMatchObject({ kind: "committed" });
    expect(await store.read("settings", key)).toMatchObject({ revision: 2, bytesBase64: "Yg==" });
  });

  it("lists a namespace sorted and deletes with revision checks", async () => {
    const store = await storeV1();
    await store.commit([
      {
        kind: "put",
        namespace: "save",
        key: "slot/b",
        expectedRevision: null,
        bytesBase64: "Yg==",
      },
      {
        kind: "put",
        namespace: "save",
        key: "slot/a",
        expectedRevision: null,
        bytesBase64: "YQ==",
      },
    ]);
    expect((await store.list("save")).map((record) => record.key)).toEqual(["slot/a", "slot/b"]);

    const wrong = await store.commit([
      { kind: "delete", namespace: "save", key: "slot/a", expectedRevision: 9 },
    ]);
    expect(wrong.kind).toBe("conflict");
    const right = await store.commit([
      { kind: "delete", namespace: "save", key: "slot/a", expectedRevision: 1 },
    ]);
    expect(right.kind).toBe("committed");
    expect(await store.read("save", "slot/a")).toBeNull();
    expect((await store.list("save")).map((record) => record.key)).toEqual(["slot/b"]);
  });

  it("prechecks multi-key commits so one stale key rejects the whole batch", async () => {
    const store = await storeV1();
    await store.commit([
      { kind: "put", namespace: "save", key: "a", expectedRevision: null, bytesBase64: "YQ==" },
    ]);
    const batch = await store.commit([
      { kind: "put", namespace: "save", key: "b", expectedRevision: null, bytesBase64: "Yg==" },
      { kind: "put", namespace: "save", key: "a", expectedRevision: 5, bytesBase64: "Yw==" },
    ]);
    expect(batch.kind).toBe("conflict");
    expect(await store.read("save", "b")).toBeNull();
  });
});
