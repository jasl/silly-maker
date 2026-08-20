// SPDX-License-Identifier: MIT
import type {
  LeaseHandoffRequestId,
  PlayerWritableSaveSlotIdV1,
  SaveSlotIdV1,
  SessionLeaseOwnerId,
} from "./application.ts";
import { digestBytes } from "./digest.ts";
import type { IsoUtcInstant } from "./host.ts";
import type { PatchSetAdoptionDeclarationV1, PatchSetIdentityV1 } from "./hotfix.ts";
import type { BuildProvenanceV1 } from "./provenance.ts";
import type {
  SaveStateMigrationAttemptV1,
  SaveStateMigrationReasonCodeV1,
  SaveStateMigrationReceiptV1,
  SaveStateMigrationRegistryV1,
} from "./save-state-migration.ts";
import { parseStrictJsonLimitsV1 } from "./strict-json.ts";
import type { StrictJsonErrorCodeV1 } from "./strict-json.ts";
import { normalizeVersionStampInternalV1 } from "./version-stamp.ts";
import type { VersionStampV1 } from "./version-stamp.ts";
import type {
  DeepReadonly,
  Digest,
  NonNegativeSafeInteger,
  PositiveSafeInteger,
  RuntimeSchemaV1,
} from "./values.ts";
import { parseDigest, parsePositiveSafeInteger } from "./values.ts";
import {
  isPersistedIsoUtcInstantInternalV1,
  scanUtcInstantFieldsInternalV1,
} from "../internal/utc-instant.ts";

export type SaveSlotHealthV1 = "empty" | "valid" | "invalid" | "recovery_candidate" | "unavailable";

/**
 * Optional per-record annotation: an application-projected summary captured
 * at save time (display lines for slot pickers) plus a player-edited note.
 * Stored inside the Save record, so it survives exactly as long as the save.
 */
export interface SaveAnnotationV1 {
  /** Application summary lines captured at save time (null = none). */
  readonly summary: readonly string[] | null;
  /** Player-edited note (null = none). */
  readonly note: string | null;
}

export const saveAnnotationLimitsV1 = Object.freeze({
  maxSummaryLines: 8,
  maxSummaryLineLength: 120,
  maxNoteLength: 64,
});

function parseAnnotationLineV1(value: unknown, maxLength: number, label: string): string {
  if (typeof value !== "string" || value.length === 0) throw new TypeError(`invalid ${label}`);
  // Iterate code points (not UTF-16 units) so astral characters count once.
  let length = 0;
  for (const character of value) {
    const code = character.codePointAt(0) ?? 0;
    if (code < 0x20 || code === 0x7f) {
      throw new TypeError(`${label} contains control characters`);
    }
    length += 1;
    if (length > maxLength) throw new TypeError(`${label} too long`);
  }
  return value;
}

/** Normalizes a player note edit: empty/whitespace clears; bounds enforced. */
export function parseSaveNoteV1(value: string): string | null {
  const trimmed = value.trim();
  if (trimmed.length === 0) return null;
  return parseAnnotationLineV1(trimmed, saveAnnotationLimitsV1.maxNoteLength, "Save note");
}

function parseSaveSummaryArrayV1(value: unknown, allowEmpty: boolean): readonly string[] | null {
  if (
    !Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Array.prototype ||
    Object.getOwnPropertySymbols(value).length !== 0 ||
    (!allowEmpty && value.length === 0)
  ) {
    throw new TypeError("invalid SaveAnnotationV1 summary");
  }
  if (value.length > saveAnnotationLimitsV1.maxSummaryLines) {
    throw new TypeError("SaveAnnotationV1 summary has too many lines");
  }
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const expectedFields = [
    ...Array.from({ length: value.length }, (_unused, index) => String(index)),
    "length",
  ];
  if (Object.keys(descriptors).sort().join("\0") !== expectedFields.sort().join("\0")) {
    throw new TypeError("invalid SaveAnnotationV1 summary fields");
  }
  const summary = Array.from({ length: value.length }, (_unused, index) => {
    const descriptor = descriptors[String(index)];
    if (
      descriptor === undefined ||
      descriptor.get !== undefined ||
      descriptor.set !== undefined ||
      !("value" in descriptor)
    ) {
      throw new TypeError("SaveAnnotationV1 summary accessors are forbidden");
    }
    return parseAnnotationLineV1(
      descriptor.value,
      saveAnnotationLimitsV1.maxSummaryLineLength,
      "SaveAnnotationV1 summary line",
    );
  });
  return summary.length === 0 ? null : Object.freeze(summary);
}

/**
 * @internal Captures one Story summary as dense, immutable package data.
 * Intentionally absent from the public contracts barrel.
 */
export function normalizeSaveSummaryInternalV1(value: unknown): readonly string[] | null {
  if (value === null) return null;
  return parseSaveSummaryArrayV1(value, true);
}

