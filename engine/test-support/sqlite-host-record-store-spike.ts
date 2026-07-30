// SPDX-License-Identifier: MIT
import { DatabaseSync } from "node:sqlite";

import {
  type HostAtomicRecordStoreV1,
  type HostRecordMutationV1,
  type HostStoredRecordV1,
  parseNonNegativeSafeInteger,
} from "@sillymaker/base";
import type {
  HostRecordStoreTransactionPhaseObserverV1,
  HostRecordStoreTransactionPhaseV1,
} from "./host-atomic-record-store-transaction-fault.ts";

type HostRecordNamespaceV1 = HostStoredRecordV1["namespace"];
type HostRecordKeyV1 = HostStoredRecordV1["key"];
type HostRecordRevisionV1 = HostStoredRecordV1["revision"];

type NormalizedMutationV1 =
  | {
      readonly kind: "put";
      readonly namespace: HostRecordNamespaceV1;
      readonly key: HostRecordKeyV1;
      readonly expectedRevision: HostRecordRevisionV1 | null;
      readonly nextRevision: HostRecordRevisionV1;
      readonly bytes: Uint8Array;
    }
  | {
      readonly kind: "delete";
      readonly namespace: HostRecordNamespaceV1;
      readonly key: HostRecordKeyV1;
      readonly expectedRevision: HostRecordRevisionV1;
    };

export interface SqliteHostRecordStoreSpikeV1 {
  readonly store: HostAtomicRecordStoreV1;
  readonly evidence: {
    readonly schemaVersion: 2;
    readonly sqliteVersion: string;
    readonly sqliteSourceId: string;
    readonly journalMode: string;
    readonly synchronous: number;
    readonly busyTimeoutMs: number;
    readonly integrityCheck: string;
  };
  close(): void;
}

const currentSchemaVersionV1 = 2;
const busyTimeoutMsV1 = 5_000;
const hostRecordTableSqlV1 = `
  CREATE TABLE host_record(
    namespace TEXT NOT NULL,
    key TEXT NOT NULL,
    revision INTEGER NOT NULL
      CHECK(revision >= 0 AND revision <= 9007199254740991),
    bytes BLOB NOT NULL,
    PRIMARY KEY(namespace, key)
  ) STRICT, WITHOUT ROWID
`;
const metadataTableSqlV1 = `
  CREATE TABLE metadata(
    name TEXT PRIMARY KEY,
    value TEXT NOT NULL
  ) STRICT, WITHOUT ROWID
`;

function isHostRecordNamespaceV1(value: unknown): value is HostRecordNamespaceV1 {
  return value === "save" || value === "lease" || value === "settings";
}

function isUint8ArrayV1(value: unknown): value is Uint8Array {
  return (
    ArrayBuffer.isView(value) && Object.prototype.toString.call(value) === "[object Uint8Array]"
  );
}

function normalizeMutationsV1(
  mutations: readonly [HostRecordMutationV1, ...HostRecordMutationV1[]],
): readonly [NormalizedMutationV1, ...NormalizedMutationV1[]] {
  if (!Array.isArray(mutations) || mutations.length === 0) {
    throw new TypeError("Host record commit requires mutations");
  }
  const normalized = mutations.map((mutation): NormalizedMutationV1 => {
    if (
      typeof mutation !== "object" ||
      mutation === null ||
      !isHostRecordNamespaceV1(Reflect.get(mutation, "namespace")) ||
      typeof Reflect.get(mutation, "key") !== "string"
    ) {
      throw new TypeError("invalid Host record mutation identity");
    }
    const namespace = mutation.namespace;
    const key = mutation.key;
    if (mutation.kind === "put") {
      if (!isUint8ArrayV1(mutation.bytes)) {
        throw new TypeError("invalid Host record mutation bytes");
      }
      const expectedRevision =
        mutation.expectedRevision === null
          ? null
          : parseNonNegativeSafeInteger(mutation.expectedRevision);
      return Object.freeze({
        kind: "put",
        namespace,
        key,
        expectedRevision,
        nextRevision: parseNonNegativeSafeInteger((expectedRevision ?? 0) + 1),
        bytes: Uint8Array.from(mutation.bytes),
      });
    }
    if (mutation.kind !== "delete") {
      throw new TypeError("invalid Host record mutation kind");
    }
    return Object.freeze({
      kind: "delete",
      namespace,
      key,
      expectedRevision: parseNonNegativeSafeInteger(mutation.expectedRevision),
    });
  });
  const identities = normalized.map((mutation) => `${mutation.namespace}\0${mutation.key}`);
  if (new Set(identities).size !== identities.length) {
    throw new TypeError("duplicate Host record mutation");
  }
  return Object.freeze(normalized) as readonly [NormalizedMutationV1, ...NormalizedMutationV1[]];
}

