// SPDX-License-Identifier: MIT
import { describe, expect, it, vi } from "vitest";

import { parseNonNegativeSafeInteger, type HostStoredRecordV1 } from "@sillymaker/base";
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

function jsonFetchV1(payload: unknown, status = 200) {
  return async (): Promise<Response> =>
    new Response(JSON.stringify(payload), {
      status,
      headers: { "content-type": "application/json" },
    });
}

describe("the HTTP host record store wire boundary", () => {
  const key = "profile" as HostRecordKeyV1;

  it("fails closed when list/read payloads are malformed or missing", async () => {
    await expect(
      createHttpHostRecordStoreV1({
        baseUrl: "/records",
        fetchImpl: jsonFetchV1({
          namespace: "unknown",
          key: "profile",
          revision: 1,
          bytesBase64: "AA==",
        }),
      }).read("settings", key),
    ).rejects.toThrow("host.http_records_invalid_namespace");

    await expect(
      createHttpHostRecordStoreV1({
        baseUrl: "/records",
        fetchImpl: jsonFetchV1({}),
      }).list("settings"),
    ).rejects.toThrow("host.http_records_invalid_list");

    await expect(
      createHttpHostRecordStoreV1({
        baseUrl: "/records",
        fetchImpl: jsonFetchV1({}, 404),
      }).list("settings"),
    ).rejects.toThrow("host.http_records_failed:404");

    await expect(
      createHttpHostRecordStoreV1({
        baseUrl: "/records",
        fetchImpl: jsonFetchV1({
          records: [
            {
              namespace: "settings",
              key: "profile",
              revision: 1,
              bytesBase64: "not base64",
            },
          ],
        }),
      }).list("settings"),
    ).rejects.toThrow("host.http_records_invalid_bytes");
  });

  it("rejects read records that do not match the requested identity", async () => {
    const validRecord = {
      namespace: "settings",
      key: "other-profile",
      revision: 1,
      bytesBase64: "AA==",
    };

    await expect(
      createHttpHostRecordStoreV1({
        baseUrl: "/records",
        fetchImpl: jsonFetchV1(validRecord),
      }).read("settings", key),
    ).rejects.toThrow("host.http_records_invalid_record");

    await expect(
      createHttpHostRecordStoreV1({
        baseUrl: "/records",
        fetchImpl: jsonFetchV1({ ...validRecord, namespace: "save", key: "profile" }),
      }).read("settings", key),
    ).rejects.toThrow("host.http_records_invalid_record");
  });

  it("rejects list records from another namespace or with duplicate keys", async () => {
    await expect(
      createHttpHostRecordStoreV1({
        baseUrl: "/records",
        fetchImpl: jsonFetchV1({
          records: [
            {
              namespace: "save",
              key: "profile",
              revision: 1,
              bytesBase64: "AA==",
            },
          ],
        }),
      }).list("settings"),
    ).rejects.toThrow("host.http_records_invalid_list");

    await expect(
      createHttpHostRecordStoreV1({
        baseUrl: "/records",
        fetchImpl: jsonFetchV1({
          records: [
            {
              namespace: "settings",
              key: "profile",
              revision: 1,
              bytesBase64: "AA==",
            },
            {
              namespace: "settings",
              key: "profile",
              revision: 2,
              bytesBase64: "AQ==",
            },
          ],
        }),
      }).list("settings"),
    ).rejects.toThrow("host.http_records_invalid_list");
  });

  it("validates committed and conflict payloads before returning them", async () => {
    const mutation = {
      kind: "put" as const,
      namespace: "settings" as const,
      key,
      expectedRevision: null,
      bytes: new Uint8Array([1]),
    };

    await expect(
      createHttpHostRecordStoreV1({
        baseUrl: "/records",
        fetchImpl: jsonFetchV1({ kind: "committed", records: "invalid" }),
      }).commit([mutation]),
    ).rejects.toThrow("host.http_records_invalid_result");

    await expect(
      createHttpHostRecordStoreV1({
        baseUrl: "/records",
        fetchImpl: jsonFetchV1({
          kind: "conflict",
          namespace: "unknown",
          key: "profile",
          actualRevision: 1,
        }),
      }).commit([mutation]),
    ).rejects.toThrow("host.http_records_invalid_namespace");

    await expect(
      createHttpHostRecordStoreV1({
        baseUrl: "/records",
        fetchImpl: jsonFetchV1({
          kind: "conflict",
          namespace: "settings",
          key: "profile",
          actualRevision: -1,
        }),
      }).commit([mutation]),
    ).rejects.toThrow();
  });

  it("rejects conflict results unrelated to the requested mutations", async () => {
    await expect(
      createHttpHostRecordStoreV1({
        baseUrl: "/records",
        fetchImpl: jsonFetchV1({
          kind: "conflict",
          namespace: "settings",
          key: "other-profile",
          actualRevision: 1,
        }),
      }).commit([
        {
          kind: "put",
          namespace: "settings",
          key,
          expectedRevision: null,
          bytes: new Uint8Array([1]),
        },
      ]),
    ).rejects.toThrow("host.http_records_invalid_result");
  });

  it("rejects conflict results whose actual revision matches expected", async () => {
    const createMutation = {
      kind: "put" as const,
      namespace: "settings" as const,
      key,
      expectedRevision: null,
      bytes: new Uint8Array([1]),
    };
    await expect(
      createHttpHostRecordStoreV1({
        baseUrl: "/records",
        fetchImpl: jsonFetchV1({
          kind: "conflict",
          namespace: "settings",
          key: "profile",
          actualRevision: null,
        }),
      }).commit([createMutation]),
    ).rejects.toThrow("host.http_records_invalid_result");

    const updateRevision = parseNonNegativeSafeInteger(3);
    await expect(
      createHttpHostRecordStoreV1({
        baseUrl: "/records",
        fetchImpl: jsonFetchV1({
          kind: "conflict",
          namespace: "settings",
          key: "profile",
          actualRevision: 3,
        }),
      }).commit([
        {
          ...createMutation,
          expectedRevision: updateRevision,
        },
      ]),
    ).rejects.toThrow("host.http_records_invalid_result");
  });

  it("rejects duplicate delete identities before calling fetch", async () => {
    const fetchImpl = vi.fn(
      async (): Promise<Response> =>
        new Response(JSON.stringify({ kind: "committed", records: [] }), { status: 200 }),
    );
    const mutation = {
      kind: "delete" as const,
      namespace: "settings" as const,
      key,
      expectedRevision: parseNonNegativeSafeInteger(1),
    };
    const store = createHttpHostRecordStoreV1({ baseUrl: "/records", fetchImpl });

    await expect(store.commit([mutation, mutation])).rejects.toThrow(
      "duplicate Host record mutation",
    );
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("rejects delete and put with the same identity before calling fetch", async () => {
    const fetchImpl = vi.fn(
      async (): Promise<Response> =>
        new Response(
          JSON.stringify({
            kind: "committed",
            records: [
              {
                namespace: "settings",
                key: "profile",
                revision: 1,
                bytesBase64: "AQ==",
              },
            ],
          }),
          { status: 200 },
        ),
    );
    const store = createHttpHostRecordStoreV1({ baseUrl: "/records", fetchImpl });

    await expect(
      store.commit([
        {
          kind: "delete",
          namespace: "settings",
          key,
          expectedRevision: parseNonNegativeSafeInteger(1),
        },
        {
          kind: "put",
          namespace: "settings",
          key,
          expectedRevision: null,
          bytes: new Uint8Array([1]),
        },
      ]),
    ).rejects.toThrow("duplicate Host record mutation");
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("validates a delete response against the mutation snapshot sent on the wire", async () => {
    const deferred = Promise.withResolvers<Response>();
    let sentExpectedRevision: unknown;
    const fetchImpl = vi.fn(async (_input: string, init?: RequestInit): Promise<Response> => {
      const body = JSON.parse(String(init?.body)) as {
        readonly mutations: readonly { readonly expectedRevision: unknown }[];
      };
      sentExpectedRevision = body.mutations[0]?.expectedRevision;
      return await deferred.promise;
    });
    const mutation = {
      kind: "delete" as const,
      namespace: "settings" as const,
      key,
      expectedRevision: parseNonNegativeSafeInteger(1),
    };
    const store = createHttpHostRecordStoreV1({ baseUrl: "/records", fetchImpl });

    const pending = store.commit([mutation]);
    expect(sentExpectedRevision).toBe(1);
    mutation.expectedRevision = parseNonNegativeSafeInteger(2);
    deferred.resolve(
      new Response(
        JSON.stringify({
          kind: "conflict",
          namespace: "settings",
          key: "profile",
          actualRevision: 1,
        }),
        { status: 200 },
      ),
    );

    await expect(pending).rejects.toThrow("host.http_records_invalid_result");
  });

  it("rejects a committed result when the next revision would overflow", async () => {
    await expect(
      createHttpHostRecordStoreV1({
        baseUrl: "/records",
        fetchImpl: jsonFetchV1({
          kind: "committed",
          records: [
            {
              namespace: "settings",
              key: "profile",
              revision: Number.MAX_SAFE_INTEGER,
              bytesBase64: "AQ==",
            },
          ],
        }),
      }).commit([
        {
          kind: "put",
          namespace: "settings",
          key,
          expectedRevision: parseNonNegativeSafeInteger(Number.MAX_SAFE_INTEGER),
          bytes: new Uint8Array([1]),
        },
      ]),
    ).rejects.toThrow("host.http_records_invalid_result");
  });

  it("requires committed records to match every put mutation exactly once", async () => {
    const secondKey = "preferences" as HostRecordKeyV1;
    const deletedKey = "retired" as HostRecordKeyV1;
    const mutations = [
      {
        kind: "put" as const,
        namespace: "settings" as const,
        key,
        expectedRevision: null,
        bytes: new Uint8Array([1]),
      },
      {
        kind: "delete" as const,
        namespace: "settings" as const,
        key: deletedKey,
        expectedRevision: parseNonNegativeSafeInteger(1),
      },
      {
        kind: "put" as const,
        namespace: "settings" as const,
        key: secondKey,
        expectedRevision: parseNonNegativeSafeInteger(4),
        bytes: new Uint8Array([2]),
      },
    ] as const;
    const profileRecord = {
      namespace: "settings",
      key: "profile",
      revision: 1,
      bytesBase64: "AQ==",
    };
    const preferencesRecord = {
      namespace: "settings",
      key: "preferences",
      revision: 5,
      bytesBase64: "Ag==",
    };

    await expect(
      createHttpHostRecordStoreV1({
        baseUrl: "/records",
        fetchImpl: jsonFetchV1({
          kind: "committed",
          records: [profileRecord],
        }),
      }).commit(mutations),
    ).rejects.toThrow("host.http_records_invalid_result");

    await expect(
      createHttpHostRecordStoreV1({
        baseUrl: "/records",
        fetchImpl: jsonFetchV1({
          kind: "committed",
          records: [{ ...profileRecord, revision: 2 }, preferencesRecord],
        }),
      }).commit(mutations),
    ).rejects.toThrow("host.http_records_invalid_result");

    await expect(
      createHttpHostRecordStoreV1({
        baseUrl: "/records",
        fetchImpl: jsonFetchV1({
          kind: "committed",
          records: [{ ...profileRecord, bytesBase64: "AA==" }, preferencesRecord],
        }),
      }).commit(mutations),
    ).rejects.toThrow("host.http_records_invalid_result");

    await expect(
      createHttpHostRecordStoreV1({
        baseUrl: "/records",
        fetchImpl: jsonFetchV1({
          kind: "committed",
          records: [profileRecord, profileRecord],
        }),
      }).commit(mutations),
    ).rejects.toThrow("host.http_records_invalid_result");

    await expect(
      createHttpHostRecordStoreV1({
        baseUrl: "/records",
        fetchImpl: jsonFetchV1({
          kind: "committed",
          records: [
            profileRecord,
            {
              namespace: "settings",
              key: "retired",
              revision: 2,
              bytesBase64: "Aw==",
            },
          ],
        }),
      }).commit(mutations),
    ).rejects.toThrow("host.http_records_invalid_result");

    await expect(
      createHttpHostRecordStoreV1({
        baseUrl: "/records",
        fetchImpl: jsonFetchV1({
          kind: "committed",
          records: [
            profileRecord,
            preferencesRecord,
            {
              namespace: "save",
              key: "unrelated",
              revision: 1,
              bytesBase64: "AA==",
            },
          ],
        }),
      }).commit(mutations),
    ).rejects.toThrow("host.http_records_invalid_result");

    await expect(
      createHttpHostRecordStoreV1({
        baseUrl: "/records",
        fetchImpl: jsonFetchV1({
          kind: "committed",
          records: [preferencesRecord, profileRecord],
        }),
      }).commit(mutations),
    ).resolves.toMatchObject({
      kind: "committed",
      records: [
        { namespace: "settings", key: "preferences" },
        { namespace: "settings", key: "profile" },
      ],
    });
  });
});
