// SPDX-License-Identifier: MIT
import type {
  HostAtomicRecordStoreV1,
  HostRecordMutationV1,
  HostStoredRecordV1,
} from "@sillymaker/base/host";
import { parseNonNegativeSafeInteger } from "@sillymaker/base/values";

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

const namespacesV1 = new Set<HostRecordNamespaceV1>(["save", "lease", "settings"]);
const base64PatternV1 = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/u;

function toBase64V1(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function requireNamespaceV1(value: unknown): HostRecordNamespaceV1 {
  if (typeof value !== "string" || !namespacesV1.has(value as HostRecordNamespaceV1)) {
    throw new TypeError("host.http_records_invalid_namespace");
  }
  return value as HostRecordNamespaceV1;
}

function requireKeyV1(value: unknown): HostRecordKeyV1 {
  if (typeof value !== "string" || value.includes("\0")) {
    throw new TypeError("host.http_records_invalid_key");
  }
  return value as HostRecordKeyV1;
}

function isUint8ArrayV1(value: unknown): value is Uint8Array {
  return (
    ArrayBuffer.isView(value) && Object.prototype.toString.call(value) === "[object Uint8Array]"
  );
}

function fromBase64V1(value: unknown): Uint8Array {
  if (typeof value !== "string" || !base64PatternV1.test(value)) {
    throw new TypeError("host.http_records_invalid_bytes");
  }
  let binary: string;
  try {
    binary = atob(value);
  } catch {
    throw new TypeError("host.http_records_invalid_bytes");
  }
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function requireObjectV1(value: unknown, code: string): Record<PropertyKey, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new TypeError(code);
  }
  return value as Record<PropertyKey, unknown>;
}

function parseWireRecordV1(value: unknown): HostStoredRecordV1 {
  const record = requireObjectV1(value, "host.http_records_invalid_record");
  return ({
    namespace: requireNamespaceV1(Reflect.get(record, "namespace")),
    key: requireKeyV1(Reflect.get(record, "key")),
    revision: parseNonNegativeSafeInteger(Reflect.get(record, "revision")),
    bytes: fromBase64V1(Reflect.get(record, "bytesBase64")),
  });
}

function recordIdentityV1(namespace: HostRecordNamespaceV1, key: HostRecordKeyV1): string {
  return `${namespace}\0${key as string}`;
}

function bytesEqualV1(left: Uint8Array, right: Uint8Array): boolean {
  return left.length === right.length && left.every((byte, index) => byte === right[index]);
}

function normalizeMutationsV1(
  value: unknown,
): readonly [HostRecordMutationV1, ...HostRecordMutationV1[]] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new TypeError("Host record commit requires mutations");
  }
  const normalized = Array.from(value, (candidate): HostRecordMutationV1 => {
    if (typeof candidate !== "object" || candidate === null) {
      throw new TypeError("invalid Host record mutation");
    }
    const namespace = requireNamespaceV1(Reflect.get(candidate, "namespace"));
    const keyValue = Reflect.get(candidate, "key");
    if (typeof keyValue !== "string") {
      throw new TypeError("host.http_records_invalid_key");
    }
    const key = keyValue as HostRecordKeyV1;
    const kind = Reflect.get(candidate, "kind");
    const expectedRevisionValue = Reflect.get(candidate, "expectedRevision");
    if (kind === "put") {
      const bytes = Reflect.get(candidate, "bytes");
      if (!isUint8ArrayV1(bytes)) {
        throw new TypeError("host.http_records_invalid_bytes");
      }
      return ({
        kind,
        namespace,
        key,
        expectedRevision: expectedRevisionValue === null
          ? null
          : parseNonNegativeSafeInteger(expectedRevisionValue),
        bytes: Uint8Array.from(bytes),
      });
    }
    if (kind !== "delete") {
      throw new TypeError("invalid Host record mutation kind");
    }
    return ({
      kind,
      namespace,
      key,
      expectedRevision: parseNonNegativeSafeInteger(expectedRevisionValue),
    });
  });
  const identities = normalized.map((mutation) =>
    recordIdentityV1(mutation.namespace, mutation.key)
  );
  if (new Set(identities).size !== identities.length) {
    throw new TypeError("duplicate Host record mutation");
  }
  return normalized as unknown as readonly [HostRecordMutationV1, ...HostRecordMutationV1[]];
}