export function parseSaveAnnotationV1(value: unknown): SaveAnnotationV1 {
  const fields = exactDescriptors(value, ["summary", "note"], "SaveAnnotationV1");
  const summaryValue = fields.summary?.value;
  const summary = summaryValue === null ? null : parseSaveSummaryArrayV1(summaryValue, false);
  const noteValue = fields.note?.value;
  let note: string | null;
  if (noteValue === null) {
    note = null;
  } else {
    if (typeof noteValue !== "string") throw new TypeError("invalid SaveAnnotationV1 note");
    const normalizedNote = parseSaveNoteV1(noteValue);
    if (normalizedNote === null || normalizedNote !== noteValue) {
      throw new TypeError("SaveAnnotationV1 note must be normalized");
    }
    note = normalizedNote;
  }
  if (summary === null && note === null) {
    throw new TypeError("SaveAnnotationV1 must carry a summary or a note");
  }
  return Object.freeze({ summary, note });
}

export interface SaveSlotSummaryV1 {
  readonly slotId: SaveSlotIdV1;
  readonly health: SaveSlotHealthV1;
  readonly recordRevision: PositiveSafeInteger | null;
  readonly capturedCommandSequence: NonNegativeSafeInteger | null;
  readonly savedAt: IsoUtcInstant | null;
  readonly annotation: SaveAnnotationV1 | null;
  readonly warningCodes: readonly string[];
}

export interface PersistenceStatusV1 {
  readonly available: boolean;
  readonly busy: boolean;
  readonly safelySavedCommandSequence: NonNegativeSafeInteger | null;
  readonly lastFailureCode: string | null;
}

export type PersistenceOperationResultV1 =
  | { readonly kind: "saved" | "cleared"; readonly slotId: SaveSlotIdV1 }
  | {
    readonly kind: "loaded" | "imported";
    readonly compatibility: "exact" | "adopted";
    readonly commandSequence: NonNegativeSafeInteger;
  }
  | {
    readonly kind: "rejected";
    readonly code:
      | "busy"
      | "unavailable"
      | "empty_slot"
      | "conflict"
      // The live state sits inside a declared in-flight span (persistence
      // safepoint policy): player-slot writes resume at the next safepoint.
      | "in_flight"
      | "invalid_record"
      | "invalid_note"
      | "lineage_limit"
      | "migration_unavailable"
      | "migration_rejected"
      | "incompatible";
  }
  | { readonly kind: "faulted"; readonly code: string };

export interface ExportedSaveV1 {
  readonly filename: string;
  readonly mediaType: "application/json";
  readonly digest: Digest;
  readonly bytes: Uint8Array;
}

export type SaveExportOperationResultV1 =
  | {
    readonly kind: "exported";
    readonly slotId: SaveSlotIdV1;
    readonly file: ExportedSaveV1;
  }
  | {
    readonly kind: "rejected";
    readonly code: "unavailable" | "empty_slot" | "conflict" | "invalid_record";
  }
  | { readonly kind: "faulted"; readonly code: string };

export type SaveRewriteOperationResultV1 =
  | {
    readonly kind: "upgraded";
    readonly slotId: SaveSlotIdV1;
    readonly compatibility: "exact" | "adopted";
  }
  | { readonly kind: "reanchored"; readonly slotId: SaveSlotIdV1 }
  | {
    readonly kind: "rejected";
    readonly code:
      | "busy"
      | "unavailable"
      | "empty_slot"
      | "backup_pending"
      | "conflict"
      | "invalid_record"
      | "migration_unavailable"
      | "migration_rejected"
      | "incompatible"
      | "reanchor_required"
      | "not_required";
  }
  | { readonly kind: "faulted"; readonly code: string };

export type SaveBackupOperationResultV1 =
  | { readonly kind: "restored" | "discarded"; readonly slotId: SaveSlotIdV1 }
  | {
    readonly kind: "rejected";
    readonly code:
      | "busy"
      | "unavailable"
      | "empty_backup"
      | "conflict"
      | "invalid_backup"
      | "invalid_record";
  }
  | { readonly kind: "faulted"; readonly code: string };

/** Player-safe, read-only status of the one bounded migration backup. */
export type SaveBackupInspectionResultV1 =
  | {
    readonly kind: "available";
    readonly slotId: SaveSlotIdV1;
  }
  | {
    readonly kind: "rejected";
    readonly slotId: SaveSlotIdV1;
    readonly code: "empty_backup" | "unavailable" | "invalid_backup";
  }
  | {
    readonly kind: "faulted";
    readonly slotId: SaveSlotIdV1 | null;
    readonly code: string;
  };