function parseStoredRecordV1(value: unknown): HostStoredRecordV1 {
  if (typeof value !== "object" || value === null) {
    throw new TypeError("invalid SQLite Host record row");
  }
  const namespace = Reflect.get(value, "namespace");
  const key = Reflect.get(value, "key");
  const revision = Reflect.get(value, "revision");
  const bytes = Reflect.get(value, "bytes");
  if (!isHostRecordNamespaceV1(namespace) || typeof key !== "string" || !isUint8ArrayV1(bytes)) {
    throw new TypeError("invalid SQLite Host record row");
  }
  return Object.freeze({
    namespace,
    key: key as HostRecordKeyV1,
    revision: parseNonNegativeSafeInteger(revision),
    bytes: Uint8Array.from(bytes),
  });
}

function requiredNumberPropertyV1(value: unknown, property: string): number {
  if (typeof value !== "object" || value === null) {
    throw new TypeError(`missing SQLite ${property}`);
  }
  const result = Reflect.get(value, property);
  if (typeof result !== "number" || !Number.isSafeInteger(result)) {
    throw new TypeError(`invalid SQLite ${property}`);
  }
  return result;
}

function requiredStringPropertyV1(value: unknown, property: string): string {
  if (typeof value !== "object" || value === null) {
    throw new TypeError(`missing SQLite ${property}`);
  }
  const result = Reflect.get(value, property);
  if (typeof result !== "string") {
    throw new TypeError(`invalid SQLite ${property}`);
  }
  return result;
}

function transactionV1(database: DatabaseSync, operation: () => void): void {
  database.exec("BEGIN IMMEDIATE");
  let open = true;
  try {
    operation();
    database.exec("COMMIT");
    open = false;
  } catch (error) {
    if (open) {
      try {
        database.exec("ROLLBACK");
      } catch {
        // Preserve the operation or commit error that made rollback necessary.
      }
    }
    throw error;
  }
}

function configureV1(database: DatabaseSync): void {
  database.exec(`PRAGMA busy_timeout=${busyTimeoutMsV1}`);
  database.exec("PRAGMA journal_mode=WAL");
  database.exec("PRAGMA synchronous=FULL");
}

function schemaVersionV1(database: DatabaseSync): number {
  return requiredNumberPropertyV1(database.prepare("PRAGMA user_version").get(), "user_version");
}

function isEmptyDatabaseV1(database: DatabaseSync): boolean {
  return (
    requiredNumberPropertyV1(
      database
        .prepare("SELECT count(*) AS count FROM sqlite_schema WHERE name NOT LIKE 'sqlite_%'")
        .get(),
      "count",
    ) === 0
  );
}

function validateCurrentSchemaV1(database: DatabaseSync): void {
  database.prepare("SELECT namespace, key, revision, bytes FROM host_record LIMIT 0").all();
  const version = database
    .prepare("SELECT value FROM metadata WHERE name = 'schema_version'")
    .get();
  if (requiredStringPropertyV1(version, "value") !== String(currentSchemaVersionV1)) {
    throw new TypeError("invalid SQLite spike schema metadata");
  }
}

function openCurrentSchemaV1(database: DatabaseSync): void {
  const version = schemaVersionV1(database);
  if (version === 0) {
    if (!isEmptyDatabaseV1(database)) {
      throw new TypeError("unversioned non-empty SQLite spike database");
    }
    transactionV1(database, () => {
      database.exec(hostRecordTableSqlV1);
      database.exec(metadataTableSqlV1);
      database
        .prepare("INSERT INTO metadata(name, value) VALUES('schema_version', ?)")
        .run(String(currentSchemaVersionV1));
      database.exec(`PRAGMA user_version=${currentSchemaVersionV1}`);
    });
    validateCurrentSchemaV1(database);
    return;
  }
  if (version === 1) {
    transactionV1(database, () => {
      database.exec(metadataTableSqlV1);
      database
        .prepare("INSERT INTO metadata(name, value) VALUES('schema_version', ?)")
        .run(String(currentSchemaVersionV1));
      database.exec(`PRAGMA user_version=${currentSchemaVersionV1}`);
    });
    validateCurrentSchemaV1(database);
    return;
  }
  if (version !== currentSchemaVersionV1) {
    throw new TypeError(`unsupported SQLite spike schema version: ${version}`);
  }
  validateCurrentSchemaV1(database);
}

