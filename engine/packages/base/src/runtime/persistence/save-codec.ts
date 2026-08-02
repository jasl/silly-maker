// SPDX-License-Identifier: MIT
import { digestCanonicalInternalV1 } from "../../contracts/digest.ts";
import { RngStateSchemaFailureInternalV1 } from "../../contracts/rng.ts";
import {
  parseCurrentSaveRecordEnvelopeInternalV1,
  parseSaveRecordEnvelopeInternalV1,
  parseSaveRecordEnvelopeShellInternalV1,
  SaveRecordEnvelopeSchemaFailureV1,
  saveJsonLimitsV1,
} from "../../contracts/persistence.ts";
import type {
  SaveCodecContextV1,
  SaveRecordDecodeRejectionCodeV1,
  SaveRecordDecodeResultV1,
  SaveRecordEnvelopeV1,
  SaveRecordEnvelopeShellInternalV1,
} from "../../contracts/persistence.ts";
import {
  canonicalJsonBytesWithStrictLimitsInternalV1,
  parseStrictJson,
} from "../../contracts/strict-json.ts";
import type { DeepReadonly } from "../../contracts/values.ts";
import type { SnapshotWorkInstrumentationV1 } from "../../internal/snapshot-work-instrumentation.ts";
import { recordSnapshotWorkV1 } from "../../internal/snapshot-work-instrumentation.ts";

function parseRecordShellV1<
  TSnapshot,
  TSaveRecord extends SaveRecordEnvelopeV1<TSnapshot, unknown, unknown, unknown>,
>(
  value: unknown,
  context: SaveCodecContextV1<TSnapshot, TSaveRecord>,
):
  | {
    readonly kind: "parsed";
    readonly record: SaveRecordEnvelopeShellInternalV1<TSaveRecord>;
  }
  | {
    readonly kind: "rejected";
    readonly code:
      | "envelope.schema_invalid"
      | "envelope.unsupported_revision"
      | "digest.invalid_format";
  } {
  let record: SaveRecordEnvelopeShellInternalV1<TSaveRecord>;
  try {
    record = parseSaveRecordEnvelopeShellInternalV1(value, context.recordSchema);
  } catch (error) {
    if (error instanceof SaveRecordEnvelopeSchemaFailureV1) {
      return Object.freeze({ kind: "rejected", code: error.code });
    }
    return Object.freeze({ kind: "rejected", code: "envelope.schema_invalid" });
  }
  return Object.freeze({ kind: "parsed", record });
}

function parseCurrentRecordV1<
  TSnapshot,
  TSaveRecord extends SaveRecordEnvelopeV1<TSnapshot, unknown, unknown, unknown>,
>(
  shell: SaveRecordEnvelopeShellInternalV1<TSaveRecord>,
  context: SaveCodecContextV1<TSnapshot, TSaveRecord>,
):
  | { readonly kind: "parsed"; readonly record: DeepReadonly<TSaveRecord> }
  | {
    readonly kind: "rejected";
    readonly code: "rng.invalid_state" | "envelope.schema_invalid";
  } {
  try {
    const record = parseCurrentSaveRecordEnvelopeInternalV1(shell, context.recordSchema);
    context.validateEnvelope(record);
    return Object.freeze({ kind: "parsed", record });
  } catch (error) {
    if (error instanceof RngStateSchemaFailureInternalV1) {
      return Object.freeze({ kind: "rejected", code: error.code });
    }
    return Object.freeze({ kind: "rejected", code: "envelope.schema_invalid" });
  }
}

function hasMatchingStateDigestV1(
  stateDigest: string,
  snapshot: unknown,
  instrumentation?: SnapshotWorkInstrumentationV1,
): boolean {
  return stateDigest === digestCanonicalInternalV1(
    "sillymaker:state:v1",
    snapshot,
    instrumentation,
  );
}

export function encodeSaveRecordV1<
  TSnapshot,
  TSaveRecord extends SaveRecordEnvelopeV1<TSnapshot, unknown, unknown, unknown>,
>(
  record: DeepReadonly<TSaveRecord>,
  context: SaveCodecContextV1<TSnapshot, TSaveRecord>,
): Uint8Array {
  return encodeSaveRecordInternalV1(record, context);
}

/** @internal Instrumented test/bench path; public codec bytes remain unchanged. */
export function encodeSaveRecordInternalV1<
  TSnapshot,
  TSaveRecord extends SaveRecordEnvelopeV1<TSnapshot, unknown, unknown, unknown>,