export type SaveBackupExportOperationResultV1 =
  | {
    readonly kind: "exported";
    readonly slotId: SaveSlotIdV1;
    readonly file: ExportedSaveV1;
  }
  | {
    readonly kind: "rejected";
    readonly code: "unavailable" | "empty_backup" | "conflict" | "invalid_backup";
  }
  | { readonly kind: "faulted"; readonly code: string };

/** Stable, player-safe evidence attached to a read-only Save inspection. */
export interface SaveInspectionDiagnosticsV1 {
  readonly codes: readonly string[];
  readonly migrationAttempt: SaveStateMigrationAttemptV1 | null;
  readonly migrationReasonCode: SaveStateMigrationReasonCodeV1 | null;
  readonly storedStateContractRevision: PositiveSafeInteger | null;
  readonly currentStateContractRevision: PositiveSafeInteger | null;
}

/**
 * Read-only disposition for one stored Save.
 *
 * Inspection may execute the configured synchronous, deterministic migration
 * chain, but never returns a candidate Snapshot, storage revision, commit
 * capability, or other authority that can be replayed as a load.
 */
export type SaveInspectionResultV1 =
  | {
    readonly kind: "direct";
    readonly slotId: SaveSlotIdV1;
    readonly warnings: readonly ImportCompatibilityWarningV1[];
    readonly diagnostics: SaveInspectionDiagnosticsV1;
  }
  | {
    readonly kind: "migration_required";
    readonly slotId: SaveSlotIdV1;
    readonly migration: SaveStateMigrationReceiptV1;
    readonly warnings: readonly ImportCompatibilityWarningV1[];
    readonly diagnostics: SaveInspectionDiagnosticsV1;
  }
  | {
    readonly kind: "adoption_required";
    readonly slotId: SaveSlotIdV1;
    readonly adoption: SimulationAdoptionV1;
    readonly warnings: readonly ImportCompatibilityWarningV1[];
    readonly diagnostics: SaveInspectionDiagnosticsV1;
  }
  | {
    readonly kind: "migration_and_adoption_required";
    readonly slotId: SaveSlotIdV1;
    readonly migration: SaveStateMigrationReceiptV1;
    readonly adoption: SimulationAdoptionV1;
    readonly warnings: readonly ImportCompatibilityWarningV1[];
    readonly diagnostics: SaveInspectionDiagnosticsV1;
  }
  | {
    readonly kind: "inspect_only";
    readonly slotId: SaveSlotIdV1;
    readonly code: "migration_unavailable" | "incompatible" | "reanchor_required";
    readonly diagnostics: SaveInspectionDiagnosticsV1;
  }
  | {
    readonly kind: "rejected";
    readonly slotId: SaveSlotIdV1;
    readonly code:
      | "empty_slot"
      | "unavailable"
      | "invalid_record"
      | "migration_rejected";
    readonly diagnostics: SaveInspectionDiagnosticsV1;
  }
  | {
    readonly kind: "faulted";
    readonly slotId: SaveSlotIdV1 | null;
    readonly code: string;
    readonly diagnostics: SaveInspectionDiagnosticsV1;
  };

export type SessionLeaseStatusV1 =
  | {
    readonly kind: "owned";
    readonly ownerId: SessionLeaseOwnerId;
    readonly fencingToken: PositiveSafeInteger;
  }
  | {
    readonly kind: "readonly";
    readonly ownerId: SessionLeaseOwnerId;
    readonly fencingToken: PositiveSafeInteger;
  }
  | {
    readonly kind: "handoff_requested";
    readonly ownerId: SessionLeaseOwnerId;
    readonly fencingToken: PositiveSafeInteger;
    readonly requestId: LeaseHandoffRequestId;
    readonly requestedByOwnerId: SessionLeaseOwnerId;
  }
  | {
    readonly kind: "unowned";
    readonly ownerId: null;
    readonly fencingToken: PositiveSafeInteger;
  }
  | {
    readonly kind: "unavailable";
    readonly ownerId: null;
    readonly fencingToken: null;
    readonly code: string;
  };

export type SessionLeaseOperationResultV1 =
  | { readonly kind: "updated"; readonly status: SessionLeaseStatusV1 }
  | {
    readonly kind: "rejected";
    readonly code: "conflict" | "unavailable" | "unknown_request";
  };

export type SaveWriteReasonV1 = "auto" | PlayerWritableSaveSlotIdV1;