function readEvidenceV1(database: DatabaseSync): SqliteHostRecordStoreSpikeV1["evidence"] {
  const schemaVersion = schemaVersionV1(database);
  if (schemaVersion !== currentSchemaVersionV1) {
    throw new TypeError("SQLite spike schema did not reach the current version");
  }
  return Object.freeze({
    schemaVersion,
    sqliteVersion: requiredStringPropertyV1(
      database.prepare("SELECT sqlite_version() AS version").get(),
      "version",
    ),
    sqliteSourceId: requiredStringPropertyV1(
      database.prepare("SELECT sqlite_source_id() AS source_id").get(),
      "source_id",
    ),
    journalMode: requiredStringPropertyV1(
      database.prepare("PRAGMA journal_mode").get(),
      "journal_mode",
    ),
    synchronous: requiredNumberPropertyV1(
      database.prepare("PRAGMA synchronous").get(),
      "synchronous",
    ),
    busyTimeoutMs: requiredNumberPropertyV1(
      database.prepare("PRAGMA busy_timeout").get(),
      "timeout",
    ),
    integrityCheck: requiredStringPropertyV1(
      database.prepare("PRAGMA integrity_check").get(),
      "integrity_check",
    ),
  });
}

function revisionForV1(
  database: DatabaseSync,
  namespace: HostRecordNamespaceV1,
  key: HostRecordKeyV1,
): HostRecordRevisionV1 | null {
  const row = database
    .prepare("SELECT revision FROM host_record WHERE namespace = ? AND key = ?")
    .get(namespace, key);
  return row === undefined
    ? null
    : parseNonNegativeSafeInteger(requiredNumberPropertyV1(row, "revision"));
}

async function reachPhaseV1(
  observer: HostRecordStoreTransactionPhaseObserverV1,
  phase: HostRecordStoreTransactionPhaseV1,
): Promise<void> {
  await observer.reached(Object.freeze(phase));
}

/**
 * D1 feasibility-only node:sqlite adapter. It is intentionally outside every
 * package source tree and export map; its schema and pragmas are not selected
 * production contracts.
 */
export function createSqliteHostRecordStoreSpikeV1(
  databasePath: string,
): SqliteHostRecordStoreSpikeV1 {
  return createSqliteHostRecordStoreInternalV1(databasePath);
}

/**
 * Test-only fault seam for D0 transaction-phase conformance.
 */
export function createInstrumentedSqliteHostRecordStoreSpikeV1(
  databasePath: string,
  observer: HostRecordStoreTransactionPhaseObserverV1,
): SqliteHostRecordStoreSpikeV1 {
  return createSqliteHostRecordStoreInternalV1(databasePath, observer);
}

