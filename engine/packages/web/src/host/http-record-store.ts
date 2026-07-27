// SPDX-License-Identifier: MIT
import type {
  HostAtomicRecordStoreV1,
  HostRecordMutationV1,
  HostStoredRecordV1,
} from "@sillymaker/base";
import { parseNonNegativeSafeInteger } from "@sillymaker/base";

type HostAtomicCommitResultV1 = Awaited<ReturnType<HostAtomicRecordStoreV1["commit"]>>;
type HostRecordKeyV1 = HostStoredRecordV1["key"];
type HostRecordNamespaceV1 = HostStoredRecordV1["namespace"];

/**
 * An atomic record store over a local HTTP endpoint — the desktop-channel
 * persistence adapter. A trusted local process (the save server) owns the
 * save directory and the optimistic-revision commit; the page stays a pure
 * client, so origin drift (random webview ports) can never orphan saves
 * the way per-origin IndexedDB does. Bytes travel as base64 in JSON.
 */

export interface CreateHttpHostRecordStoreOptionsV1 {
  /** The records API root, for example `/sillymaker/records`. */
  readonly baseUrl: string;
  /** Injectable for tests; defaults to the global fetch. */
  fetchImpl?(input: string, init?: RequestInit): Promise<Response>;
}

function toBase64V1(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function fromBase64V1(encoded: string): Uint8Array {
  const binary = atob(encoded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

interface WireRecordV1 {
  readonly namespace: string;
  readonly key: string;
  readonly revision: number;
  readonly bytesBase64: string;
}

function parseWireRecordV1(value: unknown): HostStoredRecordV1 {
  const record = value as WireRecordV1;
  if (
    record === null ||
    typeof record !== "object" ||
    typeof record.namespace !== "string" ||
    typeof record.key !== "string" ||
    typeof record.bytesBase64 !== "string"
  ) {
    throw new TypeError("host.http_records_invalid_record");
  }
  return Object.freeze({
    namespace: record.namespace as HostRecordNamespaceV1,
    key: record.key as HostRecordKeyV1,
    revision: parseNonNegativeSafeInteger(record.revision),
    bytes: fromBase64V1(record.bytesBase64),
  });
}

export function createHttpHostRecordStoreV1(
  options: CreateHttpHostRecordStoreOptionsV1,
): HostAtomicRecordStoreV1 {
  const base = options.baseUrl.replace(/\/$/u, "");
  const fetchImpl =
    options.fetchImpl ?? ((input: string, init?: RequestInit) => fetch(input, init));

  async function requestJsonV1(path: string, init?: RequestInit): Promise<unknown> {
    const response = await fetchImpl(`${base}${path}`, init);
    if (response.status === 404) return null;
    if (!response.ok) {
      throw new TypeError(`host.http_records_failed:${String(response.status)}`);
    }
    return (await response.json()) as unknown;
  }

  return Object.freeze({
    async read(namespace: HostRecordNamespaceV1, key: HostRecordKeyV1) {
      const payload = await requestJsonV1(
        `/${encodeURIComponent(namespace)}/${encodeURIComponent(key as string)}`,
      );
      return payload === null ? null : parseWireRecordV1(payload);
    },
    async list(namespace: HostRecordNamespaceV1) {
      const payload = (await requestJsonV1(`/${encodeURIComponent(namespace)}`)) as {
        readonly records?: readonly unknown[];
      } | null;
      if (payload === null || !Array.isArray(payload.records)) return Object.freeze([]);
      return Object.freeze(payload.records.map(parseWireRecordV1));
    },
    async commit(
      mutations: readonly [HostRecordMutationV1, ...HostRecordMutationV1[]],
    ): Promise<HostAtomicCommitResultV1> {
      const wireMutations = mutations.map((mutation) =>
        mutation.kind === "put"
          ? {
              kind: "put",
              namespace: mutation.namespace,
              key: mutation.key as string,
              expectedRevision: mutation.expectedRevision,
              bytesBase64: toBase64V1(mutation.bytes),
            }
          : {
              kind: "delete",
              namespace: mutation.namespace,
              key: mutation.key as string,
              expectedRevision: mutation.expectedRevision,
            },
      );
      const payload = (await requestJsonV1("/commit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mutations: wireMutations }),
      })) as
        | { readonly kind: "committed"; readonly records: readonly unknown[] }
        | {
            readonly kind: "conflict";
            readonly namespace: string;
            readonly key: string;
            readonly actualRevision: number | null;
          }
        | null;
      if (payload === null) throw new TypeError("host.http_records_failed:404");
      if (payload.kind === "committed") {
        return Object.freeze({
          kind: "committed" as const,
          records: Object.freeze(payload.records.map(parseWireRecordV1)),
        });
      }
      if (payload.kind === "conflict") {
        return Object.freeze({
          kind: "conflict" as const,
          namespace: payload.namespace as HostRecordNamespaceV1,
          key: payload.key as HostRecordKeyV1,
          actualRevision:
            payload.actualRevision === null
              ? null
              : parseNonNegativeSafeInteger(payload.actualRevision),
        });
      }
      throw new TypeError("host.http_records_invalid_result");
    },
  });
}