export interface SaveRecordEnvelopeV1<TSnapshot, TProvenance, TSlotMetadata, TSimulationLineage> {
  readonly formatRevision: 1;
  readonly recordRevision: PositiveSafeInteger;
  readonly provenance: TProvenance;
  readonly slot: TSlotMetadata;
  readonly savedAt: IsoUtcInstant;
  readonly stateDigest: Digest;
  readonly snapshot: TSnapshot;
  readonly simulationLineage: TSimulationLineage;
  /**
   * Optional annotation (summary lines + player note). Absent on records
   * written before this capability existed — decoding stays additive.
   */
  readonly annotation?: SaveAnnotationV1;
  /**
   * Optional diagnostic build stamp captured with this record's Snapshot.
   * Later annotation rewrites and Auto-slot rotation preserve that origin.
   * Additive like `annotation`, and strictly diagnostic — import compatibility
   * never reads it, and malformed/all-null metadata is omitted instead of
   * rejecting an otherwise valid record.
   */
  readonly versionStamp?: VersionStampV1;
}

export interface SaveCompatibilityKeyV1 {
  readonly storyId: string;
  readonly storyRevision: PositiveSafeInteger;
  readonly stateContractRevision: PositiveSafeInteger;
  readonly stateContractDigest: Digest;
  readonly engineDigest: Digest;
  readonly simulationDigest: Digest;
}

export interface SimulationAdoptionV1 {
  readonly fromSimulationDigest: Digest;
  readonly toSimulationDigest: Digest;
  readonly viaSimulationPatchSetDigest: Digest;
  readonly adoptedAtCommandSequence: NonNegativeSafeInteger;
}

export type ImportValidationErrorCodeV1 =
  | StrictJsonErrorCodeV1
  | "envelope.schema_invalid"
  | "envelope.unsupported_revision"
  | "digest.invalid_format"
  | "digest.state_mismatch"
  | "digest.normalized_state_mismatch"
  | "identity.story_id_mismatch"
  | "identity.story_revision_mismatch"
  | "identity.state_contract_revision_mismatch"
  | "identity.state_contract_digest_mismatch"
  | "identity.engine_digest_mismatch"
  | "identity.simulation_digest_mismatch"
  | "reference.unknown_id"
  | "invariant.failed";

export type SaveCompatibilityMismatchV1 =
  | {
    readonly field: "story_id";
    readonly code: "identity.story_id_mismatch";
    readonly stored: string;
    readonly current: string;
  }
  | {
    readonly field: "story_revision";
    readonly code: "identity.story_revision_mismatch";
    readonly stored: PositiveSafeInteger;
    readonly current: PositiveSafeInteger;
  }
  | {
    readonly field: "state_contract_revision";
    readonly code: "identity.state_contract_revision_mismatch";
    readonly stored: PositiveSafeInteger;
    readonly current: PositiveSafeInteger;
  }
  | {
    readonly field: "state_contract_digest";
    readonly code: "identity.state_contract_digest_mismatch";
    readonly stored: Digest;
    readonly current: Digest;
  }
  | {
    readonly field: "engine_digest";
    readonly code: "identity.engine_digest_mismatch";
    readonly stored: Digest;
    readonly current: Digest;
  }
  | {
    readonly field: "simulation_digest";
    readonly code: "identity.simulation_digest_mismatch";
    readonly stored: Digest;
    readonly current: Digest;
  };

export type ImportCompatibilityWarningV1 =
  | {
    readonly field: "story_digest";
    readonly code: "identity.story_digest_mismatch";
    readonly stored: Digest;
    readonly current: Digest;
  }
  | {
    readonly field: "presentation_digest";
    readonly code: "identity.presentation_digest_mismatch";
    readonly stored: Digest;
    readonly current: Digest;
  }
  | {
    readonly field: "hotfix_set";
    readonly code: "identity.hotfix_set_mismatch";
    readonly stored: PatchSetIdentityV1;
    readonly current: PatchSetIdentityV1;
  };

export type ImportRejectionCodeV1 =
  | StrictJsonErrorCodeV1
  | "rng.invalid_state"
  | "envelope.schema_invalid"
  | "envelope.unsupported_revision"
  | "digest.invalid_format"
  | "digest.state_mismatch"
  | "digest.normalized_state_mismatch"
  | "compatibility.adoption_ambiguous"
  | "compatibility.lineage_limit"
  | "reference.unknown_id"
  | "invariant.failed";

export type ImportCompatibilityOutcomeV1 =
  | {
    readonly kind: "exact";
    readonly mismatches: readonly [];
    readonly warnings: readonly ImportCompatibilityWarningV1[];
  }
  | {
    readonly kind: "adopted";
    readonly mismatches: readonly [];
    readonly warnings: readonly ImportCompatibilityWarningV1[];
    readonly adoption: SimulationAdoptionV1;
  }
  | {
    readonly kind: "inspect_only";
    readonly mismatches: readonly [SaveCompatibilityMismatchV1, ...SaveCompatibilityMismatchV1[]];
    readonly warnings: readonly ImportCompatibilityWarningV1[];
  }
  | { readonly kind: "rejected"; readonly code: ImportRejectionCodeV1 };

