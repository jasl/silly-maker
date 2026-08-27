// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";

import { digestBytes } from "../contracts/digest.ts";

import {
  admitSaveMigrationReleaseFixtureV1,
  saveMigrationReleaseCorpusRevisionV1,
  saveMigrationReleaseCorpusV1,
} from "./save-migration-release-corpus.ts";

const canonicalFixtureV1 = new TextEncoder().encode(
  '{"formatRevision":1,"provenance":{"resolved":{"stateContractDigest":"sha256:15b2ba494428229ab0354ed2e3668b56046a6c3f340569872d07f78db7193f64","stateContractRevision":3},"story":{"id":"story.e2e.engine-lab"}},"snapshot":{},"stateDigest":"sha256:3b40ae54b13b0665765cc754eaf10f71fcf2897ad8aee3a9ac95e4f291610b5c"}',
);

describe("Save migration release corpus", () => {
  it("publishes one descriptor for every admitted product revision", () => {
    expect(saveMigrationReleaseCorpusRevisionV1).toBe(1);
    expect(saveMigrationReleaseCorpusV1.map(({ id }) => id)).toEqual([
      "engine-lab-state-3",
      "engine-lab-state-4",
      "engine-lab-state-5",
      "engine-lab-state-6",
    ]);
    for (const descriptor of saveMigrationReleaseCorpusV1) {
      expect(descriptor.byteLength, descriptor.id).toBeGreaterThan(0);
      expect(descriptor.bytesDigest, descriptor.id).toMatch(/^sha256:[0-9a-f]{64}$/u);
      expect(descriptor.stateContractDigest, descriptor.id).toMatch(
        /^sha256:[0-9a-f]{64}$/u,
      );
    }
  });

  it("admits only exact canonical bytes and returns a fresh defensive copy", () => {
    const descriptor = saveMigrationReleaseCorpusV1[0];
    if (descriptor === undefined) throw new TypeError("release corpus is empty");
    const admittedDescriptor = {
      ...descriptor,
      byteLength: canonicalFixtureV1.byteLength as typeof descriptor.byteLength,
      bytesDigest:
        "sha256:0a9f5973c50a64415f208ac1b20c81cc048a432dffa941f029d0738ddb723f2a" as typeof descriptor.bytesDigest,
    };
    const first = admitSaveMigrationReleaseFixtureV1(admittedDescriptor, canonicalFixtureV1);
    const second = admitSaveMigrationReleaseFixtureV1(admittedDescriptor, canonicalFixtureV1);
    expect(first.bytes).toEqual(Uint8Array.from(canonicalFixtureV1));
    expect(first.bytes).not.toBe(second.bytes);
    first.bytes[0] = 0;
    expect(second.bytes[0]).toBe(123);

    const invalid = new TextEncoder().encode("{}");

    expect(() => admitSaveMigrationReleaseFixtureV1(descriptor, invalid)).toThrow(
      "Save migration release fixture byte length mismatch",
    );
    const tampered = Uint8Array.from(canonicalFixtureV1);
    tampered[0] = 91;
    expect(() => admitSaveMigrationReleaseFixtureV1(admittedDescriptor, tampered)).toThrow(
      "Save migration release fixture bytes digest mismatch",
    );

    const noncanonical = new TextEncoder().encode(
      JSON.stringify(JSON.parse(new TextDecoder().decode(canonicalFixtureV1)), null, 2),
    );
    const noncanonicalDescriptor = {
      ...admittedDescriptor,
      byteLength: noncanonical.byteLength as typeof admittedDescriptor.byteLength,
      bytesDigest: digestBytes(noncanonical),
    };
    expect(() => admitSaveMigrationReleaseFixtureV1(noncanonicalDescriptor, noncanonical)).toThrow(
      "Save migration release fixture bytes are not canonical JSON",
    );
  });
});
