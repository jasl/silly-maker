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
  createSqliteHostRecordStoreSpikeV1,
  type SqliteHostRecordStoreSpikeV1,
} from "../../../../test-support/sqlite-host-record-store-spike.ts";

type HostRecordKeyV1 = HostStoredRecordV1["key"];
type SigkillPhaseV1 = "between_mutations" | "after_durable_write_before_response";

interface SigkillChildV1 {
  readonly processId: number;
  readonly ready: Promise<void>;
  readonly closed: Promise<{
    readonly code: number | null;
    readonly signal: string | null;
    readonly stdoutLines: readonly string[];
    readonly stderr: string;
    readonly watchdogFired: boolean;
  }>;
  readonly killWithSigkill: () => void;
  readonly terminate: () => void;
}

const cleanupDirsV1 = new Set<string>();
const handlesV1 = new Set<SqliteHostRecordStoreSpikeV1>();
const childrenV1 = new Set<SigkillChildV1>();

afterEach(async () => {
  await Promise.all(
    [...childrenV1].map(async (child) => {
      child.terminate();
      await child.closed;
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

async function databasePathV1(): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), "sillymaker-sqlite-sigkill-spike-"));
  cleanupDirsV1.add(directory);
  return join(directory, "records.sqlite");
}

function openV1(databasePath: string): SqliteHostRecordStoreSpikeV1 {
  const handle = createSqliteHostRecordStoreSpikeV1(databasePath);
  handlesV1.add(handle);
  return handle;
}

async function seedPairV1(databasePath: string): Promise<void> {
  const seed = openV1(databasePath);
  const result = await seed.store.commit([
    {
      kind: "put",
      namespace: "save",
      key: "conformance.fault.left" as HostRecordKeyV1,
      expectedRevision: null,
      bytes: Uint8Array.of(0, 127, 255),
    },
    {
      kind: "put",
      namespace: "lease",
      key: "conformance.fault.right" as HostRecordKeyV1,
      expectedRevision: null,
      bytes: Uint8Array.of(255, 128, 0),
    },
  ]);
  if (result.kind !== "committed") {
    throw new TypeError("SQLite SIGKILL fixture seed conflicted");
  }
  seed.close();
}

function spawnSigkillChildV1(databasePath: string, phase: SigkillPhaseV1): SigkillChildV1 {
  const child = spawn(
    process.execPath,
    [
      "run",
      "--quiet",
      // See spawnSqliteCasChildV1: no node_modules re-materialization in
      // children, so concurrent suite realpath walks never race them.
      "--node-modules-dir=none",
      "--allow-read",
      "--allow-write",
      fileURLToPath(
        new URL(
          "../../../../test-support/sqlite-host-record-store-sigkill-child.fixture.ts",
          import.meta.url,
        ),
      ),
      databasePath,
      phase,
    ],
    {
      stdio: ["pipe", "pipe", "pipe"],
    },
  );

  let watchdogFiredV1 = false;
  const watchdogV1 = setTimeout(() => {
    watchdogFiredV1 = true;
    child.kill("SIGKILL");
  }, 20_000);
  let resolveReadyV1: (() => void) | undefined;
  let rejectReadyV1: ((error: unknown) => void) | undefined;
  const ready = new Promise<void>((resolve, reject) => {
    resolveReadyV1 = resolve;
    rejectReadyV1 = reject;
  });
  let resolveClosedV1: ((result: Awaited<SigkillChildV1["closed"]>) => void) | undefined;
  const closed = new Promise<Awaited<SigkillChildV1["closed"]>>((resolve) => {
    resolveClosedV1 = resolve;
  });
  void ready.catch(() => undefined);

  let readySeenV1 = false;
  let closedV1 = false;
  let stderrV1 = "";
  const stdoutLinesV1: string[] = [];
  child.stderr.setEncoding("utf8");
  child.stderr.on("data", (chunk: string) => {
    stderrV1 += chunk;
  });
  const lines = createInterface({ input: child.stdout });
  lines.on("line", (line) => {
    stdoutLinesV1.push(line);
    if (!readySeenV1 && line === `ready:${phase}`) {
      readySeenV1 = true;
      resolveReadyV1?.();
      return;
    }
    rejectReadyV1?.(new TypeError(`SQLite SIGKILL child emitted an unexpected line: ${line}`));
  });
  child.on("error", (error) => {
    rejectReadyV1?.(error);
  });
  child.on("close", (code, signal) => {
    closedV1 = true;
    clearTimeout(watchdogV1);
    if (!readySeenV1) {
      rejectReadyV1?.(
        new TypeError(
          `SQLite SIGKILL child exited before ${phase}: code=${code} signal=${signal} ` +
            `stderr=${stderrV1.trim()}`,
        ),
      );
    }
    resolveClosedV1?.(
      Object.freeze({
        code,
        signal,
        stdoutLines: Object.freeze([...stdoutLinesV1]),
        stderr: stderrV1,
        watchdogFired: watchdogFiredV1,
      }),
    );
  });

  const handle = Object.freeze({
    get processId() {
      if (child.pid === undefined) {
        throw new TypeError("SQLite SIGKILL child has no process id after ready");
      }
      return child.pid;
    },
    ready,
    closed,
    killWithSigkill: () => {
      if (!child.kill("SIGKILL")) {
        throw new TypeError("SQLite SIGKILL child could not be terminated");
      }
    },
    terminate: () => {
      if (!child.stdin.destroyed) child.stdin.destroy();
      if (!closedV1) child.kill("SIGKILL");
    },
  });
  childrenV1.add(handle);
  return handle;
}

const casesV1 = Object.freeze([
  Object.freeze({
    phase: "between_mutations" as const,
    revisions: Object.freeze([1, 1] as const),
    bytes: Object.freeze(
      [
        Object.freeze([0, 127, 255] as const),
        Object.freeze([255, 128, 0] as const),
      ] as const,
    ),
  }),
  Object.freeze({
    phase: "after_durable_write_before_response" as const,
    revisions: Object.freeze([2, 2] as const),
    bytes: Object.freeze(
      [
        Object.freeze([1, 2, 3, 4] as const),
        Object.freeze([4, 3, 2, 1] as const),
      ] as const,
    ),
  }),
]);

describe("node:sqlite real process crash recovery", () => {
  for (const testCase of casesV1) {
    it.skipIf(process.platform === "win32")(
      `reopens an all-or-nothing batch after SIGKILL at ${testCase.phase}`,
      async () => {
        const databasePath = await databasePathV1();
        await seedPairV1(databasePath);
        const child = spawnSigkillChildV1(databasePath, testCase.phase);

        await child.ready;
        expect(child.processId).not.toBe(process.pid);
        child.killWithSigkill();
        expect(await child.closed).toEqual({
          code: null,
          signal: "SIGKILL",
          stdoutLines: [`ready:${testCase.phase}`],
          stderr: "",
          watchdogFired: false,
        });

        const reopened = openV1(databasePath);
        expect(reopened.evidence.integrityCheck).toBe("ok");
        expect(
          await Promise.all([
            reopened.store.read("save", "conformance.fault.left" as HostRecordKeyV1),
            reopened.store.read("lease", "conformance.fault.right" as HostRecordKeyV1),
          ]),
        ).toEqual([
          {
            namespace: "save",
            key: "conformance.fault.left",
            revision: testCase.revisions[0],
            bytes: Uint8Array.from(testCase.bytes[0]),
          },
          {
            namespace: "lease",
            key: "conformance.fault.right",
            revision: testCase.revisions[1],
            bytes: Uint8Array.from(testCase.bytes[1]),
          },
        ]);

        if (testCase.phase === "after_durable_write_before_response") {
          expect(
            await reopened.store.commit([
              {
                kind: "put",
                namespace: "save",
                key: "conformance.fault.left" as HostRecordKeyV1,
                expectedRevision: 1 as HostStoredRecordV1["revision"],
                bytes: Uint8Array.of(9),
              },
              {
                kind: "put",
                namespace: "lease",
                key: "conformance.fault.right" as HostRecordKeyV1,
                expectedRevision: 1 as HostStoredRecordV1["revision"],
                bytes: Uint8Array.of(10),
              },
            ]),
          ).toEqual({
            kind: "conflict",
            namespace: "save",
            key: "conformance.fault.left",
            actualRevision: 2,
          });
        }
      },
      40_000,
    );
  }
});
