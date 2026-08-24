// SPDX-License-Identifier: MIT
import { randomUUID } from "node:crypto";
import { mkdir, readFile, readdir, rename, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";

/**
 * The save-directory record store behind the desktop save server: one JSON
 * file per record key ({revision, bytesBase64}), atomic per-file replace
 * (unique tmp + rename), optimistic-revision commits serialized on one
 * in-process queue. A failed multi-key operation is rolled back before it is
 * rejected; a process/OS crash between files can still leave a partial batch,
 * so crash-atomic/cross-process storage remains a production-floor task (a
 * manifest or SQLite adapter can replace this implementation behind the same
 * wire protocol). Its encodeURIComponent filename mapping is likewise preview
 * only: a durable backend must preserve case-distinct, long, and filesystem-
 * hostile keys without relying on host filename semantics.
 */

export interface StoredWireRecordV1 {
  readonly namespace: string;
  readonly key: string;
  readonly revision: number;
  readonly bytesBase64: string;
}

export type WireMutationV1 =
  | {
    readonly kind: "put";
    readonly namespace: string;
    readonly key: string;
    readonly expectedRevision: number | null;
    readonly bytesBase64: string;
  }
  | {
    readonly kind: "delete";
    readonly namespace: string;
    readonly key: string;
    readonly expectedRevision: number;
  };

export type WireCommitResultV1 =
  | { readonly kind: "committed"; readonly records: readonly StoredWireRecordV1[] }
  | {
    readonly kind: "conflict";
    readonly namespace: string;
    readonly key: string;
    readonly actualRevision: number | null;
  };

const namespacesV1 = new Set(["save", "lease", "settings"]);
const base64PatternV1 = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/u;

function isMissingFileV1(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { readonly code?: unknown }).code === "ENOENT"
  );
}

function requireNamespaceV1(value: unknown): string {
  if (typeof value !== "string" || !namespacesV1.has(value)) {
    throw new TypeError("invalid Host record namespace");
  }
  return value;
}

function requireKeyV1(value: unknown): string {
  if (typeof value !== "string" || value.includes("\0")) {
    throw new TypeError("invalid Host record key");
  }
  return value;
}

function requireRevisionV1(value: unknown, allowNull: boolean): number | null {
  if (allowNull && value === null) return null;
  if (
    Object.is(value, -0) ||
    typeof value !== "number" ||
    !Number.isSafeInteger(value) ||
    value < 0
  ) {
    throw new TypeError("invalid Host record revision");
  }
  return value;
}

function requireBase64V1(value: unknown): string {
  if (typeof value !== "string" || !base64PatternV1.test(value)) {
    throw new TypeError("invalid Host record bytes");
  }
  return value;
}

/** Validates and normalizes the JSON wire mutations before any storage access. */
export function parseWireMutationsV1(value: unknown): readonly WireMutationV1[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new TypeError("Host record commit requires mutations");
  }
  const normalized = Array.from(value, (mutation): WireMutationV1 => {
    if (typeof mutation !== "object" || mutation === null) {
      throw new TypeError("invalid Host record mutation");
    }
    const record = mutation as Record<string, unknown>;
    const namespace = requireNamespaceV1(record.namespace);
    const key = requireKeyV1(record.key);
    const kind = record.kind;
    if (kind === "put") {
      return {
        kind: "put",
        namespace,
        key,
        expectedRevision: requireRevisionV1(record.expectedRevision, true),
        bytesBase64: requireBase64V1(record.bytesBase64),
      };
    }
    if (kind === "delete") {
      return {
        kind: "delete",
        namespace,
        key,
        expectedRevision: requireRevisionV1(record.expectedRevision, false) as number,
      };
    }
    throw new TypeError("invalid Host record mutation kind");
  });
  const identities = normalized.map(({ namespace, key }) => `${namespace}\0${key}`);
  if (new Set(identities).size !== identities.length) {
    throw new TypeError("duplicate Host record mutation");
  }
  return normalized;
}

function fileNameV1(key: string): string {
  return `${encodeURIComponent(key)}.json`;
}

