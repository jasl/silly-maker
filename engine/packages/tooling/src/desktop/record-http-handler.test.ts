// SPDX-License-Identifier: MIT
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { createRecordFileStoreV1 } from "./record-file-store.mts";
import { handleRecordHttpRequestV1 } from "./record-http-handler.mts";

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

  it("fails malformed paths and unknown namespaces before storage access", async () => {
    const store = await fixtureV1();
    const malformed = await handleRecordHttpRequestV1(requestV1("/%"), "/%", store);
    expect(malformed.status).toBe(400);

    const unknown = await handleRecordHttpRequestV1(requestV1("/unknown"), "/unknown", store);
    expect(unknown.status).toBe(400);
  });
});
