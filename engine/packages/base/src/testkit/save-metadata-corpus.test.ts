// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";

import { canonicalJsonBytes } from "../contracts/canonical-json.ts";
import { digestBytes, digestCanonical } from "../contracts/digest.ts";
import { parseIsoUtcInstantV1, saveJsonLimitsV1 } from "../contracts/persistence.ts";
import { parseStrictJson } from "../contracts/strict-json.ts";
import {
  createSaveMetadataHostPayloadV1,
  evaluateSaveMetadataCompactVectorsV1,
  saveMetadataCompactExpectedV1,
  saveMetadataCorpusRevisionV1,
} from "./index.ts";

function bytesFromBase64V1(encoded: string): Uint8Array {
  const binary = atob(encoded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

describe("shared Save metadata corpus", () => {
  it("publishes one revisioned compact corpus for later runtime and Host consumers", () => {
    expect(saveMetadataCorpusRevisionV1).toBe(1);
    expect(evaluateSaveMetadataCompactVectorsV1()).toEqual(saveMetadataCompactExpectedV1);
  });

  it("keeps absent and all-null metadata on the unchanged PF1 unstamped bytes", () => {
    const actual = evaluateSaveMetadataCompactVectorsV1();

    expect(actual.records.unstamped).toEqual({
      byteLength: 1_447,
      bytesDigest: "sha256:c69e007af552917ce7207bbab2e3ff8c21a1ece6f34af0ff60a22375b4e0cd83",
      bytesBase64: saveMetadataCompactExpectedV1.records.unstamped.bytesBase64,
    });
    expect(actual.records.allNullStamp).toEqual(actual.records.unstamped);
  });

  it("Strict-decodes every maintained byte vector without changing bytes or digests", () => {
    for (const [id, vector] of Object.entries(saveMetadataCompactExpectedV1.records)) {
      const bytes = bytesFromBase64V1(vector.bytesBase64);
      const decoded = parseStrictJson(bytes, saveJsonLimitsV1);
      expect(decoded, id).toMatchObject({ ok: true });
      if (!decoded.ok) throw new TypeError(`invalid maintained Save vector: ${id}`);

      expect(canonicalJsonBytes(decoded.value), id).toEqual(bytes);
      expect(digestBytes(bytes), id).toBe(vector.bytesDigest);
      const record = decoded.value as {
        readonly savedAt: unknown;
        readonly snapshot: unknown;
        readonly stateDigest: unknown;
      };
      expect(record.savedAt, id).toBe("2026-07-20T00:00:00.000Z");
      expect(parseIsoUtcInstantV1(record.savedAt), id).toBe(record.savedAt);
      expect(record.stateDigest, id).toBe(saveMetadataCompactExpectedV1.stateDigest);
      expect(digestCanonical("sillymaker:state:v1", record.snapshot), id).toBe(
        saveMetadataCompactExpectedV1.stateDigest,
      );
    }
  });

  it("normalizes and freezes compact summary and version-stamp values", () => {
    const actual = evaluateSaveMetadataCompactVectorsV1();

    expect(actual.summaries).toEqual({
      absent: null,
      nullValue: null,
      empty: null,
      valid: ["Checkpoint 7", "Neutral scene"],
    });
    expect(Object.isFrozen(actual.summaries.valid)).toBe(true);
    expect(actual.versionStamps).toEqual(saveMetadataCompactExpectedV1.versionStamps);
    for (const stamp of Object.values(actual.versionStamps)) {
      if (stamp !== null) expect(Object.isFrozen(stamp)).toBe(true);
    }
  });

  it("returns fresh exact Host payload bytes without claiming filename uniqueness", () => {
    const first = createSaveMetadataHostPayloadV1("summaryAndFullDirtyStamp");
    const second = createSaveMetadataHostPayloadV1("summaryAndFullDirtyStamp");

    expect(first).toMatchObject({
      filename: "neutral-save-20260720000000.json",
      mediaType: "application/json",
      digest: saveMetadataCompactExpectedV1.records.summaryAndFullDirtyStamp.bytesDigest,
    });
    expect(first.bytes).toEqual(second.bytes);
    expect(first.bytes).not.toBe(second.bytes);
    first.bytes[0] = 0;
    expect(second.bytes[0]).not.toBe(0);
  });
});
