// SPDX-License-Identifier: MIT
import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createInterface } from "node:readline";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";

import type { HostStoredRecordV1 } from "@sillymaker/base";
import {
  createHostRecordStoreRevisionOverflowSeedV1,
  hostRecordStoreConformanceExpectedV1,
  hostRecordStoreKeyCorpusExpectedV1,
  hostRecordStoreMalformedConformanceExpectedV1,
  hostRecordStoreReopenExpectedV1,
  hostRecordStoreRevisionOverflowConformanceExpectedV1,
  hostRecordStoreRevisionOverflowEarlierKeyV1,
  runHostRecordStoreConformanceV1,
  runHostRecordStoreKeyCorpusV1,
  runHostRecordStoreMalformedConformanceV1,
  runHostRecordStoreReopenConformanceV1,
  runHostRecordStoreRevisionOverflowConformanceV1,
} from "../../../../test-support/host-atomic-record-store-conformance.ts";
import {
  createSqliteHostRecordStoreSpikeV1,
  seedSqliteHostRecordStoreSchema1SpikeV1,
  type SqliteHostRecordStoreSpikeV1,
} from "../../../../test-support/sqlite-host-record-store-spike.ts";

type HostRecordKeyV1 = HostStoredRecordV1["key"];

interface SqliteCasChildResultV1 {
  readonly side: "left" | "right";
  readonly processId: number;
  readonly kind: "committed" | "conflict";
  readonly revision?: number;
  readonly actualRevision?: number | null;
  readonly bytes?: readonly number[];
}

interface SqliteCasChildV1 {
  readonly processId: number;
  readonly ready: Promise<void>;
  readonly completion: Promise<SqliteCasChildResultV1>;
  readonly closed: Promise<void>;
  readonly release: () => Promise<void>;
  readonly terminate: () => void;
}

const cleanupDirsV1 = new Set<string>();
const handlesV1 = new Set<SqliteHostRecordStoreSpikeV1>();
const childrenV1 = new Set<SqliteCasChildV1>();

afterEach(async () => {
  await Promise.all(
    [...childrenV1].map(async (child) => {
      child.terminate();
      await child.closed.catch(() => undefined);
    }),
  );
  childrenV1.clear();
  for (const handle of handlesV1) handle.close();
  handlesV1.clear();
  await Promise.all(
    [...cleanupDirsV1].map((directory) => rm(directory, { recursive: true, force: true })),
  );
  cleanupDirsV1.clear();
});

async function databasePathV1(prefix = "sillymaker-sqlite-spike-"): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), prefix));
  cleanupDirsV1.add(directory);
  return join(directory, "records.sqlite");
}

function openV1(databasePath: string): SqliteHostRecordStoreSpikeV1 {
  const handle = createSqliteHostRecordStoreSpikeV1(databasePath);
  handlesV1.add(handle);
  return handle;
}