function createSqliteHostRecordStoreInternalV1(
  databasePath: string,
  observer?: HostRecordStoreTransactionPhaseObserverV1,
): SqliteHostRecordStoreSpikeV1 {
  const database = new DatabaseSync(databasePath);
  try {
    configureV1(database);
    openCurrentSchemaV1(database);
  } catch (error) {
    database.close();
    throw error;
  }

  let closed = false;
  const requireOpenV1 = () => {
    if (closed) throw new TypeError("SQLite spike handle is closed");
  };
  const store = Object.freeze({
    async read(namespace: HostRecordNamespaceV1, key: HostRecordKeyV1) {
      requireOpenV1();
      const row = database
        .prepare(
          "SELECT namespace, key, revision, bytes FROM host_record " +
            "WHERE namespace = ? AND key = ?",
        )
        .get(namespace, key);
      return row === undefined ? null : parseStoredRecordV1(row);
    },
    async list(namespace: HostRecordNamespaceV1) {
      requireOpenV1();
      return Object.freeze(
        database
          .prepare(
            "SELECT namespace, key, revision, bytes FROM host_record " +
              "WHERE namespace = ? ORDER BY key COLLATE BINARY",
          )
          .all(namespace)
          .map(parseStoredRecordV1),
      );
    },
    async commit(mutations: readonly [HostRecordMutationV1, ...HostRecordMutationV1[]]) {
      requireOpenV1();
      const normalized = normalizeMutationsV1(mutations);
      if (observer !== undefined) {
        await reachPhaseV1(observer, { kind: "before_transaction" });
      }
      database.exec("BEGIN IMMEDIATE");
      let transactionOpen = true;
      try {
        for (const mutation of normalized) {
          const actualRevision = revisionForV1(database, mutation.namespace, mutation.key);
          if (mutation.expectedRevision !== actualRevision) {
            database.exec("ROLLBACK");
            transactionOpen = false;
            return Object.freeze({
              kind: "conflict" as const,
              namespace: mutation.namespace,
              key: mutation.key,
              actualRevision,
            });
          }
        }
        if (observer !== undefined) {
          await reachPhaseV1(observer, { kind: "between_checks_and_writes" });
        }

        const changed: HostStoredRecordV1[] = [];
        for (const [index, mutation] of normalized.entries()) {
          if (mutation.kind === "delete") {
            database
              .prepare("DELETE FROM host_record WHERE namespace = ? AND key = ?")
              .run(mutation.namespace, mutation.key);
          } else {
            database
              .prepare(
                "INSERT INTO host_record(namespace, key, revision, bytes) VALUES(?, ?, ?, ?) " +
                  "ON CONFLICT(namespace, key) DO UPDATE SET " +
                  "revision = excluded.revision, bytes = excluded.bytes",
              )
              .run(mutation.namespace, mutation.key, mutation.nextRevision, mutation.bytes);
            changed.push(
              Object.freeze({
                namespace: mutation.namespace,
                key: mutation.key,
                revision: mutation.nextRevision,
                bytes: Uint8Array.from(mutation.bytes),
              }),
            );
          }
          if (observer !== undefined && index + 1 < normalized.length) {
            await reachPhaseV1(observer, {
              kind: "between_mutations",
              completedMutationCount: index + 1,
              remainingMutationCount: normalized.length - index - 1,
            });
          }
        }
        database.exec("COMMIT");
        transactionOpen = false;
        if (observer !== undefined) {
          await reachPhaseV1(observer, {
            kind: "after_durable_write_before_response",
          });
        }
        return Object.freeze({
          kind: "committed" as const,
          records: Object.freeze(changed),
        });
      } catch (error) {
        if (transactionOpen) {
          try {
            database.exec("ROLLBACK");
          } catch {
            // Preserve the operation or commit error that made rollback necessary.
          }
        }
        throw error;
      }
    },
  }) satisfies HostAtomicRecordStoreV1;
  const evidence = readEvidenceV1(database);

  return Object.freeze({
    store,
    evidence,
    close() {
      if (closed) return;
      closed = true;
      database.close();
    },
  });
}

/** Creates a neutral schema-1 fixture for the D1 upgrade feasibility test. */
export function seedSqliteHostRecordStoreSchema1SpikeV1(
  databasePath: string,
  records: readonly HostStoredRecordV1[],
): void {
  const database = new DatabaseSync(databasePath);
  try {
    if (!isEmptyDatabaseV1(database)) {
      throw new TypeError("SQLite schema-1 spike seed requires an empty database");
    }
    transactionV1(database, () => {
      database.exec(hostRecordTableSqlV1);
      const insert = database.prepare(
        "INSERT INTO host_record(namespace, key, revision, bytes) VALUES(?, ?, ?, ?)",
      );
      for (const record of records) {
        if (
          !isHostRecordNamespaceV1(record.namespace) ||
          typeof record.key !== "string" ||
          !isUint8ArrayV1(record.bytes)
        ) {
          throw new TypeError("invalid SQLite schema-1 spike seed record");
        }
        insert.run(
          record.namespace,
          record.key,
          parseNonNegativeSafeInteger(record.revision),
          Uint8Array.from(record.bytes),
        );
      }
      database.exec("PRAGMA user_version=1");
    });
  } finally {
    database.close();
  }
}
