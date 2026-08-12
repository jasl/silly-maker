// SPDX-License-Identifier: MIT
import { readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import type { HostAtomicRecordStoreV1 } from "@sillymaker/base";
import { digestCanonical } from "@sillymaker/base";
import {
  admitSaveMigrationReleaseFixtureV1,
  createMemoryHostRecordStoreV1,
  saveMigrationReleaseCorpusV1,
} from "@sillymaker/base/testkit";

import { createCatcafeApplicationInstanceV1 } from "../application/core-application.ts";

const fixtureRootV1 = resolve(import.meta.dirname, "..", "..", "fixtures", "saves");
const saveKeyV1 = "save-record.v1:story.example.cat-cafe:quick" as Parameters<
  HostAtomicRecordStoreV1["read"]
>[1];

interface JsonRecordV1 {
  [key: string]: unknown;
}

function decodeV1(bytes: Uint8Array): JsonRecordV1 {
  return JSON.parse(new TextDecoder().decode(bytes)) as JsonRecordV1;
}

async function readFixtureBytesV1(): Promise<Uint8Array> {
  return Uint8Array.from(
    await readFile(resolve(fixtureRootV1, "cat-cafe-state-1.save.json")),
  );
}

async function readAdmittedFixtureV1(): Promise<Uint8Array> {
  const descriptor = saveMigrationReleaseCorpusV1.find(({ id }) => id === "cat-cafe-state-1");
  if (descriptor === undefined) throw new TypeError("Cat Cafe release fixture is missing");
  return admitSaveMigrationReleaseFixtureV1(
    descriptor,
    await readFixtureBytesV1(),
  ).bytes;
}

async function seedV1(bytes: Uint8Array): Promise<HostAtomicRecordStoreV1> {
  const records = createMemoryHostRecordStoreV1();
  const result = await records.commit([{
    kind: "put",
    namespace: "save",
    key: saveKeyV1,
    expectedRevision: null,
    bytes,
  }]);
  if (result.kind !== "committed") throw new TypeError("failed to seed Cat Cafe release fixture");
  return records;
}

describe("Cat Cafe maintained Save migration release corpus", () => {
  it("admits revision 1 as the exact initial supported floor", async () => {
    const descriptors = saveMigrationReleaseCorpusV1.filter(({ productId }) =>
      productId === "cat-cafe"
    );
    expect(descriptors.map(({ id, storyId, stateContractRevision }) => ({
      id,
      storyId,
      stateContractRevision,
    }))).toEqual([{
      id: "cat-cafe-state-1",
      storyId: "story.example.cat-cafe",
      stateContractRevision: 1,
    }]);
    expect((await readdir(fixtureRootV1)).sort()).toEqual([
      "cat-cafe-state-1.save.json",
    ]);

    const descriptor = descriptors[0];
    if (descriptor === undefined) throw new TypeError("Cat Cafe release fixture is missing");
    const bytes = await readFixtureBytesV1();
    const admitted = admitSaveMigrationReleaseFixtureV1(descriptor, bytes);
    expect(admitted.descriptor).toBe(descriptor);
    expect([...admitted.bytes]).toEqual([...bytes]);
  });

  it("runs direct inspect, current validation/load, and a fresh Save round-trip", async () => {
    const source = await readAdmittedFixtureV1();
    const records = await seedV1(source);
    const application = await createCatcafeApplicationInstanceV1({ records });
    try {
      await expect(application.persistence.inspectSave("quick")).resolves.toMatchObject({
        kind: "direct",
        slotId: "quick",
      });
      await expect(application.persistence.upgradeSave("quick")).resolves.toEqual({
        kind: "rejected",
        code: "not_required",
      });
      await expect(application.persistence.load("quick")).resolves.toMatchObject({
        kind: "loaded",
        compatibility: "exact",
        commandSequence: 0,
      });
      expect(application.admin.inspectForTest().snapshot.state.simulation).toMatchObject({
        calendar: { week: 1, day: 0, slot: 0, stamina: 6 },
        cat: { trust: 10, vigor: 60 },
        shop: { money: 50, reputation: 10 },
      });

      await expect(application.persistence.save("quick")).resolves.toEqual({
        kind: "saved",
        slotId: "quick",
      });
      const exported = await application.persistence.exportSave("quick");
      if (exported.kind !== "exported") throw new TypeError("fresh Cat Cafe export failed");
      const fresh = decodeV1(exported.file.bytes);
      const provenance = fresh.provenance as JsonRecordV1;
      const resolved = provenance.resolved as JsonRecordV1;
      expect(resolved).toMatchObject({
        stateContractRevision: 1,
        stateContractDigest:
          "sha256:a0f26c983c47fa89b599141ae3d2b8e7653a8cd32533152d17e440bcafc8dd26",
      });
      expect(fresh.stateDigest).toBe(digestCanonical("sillymaker:state:v1", fresh.snapshot));
      await expect(application.persistence.inspectBackup("quick")).resolves.toMatchObject({
        kind: "rejected",
        code: "empty_backup",
      });
    } finally {
      await application.dispose();
    }
  });

  it("rejects a test-derived invalid record without changing its stored bytes", async () => {
    const source = await readAdmittedFixtureV1();
    const invalid = Uint8Array.from(source);
    invalid[invalid.byteLength - 1] = 91;
    const records = await seedV1(invalid);
    const application = await createCatcafeApplicationInstanceV1({ records });
    try {
      await expect(application.persistence.inspectSave("quick")).resolves.toMatchObject({
        kind: "rejected",
        code: "invalid_record",
      });
      await expect(application.persistence.load("quick")).resolves.toEqual({
        kind: "rejected",
        code: "invalid_record",
      });
      const stored = await records.read("save", saveKeyV1);
      if (stored === null) throw new TypeError("invalid Cat Cafe fixture disappeared");
      expect([...stored.bytes]).toEqual([...invalid]);
      await expect(application.persistence.inspectBackup("quick")).resolves.toMatchObject({
        kind: "rejected",
        code: "empty_backup",
      });
    } finally {
      await application.dispose();
    }
  });
});