function spawnSqliteCasChildV1(
  databasePath: string,
  side: "left" | "right",
  bytes: readonly number[],
): SqliteCasChildV1 {
  const child = spawn(
    process.execPath,
    [
      "run",
      "--quiet",
      // Keeps the child deno from re-materializing workspace node_modules
      // symlinks (racing concurrent realpath walks in the parallel suite);
      // the fixture's runtime imports are relative files and node builtins.
      "--node-modules-dir=none",
      "--allow-read",
      "--allow-write",
      fileURLToPath(
        new URL(
          "../../../../test-support/sqlite-host-record-store-cas-child.fixture.ts",
          import.meta.url,
        ),
      ),
      databasePath,
      side,
      bytes.join(","),
    ],
    {
      stdio: ["pipe", "pipe", "pipe"],
      timeout: 20_000,
      killSignal: "SIGKILL",
    },
  );

  let resolveReadyV1: (() => void) | undefined;
  let rejectReadyV1: ((error: unknown) => void) | undefined;
  const ready = new Promise<void>((resolve, reject) => {
    resolveReadyV1 = resolve;
    rejectReadyV1 = reject;
  });
  let resolveCompletionV1: ((result: SqliteCasChildResultV1) => void) | undefined;
  let rejectCompletionV1: ((error: unknown) => void) | undefined;
  const completion = new Promise<SqliteCasChildResultV1>((resolve, reject) => {
    resolveCompletionV1 = resolve;
    rejectCompletionV1 = reject;
  });
  let resolveClosedV1: (() => void) | undefined;
  const closed = new Promise<void>((resolve) => {
    resolveClosedV1 = resolve;
  });
  void ready.catch(() => undefined);
  void completion.catch(() => undefined);

  let readySeenV1 = false;
  let resultV1: SqliteCasChildResultV1 | undefined;
  let stderrV1 = "";
  let closedV1 = false;
  child.stderr.setEncoding("utf8");
  child.stderr.on("data", (chunk: string) => {
    stderrV1 += chunk;
  });
  const lines = createInterface({ input: child.stdout });
  lines.on("line", (line) => {
    if (!readySeenV1 && line === "ready") {
      readySeenV1 = true;
      resolveReadyV1?.();
      return;
    }
    if (resultV1 !== undefined) {
      rejectCompletionV1?.(new TypeError(`SQLite CAS child emitted an extra line: ${line}`));
      return;
    }
    try {
      resultV1 = JSON.parse(line) as SqliteCasChildResultV1;
    } catch (error) {
      rejectCompletionV1?.(
        new TypeError(`SQLite CAS child emitted invalid JSON: ${line}`, {
          cause: error,
        }),
      );
    }
  });
  child.on("error", (error) => {
    rejectReadyV1?.(error);
    rejectCompletionV1?.(error);
  });
  child.on("close", (code, signal) => {
    closedV1 = true;
    resolveClosedV1?.();
    if (!readySeenV1) {
      rejectReadyV1?.(
        new TypeError(
          `SQLite CAS child exited before ready: code=${code} signal=${signal} ` +
            `stderr=${stderrV1.trim()}`,
        ),
      );
    }
    if (code !== 0 || resultV1 === undefined) {
      rejectCompletionV1?.(
        new TypeError(
          `SQLite CAS child failed: code=${code} signal=${signal} stderr=${stderrV1.trim()}`,
        ),
      );
      return;
    }
    resolveCompletionV1?.(resultV1);
  });

  const handle = Object.freeze({
    get processId() {
      if (child.pid === undefined) {
        throw new TypeError("SQLite CAS child has no process id");
      }
      return child.pid;
    },
    ready,
    completion,
    closed,
    release: () =>
      new Promise<void>((resolve, reject) => {
        const onErrorV1 = (error: Error) => reject(error);
        child.stdin.once("error", onErrorV1);
        child.stdin.end("release\n", () => {
          child.stdin.off("error", onErrorV1);
          resolve();
        });
      }),
    terminate: () => {
      if (!child.stdin.destroyed) child.stdin.destroy();
      if (!closedV1) child.kill("SIGKILL");
    },
  });
  childrenV1.add(handle);
  return handle;
}