export type SaveRecordDecodeRejectionCodeV1 =
  | StrictJsonErrorCodeV1
  | "rng.invalid_state"
  | "envelope.schema_invalid"
  | "envelope.unsupported_revision"
  | "digest.invalid_format"
  | "digest.state_mismatch"
  | "digest.normalized_state_mismatch";

export type SaveRecordDecodeResultV1<TSaveRecord> =
  | { readonly kind: "decoded"; readonly record: DeepReadonly<TSaveRecord> }
  | { readonly kind: "rejected"; readonly code: SaveRecordDecodeRejectionCodeV1 };

declare const saveRecordEnvelopeSchemaBrandV1: unique symbol;

interface SaveRecordEnvelopeSchemaStagesInternalV1 {
  readonly snapshotSchema: RuntimeSchemaV1<unknown>;
  readonly provenanceSchema: RuntimeSchemaV1<unknown>;
  readonly slotMetadataSchema: RuntimeSchemaV1<unknown>;
  readonly simulationLineageSchema: RuntimeSchemaV1<unknown>;
}

/**
 * The official staged Save-envelope schema. Codecs require the value returned
 * by `createSaveRecordEnvelopeSchemaV1` so shell and current-Snapshot admission
 * cannot silently fall back to different phase ordering.
 */
export interface SaveRecordEnvelopeSchemaV1<TSaveRecord> extends RuntimeSchemaV1<TSaveRecord> {
  readonly [saveRecordEnvelopeSchemaBrandV1]: true;
}

const saveRecordEnvelopeSchemaStagesByIdentityV1 = new WeakMap<
  object,
  SaveRecordEnvelopeSchemaStagesInternalV1
>();

function saveRecordEnvelopeSchemaStagesForV1<TSaveRecord>(
  schema: SaveRecordEnvelopeSchemaV1<TSaveRecord>,
): SaveRecordEnvelopeSchemaStagesInternalV1 {
  const stages = saveRecordEnvelopeSchemaStagesByIdentityV1.get(schema);
  if (stages === undefined) {
    throw new TypeError("Save envelope schema was not created by the official factory");
  }
  return stages;
}

export interface SaveCodecContextV1<
  TSnapshot,
  TSaveRecord extends SaveRecordEnvelopeV1<TSnapshot, unknown, unknown, unknown>,
> {
  readonly recordSchema: SaveRecordEnvelopeSchemaV1<TSaveRecord>;
  validateEnvelope(record: DeepReadonly<TSaveRecord>): void;
}

export interface SaveCompatibilityClassificationInputV1 {
  readonly stored: DeepReadonly<BuildProvenanceV1>;
  readonly current: DeepReadonly<BuildProvenanceV1>;
  readonly simulationLineage: readonly DeepReadonly<SimulationAdoptionV1>[];
  readonly adoptionDeclarations: readonly DeepReadonly<PatchSetAdoptionDeclarationV1>[];
  readonly candidateCommandSequence: NonNegativeSafeInteger;
}

export type SaveCompatibilityClassificationV1 =
  | Extract<ImportCompatibilityOutcomeV1, { readonly kind: "exact" }>
  | {
    readonly kind: "adoption_candidate";
    readonly mismatches: readonly [];
    readonly warnings: readonly ImportCompatibilityWarningV1[];
    readonly adoption: SimulationAdoptionV1;
  }
  | Extract<ImportCompatibilityOutcomeV1, { readonly kind: "inspect_only" | "rejected" }>;

export interface SaveMigrationUnavailableInspectionV1 {
  readonly kind: "inspect_only";
  readonly code: "migration.unavailable";
  readonly storedStateContractRevision: PositiveSafeInteger;
  readonly currentStateContractRevision: PositiveSafeInteger;
}

export type SaveImportMigrationExecutionFailureV1 =
  | {
    readonly kind: "rejected";
    readonly code: "migration.rejected";
    readonly reasonCode: SaveStateMigrationReasonCodeV1;
    readonly migrationAttempt: SaveStateMigrationAttemptV1;
  }
  | {
    readonly kind: "rejected";
    readonly code: "migration.output_invalid";
    readonly migrationAttempt: SaveStateMigrationAttemptV1;
  }
  | {
    readonly kind: "faulted";
    readonly code: "migration.callback_threw";
    readonly migrationAttempt: SaveStateMigrationAttemptV1;
  };

export type SaveImportPostMigrationValidationFailureV1 =
  | ({ readonly kind: "rejected"; readonly code: ImportRejectionCodeV1 } & {
    readonly migrationAttempt: SaveStateMigrationAttemptV1;
  })
  | (Extract<ImportCompatibilityOutcomeV1, { readonly kind: "inspect_only" }> & {
    readonly migrationAttempt: SaveStateMigrationAttemptV1;
  });

