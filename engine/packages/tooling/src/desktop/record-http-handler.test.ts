// SPDX-License-Identifier: MIT
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createRecordFileStoreV1 } from "./record-file-store.mts";
import { handleRecordHttpRequestV1, type RecordHttpStoreV1 } from "./record-http-handler.mts";

let cleanupDir: string | null = null;

afterEach(async () => {
  if (cleanupDir !== null) await rm(cleanupDir, { recursive: true, force: true });
  cleanupDir = null;
});

async function fixtureV1() {
  const root = await mkdtemp(join(tmpdir(), "sillymaker-record-http-"));
  cleanupDir = root;
  return createRecordFileStoreV1(root);
}

function requestV1(path: string, init?: RequestInit): Request {
  return new Request(`http://127.0.0.1:41800/sillymaker/records${path}`, init);
}

describe("the desktop record HTTP handler", () => {
  it("commits and reads encoded keys over the same-origin JSON protocol", async () => {
    const store = await fixtureV1();
    const commit = await handleRecordHttpRequestV1(
      requestV1("/commit", {
        method: "POST",
        headers: {
          "content-type": "application/json; charset=utf-8",
          origin: "http://127.0.0.1:41800",
        },
        body: JSON.stringify({
          mutations: [
            {
              kind: "put",
              namespace: "settings",
              key: "profile/story.example",
              expectedRevision: null,
              bytesBase64: "YQ==",
            },
          ],
        }),
      }),
      "/commit",
      store,
    );
    expect(commit.status).toBe(200);
    expect(await commit.json()).toMatchObject({ kind: "committed" });

    const read = await handleRecordHttpRequestV1(
      requestV1("/settings/profile%2Fstory.example"),
      "/settings/profile%2Fstory.example",
      store,
    );
    expect(read.status).toBe(200);
    expect(await read.json()).toMatchObject({
      key: "profile/story.example",
      revision: 1,
      bytesBase64: "YQ==",
    });
  });

  it("rejects cross-site, non-JSON, oversized, and malformed commits", async () => {
    const store = await fixtureV1();
    const body = JSON.stringify({ mutations: [] });

    const crossSite = await handleRecordHttpRequestV1(
      requestV1("/commit", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "https://attacker.example",
          "sec-fetch-site": "cross-site",
        },
        body,
      }),
      "/commit",
      store,
    );
    expect(crossSite.status).toBe(403);

    const wrongType = await handleRecordHttpRequestV1(
      requestV1("/commit", { method: "POST", headers: { "content-type": "text/plain" }, body }),
      "/commit",
      store,
    );
    expect(wrongType.status).toBe(415);

    const oversized = await handleRecordHttpRequestV1(
      requestV1("/commit", {
        method: "POST",
        headers: { "content-type": "application/json", "content-length": "33554433" },
        body: "{}",
      }),
      "/commit",
      store,
    );
    expect(oversized.status).toBe(413);

    const malformed = await handleRecordHttpRequestV1(
      requestV1("/commit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{not-json",
      }),
      "/commit",
      store,
    );
    expect(malformed.status).toBe(400);
    expect(await store.list("settings")).toEqual([]);
  });

  it("rejects malformed wire mutations before calling store.commit", async () => {
    const commit = vi.fn<RecordHttpStoreV1["commit"]>(async () =>
      Object.freeze({ kind: "committed", records: Object.freeze([]) }),
    );
    const store = Object.freeze({
      async read() {
        return null;
      },
      async list() {
        return Object.freeze([]);
      },
      commit,
    }) satisfies RecordHttpStoreV1;
    const validPut = {
      kind: "put",
      namespace: "settings",
      key: "valid",
      expectedRevision: null,
      bytesBase64: "AQ==",
    };
    const bodies = [
      JSON.stringify({ mutations: [] }),
      JSON.stringify({ mutations: [null] }),
      JSON.stringify({ mutations: [7] }),
      JSON.stringify({ mutations: [{ ...validPut, kind: "unknown" }] }),
      JSON.stringify({ mutations: [{ ...validPut, namespace: "unknown" }] }),
      JSON.stringify({ mutations: [{ ...validPut, key: 7 }] }),
      JSON.stringify({ mutations: [{ ...validPut, bytesBase64: [1] }] }),
      JSON.stringify({ mutations: [{ ...validPut, expectedRevision: "1" }] }),
      JSON.stringify({ mutations: [{ ...validPut, expectedRevision: 1.5 }] }),
      JSON.stringify({ mutations: [{ ...validPut, expectedRevision: -1 }] }),
      JSON.stringify({
        mutations: [{ ...validPut, expectedRevision: Number.MAX_SAFE_INTEGER + 1 }],
      }),
      JSON.stringify({
        mutations: [
          {
            kind: "delete",
            namespace: "settings",
            key: "valid",
            expectedRevision: null,
          },
        ],
      }),
      JSON.stringify({
        mutations: [validPut, { ...validPut, key: "late-invalid", bytesBase64: [1] }],
      }),
      JSON.stringify({
        mutations: [
          validPut,
          {
            kind: "delete",
            namespace: "settings",
            key: "valid",
            expectedRevision: 1,
          },
        ],
      }),
      '{"mutations":[{"kind":"put","namespace":"settings","key":"negative-zero","expectedRevision":-0,"bytesBase64":"AQ=="}]}',
    ];

    for (const body of bodies) {
      const response = await handleRecordHttpRequestV1(
        requestV1("/commit", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body,
        }),
        "/commit",
        store,
      );
      expect(response.status).toBe(400);
    }
    expect(commit).not.toHaveBeenCalled();
  });

  it("fails malformed paths and unknown namespaces before storage access", async () => {
    const store = await fixtureV1();
    const malformed = await handleRecordHttpRequestV1(requestV1("/%"), "/%", store);
    expect(malformed.status).toBe(400);

    const unknown = await handleRecordHttpRequestV1(requestV1("/unknown"), "/unknown", store);
    expect(unknown.status).toBe(400);
  });
});
