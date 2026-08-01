// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";

import { canonicalJsonBytes } from "../contracts/canonical-json.ts";
import { digestBytes, digestCanonical } from "../contracts/digest.ts";
import {
  createRngZeroStateSaveBytesV1,
  createRngZeroStateSnapshotBytesV1,
  rngZeroStateSaveOracleV1,
  rngZeroStateSnapshotOracleV1,
} from "./rng-zero-state-fixture.ts";

function expectExactOracleV1(
  bytes: Uint8Array,
  oracle: { readonly byteLength: number; readonly bytesDigest: string },
): void {
  expect(bytes.byteLength).toBe(oracle.byteLength);
  expect(digestBytes(bytes)).toBe(oracle.bytesDigest);
}

describe("DET1 fixed zero-state inputs", () => {
  it("keeps the correctly digested Save bytes independent of the green codec", () => {
    const bytes = createRngZeroStateSaveBytesV1();
    const snapshotBytes = createRngZeroStateSnapshotBytesV1();
    expectExactOracleV1(bytes, rngZeroStateSaveOracleV1);
    const record = JSON.parse(new TextDecoder().decode(bytes));
    expect(record).toMatchObject({
      slot: { slotId: "auto.current", writeReason: "auto" },
      snapshot: {
        commandSequence: 0,
        rng: { algorithm: "xorshift32-v1", cursor: 0, rawDrawCount: 0 },
      },
      stateDigest: "sha256:0b8ce31faf5875e7897e65ea40233d01e9a47942431b50ced208c7c9593772b6",
    });
    expect(canonicalJsonBytes(record.snapshot)).toEqual(snapshotBytes);
    expect(digestCanonical("sillymaker:state:v1", record.snapshot)).toBe(record.stateDigest);
  });

  it("keeps the raw debug-anchor Snapshot bytes independent of the green schema", () => {
    const bytes = createRngZeroStateSnapshotBytesV1();
    expectExactOracleV1(bytes, rngZeroStateSnapshotOracleV1);
    expect(JSON.parse(new TextDecoder().decode(bytes))).toEqual({
      commandSequence: 0,
      integrity: {
        firstMutationSequence: null,
        mode: "normal",
        mutationCount: 0,
        reasons: [],
      },
      rng: { algorithm: "xorshift32-v1", cursor: 0, rawDrawCount: 0 },
      state: { simulation: { counter: { count: 0 } } },
    });
  });
});
