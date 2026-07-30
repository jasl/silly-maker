// SPDX-License-Identifier: MIT
import { runInNewContext } from "node:vm";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import type { HostStoredRecordV1 } from "@sillymaker/base";
import { createHttpHostRecordStoreV1 } from "@sillymaker/web";
import {
  hostRecordStoreMalformedConformanceExpectedV1,
  runHostRecordStoreMalformedConformanceV1,
} from "../../../../test-support/host-atomic-record-store-conformance.ts";

import { createRecordFileStoreV1 } from "./record-file-store.mts";
import { handleRecordHttpRequestV1 } from "./record-http-handler.mts";

type HostRecordKeyV1 = HostStoredRecordV1["key"];

let cleanupDirV1: string | null = null;

afterEach(async () => {
  if (cleanupDirV1 !== null) {
    await rm(cleanupDirV1, { recursive: true, force: true });
  }
  cleanupDirV1 = null;
});

async function productionBoundaryFixtureV1() {
  const root = await mkdtemp(join(tmpdir(), "sillymaker-http-record-conformance-"));
  cleanupDirV1 = root;
  const fileStore = createRecordFileStoreV1(root);
  let commitEndpointRequestCount = 0;
  const fetchImpl = async (input: string, init?: RequestInit): Promise<Response> => {
    const url = new URL(input, "http://127.0.0.1:41800");
    const prefix = "/sillymaker/records";
    if (!url.pathname.startsWith(prefix)) {
      return new Response("{}", { status: 404 });
    }
    if (url.pathname === `${prefix}/commit`) commitEndpointRequestCount += 1;
    return await handleRecordHttpRequestV1(
      new Request(url, init),
      url.pathname.slice(prefix.length),
      fileStore,
    );
  };
  return Object.freeze({
    store: createHttpHostRecordStoreV1({
      baseUrl: "/sillymaker/records",
      fetchImpl,
    }),
    commitEndpointRequestCount: () => commitEndpointRequestCount,
  });
}

describe("the Desktop HTTP record boundary", () => {
  it("rejects malformed input before a commit request and preserves valid cross-realm bytes", async () => {
    const fixture = await productionBoundaryFixtureV1();

    await expect(fixture.store.commit({} as never)).rejects.toBeInstanceOf(TypeError);
    const sparseBatch: unknown[] = [];
    sparseBatch.length = 1;
    await expect(fixture.store.commit(sparseBatch as never)).rejects.toBeInstanceOf(TypeError);
    expect(fixture.commitEndpointRequestCount()).toBe(0);

    const report = await runHostRecordStoreMalformedConformanceV1(fixture.store);

    expect(fixture.commitEndpointRequestCount()).toBe(1);
    expect(report).toEqual(hostRecordStoreMalformedConformanceExpectedV1);

    const key = "conformance.malformed.cross-realm" as HostRecordKeyV1;
    const bytes = runInNewContext("Uint8Array.of(0, 255, 16)") as Uint8Array;
    expect(bytes).not.toBeInstanceOf(Uint8Array);
    await expect(
      fixture.store.commit([
        {
          kind: "put",
          namespace: "settings",
          key,
          expectedRevision: null,
          bytes,
        },
      ]),
    ).resolves.toMatchObject({ kind: "committed" });
    expect(Array.from((await fixture.store.read("settings", key))!.bytes)).toEqual([0, 255, 16]);
    expect(fixture.commitEndpointRequestCount()).toBe(2);
  });
});