export type SaveImportValidationResultV1<TSaveRecord> =
  | (Extract<ImportCompatibilityOutcomeV1, { readonly kind: "exact" | "adopted" }> & {
    readonly candidate: DeepReadonly<TSaveRecord>;
    readonly migration: SaveStateMigrationReceiptV1 | null;
  })
  | Extract<ImportCompatibilityOutcomeV1, { readonly kind: "inspect_only" | "rejected" }>
  | SaveMigrationUnavailableInspectionV1
  | SaveImportMigrationExecutionFailureV1
  | SaveImportPostMigrationValidationFailureV1;

export interface SaveImportInvariantViewV1<TState> {
  readonly state: TState;
  readonly commandSequence: NonNegativeSafeInteger;
}

export interface SaveImportValidationContextV1<
  TState,
  TSnapshot extends {
    readonly state: TState;
    readonly commandSequence: NonNegativeSafeInteger;
  },
  TSaveRecord extends SaveRecordEnvelopeV1<TSnapshot, BuildProvenanceV1, unknown, unknown>,
> {
  readonly codec: SaveCodecContextV1<TSnapshot, TSaveRecord>;
  readonly currentStateContractRevision: PositiveSafeInteger;
  readonly saveStateMigrations: SaveStateMigrationRegistryV1 | null;
  classifyCompatibility(record: DeepReadonly<TSaveRecord>): SaveCompatibilityClassificationV1;
  validateReferences(state: DeepReadonly<TState>): readonly string[];
  validateInvariants(view: DeepReadonly<SaveImportInvariantViewV1<TState>>): readonly string[];
}

type SaveRecordEnvelopeSchemaFailureCodeV1 =
  | "envelope.unsupported_revision"
  | "digest.invalid_format";

export class SaveRecordEnvelopeSchemaFailureV1 extends TypeError {
  readonly code: SaveRecordEnvelopeSchemaFailureCodeV1;

  constructor(code: SaveRecordEnvelopeSchemaFailureCodeV1) {
    super(code);
    this.name = "SaveRecordEnvelopeSchemaFailureV1";
    this.code = code;
  }
}

type ExactRecord = Record<string, PropertyDescriptor>;

function exactDescriptors(value: unknown, fields: readonly string[], label: string): ExactRecord {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Object.prototype ||
    Object.getOwnPropertySymbols(value).length !== 0
  ) {
    throw new TypeError(`invalid ${label}`);
  }
  const descriptors = Object.getOwnPropertyDescriptors(value);
  if (Object.keys(descriptors).sort().join("\0") !== [...fields].sort().join("\0")) {
    throw new TypeError(`invalid ${label} fields`);
  }
  if (Object.values(descriptors).some(({ get, set }) => get !== undefined || set !== undefined)) {
    throw new TypeError(`${label} accessors are forbidden`);
  }
  return descriptors;
}

function requiredString(value: unknown, label: string): string {
  if (typeof value !== "string" || value.length === 0) throw new TypeError(`invalid ${label}`);
  return value;
}

export function parseIsoUtcInstantV1(value: unknown): IsoUtcInstant {
  const fields = scanUtcInstantFieldsInternalV1(value);
  if (fields === null || !isPersistedIsoUtcInstantInternalV1(fields)) {
    throw new TypeError("invalid IsoUtcInstant");
  }
  return value as IsoUtcInstant;
}

function parseByteExport<T extends ExportedSaveV1>(value: unknown, label: string): T {
  const fields = ["filename", "mediaType", "digest", "bytes"] as const;
  const descriptors = exactDescriptors(value, fields, label);
  const bytesValue = descriptors.bytes?.value;
  if (
    !(bytesValue instanceof Uint8Array) ||
    Object.getPrototypeOf(bytesValue) !== Uint8Array.prototype
  ) {
    throw new TypeError(`invalid ${label} bytes`);
  }
  const bytes = Uint8Array.from(bytesValue);
  const digest = parseDigest(descriptors.digest?.value);
  if (digest !== digestBytes(bytes)) throw new TypeError(`${label} digest mismatch`);
  if (descriptors.mediaType?.value !== "application/json") {
    throw new TypeError(`invalid ${label} mediaType`);
  }
  return Object.freeze({
    filename: requiredString(descriptors.filename?.value, `${label} filename`),
    mediaType: "application/json" as const,
    digest,
    bytes,
  }) as T;
}

export const exportedSaveSchemaV1: RuntimeSchemaV1<ExportedSaveV1> = Object.freeze({
  parse(value: unknown) {
    return parseByteExport<ExportedSaveV1>(value, "ExportedSaveV1");
  },
});

