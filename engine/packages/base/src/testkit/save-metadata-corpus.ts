// SPDX-License-Identifier: MIT
import { digestBytes } from "../contracts/digest.ts";
import type {
  SaveAnnotationV1,
  SaveCodecContextV1,
  SaveRecordEnvelopeV1,
} from "../contracts/persistence.ts";
import {
  createSaveRecordEnvelopeSchemaV1,
  normalizeSaveSummaryInternalV1,
  parseSaveNoteV1,
} from "../contracts/persistence.ts";
import type { VersionStampV1 } from "../contracts/version-stamp.ts";
import { normalizeVersionStampInternalV1 } from "../contracts/version-stamp.ts";
import type { DeepReadonly, Digest, RuntimeSchemaV1 } from "../contracts/values.ts";
import { encodeSaveRecordV1 } from "../runtime/persistence/save-codec.ts";

export const saveMetadataCorpusRevisionV1 = 1 as const;

export type SaveMetadataCompactRecordIdV1 =
  | "unstamped"
  | "allNullStamp"
  | "summaryOnly"
  | "noteOnly"
  | "summaryAndNote"
  | "partialStamp"
  | "fullCleanStamp"
  | "fullDirtyStamp"
  | "statusUnavailableStamp"
  | "summaryAndFullDirtyStamp";

export interface SaveMetadataCompactByteVectorV1 {
  readonly byteLength: number;
  readonly bytesDigest: Digest;
  /** Lossless immutable representation of the exact UTF-8 Save bytes. */
  readonly bytesBase64: string;
}

export interface SaveMetadataCompactVectorsV1 {
  readonly summaries: {
    readonly absent: null;
    readonly nullValue: null;
    readonly empty: null;
    readonly valid: readonly string[];
  };
  readonly versionStamps: {
    readonly absent: null;
    readonly allNull: null;
    readonly partial: VersionStampV1;
    readonly fullClean: VersionStampV1;
    readonly fullDirty: VersionStampV1;
    readonly statusUnavailable: VersionStampV1;
    readonly malformed: null;
    readonly accessor: null;
    readonly hostileProxy: null;
  };
  readonly stateDigest: Digest;
  readonly records: Readonly<
    Record<SaveMetadataCompactRecordIdV1, SaveMetadataCompactByteVectorV1>
  >;
}

const textEncoderV1 = new TextEncoder();
const textDecoderV1 = new TextDecoder();

