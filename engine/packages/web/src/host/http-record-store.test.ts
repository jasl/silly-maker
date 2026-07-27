// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";

import type { HostStoredRecordV1 } from "@sillymaker/base";
import { createMemoryHostRecordStoreV1 } from "@sillymaker/base/testkit";

type HostRecordKeyV1 = HostStoredRecordV1["key"];
type HostRecordNamespaceV1 = HostStoredRecordV1["namespace"];

import { createHttpHostRecordStoreV1 } from "./http-record-store.ts";

/**
 * Drives the HTTP adapter against an in-process fetch fake that speaks the
 * save-server wire protocol over a memory record store — the adapter and
 * the server-side semantics stay in lockstep through one contract test.
 */
function fetchFakeV1() {
  const backing = createMemoryHostRecordStoreV1();
  const toBase64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes));
  const fromBase64 = (encoded: string) => {
    const binary = atob(encoded);
    return new Uint8Array(Array.from({ length: binary.length }, (_, i) => binary.charCodeAt(i)));
  };
  const wire = (record: {
    readonly namespace: string;
    readonly key: string;
    readonly revision: number;
    readonly bytes: Uint8Array;
  }) => ({
    namespace: record.namespace,
    key: record.key,
    revision: record.revision,
    bytesBase64: toBase64(record.bytes),
  });

  return async (input: string, init?: RequestInit): Promise<Response> => {
    const url = new URL(input, "http://local.test");
    const segments = url.pathname
      .replace("/sillymaker/records", "")
      .split("/")
      .filter((segment) => segment !== "");
    if (init?.method === "POST" && segments[0] === "commit") {
      const body = JSON.parse(String(init.body)) as {
        readonly mutations: readonly {
          readonly kind: "put" | "delete";
          readonly namespace: string;
          readonly key: string;
          readonly expectedRevision: number | null;
          readonly bytesBase64?: string;
        }[];
      };
      const result = await backing.commit(
        body.mutations.map((mutation) =>
          mutation.kind === "put"
            ? {
                kind: "put" as const,
                namespace: mutation.namespace as HostRecordNamespaceV1,
                key: mutation.key as HostRecordKeyV1,
                expectedRevision: mutation.expectedRevision as never,
                bytes: fromBase64(mutation.bytesBase64 ?? ""),
              }
            : {
                kind: "delete" as const,
                namespace: mutation.namespace as HostRecordNamespaceV1,
                key: mutation.key as HostRecordKeyV1,
                expectedRevision: mutation.expectedRevision as never,
              },
        ) as never,
      );
      const payload =
        result.kind === "committed"
          ? { kind: "committed", records: result.records.map(wire) }
          : result;
      return new Response(JSON.stringify(payload), { status: 200 });
    }
    if (segments.length === 1) {
      const records = await backing.list(decodeURIComponent(segments[0] ?? "") as never);
      return new Response(JSON.stringify({ records: records.map(wire) }), { status: 200 });
    }
    if (segments.length === 2) {
      const record = await backing.read(
        decodeURIComponent(segments[0] ?? "") as never,
        decodeURIComponent(segments[1] ?? "") as never,
      );
      return record === null
        ? new Response("{}", { status: 404 })
        : new Response(JSON.stringify(wire(record)), { status: 200 });
    }
    return new Response("{}", { status: 405 });
  };
}

describe("the HTTP host record store", () => {
  it("round-trips read/list/commit with revisions and binary bytes", async () => {
    const store = createHttpHostRecordStoreV1({
      baseUrl: "/sillymaker/records",
      fetchImpl: fetchFakeV1(),
    });
    const key = "player-profile/story.example.cat-cafe" as HostRecordKeyV1;
    const bytes = new Uint8Array([0, 1, 254, 255, 128]);

    expect(await store.read("settings", key)).toBeNull();
    const committed = await store.commit([
      { kind: "put", namespace: "settings", key, expectedRevision: null, bytes },
    ]);
    expect(committed.kind).toBe("committed");

    const read = await store.read("settings", key);
    expect(read?.revision).toBe(1);
    expect([...(read?.bytes ?? [])]).toEqual([0, 1, 254, 255, 128]);

    const listed = await store.list("settings");
    expect(listed.map((record) => record.key)).toEqual([key]);

    const conflict = await store.commit([
      { kind: "put", namespace: "settings", key, expectedRevision: null, bytes },
    ]);
    expect(conflict).toMatchObject({ kind: "conflict", key, actualRevision: 1 });
  });
});
