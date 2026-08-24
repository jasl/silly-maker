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

export const saveAnnotationLimitsV1 = {
  maxSummaryLines: 8,
  maxSummaryLineLength: 120,
  maxNoteLength: 64,
};

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
    (!allowEmpty && value.length === 0)
  ) {
    throw new TypeError("invalid SaveAnnotationV1 summary");
  }
  if (value.length > saveAnnotationLimitsV1.maxSummaryLines) {
    throw new TypeError("SaveAnnotationV1 summary has too many lines");
  }
  if (Object.keys(value).length !== value.length) {
    throw new TypeError("invalid SaveAnnotationV1 summary fields");
  }
  const summary = value.map((entry) => {
    return parseAnnotationLineV1(
      entry,
      saveAnnotationLimitsV1.maxSummaryLineLength,
      "SaveAnnotationV1 summary line",
    );
  });
  return summary.length === 0 ? null : summary;
}

/**
 * @internal Captures one Story summary as dense, detached package data.
 * Intentionally absent from the public contracts barrel.
 */
export function normalizeSaveSummaryInternalV1(value: unknown): readonly string[] | null {
  if (value === null) return null;
  return parseSaveSummaryArrayV1(value, true);
}

export function parseSaveAnnotationV1(value: unknown): SaveAnnotationV1 {
  const fields = exactFields(value, ["summary", "note"], "SaveAnnotationV1");
  const summaryValue = fields.summary;
  const summary = summaryValue === null ? null : parseSaveSummaryArrayV1(summaryValue, false);
  const noteValue = fields.note;
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
  return { summary, note };
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

interface SaveRecordEnvelopeSchemaStagesInternalV1 {
  readonly snapshotSchema: RuntimeSchemaV1<unknown>;
  readonly provenanceSchema: RuntimeSchemaV1<unknown>;
  readonly slotMetadataSchema: RuntimeSchemaV1<unknown>;
  readonly simulationLineageSchema: RuntimeSchemaV1<unknown>;
}

const saveRecordEnvelopeSchemaStagesV1 = Symbol(
  "SaveRecordEnvelopeSchemaV1.stages",
);

/**
 * A staged Save-envelope schema. Its package-internal parse stages are carried
 * directly by the normalized typed value returned from the schema factory.
 */
export interface SaveRecordEnvelopeSchemaV1<TSaveRecord> extends RuntimeSchemaV1<TSaveRecord> {
  readonly [saveRecordEnvelopeSchemaStagesV1]: SaveRecordEnvelopeSchemaStagesInternalV1;
}

function saveRecordEnvelopeSchemaStagesForV1<TSaveRecord>(
  schema: SaveRecordEnvelopeSchemaV1<TSaveRecord>,
): SaveRecordEnvelopeSchemaStagesInternalV1 {
  return schema[saveRecordEnvelopeSchemaStagesV1];
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

type ExactRecord = Record<string, unknown>;

function exactFields(value: unknown, fields: readonly string[], label: string): ExactRecord {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`invalid ${label}`);
  }
  const record = value as Record<string, unknown>;
  if (Object.keys(record).sort().join("\0") !== [...fields].sort().join("\0")) {
    throw new TypeError(`invalid ${label} fields`);
  }
  return Object.fromEntries(fields.map((field) => [field, record[field]]));
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
  const record = exactFields(value, fields, label);
  const bytesValue = record.bytes;
  if (!(bytesValue instanceof Uint8Array)) {
    throw new TypeError(`invalid ${label} bytes`);
  }
  const bytes = Uint8Array.from(bytesValue);
  const digest = parseDigest(record.digest);
  if (digest !== digestBytes(bytes)) throw new TypeError(`${label} digest mismatch`);
  if (record.mediaType !== "application/json") {
    throw new TypeError(`invalid ${label} mediaType`);
  }
  return {
    filename: requiredString(record.filename, `${label} filename`),
    mediaType: "application/json" as const,
    digest,
    bytes,
  } as T;
}

export const exportedSaveSchemaV1: RuntimeSchemaV1<ExportedSaveV1> = {
  parse(value: unknown) {
    return parseByteExport<ExportedSaveV1>(value, "ExportedSaveV1");
  },
};

