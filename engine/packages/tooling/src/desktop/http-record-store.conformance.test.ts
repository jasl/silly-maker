// SPDX-License-Identifier: MIT
import { Buffer } from "node:buffer";
import { runInNewContext } from "node:vm";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import type { HostStoredRecordV1 } from "@sillymaker/base";
import { createHttpHostRecordStoreV1 } from "@sillymaker/web";
import {
  createHostRecordStoreRevisionOverflowSeedV1,
  hostRecordStoreKeyCorpusExpectedV1,
  hostRecordStoreMalformedConformanceExpectedV1,
  hostRecordStoreRevisionOverflowConformanceExpectedV1,
  hostRecordStoreRevisionOverflowEarlierKeyV1,
  runHostRecordStoreKeyCorpusV1,
  runHostRecordStoreMalformedConformanceV1,
  runHostRecordStoreRevisionOverflowConformanceV1,
} from "../../../../test-support/host-atomic-record-store-conformance.ts";

import {
  createInstrumentedRecordFileStoreInternalV1,
  createRecordFileStoreV1,
  type RecordFileStorePhaseInternalV1,
} from "./record-file-store.mts";
import { adaptRecordFileStoreForHostTestsV1 } from "../../../../test-support/record-file-store-host-adapter.ts";
import { handleRecordHttpRequestV1 } from "./record-http-handler.mts";

type HostRecordKeyV1 = HostStoredRecordV1["key"];

const cleanupDirsV1 = new Set<string>();

afterEach(async () => {
  await Promise.all(
    [...cleanupDirsV1].map((directory) => rm(directory, { recursive: true, force: true })),
  );
  cleanupDirsV1.clear();
});

async function productionBoundaryFixtureV1() {
  const root = await mkdtemp(join(tmpdir(), "sillymaker-http-record-conformance-"));
  cleanupDirsV1.add(root);
  let commitEndpointRequestCount = 0;
  const phaseEvents: RecordFileStorePhaseInternalV1[] = [];
  const createStore = () => {
    const fileStore = createInstrumentedRecordFileStoreInternalV1(root, {
      reached(point) {
        phaseEvents.push(point);
      },
    });
    const fetchImpl = async (input: string, init?: RequestInit): Promise<Response> => {
      const url = new URL(input, "http://127.0.0.1:41800");
      const prefix = "/sillymaker/records";
      if (!url.pathname.startsWith(prefix)) {
        return new Response("{}", { status: 404 });
      }
      if (url.pathname === `${prefix}/commit`) commitEndpointRequestCount += 1;
      return await handleRecordHttpRequestV1(
        new Request(url, init),
        url.pathname.slice(prefix.length),
        fileStore,
      );
    };
    return createHttpHostRecordStoreV1({
      baseUrl: "/sillymaker/records",
      fetchImpl,
    });
  };
  return Object.freeze({
    root,
    createStore,
    store: createStore(),
    commitEndpointRequestCount: () => commitEndpointRequestCount,
    phaseEvents: () => Object.freeze([...phaseEvents]),
  });
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

describe("the Desktop HTTP record boundary", () => {
  it("exposes the preview filename mapping through the real HTTP boundary", async () => {
    const report = await runHostRecordStoreKeyCorpusV1(
      async () => (await productionBoundaryFixtureV1()).store,
    );
    const directReport = await runHostRecordStoreKeyCorpusV1(async () => {
      const root = await mkdtemp(join(tmpdir(), "sillymaker-direct-record-conformance-"));
      cleanupDirsV1.add(root);
      return adaptRecordFileStoreForHostTestsV1(createRecordFileStoreV1(root));
    });

    expect(report).not.toEqual(hostRecordStoreKeyCorpusExpectedV1);
    expect(report).toEqual(directReport);
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

  it("rejects malformed input before a commit request and preserves valid cross-realm bytes", async () => {
    const fixture = await productionBoundaryFixtureV1();

    await expect(fixture.store.commit({} as never)).rejects.toBeInstanceOf(TypeError);
    const sparseBatch: unknown[] = [];
    sparseBatch.length = 1;
    await expect(fixture.store.commit(sparseBatch as never)).rejects.toBeInstanceOf(TypeError);
    expect(fixture.commitEndpointRequestCount()).toBe(0);

    const report = await runHostRecordStoreMalformedConformanceV1(fixture.store);

    expect(fixture.commitEndpointRequestCount()).toBe(1);
    expect(report).toEqual(hostRecordStoreMalformedConformanceExpectedV1);

    const key = "conformance.malformed.cross-realm" as HostRecordKeyV1;
    const bytes = runInNewContext("Uint8Array.of(0, 255, 16)") as Uint8Array;
    expect(bytes).not.toBeInstanceOf(Uint8Array);
    await expect(
      fixture.store.commit([
        {
          kind: "put",
          namespace: "settings",
          key,
          expectedRevision: null,
          bytes,
        },
      ]),
    ).resolves.toMatchObject({ kind: "committed" });
    expect(Array.from((await fixture.store.read("settings", key))!.bytes)).toEqual([0, 255, 16]);
    expect(fixture.commitEndpointRequestCount()).toBe(2);
  });

  it("rejects matched revision exhaustion atomically and preserves it across a fresh boundary", async () => {
    const fixture = await productionBoundaryFixtureV1();
    const seed = createHostRecordStoreRevisionOverflowSeedV1();
    await seedRevisionOverflowV1(fixture.root, seed);

    expect(await runHostRecordStoreRevisionOverflowConformanceV1(fixture.store)).toEqual(
      hostRecordStoreRevisionOverflowConformanceExpectedV1,
    );
    expect(fixture.commitEndpointRequestCount()).toBe(1);
    expect(fixture.phaseEvents()).toEqual([
      { kind: "between_checks_and_writes" },
      {
        kind: "between_mutations",
        completedMutationCount: 1,
        remainingMutationCount: 1,
      },
    ]);
    const freshStore = fixture.createStore();
    expect(await freshStore.read(seed.namespace, seed.key)).toEqual(seed);
    expect(
      await freshStore.read(seed.namespace, hostRecordStoreRevisionOverflowEarlierKeyV1),
    ).toBeNull();
  });
});
