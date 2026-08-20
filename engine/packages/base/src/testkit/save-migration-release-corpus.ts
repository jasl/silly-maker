// SPDX-License-Identifier: MIT
import { canonicalJsonBytes } from "../contracts/canonical-json.ts";
import { digestBytes, digestCanonical } from "../contracts/digest.ts";
import { saveJsonLimitsV1 } from "../contracts/persistence.ts";
import { parseStrictJson } from "../contracts/strict-json.ts";
import type { Digest, PositiveSafeInteger } from "../contracts/values.ts";
import { parseDigest, parsePositiveSafeInteger } from "../contracts/values.ts";

export const saveMigrationReleaseCorpusRevisionV1 = 1 as const;

export type SaveMigrationReleaseFixtureIdV1 =
  | "engine-lab-state-3"
  | "engine-lab-state-4"
  | "engine-lab-state-5"
  | "cat-cafe-state-1";

export type SaveMigrationReleaseProductIdV1 = "engine-lab" | "cat-cafe";

export interface SaveMigrationReleaseFixtureDescriptorV1 {
  readonly id: SaveMigrationReleaseFixtureIdV1;
  readonly productId: SaveMigrationReleaseProductIdV1;
  readonly storyId: string;
  readonly stateContractRevision: PositiveSafeInteger;
  readonly stateContractDigest: Digest;
  readonly byteLength: PositiveSafeInteger;
  readonly bytesDigest: Digest;
}

export interface AdmittedSaveMigrationReleaseFixtureV1 {
  readonly descriptor: SaveMigrationReleaseFixtureDescriptorV1;
  /** A fresh copy of the checked-in immutable fixture bytes. */
  readonly bytes: Uint8Array;
}

function descriptorV1(input: {
  readonly id: SaveMigrationReleaseFixtureIdV1;
  readonly productId: SaveMigrationReleaseProductIdV1;
  readonly storyId: string;
  readonly stateContractRevision: number;
  readonly stateContractDigest: string;
  readonly byteLength: number;
  readonly bytesDigest: string;
}): SaveMigrationReleaseFixtureDescriptorV1 {
  return Object.freeze({
    id: input.id,
    productId: input.productId,
    storyId: input.storyId,
    stateContractRevision: parsePositiveSafeInteger(input.stateContractRevision),
    stateContractDigest: parseDigest(input.stateContractDigest),
    byteLength: parsePositiveSafeInteger(input.byteLength),
    bytesDigest: parseDigest(input.bytesDigest),
  });
}

/** The complete maintained product Save compatibility inventory. */
export const saveMigrationReleaseCorpusV1: readonly SaveMigrationReleaseFixtureDescriptorV1[] =
  Object.freeze([
    descriptorV1({
      id: "engine-lab-state-3",
      productId: "engine-lab",
      storyId: "story.e2e.engine-lab",
      stateContractRevision: 3,
      stateContractDigest:
        "sha256:15b2ba494428229ab0354ed2e3668b56046a6c3f340569872d07f78db7193f64",
      byteLength: 2_163,
      bytesDigest: "sha256:40501b972311e8017c848b5b35c41a35f5477ebd86349eba860afae048c72441",
    }),
    descriptorV1({
      id: "engine-lab-state-4",
      productId: "engine-lab",
      storyId: "story.e2e.engine-lab",
      stateContractRevision: 4,
      stateContractDigest:
        "sha256:42d426e6fb95566cf38787ee1de8c32f853b1e3eb4a16003c05fbfb109408667",
      byteLength: 2_188,
      bytesDigest: "sha256:5102ea13437a52339d560992bb5a69f110b3c980d53676cfae044c7130b66ee0",
    }),
    descriptorV1({
      id: "engine-lab-state-5",
      productId: "engine-lab",
      storyId: "story.e2e.engine-lab",
      stateContractRevision: 5,
      stateContractDigest:
        "sha256:c6407d9e0b5bd4d93fbe6e54d61fc62f59d209892d71a663a70190a4970735e3",
      byteLength: 2_246,
      bytesDigest: "sha256:0777542fbe7cf777a4ae81e5edc5e70cdd3ebe2425dfc85578cb4ffadb7ecccf",
    }),
    descriptorV1({
      id: "cat-cafe-state-1",
      productId: "cat-cafe",
      storyId: "story.example.cat-cafe",
      stateContractRevision: 1,
      stateContractDigest:
        "sha256:a0f26c983c47fa89b599141ae3d2b8e7653a8cd32533152d17e440bcafc8dd26",
      byteLength: 2_092,
      bytesDigest: "sha256:5c5eb77ae42a964cb4a8925450e174399d2d70db761e17b865e9c03bcaa3e479",
    }),
  ]);

function sameBytesV1(left: Uint8Array, right: Uint8Array): boolean {
  return left.byteLength === right.byteLength && left.every((byte, index) => byte === right[index]);
}

function readRecordIdentityV1(value: unknown): {
  readonly formatRevision: unknown;
  readonly storyId: unknown;
  readonly stateContractRevision: unknown;
  readonly stateContractDigest: unknown;
  readonly stateDigest: unknown;
  readonly snapshot: unknown;
} | null {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return null;
  const provenance = Reflect.get(value, "provenance");
  if (provenance === null || typeof provenance !== "object" || Array.isArray(provenance)) {
    return null;
  }
  const resolved = Reflect.get(provenance, "resolved");
  if (resolved === null || typeof resolved !== "object" || Array.isArray(resolved)) return null;
  return Object.freeze({
    formatRevision: Reflect.get(value, "formatRevision"),
    storyId: Reflect.get(Reflect.get(provenance, "story"), "id"),
    stateContractRevision: Reflect.get(resolved, "stateContractRevision"),
    stateContractDigest: Reflect.get(resolved, "stateContractDigest"),
    stateDigest: Reflect.get(value, "stateDigest"),
    snapshot: Reflect.get(value, "snapshot"),
  });
}

/**
 * Admits one checked-in release fixture without discovering files or generating
 * bytes. Product suites remain the sole owners of file inventory and lifecycle.
 */
export function admitSaveMigrationReleaseFixtureV1(
  descriptor: SaveMigrationReleaseFixtureDescriptorV1,
  bytes: Uint8Array,
): AdmittedSaveMigrationReleaseFixtureV1 {
  if (bytes.byteLength !== descriptor.byteLength) {
    throw new TypeError("Save migration release fixture byte length mismatch");
  }
  if (digestBytes(bytes) !== descriptor.bytesDigest) {
    throw new TypeError("Save migration release fixture bytes digest mismatch");
  }
  const decoded = parseStrictJson(bytes, saveJsonLimitsV1);
  if (!decoded.ok) throw new TypeError("Save migration release fixture is not Strict JSON");
  if (!sameBytesV1(canonicalJsonBytes(decoded.value), bytes)) {
    throw new TypeError("Save migration release fixture bytes are not canonical JSON");
  }
  const identity = readRecordIdentityV1(decoded.value);
  if (
    identity === null || identity.formatRevision !== 1 ||
    identity.storyId !== descriptor.storyId ||
    identity.stateContractRevision !== descriptor.stateContractRevision ||
    identity.stateContractDigest !== descriptor.stateContractDigest ||
    identity.stateDigest !== digestCanonical("sillymaker:state:v1", identity.snapshot)
  ) {
    throw new TypeError("Save migration release fixture identity mismatch");
  }
  return Object.freeze({ descriptor, bytes: Uint8Array.from(bytes) });
}