export const sessionLeaseStatusSchemaV1: RuntimeSchemaV1<SessionLeaseStatusV1> = Object.freeze({
  parse(value: unknown) {
    if (value === null || typeof value !== "object") {
      throw new TypeError("invalid SessionLeaseStatusV1");
    }
    const kind = Reflect.get(value, "kind");
    if (kind === "owned" || kind === "readonly") {
      const fields = exactDescriptors(
        value,
        ["kind", "ownerId", "fencingToken"],
        "SessionLeaseStatusV1",
      );
      return Object.freeze({
        kind,
        ownerId: requiredString(fields.ownerId?.value, "ownerId") as SessionLeaseOwnerId,
        fencingToken: parsePositiveSafeInteger(fields.fencingToken?.value),
      });
    }
    if (kind === "handoff_requested") {
      const fields = exactDescriptors(
        value,
        ["kind", "ownerId", "fencingToken", "requestId", "requestedByOwnerId"],
        "SessionLeaseStatusV1",
      );
      return Object.freeze({
        kind,
        ownerId: requiredString(fields.ownerId?.value, "ownerId") as SessionLeaseOwnerId,
        fencingToken: parsePositiveSafeInteger(fields.fencingToken?.value),
        requestId: requiredString(fields.requestId?.value, "requestId") as LeaseHandoffRequestId,
        requestedByOwnerId: requiredString(
          fields.requestedByOwnerId?.value,
          "requestedByOwnerId",
        ) as SessionLeaseOwnerId,
      });
    }
    if (kind === "unowned") {
      const fields = exactDescriptors(
        value,
        ["kind", "ownerId", "fencingToken"],
        "SessionLeaseStatusV1",
      );
      if (fields.ownerId?.value !== null) throw new TypeError("unowned lease has an owner");
      return Object.freeze({
        kind,
        ownerId: null,
        fencingToken: parsePositiveSafeInteger(fields.fencingToken?.value),
      });
    }
    if (kind === "unavailable") {
      const fields = exactDescriptors(
        value,
        ["kind", "ownerId", "fencingToken", "code"],
        "SessionLeaseStatusV1",
      );
      if (fields.ownerId?.value !== null || fields.fencingToken?.value !== null) {
        throw new TypeError("unavailable lease carries ownership");
      }
      return Object.freeze({
        kind,
        ownerId: null,
        fencingToken: null,
        code: requiredString(fields.code?.value, "lease unavailable code"),
      });
    }
    throw new TypeError("invalid SessionLeaseStatusV1 kind");
  },
});

export type SaveRecordEnvelopeShellInternalV1<
  TSaveRecord extends SaveRecordEnvelopeV1<unknown, unknown, unknown, unknown>,
> = {
  readonly formatRevision: 1;
  readonly recordRevision: PositiveSafeInteger;
  readonly provenance: DeepReadonly<TSaveRecord["provenance"]>;
  readonly slot: DeepReadonly<TSaveRecord["slot"]>;
  readonly savedAt: IsoUtcInstant;
  readonly stateDigest: Digest;
  readonly snapshot: unknown;
  readonly simulationLineage: DeepReadonly<TSaveRecord["simulationLineage"]>;
  readonly annotation?: SaveAnnotationV1;
  readonly versionStamp?: VersionStampV1;
};

function parseSaveRecordEnvelopeShellWithStagesV1(
  value: unknown,
  stages: SaveRecordEnvelopeSchemaStagesInternalV1,
): SaveRecordEnvelopeV1<unknown, unknown, unknown, unknown> {
  // `annotation` and `versionStamp` are additive-optional: records written
  // before either field existed must keep parsing, so the exact-field list
  // admits every shape combination.
  const hasAnnotation = value !== null &&
    typeof value === "object" &&
    Object.prototype.hasOwnProperty.call(value, "annotation");
  const hasVersionStamp = value !== null &&
    typeof value === "object" &&
    Object.prototype.hasOwnProperty.call(value, "versionStamp");
  const fields = exactDescriptors(
    value,
    [
      "formatRevision",
      "recordRevision",
      "provenance",
      "slot",
      "savedAt",
      "stateDigest",
      "snapshot",
      "simulationLineage",
      ...(hasAnnotation ? (["annotation"] as const) : []),
      ...(hasVersionStamp ? (["versionStamp"] as const) : []),
    ],
    "SaveRecordEnvelopeV1",
  );
  const formatRevision = fields.formatRevision?.value;
  if (formatRevision !== 1) {
    if (
      typeof formatRevision === "number" &&
      Number.isSafeInteger(formatRevision) &&
      !Object.is(formatRevision, -0) &&
      formatRevision > 0
    ) {
      throw new SaveRecordEnvelopeSchemaFailureV1("envelope.unsupported_revision");
    }
    throw new TypeError("invalid Save formatRevision");
  }
  const recordRevision = parsePositiveSafeInteger(fields.recordRevision?.value);
  const provenance = stages.provenanceSchema.parse(fields.provenance?.value);
  const slot = stages.slotMetadataSchema.parse(fields.slot?.value);
  const savedAt = parseIsoUtcInstantV1(fields.savedAt?.value);
  let stateDigest: Digest;
  try {
    stateDigest = parseDigest(fields.stateDigest?.value);
  } catch {
    throw new SaveRecordEnvelopeSchemaFailureV1("digest.invalid_format");
  }
  const simulationLineage = stages.simulationLineageSchema.parse(
    fields.simulationLineage?.value,
  );
  const annotation = hasAnnotation ? parseSaveAnnotationV1(fields.annotation?.value) : null;
  const versionStamp = hasVersionStamp
    ? normalizeVersionStampInternalV1(fields.versionStamp?.value)
    : null;
  return Object.freeze({
    formatRevision: 1 as const,
    recordRevision,
    provenance,
    slot,
    savedAt,
    stateDigest,
    snapshot: fields.snapshot?.value,
    simulationLineage,
    ...(annotation === null ? {} : { annotation }),
    // Diagnostic-only: normalize/omit instead of reject (see the field doc).
    ...(versionStamp === null ? {} : { versionStamp }),
  });
}

