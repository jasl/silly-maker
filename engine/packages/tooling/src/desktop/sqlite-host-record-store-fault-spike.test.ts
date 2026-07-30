// SPDX-License-Identifier: MIT
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import type { HostStoredRecordV1 } from "@sillymaker/base";
import {
  hostRecordStoreTransactionFaultExpectedV1,
  runHostRecordStoreTransactionFaultConformanceV1,
  type HostRecordStoreTransactionFaultFixtureV1,
  type HostRecordStoreTransactionPhaseIdV1,
  type HostRecordStoreTransactionPhaseV1,
} from "../../../../test-support/host-atomic-record-store-transaction-fault.ts";
import {
  createInstrumentedSqliteHostRecordStoreSpikeV1,
  createSqliteHostRecordStoreSpikeV1,
  type SqliteHostRecordStoreSpikeV1,
} from "../../../../test-support/sqlite-host-record-store-spike.ts";

type HostRecordKeyV1 = HostStoredRecordV1["key"];

const cleanupDirsV1 = new Set<string>();
const handlesV1 = new Set<SqliteHostRecordStoreSpikeV1>();

afterEach(async () => {
  for (const handle of handlesV1) handle.close();
  handlesV1.clear();
  await Promise.all(
    [...cleanupDirsV1].map((directory) => rm(directory, { recursive: true, force: true })),
  );
  cleanupDirsV1.clear();
});

async function databasePathV1(): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), "sillymaker-sqlite-fault-spike-"));
  cleanupDirsV1.add(directory);
  return join(directory, "records.sqlite");
}

function trackV1(handle: SqliteHostRecordStoreSpikeV1): SqliteHostRecordStoreSpikeV1 {
  handlesV1.add(handle);
  return handle;
}

describe("node:sqlite Host transaction fault feasibility", () => {
  it("keeps deterministic transaction failures all-old and response loss all-new", async () => {
    const phasePaths = new Map<HostRecordStoreTransactionPhaseIdV1, string>();
    const report = await runHostRecordStoreTransactionFaultConformanceV1(
      async (targetPhase): Promise<HostRecordStoreTransactionFaultFixtureV1> => {
        const databasePath = await databasePathV1();
        phasePaths.set(targetPhase, databasePath);
        const seed = trackV1(createSqliteHostRecordStoreSpikeV1(databasePath));
        const seedResult = await seed.store.commit([
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
        if (seedResult.kind !== "committed") {
          throw new TypeError("SQLite fault fixture seed conflicted");
        }
        seed.close();

        const phases: HostRecordStoreTransactionPhaseV1[] = [];
        const current = trackV1(
          createInstrumentedSqliteHostRecordStoreSpikeV1(databasePath, {
            reached(phase) {
              phases.push(phase);
              if (phase.kind === targetPhase) {
                throw new Error(`injected SQLite ${targetPhase} failure`);
              }
            },
          }),
        );
        return Object.freeze({
          current,
          observedPhases: () => Object.freeze([...phases]),
          reopen: () => trackV1(createSqliteHostRecordStoreSpikeV1(databasePath)),
        });
      },
    );

    expect(report).toEqual(hostRecordStoreTransactionFaultExpectedV1);
    expect(Object.isFrozen(report)).toBe(true);
    expect(Object.isFrozen(report.cases)).toBe(true);
    for (const faultCase of report.cases) {
      expect(Object.isFrozen(faultCase)).toBe(true);
      expect(Object.isFrozen(faultCase.observedPhases)).toBe(true);
      expect(faultCase.observedPhases.every(Object.isFrozen)).toBe(true);
      expect(Object.isFrozen(faultCase.reopenedRecords)).toBe(true);
      for (const record of faultCase.reopenedRecords) {
        expect(record === null || (Object.isFrozen(record) && Object.isFrozen(record.bytes))).toBe(
          true,
        );
      }
      expect(faultCase.retry === null || Object.isFrozen(faultCase.retry)).toBe(true);
    }
    expect(phasePaths.size).toBe(4);
    for (const databasePath of phasePaths.values()) {
      expect(
        trackV1(createSqliteHostRecordStoreSpikeV1(databasePath)).evidence.integrityCheck,
      ).toBe("ok");
    }
  });
});
