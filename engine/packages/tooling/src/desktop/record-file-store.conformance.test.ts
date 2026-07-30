// SPDX-License-Identifier: MIT
import { Buffer } from "node:buffer";
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import {
  createHostRecordStoreCorruptBackingNeighborV1,
  createHostRecordStoreRevisionOverflowSeedV1,
  hostRecordStoreConformanceExpectedV1,
  hostRecordStoreCorruptBackingCommitConformanceExpectedV1,
  hostRecordStoreCorruptBackingKeyV1,
  hostRecordStoreCorruptBackingReadListConformanceExpectedV1,
  hostRecordStoreKeyCorpusExpectedV1,
  hostRecordStoreReopenExpectedV1,
  hostRecordStoreRevisionOverflowConformanceExpectedV1,
  hostRecordStoreRevisionOverflowEarlierKeyV1,
  runHostRecordStoreConformanceV1,
  runHostRecordStoreCorruptBackingCommitConformanceV1,
  runHostRecordStoreCorruptBackingReadListConformanceV1,
  runHostRecordStoreKeyCorpusV1,
  runHostRecordStoreReopenConformanceV1,
  runHostRecordStoreRevisionOverflowConformanceV1,
  type HostRecordStoreCorruptBackingCommitFixtureV1,
} from "../../../../test-support/host-atomic-record-store-conformance.ts";

import { createRecordFileStoreV1 } from "./record-file-store.mts";
import { adaptRecordFileStoreForHostTestsV1 } from "../../../../test-support/record-file-store-host-adapter.ts";

const cleanupDirsV1 = new Set<string>();

afterEach(async () => {
  await Promise.all(
    [...cleanupDirsV1].map((directory) => rm(directory, { recursive: true, force: true })),
  );
  cleanupDirsV1.clear();
});

async function fixtureV1() {
  const root = await mkdtemp(join(tmpdir(), "sillymaker-record-conformance-"));
  cleanupDirsV1.add(root);
  const createStore = () => adaptRecordFileStoreForHostTestsV1(createRecordFileStoreV1(root));
  return Object.freeze({ root, createStore, store: createStore() });
}

async function seedRevisionOverflowV1(
  root: string,
  seed: ReturnType<typeof createHostRecordStoreRevisionOverflowSeedV1>,
): Promise<void> {
  const directory = join(root, seed.namespace);
  await mkdir(directory, { recursive: true });
  await writeFile(
    join(directory, `${encodeURIComponent(seed.key as string)}.json`),
    JSON.stringify({
      revision: seed.revision,
      bytesBase64: Buffer.from(seed.bytes).toString("base64"),
    }),
    "utf8",
  );
}

async function createCorruptBackingStoreV1(rawCorruptRecord: string) {
  const { root, store } = await fixtureV1();
  const neighbor = createHostRecordStoreCorruptBackingNeighborV1();
  const directory = join(root, neighbor.namespace);
  await mkdir(directory, { recursive: true });
  await Promise.all([
    writeFile(
      join(directory, `${encodeURIComponent(neighbor.key as string)}.json`),
      JSON.stringify({
        revision: neighbor.revision,
        bytesBase64: Buffer.from(neighbor.bytes).toString("base64"),
      }),
      "utf8",
    ),
    writeFile(
      join(directory, `${encodeURIComponent(hostRecordStoreCorruptBackingKeyV1 as string)}.json`),
      rawCorruptRecord,
      "utf8",
    ),
  ]);
  return store;
}

interface RecordTreeEntryV1 {
  readonly kind: "directory" | "file" | "other";
  readonly path: string;
  readonly bytes?: readonly number[];
}

async function snapshotRecordTreeV1(root: string): Promise<readonly RecordTreeEntryV1[]> {
  const snapshot: RecordTreeEntryV1[] = [];
  const visitV1 = async (directory: string, relativeDirectory: string): Promise<void> => {
    const entries = (await readdir(directory, { withFileTypes: true })).toSorted((left, right) =>
      left.name < right.name ? -1 : left.name > right.name ? 1 : 0,
    );
    for (const entry of entries) {
      const relativePath =
        relativeDirectory.length === 0 ? entry.name : join(relativeDirectory, entry.name);
      const absolutePath = join(directory, entry.name);
      if (entry.isDirectory()) {
        snapshot.push(Object.freeze({ kind: "directory", path: relativePath }));
        await visitV1(absolutePath, relativePath);
      } else if (entry.isFile()) {
        snapshot.push(
          Object.freeze({
            kind: "file",
            path: relativePath,
            bytes: Object.freeze(Array.from(await readFile(absolutePath))),
          }),
        );
      } else {
        snapshot.push(Object.freeze({ kind: "other", path: relativePath }));
      }
    }
  };
  await visitV1(root, "");
  return Object.freeze(snapshot);
}

