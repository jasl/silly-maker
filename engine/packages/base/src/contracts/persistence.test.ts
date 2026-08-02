// SPDX-License-Identifier: MIT
import { describe, expect, it, vi } from "vitest";

import { digestBytes } from "./digest.ts";
import { versionStampGlobalKeyV1 } from "./version-stamp.ts";
import {
  createSaveRecordEnvelopeSchemaV1,
  exportedSaveSchemaV1,
  parseSaveAnnotationV1,
  parseSaveNoteV1,
  parseIsoUtcInstantV1,
  SaveRecordEnvelopeSchemaFailureV1,
  saveAnnotationLimitsV1,
  saveJsonLimitsV1,
  sessionLeaseStatusSchemaV1,
} from "./persistence.ts";
import type { RuntimeSchemaV1 } from "./values.ts";

const exactValueSchema = <T>(key: string): RuntimeSchemaV1<T> => ({
  parse(value) {
    if (
      value === null ||
      typeof value !== "object" ||
      Array.isArray(value) ||
      Object.getPrototypeOf(value) !== Object.prototype ||
      Object.keys(value).join() !== key
    ) {
      throw new TypeError(`invalid ${key}`);
    }
    return Object.freeze({ ...value }) as T;
  },
});

describe("persistence contracts", () => {
  it("owns B-prime UTC admission and preserves every accepted spelling", () => {
    const accepted = [
      "0000-02-29T00:00:00Z",
      "2000-02-29T00:00:00.123456789Z",
      "2026-12-31T24:00:00Z",
      "2026-12-31T24:00:00.0000Z",
      "9999-12-31T24:00:00Z",
    ];
    for (const value of accepted) expect(parseIsoUtcInstantV1(value)).toBe(value);

    const rejected = [
      "2023-02-29T00:00:00Z",
      "1900-02-29T00:00:00Z",
      "2026-02-30T00:00:00Z",
      "2026-02-30T24:00:00Z",
      "2026-04-31T00:00:00Z",
      "2026-12-31T24:00:00.000001Z",
      "2026-12-31T24:00:01Z",
      "2026-12-31T25:00:00Z",
      "2026-12-31T23:59:60Z",
      "2026-12-31T23:59:59.Z",
      "2026-12-31T23:59:59z",
      "2026-12-31T23:59:59+00:00",
      "+02026-12-31T23:59:59Z",
      "２０２６-12-31T23:59:59Z",
    ];
    for (const value of rejected) {
      expect(() => parseIsoUtcInstantV1(value), value).toThrowError("invalid IsoUtcInstant");
    }
    for (const value of [null, 0, new String("2026-07-12T01:02:03Z")]) {
      expect(() => parseIsoUtcInstantV1(value)).toThrowError("invalid IsoUtcInstant");
    }
  });

  it("does not consult the ambient Date parser", () => {
    const parse = vi.spyOn(Date, "parse").mockImplementation(() => {
      throw new Error("ambient Date.parse reached");
    });
    try {
      expect(parseIsoUtcInstantV1("2026-07-12T01:02:03.123456789Z")).toBe(
        "2026-07-12T01:02:03.123456789Z",
      );
      expect(parse).not.toHaveBeenCalled();
    } finally {
      parse.mockRestore();
    }
  });

  it("keeps Save exports closed and binds the exact bytes", () => {
    const bytes = Uint8Array.of(1);
    const valid = {
      filename: "slot.json",
      mediaType: "application/json",
      digest: digestBytes(bytes),
      bytes,
    };
    expect(exportedSaveSchemaV1.parse(valid)).toEqual(valid);
    expect(() => exportedSaveSchemaV1.parse({ ...valid, summary: {} })).toThrow();
    expect(() => exportedSaveSchemaV1.parse({ ...valid, digest: digestBytes(Uint8Array.of(2)) }))
      .toThrow();
  });

  it("carries owner and fencing state through every available lease branch", () => {
    expect(
      sessionLeaseStatusSchemaV1.parse({
        kind: "handoff_requested",
        ownerId: "owner-a",
        fencingToken: 3,
        requestId: "request-1",
        requestedByOwnerId: "owner-b",
      }),
    ).toMatchObject({ ownerId: "owner-a", fencingToken: 3 });
    expect(
      sessionLeaseStatusSchemaV1.parse({
        kind: "unowned",
        ownerId: null,
        fencingToken: 1,
      }),
    ).toEqual({ kind: "unowned", ownerId: null, fencingToken: 1 });
  });

  it("builds a strict Save record Schema from four specialization Schemas", () => {
    const schema = createSaveRecordEnvelopeSchemaV1(
      exactValueSchema<{ readonly snapshot: true }>("snapshot"),
      exactValueSchema<{ readonly provenance: true }>("provenance"),
      exactValueSchema<{ readonly slot: true }>("slot"),
      exactValueSchema<{ readonly lineage: true }>("lineage"),
    );
    const valid = {
      formatRevision: 1,
      recordRevision: 2,
      provenance: { provenance: true },
      slot: { slot: true },
      savedAt: "2026-07-12T01:02:03.000Z",
      stateDigest: digestBytes(Uint8Array.of(3)),
      snapshot: { snapshot: true },
      simulationLineage: { lineage: true },
    };
    expect(schema.parse(valid)).toEqual(valid);
    expect(() => schema.parse({ ...valid, extra: true })).toThrow();
    expect(() => schema.parse({ ...valid, savedAt: "2026-07-12" })).toThrow();
    expect(Object.isFrozen(schema.parse(valid))).toBe(true);

    // Annotation is additive-optional: legacy records (absent) and annotated
    // records both parse; a malformed annotation still fails closed.
    const annotated = {
      ...valid,
      annotation: { summary: ["3日目 19:30", "信赖 25"], note: "存主线前" },
    };
    expect(schema.parse(annotated)).toEqual(annotated);
    expect(schema.parse(valid)).not.toHaveProperty("annotation");
    expect(() => schema.parse({ ...valid, annotation: null })).toThrow();
    expect(() => schema.parse({ ...valid, annotation: { summary: null, note: null } })).toThrow();

    // The version stamp is additive-optional AND diagnostic-only: absent on
    // legacy records, round-tripped when valid, and malformed/all-null input
    // is omitted instead of rejecting an otherwise valid record.
    const stamped = {
      ...valid,
      versionStamp: {
        applicationVersion: "1.2.0",
        applicationCommit: "abc1234",
        engineVersion: "0.4.2",
        engineCommit: "def5678",
      },
    };
    expect(schema.parse(stamped)).toEqual(stamped);
    expect(schema.parse(valid)).not.toHaveProperty("versionStamp");
    expect(schema.parse({ ...valid, versionStamp: "garbage" })).not.toHaveProperty("versionStamp");
    expect(
      schema.parse({
        ...valid,
        versionStamp: {
          applicationVersion: null,
          applicationCommit: null,
          engineVersion: null,
          engineCommit: null,
        },
      }),
    ).not.toHaveProperty("versionStamp");

    // Explicit wire `undefined` is never confused with the ambient build
    // stamp used by readVersionStampV1().
    Reflect.set(globalThis, versionStampGlobalKeyV1, stamped.versionStamp);
    try {
      expect(schema.parse({ ...valid, versionStamp: undefined })).not.toHaveProperty(
        "versionStamp",
      );
    } finally {
      Reflect.deleteProperty(globalThis, versionStampGlobalKeyV1);
    }

    for (
      const [value, code] of [
        [{ ...valid, formatRevision: 2 }, "envelope.unsupported_revision"],
        [{ ...valid, stateDigest: "not-a-digest" }, "digest.invalid_format"],
      ] as const
    ) {
      try {
        schema.parse(value);
        throw new TypeError("expected tagged envelope failure");
      } catch (error) {
        expect(error).toBeInstanceOf(SaveRecordEnvelopeSchemaFailureV1);
        expect(error).toMatchObject({ code });
      }
    }
    expect(() => schema.parse({ ...valid, formatRevision: 0 })).toThrow(TypeError);
  });

  it("bounds Save annotations and normalizes player notes", () => {
    expect(saveAnnotationLimitsV1).toEqual({
      maxSummaryLines: 8,
      maxSummaryLineLength: 120,
      maxNoteLength: 64,
    });

    const annotation = parseSaveAnnotationV1({ summary: ["line 1"], note: null });
    expect(annotation).toEqual({ summary: ["line 1"], note: null });
    expect(Object.isFrozen(annotation)).toBe(true);
    expect(parseSaveAnnotationV1({ summary: null, note: "note" })).toEqual({
      summary: null,
      note: "note",
    });

    expect(() => parseSaveAnnotationV1({ summary: [], note: null })).toThrow();
    expect(() => parseSaveAnnotationV1({ summary: Array(9).fill("x"), note: null })).toThrow();
    expect(() => parseSaveAnnotationV1({ summary: ["a\nb"], note: null })).toThrow();
    expect(() => parseSaveAnnotationV1({ summary: ["x".repeat(121)], note: null })).toThrow();
    const sparseSummary = Array<string>(1);
    expect(() => parseSaveAnnotationV1({ summary: sparseSummary, note: null })).toThrow();
    const accessorSummary = ["line"];
    Object.defineProperty(accessorSummary, "0", {
      enumerable: true,
      configurable: true,
      get: () => "accessed",
    });
    expect(() => parseSaveAnnotationV1({ summary: accessorSummary, note: null })).toThrow();
    expect(() => parseSaveAnnotationV1({ summary: null, note: "x".repeat(65) })).toThrow();
    expect(() => parseSaveAnnotationV1({ summary: null, note: "   " })).toThrow();
    expect(() => parseSaveAnnotationV1({ summary: null, note: " note " })).toThrow();
    expect(() => parseSaveAnnotationV1({ summary: null, note: null })).toThrow();
    expect(() => parseSaveAnnotationV1({ summary: null })).toThrow();

    expect(parseSaveNoteV1("  ")).toBeNull();
    expect(parseSaveNoteV1(" 备注 ")).toBe("备注");
    // Astral characters count as one: 32 emoji fit inside the 64 cap.
    expect(parseSaveNoteV1("😀".repeat(32))).toBe("😀".repeat(32));
    expect(() => parseSaveNoteV1("😀".repeat(65))).toThrow();
    expect(() => parseSaveNoteV1("a\u0007b")).toThrow();
  });

  it("freezes the reviewed Save limits", () => {
    expect(saveJsonLimitsV1).toEqual({
      maxBytes: 5_242_880,
      maxDepth: 64,
      maxArrayItems: 10_000,
      maxObjectMembers: 10_000,
      maxNodes: 100_000,
      maxStringBytes: 262_144,
    });
  });
});
