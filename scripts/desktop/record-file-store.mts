// SPDX-License-Identifier: MIT
import { mkdir, readFile, readdir, rename, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";

/**
 * The save-directory record store behind the desktop save server: one JSON
 * file per record key ({revision, bytesBase64}), atomic per-file replace
 * (tmp + rename), optimistic-revision commits serialized on one in-process
 * queue. Single-user desktop semantics; a crash between the files of one
 * multi-key commit is tolerated (each file stays individually valid) and a
 * future channel can swap SQLite in behind the same wire protocol.
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

function fileNameV1(key: string): string {
  return `${encodeURIComponent(key)}.json`;
}

export function createRecordFileStoreV1(rootDir: string) {
  let queue: Promise<unknown> = Promise.resolve();
  const serialize = <T,>(task: () => Promise<T>): Promise<T> => {
    const next = queue.then(task);
    queue = next.catch(() => undefined);
    return next;
  };

  function directoryFor(namespace: string): string {
    if (!namespacesV1.has(namespace)) throw new TypeError(`invalid namespace ${namespace}`);
    return join(rootDir, namespace);
  }

  async function readRecord(namespace: string, key: string): Promise<StoredWireRecordV1 | null> {
    try {
      const raw = await readFile(join(directoryFor(namespace), fileNameV1(key)), "utf8");
      const parsed = JSON.parse(raw) as { revision?: unknown; bytesBase64?: unknown };
      if (typeof parsed.revision !== "number" || typeof parsed.bytesBase64 !== "string") {
        return null;
      }
      return { namespace, key, revision: parsed.revision, bytesBase64: parsed.bytesBase64 };
    } catch {
      return null;
    }
  }

  async function writeRecord(record: StoredWireRecordV1): Promise<void> {
    const directory = directoryFor(record.namespace);
    await mkdir(directory, { recursive: true });
    const path = join(directory, fileNameV1(record.key));
    const tmp = `${path}.tmp`;
    await writeFile(
      tmp,
      JSON.stringify({ revision: record.revision, bytesBase64: record.bytesBase64 }),
      "utf8",
    );
    await rename(tmp, path);
  }

  return {
    read: (namespace: string, key: string) => serialize(() => readRecord(namespace, key)),
    list: (namespace: string) =>
      serialize(async (): Promise<readonly StoredWireRecordV1[]> => {
        let names: readonly string[];
        try {
          names = await readdir(directoryFor(namespace));
        } catch {
          return [];
        }
        const records: StoredWireRecordV1[] = [];
        for (const name of names) {
          if (!name.endsWith(".json")) continue;
          const key = decodeURIComponent(name.slice(0, -".json".length));
          const record = await readRecord(namespace, key);
          if (record !== null) records.push(record);
        }
        return records.toSorted((left, right) => left.key.localeCompare(right.key));
      }),
    commit: (mutations: readonly WireMutationV1[]) =>
      serialize(async (): Promise<WireCommitResultV1> => {
        // Precheck every expected revision before touching any file.
        const current = new Map<string, StoredWireRecordV1 | null>();
        for (const mutation of mutations) {
          const id = `${mutation.namespace}\u0000${mutation.key}`;
          if (!current.has(id)) {
            current.set(id, await readRecord(mutation.namespace, mutation.key));
          }
          const existing = current.get(id) ?? null;
          const actual = existing?.revision ?? null;
          if (mutation.expectedRevision !== actual) {
            return {
              kind: "conflict",
              namespace: mutation.namespace,
              key: mutation.key,
              actualRevision: actual,
            };
          }
          // Later mutations in the same commit see the projected state.
          current.set(
            id,
            mutation.kind === "put"
              ? {
                  namespace: mutation.namespace,
                  key: mutation.key,
                  revision: (actual ?? 0) + 1,
                  bytesBase64: mutation.bytesBase64,
                }
              : null,
          );
        }
        const committed: StoredWireRecordV1[] = [];
        for (const mutation of mutations) {
          const id = `${mutation.namespace}\u0000${mutation.key}`;
          const projected = current.get(id) ?? null;
          if (mutation.kind === "put") {
            if (projected === null) continue; // deleted later in the same commit
            await writeRecord(projected);
            committed.push(projected);
          } else {
            await rm(join(directoryFor(mutation.namespace), fileNameV1(mutation.key)), {
              force: true,
            });
          }
        }
        return { kind: "committed", records: committed };
      }),
  };
}