export function parseSaveRecordEnvelopeShellInternalV1<
  TSaveRecord extends SaveRecordEnvelopeV1<unknown, unknown, unknown, unknown>,
>(
  value: unknown,
  schema: SaveRecordEnvelopeSchemaV1<TSaveRecord>,
): SaveRecordEnvelopeShellInternalV1<TSaveRecord> {
  return parseSaveRecordEnvelopeShellWithStagesV1(
    value,
    saveRecordEnvelopeSchemaStagesForV1(schema),
  ) as unknown as SaveRecordEnvelopeShellInternalV1<TSaveRecord>;
}

export function parseCurrentSaveRecordEnvelopeInternalV1<
  TSaveRecord extends SaveRecordEnvelopeV1<unknown, unknown, unknown, unknown>,
>(
  shell: SaveRecordEnvelopeShellInternalV1<TSaveRecord>,
  schema: SaveRecordEnvelopeSchemaV1<TSaveRecord>,
): DeepReadonly<TSaveRecord> {
  const snapshot = saveRecordEnvelopeSchemaStagesForV1(schema).snapshotSchema.parse(
    shell.snapshot,
  );
  return Object.freeze({ ...shell, snapshot }) as DeepReadonly<TSaveRecord>;
}

export function parseSaveRecordEnvelopeInternalV1<
  TSaveRecord extends SaveRecordEnvelopeV1<unknown, unknown, unknown, unknown>,
>(
  value: unknown,
  schema: SaveRecordEnvelopeSchemaV1<TSaveRecord>,
): DeepReadonly<TSaveRecord> {
  const shell = parseSaveRecordEnvelopeShellInternalV1(value, schema);
  return parseCurrentSaveRecordEnvelopeInternalV1(shell, schema);
}

export function createSaveRecordEnvelopeSchemaV1<
  TSnapshot,
  TProvenance,
  TSlotMetadata,
  TSimulationLineage,
>(
  snapshotSchema: RuntimeSchemaV1<TSnapshot>,
  provenanceSchema: RuntimeSchemaV1<TProvenance>,
  slotMetadataSchema: RuntimeSchemaV1<TSlotMetadata>,
  simulationLineageSchema: RuntimeSchemaV1<TSimulationLineage>,
): SaveRecordEnvelopeSchemaV1<
  SaveRecordEnvelopeV1<TSnapshot, TProvenance, TSlotMetadata, TSimulationLineage>
> {
  const stages: SaveRecordEnvelopeSchemaStagesInternalV1 = Object.freeze({
    snapshotSchema,
    provenanceSchema,
    slotMetadataSchema,
    simulationLineageSchema,
  });
  const schema = Object.freeze({
    parse(value: unknown) {
      const shell = parseSaveRecordEnvelopeShellWithStagesV1(value, stages);
      const snapshot = snapshotSchema.parse(shell.snapshot);
      return Object.freeze({ ...shell, snapshot });
    },
  }) as unknown as SaveRecordEnvelopeSchemaV1<
    SaveRecordEnvelopeV1<TSnapshot, TProvenance, TSlotMetadata, TSimulationLineage>
  >;
  saveRecordEnvelopeSchemaStagesByIdentityV1.set(schema, stages);
  return schema;
}

export const saveJsonLimitsV1 = parseStrictJsonLimitsV1({
  maxBytes: 5_242_880,
  maxDepth: 64,
  maxArrayItems: 10_000,
  maxObjectMembers: 10_000,
  maxNodes: 100_000,
  maxStringBytes: 262_144,
});

export { exactDescriptors as exactEnvelopeDescriptorsV1, parseByteExport as parseByteExportV1 };