async function createCorruptCommitFixtureV1(
  rawCorruptRecord: string,
): Promise<HostRecordStoreCorruptBackingCommitFixtureV1<readonly RecordTreeEntryV1[]>> {
  const { root, createStore, store } = await fixtureV1();
  const neighbor = createHostRecordStoreCorruptBackingNeighborV1();
  const directory = join(root, neighbor.namespace);
  await mkdir(directory, { recursive: true });
  await Promise.all([
    writeFile(
      join(directory, `${encodeURIComponent(neighbor.key as string)}.json`),
      JSON.stringify({
        revision: neighbor.revision,
        bytesBase64: Buffer.from(neighbor.bytes).toString("base64"),
      }),
      "utf8",
    ),
    writeFile(
      join(directory, `${encodeURIComponent(hostRecordStoreCorruptBackingKeyV1 as string)}.json`),
      rawCorruptRecord,
      "utf8",
    ),
  ]);
  return Object.freeze({
    store,
    createFreshStore: createStore,
    snapshotRecordBacking: () => snapshotRecordTreeV1(root),
    recordBackingSnapshotsEqual: (
      left: readonly RecordTreeEntryV1[],
      right: readonly RecordTreeEntryV1[],
    ) => JSON.stringify(left) === JSON.stringify(right),
  });
}

const corruptRecordCasesV1 = Object.freeze([
  ["missing revision", JSON.stringify({ bytesBase64: "AQ==" })],
  ["negative-zero revision", '{"revision":-0,"bytesBase64":"AQ=="}'],
  ["missing bytes", JSON.stringify({ revision: 1 })],
  ["invalid base64 bytes", JSON.stringify({ revision: 1, bytesBase64: "not-base64" })],
  ["truncated JSON", '{"revision":1'],
] as const);

const corruptCommitRecordCasesV1 = Object.freeze([
  ["missing bytes", JSON.stringify({ revision: 1 })],
  ["invalid base64 bytes", JSON.stringify({ revision: 1, bytesBase64: "not-base64" })],
] as const);

describe("desktop file-preview Host record store conformance", () => {
  it("matches the shared core workload under one process-local handle", async () => {
    const { store } = await fixtureV1();

    expect(await runHostRecordStoreConformanceV1(store)).toEqual(
      hostRecordStoreConformanceExpectedV1,
    );
  });

  it("exposes the preview filename mapping against the shared logical key corpus", async () => {
    const report = await runHostRecordStoreKeyCorpusV1(async () => (await fixtureV1()).store);

    expect(report).not.toEqual(hostRecordStoreKeyCorpusExpectedV1);
    expect(report.cases.find((testCase) => testCase.id === "non_ascii")).toEqual(
      hostRecordStoreKeyCorpusExpectedV1.cases.find((testCase) => testCase.id === "non_ascii"),
    );
    expect(report.cases.find((testCase) => testCase.id === "representative_long")).toEqual({
      id: "representative_long",
      keyCount: 2,
      committedRecordCount: 0,
      committedExactCount: 0,
      readExactCount: 0,
      listedRecordCount: 0,
      listedExactCount: 0,
      listStable: true,
      rejected: true,
    });
  });

  it("retains revisions and bytes across a fresh adapter handle", async () => {
    const { createStore, store } = await fixtureV1();

    expect(await runHostRecordStoreReopenConformanceV1(store, createStore)).toEqual(
      hostRecordStoreReopenExpectedV1,
    );
  });

  it("rejects matched revision exhaustion atomically and preserves it across a fresh handle", async () => {
    const { root, createStore, store } = await fixtureV1();
    const seed = createHostRecordStoreRevisionOverflowSeedV1();
    await seedRevisionOverflowV1(root, seed);

    expect(await runHostRecordStoreRevisionOverflowConformanceV1(store)).toEqual(
      hostRecordStoreRevisionOverflowConformanceExpectedV1,
    );
    const freshStore = createStore();
    expect(await freshStore.read(seed.namespace, seed.key)).toEqual(seed);
    expect(
      await freshStore.read(seed.namespace, hostRecordStoreRevisionOverflowEarlierKeyV1),
    ).toBeNull();
  });

  it.each(corruptRecordCasesV1)(
    "fails closed for a persisted record with %s",
    async (_name, rawCorruptRecord) => {
      expect(
        await runHostRecordStoreCorruptBackingReadListConformanceV1(() =>
          createCorruptBackingStoreV1(rawCorruptRecord),
        ),
      ).toEqual(hostRecordStoreCorruptBackingReadListConformanceExpectedV1);
    },
  );

  it.each(corruptCommitRecordCasesV1)(
    "rejects an atomic batch before mutating a persisted record with %s",
    async (_name, rawCorruptRecord) => {
      expect(
        await runHostRecordStoreCorruptBackingCommitConformanceV1(() =>
          createCorruptCommitFixtureV1(rawCorruptRecord),
        ),
      ).toEqual(hostRecordStoreCorruptBackingCommitConformanceExpectedV1);
    },
  );
});
