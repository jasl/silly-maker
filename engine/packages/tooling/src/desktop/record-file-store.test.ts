// SPDX-License-Identifier: MIT
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { createRecordFileStoreV1, parseWireMutationsV1 } from "./record-file-store.mts";

let cleanupDir: string | null = null;

afterEach(async () => {
  if (cleanupDir !== null) await rm(cleanupDir, { recursive: true, force: true });
  cleanupDir = null;
});

async function fixtureV1() {
  const root = await mkdtemp(join(tmpdir(), "sillymaker-records-"));
  cleanupDir = root;
  return { root, store: createRecordFileStoreV1(root) };
}

describe("the desktop record file store", () => {
  it("commits with optimistic revisions and survives keys with slashes", async () => {
    const { store } = await fixtureV1();
    const key = "player-profile/story.test.fixture";

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
    const { store } = await fixtureV1();
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
    const { store } = await fixtureV1();
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

  it("rejects duplicate keys and malformed wire values at wire admission", () => {
    expect(() =>
      parseWireMutationsV1([
        { kind: "put", namespace: "save", key: "one", expectedRevision: null, bytesBase64: "YQ==" },
        { kind: "delete", namespace: "save", key: "one", expectedRevision: 1 },
      ])
    ).toThrow("duplicate Host record mutation");
    expect(() =>
      parseWireMutationsV1([
        {
          kind: "put",
          namespace: "unknown",
          key: "one",
          expectedRevision: null,
          bytesBase64: "YQ==",
        },
      ])
    ).toThrow("invalid Host record namespace");
    expect(() =>
      parseWireMutationsV1([
        {
          kind: "put",
          namespace: "save",
          key: "one",
          expectedRevision: null,
          bytesBase64: "not-base64",
        },
      ])
    ).toThrow("invalid Host record bytes");
  });

  it("rejects negative-zero wire revisions", () => {
    expect(() =>
      parseWireMutationsV1([
        {
          kind: "put",
          namespace: "settings",
          key: "negative-zero-put",
          expectedRevision: -0,
          bytesBase64: "AQ==",
        },
      ])
    ).toThrow(TypeError);
    expect(() =>
      parseWireMutationsV1([
        {
          kind: "delete",
          namespace: "settings",
          key: "negative-zero-delete",
          expectedRevision: -0,
        },
      ])
    ).toThrow(TypeError);
  });

  it("rejects sparse wire batches during full-batch parsing", () => {
    const sparseBatch: unknown[] = [
      {
        kind: "put",
        namespace: "settings",
        key: "valid-first",
        expectedRevision: null,
        bytesBase64: "AQ==",
      },
    ];
    sparseBatch.length = 2;

    expect(() => parseWireMutationsV1(sparseBatch)).toThrow(TypeError);
  });

  it("fails closed for non-canonical record filenames", async () => {
    const { root, store } = await fixtureV1();
    await mkdir(join(root, "save"), { recursive: true });
    await writeFile(
      join(root, "save", "%61.json"),
      JSON.stringify({ revision: 1, bytesBase64: "YQ==" }),
      "utf8",
    );

    await expect(store.list("save")).rejects.toThrow(
      "desktop Host record filename is not canonical: %61.json",
    );
  });

  it("fails closed when two filenames alias the same logical key", async () => {
    const { root, store } = await fixtureV1();
    await mkdir(join(root, "save"), { recursive: true });
    const record = JSON.stringify({ revision: 1, bytesBase64: "YQ==" });
    await writeFile(join(root, "save", "a.json"), record, "utf8");
    await writeFile(join(root, "save", "%61.json"), record, "utf8");

    await expect(store.list("save")).rejects.toThrow("duplicate desktop Host record key: a");
  });
});