function parseWireRecordListV1(
  value: unknown,
  requestedNamespace: HostRecordNamespaceV1,
): readonly HostStoredRecordV1[] {
  const payload = requireObjectV1(value, "host.http_records_invalid_list");
  const records = Reflect.get(payload, "records");
  if (!Array.isArray(records)) {
    throw new TypeError("host.http_records_invalid_list");
  }
  const parsed = records.map(parseWireRecordV1);
  const keys = new Set<HostRecordKeyV1>();
  for (const record of parsed) {
    if (record.namespace !== requestedNamespace || keys.has(record.key)) {
      throw new TypeError("host.http_records_invalid_list");
    }
    keys.add(record.key);
  }
  return parsed;
}

function parseCommitResultV1(
  value: unknown,
  requestedMutations: readonly HostRecordMutationV1[],
): HostAtomicCommitResultV1 {
  const payload = requireObjectV1(value, "host.http_records_invalid_result");
  const kind = Reflect.get(payload, "kind");
  if (kind === "committed") {
    const records = Reflect.get(payload, "records");
    if (!Array.isArray(records)) {
      throw new TypeError("host.http_records_invalid_result");
    }
    const parsed = records.map(parseWireRecordV1);
    const puts = requestedMutations.filter((mutation) => mutation.kind === "put");
    const seen = new Set<string>();
    if (parsed.length !== puts.length) {
      throw new TypeError("host.http_records_invalid_result");
    }
    for (const record of parsed) {
      const identity = recordIdentityV1(record.namespace, record.key);
      const matchingPut = puts.find(
        (mutation) => mutation.namespace === record.namespace && mutation.key === record.key,
      );
      const expectedRevision = (matchingPut?.expectedRevision ?? 0) + 1;
      if (
        matchingPut === undefined ||
        seen.has(identity) ||
        !Number.isSafeInteger(expectedRevision) ||
        record.revision !== expectedRevision ||
        !bytesEqualV1(record.bytes, matchingPut.bytes)
      ) {
        throw new TypeError("host.http_records_invalid_result");
      }
      seen.add(identity);
    }
    return ({
      kind: "committed" as const,
      records: parsed,
    });
  }
  if (kind === "conflict") {
    const actualRevision = Reflect.get(payload, "actualRevision");
    const result = {
      kind: "conflict" as const,
      namespace: requireNamespaceV1(Reflect.get(payload, "namespace")),
      key: requireKeyV1(Reflect.get(payload, "key")),
      actualRevision: actualRevision === null ? null : parseNonNegativeSafeInteger(actualRevision),
    };
    const matchingMutations = requestedMutations.filter(
      (mutation) => mutation.namespace === result.namespace && mutation.key === result.key,
    );
    const matchingMutation = matchingMutations[0];
    if (
      matchingMutations.length !== 1 ||
      matchingMutation === undefined ||
      result.actualRevision === matchingMutation.expectedRevision
    ) {
      throw new TypeError("host.http_records_invalid_result");
    }
    return result;
  }
  throw new TypeError("host.http_records_invalid_result");
}

export function createHttpHostRecordStoreV1(
  options: CreateHttpHostRecordStoreOptionsV1,
): HostAtomicRecordStoreV1 {
  const base = options.baseUrl.replace(/\/$/u, "");
  const fetchImpl = options.fetchImpl ??
    ((input: string, init?: RequestInit) => fetch(input, init));

  async function requestJsonV1(path: string, init?: RequestInit): Promise<unknown> {
    const response = await fetchImpl(`${base}${path}`, init);
    if (response.status === 404) return null;
    if (!response.ok) {
      throw new TypeError(`host.http_records_failed:${String(response.status)}`);
    }
    return (await response.json()) as unknown;
  }

  return ({
    async read(namespace: HostRecordNamespaceV1, key: HostRecordKeyV1) {
      const payload = await requestJsonV1(
        `/${encodeURIComponent(namespace)}/${encodeURIComponent(key as string)}`,
      );
      if (payload === null) return null;
      const record = parseWireRecordV1(payload);
      if (record.namespace !== namespace || record.key !== key) {
        throw new TypeError("host.http_records_invalid_record");
      }
      return record;
    },
    async list(namespace: HostRecordNamespaceV1) {
      const payload = await requestJsonV1(`/${encodeURIComponent(namespace)}`);
      if (payload === null) throw new TypeError("host.http_records_failed:404");
      return parseWireRecordListV1(payload, namespace);
    },
    async commit(
      mutations: readonly [HostRecordMutationV1, ...HostRecordMutationV1[]],
    ): Promise<HostAtomicCommitResultV1> {
      const requestedMutations = normalizeMutationsV1(mutations);
      const wireMutations = requestedMutations.map((mutation) =>
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
          }
      );
      const payload = await requestJsonV1("/commit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mutations: wireMutations }),
      });
      if (payload === null) throw new TypeError("host.http_records_failed:404");
      return parseCommitResultV1(payload, requestedMutations);
    },
  });
}