>(
  record: DeepReadonly<TSaveRecord>,
  context: SaveCodecContextV1<TSnapshot, TSaveRecord>,
  instrumentation?: SnapshotWorkInstrumentationV1,
): Uint8Array {
  const parsed = parseSaveRecordEnvelopeInternalV1(record, context.recordSchema);
  context.validateEnvelope(parsed);
  if (!hasMatchingStateDigestV1(parsed.stateDigest, parsed.snapshot, instrumentation)) {
    throw new TypeError("Save state digest mismatch");
  }
  recordSnapshotWorkV1(instrumentation, "save_canonical_serialization");
  const encoded = canonicalJsonBytesWithStrictLimitsInternalV1(
    parsed,
    saveJsonLimitsV1,
    instrumentation,
  );
  if (!encoded.ok) {
    throw new TypeError(`Save record violates Strict JSON constraints: ${encoded.error.code}`);
  }
  return encoded.bytes;
}

export function decodeSaveRecordV1<
  TSnapshot,
  TSaveRecord extends SaveRecordEnvelopeV1<TSnapshot, unknown, unknown, unknown>,
>(
  bytes: Uint8Array,
  context: SaveCodecContextV1<TSnapshot, TSaveRecord>,
): SaveRecordDecodeResultV1<TSaveRecord> {
  return decodeSaveRecordInternalV1(bytes, context);
}

/** @internal Instrumented path for the public staged decoder contract. */
export function decodeSaveRecordInternalV1<
  TSnapshot,
  TSaveRecord extends SaveRecordEnvelopeV1<TSnapshot, unknown, unknown, unknown>,
>(
  bytes: Uint8Array,
  context: SaveCodecContextV1<TSnapshot, TSaveRecord>,
  instrumentation?: SnapshotWorkInstrumentationV1,
): SaveRecordDecodeResultV1<TSaveRecord> {
  const shell = decodeSaveRecordEnvelopeShellInternalV1(bytes, context, instrumentation);
  if (shell.kind === "rejected") return shell;
  return decodeCurrentSaveRecordEnvelopeInternalV1(shell.record, context, instrumentation);
}

export type SaveRecordEnvelopeShellDecodeResultInternalV1<
  TSaveRecord extends SaveRecordEnvelopeV1<unknown, unknown, unknown, unknown>,
> =
  | {
    readonly kind: "decoded_shell";
    readonly record: SaveRecordEnvelopeShellInternalV1<TSaveRecord>;
  }
  | { readonly kind: "rejected"; readonly code: SaveRecordDecodeRejectionCodeV1 };

/** @internal Bounded shell + raw-digest phase; intentionally absent from runtime barrels. */
export function decodeSaveRecordEnvelopeShellInternalV1<
  TSnapshot,
  TSaveRecord extends SaveRecordEnvelopeV1<TSnapshot, unknown, unknown, unknown>,
>(
  bytes: Uint8Array,
  context: SaveCodecContextV1<TSnapshot, TSaveRecord>,
  instrumentation?: SnapshotWorkInstrumentationV1,
): SaveRecordEnvelopeShellDecodeResultInternalV1<TSaveRecord> {
  recordSnapshotWorkV1(instrumentation, "strict_json_parse");
  const decoded = parseStrictJson(bytes, saveJsonLimitsV1);
  if (!decoded.ok) {
    return Object.freeze({ kind: "rejected", code: decoded.error.code });
  }
  const parsed = parseRecordShellV1(decoded.value, context);
  if (parsed.kind === "rejected") return parsed;
  if (
    !hasMatchingStateDigestV1(parsed.record.stateDigest, parsed.record.snapshot, instrumentation)
  ) {
    return Object.freeze({ kind: "rejected", code: "digest.state_mismatch" });
  }
  return Object.freeze({ kind: "decoded_shell", record: parsed.record });
}

/** @internal Current-Snapshot + normalized-digest phase; absent from runtime barrels. */
export function decodeCurrentSaveRecordEnvelopeInternalV1<
  TSnapshot,
  TSaveRecord extends SaveRecordEnvelopeV1<TSnapshot, unknown, unknown, unknown>,
>(
  shell: SaveRecordEnvelopeShellInternalV1<TSaveRecord>,
  context: SaveCodecContextV1<TSnapshot, TSaveRecord>,
  instrumentation?: SnapshotWorkInstrumentationV1,
): SaveRecordDecodeResultV1<TSaveRecord> {
  const parsed = parseCurrentRecordV1(shell, context);
  if (parsed.kind === "rejected") return parsed;
  if (
    !hasMatchingStateDigestV1(parsed.record.stateDigest, parsed.record.snapshot, instrumentation)
  ) {
    return Object.freeze({
      kind: "rejected",
      code: "digest.normalized_state_mismatch",
    });
  }
  return Object.freeze({ kind: "decoded", record: parsed.record });
}