function createRecordFileStoreInternalV1(rootDir: string) {
  let queue: Promise<unknown> = Promise.resolve();
  const serialize = <T,>(task: () => Promise<T>): Promise<T> => {
    const next = queue.then(task);
    queue = next.catch(() => undefined);
    return next;
  };

  function directoryFor(namespace: string): string {
    return join(rootDir, namespace);
  }

  async function readRecord(namespace: string, key: string): Promise<StoredWireRecordV1 | null> {
    let raw: string;
    try {
      raw = await readFile(
        join(directoryFor(namespace), fileNameV1(key)),
        "utf8",
      );
    } catch (error) {
      if (isMissingFileV1(error)) return null;
      throw error;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw) as unknown;
    } catch (error) {
      throw new TypeError("desktop Host record is not valid JSON", { cause: error });
    }
    if (typeof parsed !== "object" || parsed === null) {
      throw new TypeError("desktop Host record has an invalid shape");
    }
    const record = parsed as Record<string, unknown>;
    const revision = requireRevisionV1(record.revision, false) as number;
    const bytesBase64 = requireBase64V1(record.bytesBase64);
    return {
      namespace,
      key,
      revision,
      bytesBase64,
    };
  }

  async function writeRecord(record: StoredWireRecordV1): Promise<void> {
    const directory = directoryFor(record.namespace);
    await mkdir(directory, { recursive: true });
    const path = join(directory, fileNameV1(record.key));
    const temporaryPath = `${path}.${randomUUID()}.tmp`;
    try {
      await writeFile(
        temporaryPath,
        JSON.stringify({ revision: record.revision, bytesBase64: record.bytesBase64 }),
        "utf8",
      );
      await rename(temporaryPath, path);
    } finally {
      await rm(temporaryPath, { force: true }).catch(() => undefined);
    }
  }

  return {
    read: (namespace: string, key: string) => serialize(() => readRecord(namespace, key)),
    list: (namespace: string) =>
      serialize(async (): Promise<readonly StoredWireRecordV1[]> => {
        let names: readonly string[];
        try {
          names = await readdir(directoryFor(namespace));
        } catch (error) {
          if (isMissingFileV1(error)) return [];
          throw error;
        }
        const entries: { readonly name: string; readonly key: string }[] = [];
        for (const name of names) {
          if (!name.endsWith(".json")) continue;
          let key: string;
          try {
            key = decodeURIComponent(name.slice(0, -".json".length));
          } catch (error) {
            throw new TypeError(`desktop Host record filename is invalid: ${name}`, {
              cause: error,
            });
          }
          entries.push({ name, key: requireKeyV1(key) });
        }

        const namesByKey = new Map<string, string>();
        for (const { name, key } of entries) {
          if (namesByKey.has(key)) {
            throw new TypeError(`duplicate desktop Host record key: ${key}`);
          }
          namesByKey.set(key, name);
        }
        for (const { name, key } of entries) {
          if (name !== fileNameV1(key)) {
            throw new TypeError(`desktop Host record filename is not canonical: ${name}`);
          }
        }

        const records: StoredWireRecordV1[] = [];
        for (const { name, key } of entries) {
          const record = await readRecord(namespace, key);
          if (record === null) {
            throw new TypeError(`desktop Host record disappeared during list: ${name}`);
          }
          records.push(record);
        }
        return records.toSorted((left, right) => left.key.localeCompare(right.key));
      }),
    commit: (mutations: readonly WireMutationV1[]) =>
      serialize(async (): Promise<WireCommitResultV1> => {
        const previous = new Map<string, StoredWireRecordV1 | null>();
        for (const mutation of mutations) {
          const id = `${mutation.namespace}\0${mutation.key}`;
          const existing = await readRecord(mutation.namespace, mutation.key);
          previous.set(id, existing);
          const actualRevision = existing?.revision ?? null;
          if (mutation.expectedRevision !== actualRevision) {
            return {
              kind: "conflict",
              namespace: mutation.namespace,
              key: mutation.key,
              actualRevision,
            };
          }
        }

        const applied: string[] = [];
        const committed: StoredWireRecordV1[] = [];
        try {
          for (const mutation of mutations) {
            const id = `${mutation.namespace}\0${mutation.key}`;
            const existing = previous.get(id) ?? null;
            if (mutation.kind === "put") {
              const nextRevision = requireRevisionV1(
                (existing?.revision ?? 0) + 1,
                false,
              ) as number;
              const next: StoredWireRecordV1 = {
                namespace: mutation.namespace,
                key: mutation.key,
                revision: nextRevision,
                bytesBase64: mutation.bytesBase64,
              };
              await writeRecord(next);
              committed.push(next);
            } else {
              await rm(join(directoryFor(mutation.namespace), fileNameV1(mutation.key)), {
                force: true,
              });
            }
            applied.push(id);
          }
        } catch (error) {
          const rollbackFailures: unknown[] = [];
          for (const id of applied.toReversed()) {
            const separator = id.indexOf("\0");
            const namespace = id.slice(0, separator);
            const key = id.slice(separator + 1);
            const record = previous.get(id) ?? null;
            try {
              if (record === null) {
                await rm(join(directoryFor(namespace), fileNameV1(key)), { force: true });
              } else {
                await writeRecord(record);
              }
            } catch (rollbackError) {
              rollbackFailures.push(rollbackError);
            }
          }
          if (rollbackFailures.length > 0) {
            const aggregateError = new AggregateError(
              rollbackFailures,
              "desktop Host record commit and rollback both failed",
              { cause: error },
            );
            throw aggregateError;
          }
          throw error;
        }
        return {
          kind: "committed",
          records: committed,
        };
      }),
  };
}

export function createRecordFileStoreV1(rootDir: string) {
  return createRecordFileStoreInternalV1(rootDir);
}