export const sessionLeaseStatusSchemaV1: RuntimeSchemaV1<SessionLeaseStatusV1> = {
  parse(value: unknown) {
    if (value === null || typeof value !== "object") {
      throw new TypeError("invalid SessionLeaseStatusV1");
    }
    const kind = Reflect.get(value, "kind");
    if (kind === "owned" || kind === "readonly") {
      const fields = exactFields(
        value,
        ["kind", "ownerId", "fencingToken"],
        "SessionLeaseStatusV1",
      );
      return {
        kind,
        ownerId: requiredString(fields.ownerId, "ownerId") as SessionLeaseOwnerId,
        fencingToken: parsePositiveSafeInteger(fields.fencingToken),
      };
    }
    if (kind === "handoff_requested") {
      const fields = exactFields(
        value,
        ["kind", "ownerId", "fencingToken", "requestId", "requestedByOwnerId"],
        "SessionLeaseStatusV1",
      );
      return {
        kind,
        ownerId: requiredString(fields.ownerId, "ownerId") as SessionLeaseOwnerId,
        fencingToken: parsePositiveSafeInteger(fields.fencingToken),
        requestId: requiredString(fields.requestId, "requestId") as LeaseHandoffRequestId,
        requestedByOwnerId: requiredString(
          fields.requestedByOwnerId,
          "requestedByOwnerId",
        ) as SessionLeaseOwnerId,
      };
    }
    if (kind === "unowned") {
      const fields = exactFields(
        value,
        ["kind", "ownerId", "fencingToken"],
        "SessionLeaseStatusV1",
      );
      if (fields.ownerId !== null) throw new TypeError("unowned lease has an owner");
      return {
        kind,
        ownerId: null,
        fencingToken: parsePositiveSafeInteger(fields.fencingToken),
      };
    }
    if (kind === "unavailable") {
      const fields = exactFields(
        value,
        ["kind", "ownerId", "fencingToken", "code"],
        "SessionLeaseStatusV1",
      );
      if (fields.ownerId !== null || fields.fencingToken !== null) {
        throw new TypeError("unavailable lease carries ownership");
      }
      return {
        kind,
        ownerId: null,
        fencingToken: null,
        code: requiredString(fields.code, "lease unavailable code"),
      };
    }
    throw new TypeError("invalid SessionLeaseStatusV1 kind");
  },
};

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
  const fields = exactFields(
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
  const formatRevision = fields.formatRevision;
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
  const recordRevision = parsePositiveSafeInteger(fields.recordRevision);
  const provenance = stages.provenanceSchema.parse(fields.provenance);
  const slot = stages.slotMetadataSchema.parse(fields.slot);
  const savedAt = parseIsoUtcInstantV1(fields.savedAt);
  let stateDigest: Digest;
  try {
    stateDigest = parseDigest(fields.stateDigest);
  } catch {
    throw new SaveRecordEnvelopeSchemaFailureV1("digest.invalid_format");
  }
  const simulationLineage = stages.simulationLineageSchema.parse(
    fields.simulationLineage,
  );
  const annotation = hasAnnotation ? parseSaveAnnotationV1(fields.annotation) : null;
  const versionStamp = hasVersionStamp
    ? normalizeVersionStampInternalV1(fields.versionStamp)
    : null;
  return {
    formatRevision: 1 as const,
    recordRevision,
    provenance,
    slot,
    savedAt,
    stateDigest,
    snapshot: fields.snapshot,
    simulationLineage,
    ...(annotation === null ? {} : { annotation }),
    // Diagnostic-only: normalize/omit instead of reject (see the field doc).
    ...(versionStamp === null ? {} : { versionStamp }),
  };
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
  return { ...shell, snapshot } as DeepReadonly<TSaveRecord>;
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
  const stages: SaveRecordEnvelopeSchemaStagesInternalV1 = {
    snapshotSchema,
    provenanceSchema,
    slotMetadataSchema,
    simulationLineageSchema,
  };
  const schema: SaveRecordEnvelopeSchemaV1<
    SaveRecordEnvelopeV1<TSnapshot, TProvenance, TSlotMetadata, TSimulationLineage>
  > = {
    [saveRecordEnvelopeSchemaStagesV1]: stages,
    parse(value: unknown) {
      const shell = parseSaveRecordEnvelopeShellWithStagesV1(value, stages);
      const snapshot = snapshotSchema.parse(shell.snapshot);
      return { ...shell, snapshot } as SaveRecordEnvelopeV1<
        TSnapshot,
        TProvenance,
        TSlotMetadata,
        TSimulationLineage
      >;
    },
  };
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

export { exactFields as exactEnvelopeFieldsV1, parseByteExport as parseByteExportV1 };