function bytesFromBase64V1(encoded: string): Uint8Array {
  const binary = atob(encoded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function bytesToBase64V1(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

// The PF1 oracle was derived at 96a0a93. Its raw bytes were promoted at the
// M0a parent cccca26 only after the existing 1,447-byte / c69e...cd83 evidence
// matched, so the historical oracle was neither regenerated nor changed.
const pf1UnstampedSaveBase64V1 = [
  "eyJmb3JtYXRSZXZpc2lvbiI6MSwicHJvdmVuYW5jZSI6eyJlbmdpbmUiOnsiZGlnZXN0Ijoic2hhMjU2OjAyOGY4NWI4YmI5",
  "YmViNWI5ZWZkNDZkM2I3Y2UyODdlYzVjYTcyNjM4MWEyMWY1ZmJiNjI4NjUxMjY3ZTM3ZjAiLCJ2ZXJzaW9uIjoiU2lsbHlN",
  "YWtlciBzeW50aGV0aWMtdGVzdCJ9LCJyZXNvbHZlZCI6eyJwYXRjaFNldCI6eyJhcHBsaWVkSG90Zml4ZXMiOltdLCJkaWdl",
  "c3QiOiJzaGEyNTY6MDc1ZTRhMzc1MzMxOTM0MWY5Nzc3NTZiNzg2YjM0MjMwMzhiNjYxMGM3YzJjZjU3ZGY1MWQzZGVkNTcw",
  "MTk4OCIsInByZXNlbnRhdGlvbkRpZ2VzdCI6InNoYTI1NjowNzVlNGEzNzUzMzE5MzQxZjk3Nzc1NmI3ODZiMzQyMzAzOGI2",
  "NjEwYzdjMmNmNTdkZjUxZDNkZWQ1NzAxOTg4Iiwic2ltdWxhdGlvbkRpZ2VzdCI6InNoYTI1NjowNzVlNGEzNzUzMzE5MzQx",
  "Zjk3Nzc1NmI3ODZiMzQyMzAzOGI2NjEwYzdjMmNmNTdkZjUxZDNkZWQ1NzAxOTg4In0sInByZXNlbnRhdGlvbkRpZ2VzdCI6",
  "InNoYTI1NjpkNWU0ZGM4MGMxZTAyMTA4NjNjODk2NDYwMjE2ZDNiNGE3MTFmZDg4NDUzNWRjMGVmNzkyNDgzYWY3ZWNiNTFl",
  "Iiwic2ltdWxhdGlvbkRpZ2VzdCI6InNoYTI1NjpjODQyNGE5ODA4ZDQyZWU1MjFmZWEwNDUzMTc3MTZhMWViNTlkNGE0MzJh",
  "NGQyYzQ4YzJhNzgxYzMyODQ5YmRlIiwic3RhdGVDb250cmFjdERpZ2VzdCI6InNoYTI1NjozMTE5MjFmZmIyYzQ2NzQyZTEy",
  "Njg4YjJhMjVlZWU0ZTlkOGZlNzg5MjhmZDI0MDI5NmQ4ZjUzNjhhMjY1N2Q0Iiwic3RhdGVDb250cmFjdFJldmlzaW9uIjox",
  "fSwic3RvcnkiOnsiZGlnZXN0Ijoic2hhMjU2OjQ0MDhiOGI4M2MwMTJjOWFkODg4ZTFmYTNiNGI0Nzg1YTA0NDkwODUzOTZj",
  "NTk0YTc5NTRjYmYzN2QxZGI2NzYiLCJpZCI6InN0b3J5LnN5bnRoZXRpYy1jb3VudGVyIiwicmV2aXNpb24iOjF9fSwicmVj",
  "b3JkUmV2aXNpb24iOjEsInNhdmVkQXQiOiIyMDI2LTA3LTIwVDAwOjAwOjAwLjAwMFoiLCJzaW11bGF0aW9uTGluZWFnZSI6",
  "W10sInNsb3QiOnsiY2FwdHVyZWRDb21tYW5kU2VxdWVuY2UiOjAsInNsb3RJZCI6InF1aWNrIiwic3RvcnlJZCI6InN0b3J5",
  "LnN5bnRoZXRpYy1jb3VudGVyIiwid3JpdGVSZWFzb24iOiJxdWljayJ9LCJzbmFwc2hvdCI6eyJjb21tYW5kU2VxdWVuY2Ui",
  "OjAsImludGVncml0eSI6eyJmaXJzdE11dGF0aW9uU2VxdWVuY2UiOm51bGwsIm1vZGUiOiJub3JtYWwiLCJtdXRhdGlvbkNv",
  "dW50IjowLCJyZWFzb25zIjpbXX0sInJuZyI6eyJhbGdvcml0aG0iOiJ4b3JzaGlmdDMyLXYxIiwiY3Vyc29yIjoxMDEsInJh",
  "d0RyYXdDb3VudCI6MH0sInN0YXRlIjp7InNpbXVsYXRpb24iOnsiY291bnRlciI6eyJjb3VudCI6MH19fX0sInN0YXRlRGln",
  "ZXN0Ijoic2hhMjU2OmM4N2VlZWEwNDY5YmQzNTNkZjI5YTk3Yjg0ZTc3M2ZiZmZhNWIwYTY2MTg4ODM0MmU0NjIwMzUzODM5",
  "Mzc5YTUifQ==",
].join("");
const pf1UnstampedSaveTextV1 = textDecoderV1.decode(
  bytesFromBase64V1(pf1UnstampedSaveBase64V1),
);

const summaryLinesV1 = Object.freeze(["Checkpoint 7", "Neutral scene"]);
const partialStampV1 = Object.freeze({
  applicationVersion: "1.2.0",
  applicationCommit: null,
  engineVersion: null,
  engineCommit: null,
}) satisfies VersionStampV1;
const fullCleanStampV1 = Object.freeze({
  applicationVersion: "1.2.0",
  applicationCommit: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  engineVersion: "0.4.2",
  engineCommit: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
}) satisfies VersionStampV1;
const fullDirtyStampV1 = Object.freeze({
  applicationVersion: "1.2.0",
  applicationCommit: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa-dirty",
  engineVersion: "0.4.2",
  engineCommit: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb-dirty",
}) satisfies VersionStampV1;
const statusUnavailableStampV1 = Object.freeze({
  applicationVersion: "1.2.0",
  applicationCommit: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa-dirty",
  engineVersion: "0.4.2",
  engineCommit: null,
}) satisfies VersionStampV1;

const summaryOnlyJsonV1 = '{"note":null,"summary":["Checkpoint 7","Neutral scene"]}';
const noteOnlyJsonV1 = '{"note":"player checkpoint","summary":null}';
const summaryAndNoteJsonV1 =
  '{"note":"player checkpoint","summary":["Checkpoint 7","Neutral scene"]}';
const partialStampJsonV1 =
  '{"applicationCommit":null,"applicationVersion":"1.2.0","engineCommit":null,"engineVersion":null}';
const fullCleanStampJsonV1 =
  '{"applicationCommit":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","applicationVersion":"1.2.0","engineCommit":"bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb","engineVersion":"0.4.2"}';
const fullDirtyStampJsonV1 =
  '{"applicationCommit":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa-dirty","applicationVersion":"1.2.0","engineCommit":"bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb-dirty","engineVersion":"0.4.2"}';
const statusUnavailableStampJsonV1 =
  '{"applicationCommit":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa-dirty","applicationVersion":"1.2.0","engineCommit":null,"engineVersion":"0.4.2"}';

function expectedRecordTextV1(
  annotationJson: string | null,
  versionStampJson: string | null,
): string {
  let text = pf1UnstampedSaveTextV1;
  if (annotationJson !== null) {
    text = `{"annotation":${annotationJson},${text.slice(1)}`;
  }
  if (versionStampJson !== null) {
    text = `${text.slice(0, -1)},"versionStamp":${versionStampJson}}`;
  }
  return text;
}

function expectedByteVectorV1(
  text: string,
  byteLength: number,
  bytesDigest: Digest,
): SaveMetadataCompactByteVectorV1 {
  const bytes = textEncoderV1.encode(text);
  if (bytes.byteLength !== byteLength) {
    throw new TypeError("invalid maintained Save metadata byte length");
  }
  return Object.freeze({
    byteLength,
    bytesDigest,
    bytesBase64: bytesToBase64V1(bytes),
  });
}

const expectedUnstampedV1 = expectedByteVectorV1(
  pf1UnstampedSaveTextV1,
  1_447,
  "sha256:c69e007af552917ce7207bbab2e3ff8c21a1ece6f34af0ff60a22375b4e0cd83" as Digest,
);

export const saveMetadataCompactExpectedV1: SaveMetadataCompactVectorsV1 = Object.freeze({
  summaries: Object.freeze({
    absent: null,
    nullValue: null,
    empty: null,
    valid: summaryLinesV1,
  }),
  versionStamps: Object.freeze({
    absent: null,
    allNull: null,
    partial: partialStampV1,
    fullClean: fullCleanStampV1,
    fullDirty: fullDirtyStampV1,
    statusUnavailable: statusUnavailableStampV1,
    malformed: null,
    accessor: null,
    hostileProxy: null,
  }),
  stateDigest: "sha256:c87eeea0469bd353df29a97b84e773fbffa5b0a661888342e4620353839379a5" as Digest,
  records: Object.freeze({
    unstamped: expectedUnstampedV1,
    allNullStamp: expectedUnstampedV1,
    summaryOnly: expectedByteVectorV1(
      expectedRecordTextV1(summaryOnlyJsonV1, null),
      1_517,
      "sha256:2079b3fa038abf6dc7adc2309a476294dc4461d7183c93fbcda78fd30656e839" as Digest,
    ),
    noteOnly: expectedByteVectorV1(
      expectedRecordTextV1(noteOnlyJsonV1, null),
      1_504,
      "sha256:8c0c6b1e3db6d3658aba554d376ae564d03a8f90d44078707fed0ec70bb4e142" as Digest,
    ),
    summaryAndNote: expectedByteVectorV1(
      expectedRecordTextV1(summaryAndNoteJsonV1, null),
      1_532,
      "sha256:5967b7572841cea0d933e66c626b35984892370ecd0610e7086808d290e66659" as Digest,
    ),
    partialStamp: expectedByteVectorV1(
      expectedRecordTextV1(null, partialStampJsonV1),
      1_559,
      "sha256:537d5c785bfba490040b3e34ae33d70694edea4d0435b60e31b0485e897d89d3" as Digest,
    ),
    fullCleanStamp: expectedByteVectorV1(
      expectedRecordTextV1(null, fullCleanStampJsonV1),
      1_638,
      "sha256:062458d80eb8b8e96326827db5e8cc8b8ac80fdcf7fe7e4d1c8765fbbfdadb04" as Digest,
    ),
    fullDirtyStamp: expectedByteVectorV1(
      expectedRecordTextV1(null, fullDirtyStampJsonV1),
      1_650,
      "sha256:c7d853587182247259fcf2b337c5102f18dd90e8876c82e539bdd723554c91e2" as Digest,
    ),
    statusUnavailableStamp: expectedByteVectorV1(
      expectedRecordTextV1(null, statusUnavailableStampJsonV1),
      1_606,
      "sha256:884bb5fa9cdcba9d088a14240a54220730ce6dfd43722c1e65d3dc3ef77213d4" as Digest,
    ),
    summaryAndFullDirtyStamp: expectedByteVectorV1(
      expectedRecordTextV1(summaryAndNoteJsonV1, fullDirtyStampJsonV1),
      1_735,
      "sha256:eb62ceff1033406fe850515bbb0d04de0aa6662d873984de5820a780c2eefcd0" as Digest,
    ),
  }),
});

type NeutralSaveRecordV1 = SaveRecordEnvelopeV1<unknown, unknown, unknown, unknown>;

const passthroughSchemaV1: RuntimeSchemaV1<unknown> = Object.freeze({
  parse(value: unknown) {
    return value;
  },
});
const neutralRecordSchemaV1 = createSaveRecordEnvelopeSchemaV1(
  passthroughSchemaV1,
  passthroughSchemaV1,
  passthroughSchemaV1,
  passthroughSchemaV1,
);
const neutralCodecV1: SaveCodecContextV1<unknown, NeutralSaveRecordV1> = Object.freeze({
  recordSchema: neutralRecordSchemaV1,
  validateEnvelope() {},
});

function baseRecordV1(): NeutralSaveRecordV1 {
  return neutralRecordSchemaV1.parse(JSON.parse(pf1UnstampedSaveTextV1));
}

function recordVectorV1(
  annotation: SaveAnnotationV1 | null,
  versionStamp: VersionStampV1 | null,
): SaveMetadataCompactByteVectorV1 {
  const bytes = encodeSaveRecordV1(
    neutralRecordSchemaV1.parse({
      ...baseRecordV1(),
      ...(annotation === null ? {} : { annotation }),
      ...(versionStamp === null ? {} : { versionStamp }),
    }) as DeepReadonly<NeutralSaveRecordV1>,
    neutralCodecV1,
  );
  return Object.freeze({
    byteLength: bytes.byteLength,
    bytesDigest: digestBytes(bytes),
    bytesBase64: bytesToBase64V1(bytes),
  });
}

function normalizedStampV1(value: unknown): VersionStampV1 | null {
  return normalizeVersionStampInternalV1(value);
}

function requireStampV1(value: VersionStampV1 | null, label: string): VersionStampV1 {
  if (value === null) throw new TypeError(`missing normalized ${label} version stamp`);
  return value;
}

function requireNoteV1(value: string | null): string {
  if (value === null) throw new TypeError("missing normalized Save note");
  return value;
}

function requireNullV1(value: unknown, label: string): null {
  if (value !== null) throw new TypeError(`expected absent ${label}`);
  return null;
}

export function evaluateSaveMetadataCompactVectorsV1(): SaveMetadataCompactVectorsV1 {
  const sourceSummary = ["Checkpoint 7", "Neutral scene"];
  const validSummary = normalizeSaveSummaryInternalV1(sourceSummary);
  if (validSummary === null) throw new TypeError("missing normalized Save summary");
  sourceSummary[0] = "mutated after normalization";

  const allNullStamp = requireNullV1(
    normalizedStampV1({
      applicationVersion: null,
      applicationCommit: null,
      engineVersion: null,
      engineCommit: null,
    }),
    "all-null version stamp",
  );
  const partialStamp = requireStampV1(
    normalizedStampV1({ applicationVersion: " 1.2.0 " }),
    "partial",
  );
  const fullCleanStamp = requireStampV1(normalizedStampV1({ ...fullCleanStampV1 }), "full clean");
  const fullDirtyStamp = requireStampV1(normalizedStampV1({ ...fullDirtyStampV1 }), "full dirty");
  const statusUnavailableStamp = requireStampV1(
    normalizedStampV1({ ...statusUnavailableStampV1 }),
    "status unavailable",
  );
  const malformedStamp = requireNullV1(
    normalizedStampV1({
      applicationVersion: 1,
      applicationCommit: "x".repeat(129),
      engineVersion: "bad\u0007value",
      engineCommit: undefined,
    }),
    "malformed version stamp",
  );
  let accessorReads = 0;
  const accessorStamp = Object.create(null) as Record<string, unknown>;
  Object.defineProperty(accessorStamp, "applicationVersion", {
    enumerable: true,
    get() {
      accessorReads += 1;
      return "must-not-run";
    },
  });
  const normalizedAccessorStamp = requireNullV1(
    normalizedStampV1(accessorStamp),
    "accessor version stamp",
  );
  if (accessorReads !== 0) throw new TypeError("version stamp accessor was invoked");
  const hostileProxyStamp = requireNullV1(
    normalizedStampV1(
      new Proxy({}, {
        getOwnPropertyDescriptor() {
          throw new Error("hostile descriptor trap");
        },
      }),
    ),
    "hostile Proxy version stamp",
  );
  const summaryOnly = Object.freeze({ summary: validSummary, note: null });
  const noteOnly = Object.freeze({
    summary: null,
    note: requireNoteV1(parseSaveNoteV1(" player checkpoint ")),
  });
  const summaryAndNote = Object.freeze({
    summary: validSummary,
    note: noteOnly.note,
  });

  const unstamped = recordVectorV1(null, null);
  return Object.freeze({
    summaries: Object.freeze({
      absent: null,
      nullValue: requireNullV1(normalizeSaveSummaryInternalV1(null), "null Save summary"),
      empty: requireNullV1(normalizeSaveSummaryInternalV1([]), "empty Save summary"),
      valid: validSummary,
    }),
    versionStamps: Object.freeze({
      absent: null,
      allNull: allNullStamp,
      partial: partialStamp,
      fullClean: fullCleanStamp,
      fullDirty: fullDirtyStamp,
      statusUnavailable: statusUnavailableStamp,
      malformed: malformedStamp,
      accessor: normalizedAccessorStamp,
      hostileProxy: hostileProxyStamp,
    }),
    stateDigest: baseRecordV1().stateDigest,
    records: Object.freeze({
      unstamped,
      allNullStamp: recordVectorV1(null, allNullStamp),
      summaryOnly: recordVectorV1(summaryOnly, null),
      noteOnly: recordVectorV1(noteOnly, null),
      summaryAndNote: recordVectorV1(summaryAndNote, null),
      partialStamp: recordVectorV1(null, partialStamp),
      fullCleanStamp: recordVectorV1(null, fullCleanStamp),
      fullDirtyStamp: recordVectorV1(null, fullDirtyStamp),
      statusUnavailableStamp: recordVectorV1(null, statusUnavailableStamp),
      summaryAndFullDirtyStamp: recordVectorV1(summaryAndNote, fullDirtyStamp),
    }),
  });
}

export interface SaveMetadataHostPayloadV1 {
  readonly filename: "neutral-save-20260720000000.json";
  readonly mediaType: "application/json";
  readonly digest: Digest;
  readonly bytes: Uint8Array;
}

/**
 * Fresh-copy payload for Browser/Desktop no-clobber integration. The filename
 * is fixed UTC metadata-clock evidence; callers own collision policy.
 */
export function createSaveMetadataHostPayloadV1(
  recordId: SaveMetadataCompactRecordIdV1,
): SaveMetadataHostPayloadV1 {
  const expected = saveMetadataCompactExpectedV1.records[recordId];
  return Object.freeze({
    filename: "neutral-save-20260720000000.json",
    mediaType: "application/json",
    digest: expected.bytesDigest,
    bytes: bytesFromBase64V1(expected.bytesBase64),
  });
}