describe("node:sqlite Host record store feasibility spike", () => {
  it("matches shared core and logical-key semantics with the candidate SQLite configuration", async () => {
    const coreHandle = openV1(await databasePathV1());

    expect(coreHandle.evidence).toMatchObject({
      schemaVersion: 2,
      journalMode: "wal",
      synchronous: 2,
      busyTimeoutMs: 5_000,
      integrityCheck: "ok",
    });
    expect(coreHandle.evidence.sqliteVersion).toMatch(/^\d+\.\d+\.\d+$/u);
    expect(coreHandle.evidence.sqliteSourceId).toMatch(
      /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2} [0-9a-f]+$/u,
    );
    expect(await runHostRecordStoreConformanceV1(coreHandle.store)).toEqual(
      hostRecordStoreConformanceExpectedV1,
    );
    expect(
      await runHostRecordStoreKeyCorpusV1(async () => openV1(await databasePathV1()).store),
    ).toEqual(hostRecordStoreKeyCorpusExpectedV1);
  });

  it("closes and reopens while retaining the shared persistence contract", async () => {
    const databasePath = await databasePathV1();
    let current = openV1(databasePath);

    expect(
      await runHostRecordStoreReopenConformanceV1(current.store, () => {
        current.close();
        current = openV1(databasePath);
        return current.store;
      }),
    ).toEqual(hostRecordStoreReopenExpectedV1);
  });

  it("matches the shared malformed mutation baseline across a fresh reopen", async () => {
    const databasePath = await databasePathV1();
    const current = openV1(databasePath);

    expect(await runHostRecordStoreMalformedConformanceV1(current.store)).toEqual(
      hostRecordStoreMalformedConformanceExpectedV1,
    );
    current.close();

    expect(await openV1(databasePath).store.list("settings")).toEqual([
      {
        namespace: "settings",
        key: "conformance.malformed.victim",
        revision: 1,
        bytes: Uint8Array.of(7, 8, 9, 255),
      },
    ]);
  });

  it("rejects a matched maximum-revision batch without changing either key", async () => {
    const databasePath = await databasePathV1();
    const seed = createHostRecordStoreRevisionOverflowSeedV1();
    seedSqliteHostRecordStoreSchema1SpikeV1(databasePath, [seed]);
    const current = openV1(databasePath);

    expect(await runHostRecordStoreRevisionOverflowConformanceV1(current.store)).toEqual(
      hostRecordStoreRevisionOverflowConformanceExpectedV1,
    );
    current.close();

    const reopened = openV1(databasePath);
    expect(
      await reopened.store.read("settings", hostRecordStoreRevisionOverflowEarlierKeyV1),
    ).toBeNull();
    expect(await reopened.store.read(seed.namespace, seed.key)).toEqual(seed);
  });

  it("upgrades a schema-1 database to schema 2 without changing record identity or bytes", async () => {
    const databasePath = await databasePathV1();
    const seed = Object.freeze({
      namespace: "settings",
      key: "spike.schema-upgrade" as HostRecordKeyV1,
      revision: 7 as HostStoredRecordV1["revision"],
      bytes: Uint8Array.of(0, 127, 255, 16),
    });
    seedSqliteHostRecordStoreSchema1SpikeV1(databasePath, [seed]);

    const upgraded = openV1(databasePath);

    expect(upgraded.evidence.schemaVersion).toBe(2);
    expect(await upgraded.store.read(seed.namespace, seed.key)).toEqual(seed);
    upgraded.close();

    const reopened = openV1(databasePath);
    expect(reopened.evidence.schemaVersion).toBe(2);
    expect(await reopened.store.read(seed.namespace, seed.key)).toEqual(seed);
  });

  it("gives exactly one commit authority to two simultaneously live Deno processes", async () => {
    const databasePath = await databasePathV1();
    openV1(databasePath).close();
    const left = spawnSqliteCasChildV1(databasePath, "left", [1, 0, 255]);
    const right = spawnSqliteCasChildV1(databasePath, "right", [2, 0, 254]);

    await Promise.all([left.ready, right.ready]);
    expect(left.processId).not.toBe(right.processId);
    await Promise.all([left.release(), right.release()]);
    const results = await Promise.all([left.completion, right.completion]);
    expect(results).toEqual([
      expect.objectContaining({
        side: "left",
        processId: left.processId,
      }),
      expect.objectContaining({
        side: "right",
        processId: right.processId,
      }),
    ]);
    const committed = results.filter((result) => result.kind === "committed");
    const conflicts = results.filter((result) => result.kind === "conflict");

    expect(committed).toHaveLength(1);
    expect(conflicts).toEqual([
      expect.objectContaining({
        kind: "conflict",
        actualRevision: 1,
      }),
    ]);
    expect(committed[0]).toMatchObject({ revision: 1 });
    const finalHandle = openV1(databasePath);
    const finalRecord = await finalHandle.store.read(
      "lease",
      "spike.process-concurrent" as HostRecordKeyV1,
    );
    expect(finalHandle.evidence.integrityCheck).toBe("ok");
    expect(finalRecord).toEqual({
      namespace: "lease",
      key: "spike.process-concurrent",
      revision: 1,
      bytes: Uint8Array.from(committed[0]!.bytes!),
    });
  });
});
