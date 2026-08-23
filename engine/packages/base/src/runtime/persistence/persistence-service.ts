// SPDX-License-Identifier: MIT
import type {
  LeaseHandoffRequestId,
  PlayerPersistencePortV1,
  PlayerWritableSaveSlotIdV1,
  SaveSlotIdV1,
  SessionLeaseOwnerId,
} from "../../contracts/application.ts";
import {
  createSaveSlotIdsV1,
  defaultManualSaveSlotCountV1,
  isPlayerWritableSaveSlotIdV1,
  isSaveSlotIdShapeV1,
  manualSaveSlotIdV1,
  manualSaveSlotIndexV1,
  parseManualSaveSlotCountV1,
} from "../../contracts/application.ts";
import { digestBytes, digestCanonicalInternalV1 } from "../../contracts/digest.ts";
import type { HostAtomicRecordStoreV1, IsoUtcInstant } from "../../contracts/host.ts";
import {
  normalizeVersionStampInternalV1,
  readVersionStampV1,
} from "../../contracts/version-stamp.ts";
import type { VersionStampV1 } from "../../contracts/version-stamp.ts";
import type {
  AppliedHotfixV1,
  PatchReplacementTraceV1,
  PatchSetAdoptionDeclarationV1,
  PatchSetIdentityV1,
} from "../../contracts/hotfix.ts";
import type { BuildProvenanceV1 } from "../../contracts/provenance.ts";
import type { PersistenceSafepointClassificationV1 } from "../../contracts/persistence-safepoint.ts";
import type { SaveStateMigrationRegistryV1 } from "../../contracts/save-state-migration.ts";
import type { SaveStateMigrationReceiptV1 } from "../../contracts/save-state-migration.ts";
import type {
  ExportedSaveV1,
  PersistenceOperationResultV1,
  PersistenceStatusV1,
  SaveBackupExportOperationResultV1,
  SaveBackupInspectionResultV1,
  SaveBackupOperationResultV1,
  SaveCodecContextV1,
  SaveExportOperationResultV1,
  SaveImportInvariantViewV1,
  SaveImportValidationContextV1,
  SaveImportValidationResultV1,
  SaveInspectionDiagnosticsV1,
  SaveInspectionResultV1,
  SaveRecordEnvelopeV1,
  SaveRewriteOperationResultV1,
  SaveSlotSummaryV1,
  SessionLeaseOperationResultV1,
  SessionLeaseStatusV1,
  SimulationAdoptionV1,
} from "../../contracts/persistence.ts";
import {
  createSaveRecordEnvelopeSchemaV1,
  normalizeSaveSummaryInternalV1,
  parseSaveNoteV1,
} from "../../contracts/persistence.ts";
import type {
  DeepReadonly,
  NonNegativeSafeInteger,
  PositiveSafeInteger,
  RuntimeSchemaV1,
} from "../../contracts/values.ts";
import {
  parseDigest,
  parseNonNegativeSafeInteger,
  parsePositiveSafeInteger,
} from "../../contracts/values.ts";
import type { SnapshotWorkInstrumentationV1 } from "../../internal/snapshot-work-instrumentation.ts";
import {
  formatLegacyExportTimestampInternalV1,
  scanUtcInstantFieldsInternalV1,
} from "../../internal/utc-instant.ts";
import type {
  AuthoritativeReplacementOwnerInternalV1,
  AuthoritativeReplacementPublicationContextInternalV1,
  GameSessionRuntimeControlV1,
} from "../session/game-session.ts";
import {
  bindAuthoritativeReplacementCommitInternalV1,
  bindAuthoritativeReplacementPrepareCallbackInternalV1,
  createPreparedAuthoritativeReplacementCommitInternalV1,
  lookupAuthoritativeReplacementOwnerInternalV1,
  lookupInstalledSnapshotDigestInternalV1,
} from "../session/game-session.ts";
import type { AutoSaveAttemptReceiptInternalV1 } from "./auto-save-queue.ts";
import {
  commitPreparedAutoSaveAnchorInternalV1,
  createAutoSaveQueueInternalV1,
  enqueueAutoSaveWithReceiptInternalV1,
  prepareAutoSaveAnchorWithReceiptInternalV1,
  runPreparedAutoSaveAnchorPostCommitInternalV1,
} from "./auto-save-queue.ts";
import {
  admitAdoptionDeclarationsInternalV1,
  classifySaveCompatibilityV1,
  finishSaveImportCandidateInternalV1,
  finishSaveReanchorCandidateInternalV1,
  prepareSaveImportCandidateInternalV1,
  resumeSaveImportCandidateInternalV1,
  validateSaveImportCandidateV1,
} from "./compatibility.ts";
export { admitAdoptionDeclarationsInternalV1 } from "./compatibility.ts";
import { encodeSaveRecordInternalV1 } from "./save-codec.ts";
import type {
  SaveRepositorySlotMetadataV1,
  SaveRepositoryV1,
  SaveRepositoryWriteResultV1,
} from "./save-repository.ts";
import {
  createSaveRepositoryInternalV1,
  matchesCommittedSaveWriteReceiptInternalV1,
} from "./save-repository.ts";
import type { SessionLeaseFenceV1, SessionLeaseV1 } from "./session-lease.ts";
import { createSessionLeaseV1 } from "./session-lease.ts";

export type SaveSummaryProjectionEventInternalV1<TState = unknown> =
  | { readonly phase: "before"; readonly state: DeepReadonly<TState> }
  | {
    readonly phase: "returned";
    readonly state: DeepReadonly<TState>;
    readonly value: readonly string[] | null;
  }
  | { readonly phase: "threw"; readonly state: DeepReadonly<TState>; readonly error: unknown };

export interface SaveSummaryProjectionInstrumentationInternalV1<TState = unknown> {
  record(event: SaveSummaryProjectionEventInternalV1<TState>): unknown;
}

interface PersistenceServiceTestOptionsInternalV1<TState> {
  readonly wrapRepositoryForWriteReceiptFallback?: boolean;
  readonly autoSaveInitialAnchorEpoch?: NonNegativeSafeInteger;
  readonly saveSummaryProjectionInstrumentation?: SaveSummaryProjectionInstrumentationInternalV1<
    TState
  >;
}

function recordSaveSummaryProjectionInternalV1<TState>(
  instrumentation: SaveSummaryProjectionInstrumentationInternalV1<TState> | undefined,
  event: SaveSummaryProjectionEventInternalV1<TState>,
): void {
  try {
    const result = instrumentation?.record(event);
    if (result !== undefined) void Promise.resolve(result).catch(() => undefined);
  } catch {
    // Test instrumentation is observational and cannot affect Save capture.
  }
}

type PersistenceSaveRecordV1<TSnapshot> = SaveRecordEnvelopeV1<
  TSnapshot,
  BuildProvenanceV1,
  SaveRepositorySlotMetadataV1,
  readonly SimulationAdoptionV1[]
>;

type PersistencePortV1 = PlayerPersistencePortV1<
  SaveSlotSummaryV1,
  PersistenceStatusV1,
  PersistenceOperationResultV1,
  ExportedSaveV1,
  SaveExportOperationResultV1,
  SessionLeaseStatusV1,
  SessionLeaseOperationResultV1,
  SaveInspectionResultV1,
  SaveBackupInspectionResultV1,
  SaveRewriteOperationResultV1,
  SaveBackupOperationResultV1,
  SaveBackupExportOperationResultV1
>;

/** @internal Exact Save and released lease generation carried between Core instances. */
export interface PersistenceRebootstrapHandoffInternalV1 {
  readonly save: DeepReadonly<ExportedSaveV1>;
  readonly lease: DeepReadonly<SessionLeaseFenceV1>;
}

export interface PersistenceServiceV1<TSnapshot> {
  readonly port: PersistencePortV1;
  getSimulationLineage(): readonly DeepReadonly<SimulationAdoptionV1>[];
  establishAnchor(
    snapshot: DeepReadonly<TSnapshot>,
    simulationLineage: readonly DeepReadonly<SimulationAdoptionV1>[],
  ): void;
  /**
   * Enqueues one auto-save candidate for the given committed Snapshot. Used
   * by application-level autosave policies when the service was created with
   * `autoSaveCapture: "external"`; a no-op after disposal or mutation fencing.
   */
  captureAutoSave(snapshot: DeepReadonly<TSnapshot>): void;
  autoSaveIdle(): Promise<void>;
  dispose(): Promise<void>;
}

export type PersistenceAutoSaveAttemptReceiptInternalV1 =
  | {
    readonly kind: "saved";
  }
  | {
    readonly kind: "failed";
    readonly result: PersistenceOperationResultV1 | null;
  }
  | {
    readonly kind: "superseded";
  };

interface PersistenceServiceControlInternalV1 {
  captureAutoSaveWithReceipt(
    snapshot: unknown,
  ): Promise<PersistenceAutoSaveAttemptReceiptInternalV1>;
  loadWithReplacementCommit(
    slot: SaveSlotIdV1,
    onReplacementCommit: () => void,
    publicationContext?: AuthoritativeReplacementPublicationContextInternalV1,
  ): Promise<PersistenceOperationResultV1>;
  importWithReplacementCommit(
    bytes: Uint8Array,
    onReplacementCommit: () => void,
    publicationContext?: AuthoritativeReplacementPublicationContextInternalV1,
  ): Promise<PersistenceOperationResultV1>;
  bindAnchorReplacement<TResult>(
    outcome: object,
    simulationLineage: readonly DeepReadonly<SimulationAdoptionV1>[],
    onReplacementCommit: () => void,
    normalizePrepareFailure: (error: unknown) => TResult,
    publicationContext?: AuthoritativeReplacementPublicationContextInternalV1,
  ): void;
  fencePlayerMutations(): void;
  disposeForRebootstrap(): Promise<PersistenceRebootstrapHandoffInternalV1>;
  adoptRebootstrapHandoff(
    handoff: DeepReadonly<PersistenceRebootstrapHandoffInternalV1>,
  ): Promise<void>;
}

const persistenceServiceControlsInternalV1 = new WeakMap<
  object,
  PersistenceServiceControlInternalV1
>();

export function captureAutoSaveWithReceiptInternalV1<TSnapshot>(
  service: PersistenceServiceV1<TSnapshot>,
  snapshot: DeepReadonly<TSnapshot>,
): Promise<PersistenceAutoSaveAttemptReceiptInternalV1> {
  const control = persistenceServiceControlsInternalV1.get(service);
  if (control === undefined) {
    throw new TypeError("Persistence service does not support exact Auto Save receipts");
  }
  return control.captureAutoSaveWithReceipt(snapshot);
}

export function fencePersistencePlayerMutationsInternalV1<TSnapshot>(
  service: PersistenceServiceV1<TSnapshot>,
): void {
  const control = persistenceServiceControlsInternalV1.get(service);
  if (control === undefined) {
    throw new TypeError("Persistence service does not support mutation fencing");
  }
  control.fencePlayerMutations();
}

/** @internal Retires one fenced runtime into a ready-only exact Save + lease handoff. */
export function disposePersistenceForRebootstrapInternalV1<TSnapshot>(
  service: PersistenceServiceV1<TSnapshot>,
): Promise<PersistenceRebootstrapHandoffInternalV1> {
  const control = persistenceServiceControlsInternalV1.get(service);
  if (control === undefined) {
    throw new TypeError("Persistence service does not support rebootstrap disposal");
  }
  return control.disposeForRebootstrap();
}

/** @internal Admits one exact Save, takes its released fence, then atomically installs its anchor. */
export function adoptPersistenceRebootstrapHandoffInternalV1<TSnapshot>(
  service: PersistenceServiceV1<TSnapshot>,
  handoff: DeepReadonly<PersistenceRebootstrapHandoffInternalV1>,
): Promise<void> {
  const control = persistenceServiceControlsInternalV1.get(service);
  if (control === undefined) {
    throw new TypeError("Persistence service does not support rebootstrap adoption");
  }
  return control.adoptRebootstrapHandoff(handoff);
}

/** @internal Binds application presentation attribution to one queued load commit. */
export function loadWithReplacementCommitInternalV1<TSnapshot>(
  service: PersistenceServiceV1<TSnapshot>,
  slot: SaveSlotIdV1,
  onReplacementCommit: () => void,
  publicationContext?: AuthoritativeReplacementPublicationContextInternalV1,
): Promise<PersistenceOperationResultV1> {
  const control = persistenceServiceControlsInternalV1.get(service);
  if (control === undefined) {
    throw new TypeError("Persistence service does not support replacement commit binding");
  }
  return control.loadWithReplacementCommit(slot, onReplacementCommit, publicationContext);
}

/** @internal Binds application presentation attribution to one queued import commit. */
export function importWithReplacementCommitInternalV1<TSnapshot>(
  service: PersistenceServiceV1<TSnapshot>,
  bytes: Uint8Array,
  onReplacementCommit: () => void,
  publicationContext?: AuthoritativeReplacementPublicationContextInternalV1,
): Promise<PersistenceOperationResultV1> {
  const control = persistenceServiceControlsInternalV1.get(service);
  if (control === undefined) {
    throw new TypeError("Persistence service does not support replacement commit binding");
  }
  return control.importWithReplacementCommit(bytes, onReplacementCommit, publicationContext);
}

/** @internal Atomically joins a package-owned non-migration replay-base replacement. */
export function bindPersistenceAnchorReplacementInternalV1<TSnapshot, TResult>(
  service: PersistenceServiceV1<TSnapshot>,
  outcome: object,
  simulationLineage: readonly DeepReadonly<SimulationAdoptionV1>[],
  onReplacementCommit: () => void,
  normalizePrepareFailure: (error: unknown) => TResult,
  publicationContext?: AuthoritativeReplacementPublicationContextInternalV1,
): void {
  const control = persistenceServiceControlsInternalV1.get(service);
  if (control === undefined) {
    throw new TypeError("Persistence service does not support atomic anchor replacement");
  }
  control.bindAnchorReplacement(
    outcome,
    simulationLineage,
    onReplacementCommit,
    normalizePrepareFailure,
    publicationContext,
  );
}

export type PersistenceLeaseAcquisitionV1 = "acquire_initial" | "deferred_rebootstrap";

/**
 * Who feeds committed Snapshots into the auto-save queue: the service's own
 * committed-snapshot subscription (default), or an external policy calling
 * `captureAutoSave` (for example a debounced application autosave policy).
 */
export type PersistenceAutoSaveCaptureV1 = "committed_snapshots" | "external";

/** Stable UTC `yyyyMMddHHmmss` used only in suggested export filenames. */
function formatExportTimestampV1(instant: IsoUtcInstant): string | null {
  const fields = scanUtcInstantFieldsInternalV1(instant);
  return fields === null ? null : formatLegacyExportTimestampInternalV1(fields);
}

export interface CreatePersistenceServiceOptionsV1<
  TState,
  TSnapshot extends {
    readonly state: TState;
    readonly commandSequence: NonNegativeSafeInteger;
  },
> {
  readonly runtimeControl: GameSessionRuntimeControlV1<TSnapshot>;
  readonly repository: SaveRepositoryV1<PersistenceSaveRecordV1<TSnapshot>>;
  readonly lease: SessionLeaseV1;
  readonly validation: SaveImportValidationContextV1<
    TState,
    TSnapshot,
    PersistenceSaveRecordV1<TSnapshot>
  >;
  readonly provenance: DeepReadonly<BuildProvenanceV1>;
  readonly initialSimulationLineage: readonly DeepReadonly<SimulationAdoptionV1>[];
  readonly metadataClock: { now(): IsoUtcInstant };
  readonly exportFilename: string;
  /** Numbered manual slots exposed by this application (default 8, range 0..99). */
  readonly manualSaveSlotCount?: number;
  readonly leaseAcquisition?: PersistenceLeaseAcquisitionV1;
  readonly autoSaveCapture?: PersistenceAutoSaveCaptureV1;
  /**
   * Optional application projector: summary lines stored in every written
   * record's annotation (custom slot pickers may consume them). Must be deterministic
   * for a given state; a throwing projector fails the capture.
   */
  summarizeSave?(state: DeepReadonly<TState>): readonly string[] | null;
  /**
   * Optional persistence-safepoint gate over player-slot writes: when the
   * live state classifies `in_flight`, `save()` rejects with `in_flight`
   * instead of exporting a mid-span state. The caller owns the policy
   * (bound accounting, classifier failure handling) and must hand the
   * service a non-throwing classifier.
   */
  classifyWriteCandidate?(state: DeepReadonly<TState>): PersistenceSafepointClassificationV1;
  /**
   * Diagnostic build stamp captured once for each service and attached to new
   * Snapshot captures. Annotation rewrites and Auto rotation preserve the
   * original stamp. Defaults to `readVersionStampV1`; malformed/all-null
   * results are omitted so headless runs keep the pre-stamp record bytes.
   * Strictly diagnostic — import compatibility never reads it.
   */
  collectVersionStamp?(): VersionStampV1;
}

export interface CreateStandardPersistenceServiceOptionsV1<
  TState,
  TSnapshot extends {
    readonly state: TState;
    readonly commandSequence: NonNegativeSafeInteger;
  },
> {
  readonly runtimeControl: GameSessionRuntimeControlV1<TSnapshot>;
  readonly records: HostAtomicRecordStoreV1;
  readonly snapshotSchema: RuntimeSchemaV1<TSnapshot>;
  readonly provenance: DeepReadonly<BuildProvenanceV1>;
  readonly adoptionDeclarations: readonly DeepReadonly<PatchSetAdoptionDeclarationV1>[];
  readonly saveStateMigrations: SaveStateMigrationRegistryV1 | null;
  readonly ownerId: SessionLeaseOwnerId;
  nextHandoffRequestId(): LeaseHandoffRequestId;
  validateReferences(state: DeepReadonly<TState>): readonly string[];
  validateInvariants(view: DeepReadonly<SaveImportInvariantViewV1<TState>>): readonly string[];
  readonly initialSimulationLineage: readonly DeepReadonly<SimulationAdoptionV1>[];
  readonly metadataClock: { now(): IsoUtcInstant };
  readonly exportFilename: string;
  /** Numbered manual slots exposed by this application (default 8, range 0..99). */
  readonly manualSaveSlotCount?: number;
  readonly leaseAcquisition?: PersistenceLeaseAcquisitionV1;
  readonly autoSaveCapture?: PersistenceAutoSaveCaptureV1;
  /**
   * Optional application projector: summary lines stored in every written
   * record's annotation (custom slot pickers may consume them). Must be deterministic
   * for a given state; a throwing projector fails the capture.
   */
  summarizeSave?(state: DeepReadonly<TState>): readonly string[] | null;
  /** See CreatePersistenceServiceOptionsV1.classifyWriteCandidate. */
  classifyWriteCandidate?(state: DeepReadonly<TState>): PersistenceSafepointClassificationV1;
  /** See CreatePersistenceServiceOptionsV1.collectVersionStamp. */
  collectVersionStamp?(): VersionStampV1;
}

interface SaveCandidateV1<TSnapshot> {
  readonly snapshot: DeepReadonly<TSnapshot>;
  readonly simulationLineage: readonly DeepReadonly<SimulationAdoptionV1>[];
  readonly savedAt: IsoUtcInstant;
  /**
   * Application summary lines captured once per candidate so the record
   * bytes stay deterministic across the write-then-verify re-encode.
   */
  readonly summary: readonly string[] | null;
}

interface AutoCandidateV1<TSnapshot> {
  readonly snapshot: TSnapshot;
  readonly simulationLineage: readonly SimulationAdoptionV1[];
  readonly fence: SessionLeaseFenceV1 | null;
  readonly attemptIdentity: object;
}

function copyLineageV1(
  lineage: readonly DeepReadonly<SimulationAdoptionV1>[],
): readonly SimulationAdoptionV1[] {
  return Object.freeze(lineage.map((entry) => Object.freeze({ ...entry })));
}

function bytesEqualV1(left: Uint8Array, right: Uint8Array): boolean {
  return (
    left.byteLength === right.byteLength && left.every((value, index) => value === right[index])
  );
}

function rejectedV1(
  code: Extract<PersistenceOperationResultV1, { readonly kind: "rejected" }>["code"],
): PersistenceOperationResultV1 {
  return Object.freeze({ kind: "rejected", code });
}

function faultedV1(code = "persistence.unexpected"): PersistenceOperationResultV1 {
  return Object.freeze({ kind: "faulted", code });
}

function exportRejectedV1(
  code: Extract<SaveExportOperationResultV1, { readonly kind: "rejected" }>["code"],
): SaveExportOperationResultV1 {
  return Object.freeze({ kind: "rejected", code });
}

function saveInspectionDiagnosticsV1(input: {
  readonly codes?: readonly string[];
  readonly validation?: SaveImportValidationResultV1<unknown>;
} = {}): SaveInspectionDiagnosticsV1 {
  const validation = input.validation;
  const migrationAttempt = validation !== undefined && "migrationAttempt" in validation
    ? validation.migrationAttempt
    : null;
  const migrationReasonCode = validation !== undefined && "reasonCode" in validation
    ? validation.reasonCode
    : null;
  const unavailable = validation?.kind === "inspect_only" && "code" in validation
    ? validation
    : null;
  return Object.freeze({
    codes: Object.freeze([...(input.codes ?? [])]),
    migrationAttempt,
    migrationReasonCode,
    storedStateContractRevision: unavailable?.storedStateContractRevision ?? null,
    currentStateContractRevision: unavailable?.currentStateContractRevision ?? null,
  });
}

function projectSaveInspectionValidationV1(
  slotId: SaveSlotIdV1,
  validation: SaveImportValidationResultV1<unknown>,
): SaveInspectionResultV1 {
  if (validation.kind === "exact") {
    return validation.migration === null
      ? Object.freeze({
        kind: "direct",
        slotId,
        warnings: validation.warnings,
        diagnostics: saveInspectionDiagnosticsV1({ validation }),
      })
      : Object.freeze({
        kind: "migration_required",
        slotId,
        migration: validation.migration,
        warnings: validation.warnings,
        diagnostics: saveInspectionDiagnosticsV1({ validation }),
      });
  }
  if (validation.kind === "adopted") {
    return validation.migration === null
      ? Object.freeze({
        kind: "adoption_required",
        slotId,
        adoption: validation.adoption,
        warnings: validation.warnings,
        diagnostics: saveInspectionDiagnosticsV1({ validation }),
      })
      : Object.freeze({
        kind: "migration_and_adoption_required",
        slotId,
        migration: validation.migration,
        adoption: validation.adoption,
        warnings: validation.warnings,
        diagnostics: saveInspectionDiagnosticsV1({ validation }),
      });
  }
  if (validation.kind === "faulted") {
    return Object.freeze({
      kind: "faulted",
      slotId,
      code: validation.code,
      diagnostics: saveInspectionDiagnosticsV1({
        codes: Object.freeze([validation.code]),
        validation,
      }),
    });
  }
  if (validation.kind === "inspect_only") {
    if ("code" in validation) {
      return Object.freeze({
        kind: "inspect_only",
        slotId,
        code: "migration_unavailable",
        diagnostics: saveInspectionDiagnosticsV1({
          codes: Object.freeze([validation.code]),
          validation,
        }),
      });
    }
    return Object.freeze({
      kind: "inspect_only",
      slotId,
      code: "incompatible",
      diagnostics: saveInspectionDiagnosticsV1({
        codes: Object.freeze([
          ...validation.mismatches.map(({ code }) => code),
          ...validation.warnings.map(({ code }) => code),
        ]),
        validation,
      }),
    });
  }
  const migrationFailure = validation.code === "migration.rejected" ||
    validation.code === "migration.output_invalid";
  if (validation.code === "compatibility.lineage_limit") {
    return Object.freeze({
      kind: "inspect_only",
      slotId,
      code: "reanchor_required",
      diagnostics: saveInspectionDiagnosticsV1({
        codes: Object.freeze([validation.code]),
        validation,
      }),
    });
  }
  return Object.freeze({
    kind: "rejected",
    slotId,
    code: migrationFailure ? "migration_rejected" : "invalid_record",
    diagnostics: saveInspectionDiagnosticsV1({
      codes: Object.freeze([validation.code]),
      validation,
    }),
  });
}

function repositoryRejectionV1(
  code: Extract<SaveRepositoryWriteResultV1, { readonly kind: "rejected" }>["code"],
): PersistenceOperationResultV1 {
  return rejectedV1(code === "empty_slot" ? "empty_slot" : code);
}

async function createPersistenceServiceWithDependenciesV1<
  TState,
  TSnapshot extends {
    readonly state: TState;
    readonly commandSequence: NonNegativeSafeInteger;
  },
>(
  options: CreatePersistenceServiceOptionsV1<TState, TSnapshot>,
  instrumentation?: SnapshotWorkInstrumentationV1,
  testOptions?: PersistenceServiceTestOptionsInternalV1<TState>,
): Promise<PersistenceServiceV1<TSnapshot>> {
  if (typeof options.exportFilename !== "string" || options.exportFilename.length === 0) {
    throw new TypeError("Persistence service requires an export filename");
  }
  const leaseAcquisition = options.leaseAcquisition ?? "acquire_initial";
  if (leaseAcquisition !== "acquire_initial" && leaseAcquisition !== "deferred_rebootstrap") {
    throw new TypeError("invalid persistence lease acquisition");
  }
  const manualSlotCount = parseManualSaveSlotCountV1(
    options.manualSaveSlotCount ?? defaultManualSaveSlotCountV1,
  );
  const slotIds = createSaveSlotIdsV1(manualSlotCount);
  const slotWithinCountV1 = (slot: SaveSlotIdV1): boolean => {
    if (!isSaveSlotIdShapeV1(slot)) return false;
    if (slot === "auto.current" || slot === "auto.previous" || slot === "quick") return true;
    const index = manualSaveSlotIndexV1(slot);
    return index !== null && index <= manualSlotCount;
  };

  // Resolve optional diagnostic metadata before the first lease mutation. A
  // throwing or runtime-malformed collector degrades to absence and therefore
  // cannot strand an acquired lease during service construction.
  const versionStampV1: VersionStampV1 | null = (() => {
    try {
      return normalizeVersionStampInternalV1((options.collectVersionStamp ?? readVersionStampV1)());
    } catch {
      return null;
    }
  })();

  let currentLineage = copyLineageV1(options.initialSimulationLineage);
  const authoritativeReplacementOwner = lookupAuthoritativeReplacementOwnerInternalV1(
    options.runtimeControl,
  );
  let safelySavedCommandSequence: NonNegativeSafeInteger | null = null;
  let lastFailureCode: string | null = null;
  let rebootstrapFailureCode:
    | "rebootstrap_capture_failed"
    | "lease_release_failed"
    | "lease_takeover_failed"
    | null = null;
  let foregroundWrites = 0;
  let autoWrites = 0;
  let physicalTail: Promise<void> = Promise.resolve();
  let lifecycle: "active" | "disposing" | "disposed" = "active";
  let playerMutationsFenced = false;
  let rebootstrapTransferPending = leaseAcquisition === "deferred_rebootstrap";
  let leaseMutationTail: Promise<void> = Promise.resolve();
  let disposalPromise: Promise<void> | null = null;
  let rebootstrapDisposalPromise: Promise<PersistenceRebootstrapHandoffInternalV1> | null = null;
  let rebootstrapAdoptionPromise: Promise<void> | null = null;
  let rebootstrapPhase: "none" | "prepared" | "taken_over" | "anchored" = "none";
  let rebootstrapSave: DeepReadonly<ExportedSaveV1> | null = null;
  let rebootstrapLease: DeepReadonly<SessionLeaseFenceV1> | null = null;
  let leaseStatus = leaseAcquisition === "acquire_initial"
    ? await options.lease.acquireInitial()
    : await options.lease.getStatus();
  if (leaseStatus.kind === "unavailable") lastFailureCode = leaseStatus.code;

  const rememberFailureV1 = (code: string): void => {
    lastFailureCode = code;
  };
  const rememberOperationFailureV1 = (code: string): void => {
    if (code === "unavailable" && lastFailureCode?.startsWith("indexeddb.") === true) return;
    rememberFailureV1(code);
  };
  const rememberSuccessV1 = (sequence: NonNegativeSafeInteger): void => {
    safelySavedCommandSequence = sequence;
    lastFailureCode = null;
  };
  const observeLeaseStatusV1 = (status: SessionLeaseStatusV1): SessionLeaseStatusV1 => {
    leaseStatus = status;
    if (status.kind === "unavailable") rememberFailureV1(status.code);
    return status;
  };
  const refreshLeaseStatusV1 = async (): Promise<SessionLeaseStatusV1> =>
    observeLeaseStatusV1(await options.lease.getStatus());

  const schedulePhysicalV1 = <TResult>(operation: () => Promise<TResult>): Promise<TResult> => {
    const result = physicalTail.then(operation);
    physicalTail = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  };

  const makeRecordV1 = (
    candidate: SaveCandidateV1<TSnapshot>,
    slotId: SaveSlotIdV1,
    writeReason: "auto" | PlayerWritableSaveSlotIdV1,
    recordRevision: PositiveSafeInteger = parsePositiveSafeInteger(1),
  ): PersistenceSaveRecordV1<TSnapshot> => {
    const value = {
      formatRevision: 1 as const,
      recordRevision,
      provenance: options.provenance,
      slot: Object.freeze({
        storyId: options.provenance.story.id,
        slotId,
        writeReason,
        capturedCommandSequence: candidate.snapshot.commandSequence,
      }),
      savedAt: candidate.savedAt,
      stateDigest:
        lookupInstalledSnapshotDigestInternalV1(options.runtimeControl, candidate.snapshot) ??
          digestCanonicalInternalV1("sillymaker:state:v1", candidate.snapshot, instrumentation),
      snapshot: candidate.snapshot,
      simulationLineage: candidate.simulationLineage,
      // A fresh capture starts with no player note; annotateSave adds one.
      ...(candidate.summary === null ? {} : {
        annotation: Object.freeze({ summary: candidate.summary, note: null }),
      }),
      ...(versionStampV1 === null ? {} : { versionStamp: versionStampV1 }),
    };
    const parsed = options.validation.codec.recordSchema.parse(value);
    options.validation.codec.validateEnvelope(
      parsed as DeepReadonly<PersistenceSaveRecordV1<TSnapshot>>,
    );
    return parsed;
  };

  const encodeRecordV1 = (record: DeepReadonly<PersistenceSaveRecordV1<TSnapshot>>): Uint8Array =>
    encodeSaveRecordInternalV1<TSnapshot, PersistenceSaveRecordV1<TSnapshot>>(
      record,
      options.validation.codec,
      instrumentation,
    );

  const captureSummaryV1 = (snapshot: DeepReadonly<TSnapshot>): readonly string[] | null => {
    if (options.summarizeSave === undefined) return null;
    const state = (snapshot as { readonly state: DeepReadonly<TState> }).state;
    recordSaveSummaryProjectionInternalV1(
      testOptions?.saveSummaryProjectionInstrumentation,
      Object.freeze({ phase: "before" as const, state }),
    );
    try {
      const value = normalizeSaveSummaryInternalV1(options.summarizeSave(state));
      recordSaveSummaryProjectionInternalV1(
        testOptions?.saveSummaryProjectionInstrumentation,
        Object.freeze({ phase: "returned" as const, state, value }),
      );
      return value;
    } catch (error) {
      recordSaveSummaryProjectionInternalV1(
        testOptions?.saveSummaryProjectionInstrumentation,
        Object.freeze({ phase: "threw" as const, state, error }),
      );
      throw error;
    }
  };

  const captureV1 = (snapshot: DeepReadonly<TSnapshot>): SaveCandidateV1<TSnapshot> =>
    Object.freeze({
      snapshot,
      simulationLineage: currentLineage,
      savedAt: options.metadataClock.now(),
      summary: captureSummaryV1(snapshot),
    });

  const verifyFenceV1 = async (
    fence: DeepReadonly<SessionLeaseFenceV1>,
  ): Promise<
    | { readonly kind: "owned" }
    | { readonly kind: "conflict" }
    | { readonly kind: "unavailable"; readonly code: string }
  > => {
    const observedStatus = await refreshLeaseStatusV1();
    if (observedStatus.kind === "unavailable") {
      return Object.freeze({ kind: "unavailable", code: observedStatus.code });
    }
    const freshFence = options.lease.captureFence();
    const ownsFence =
      (observedStatus.kind === "owned" || observedStatus.kind === "handoff_requested") &&
      observedStatus.ownerId === fence.ownerId &&
      observedStatus.fencingToken === fence.fencingToken &&
      freshFence !== null &&
      freshFence.ownerId === fence.ownerId &&
      freshFence.fencingToken === fence.fencingToken;
    return Object.freeze({ kind: ownsFence ? "owned" : "conflict" });
  };

  const writeVerifiedV1 = async (
    candidate: SaveCandidateV1<TSnapshot>,
    slotId: "auto.current" | PlayerWritableSaveSlotIdV1,
    fence: DeepReadonly<SessionLeaseFenceV1> | null,
  ): Promise<PersistenceOperationResultV1> => {
    if (fence === null) {
      return rejectedV1("unavailable");
    }
    const reason = slotId === "auto.current" ? "auto" : slotId;
    let record: PersistenceSaveRecordV1<TSnapshot>;
    try {
      record = makeRecordV1(candidate, slotId, reason);
    } catch {
      return faultedV1("persistence.capture_invalid");
    }
    try {
      const written = slotId === "auto.current"
        ? await options.repository.writeAuto(
          record as DeepReadonly<PersistenceSaveRecordV1<TSnapshot>>,
          fence,
        )
        : await options.repository.writePlayer(
          slotId,
          record as DeepReadonly<PersistenceSaveRecordV1<TSnapshot>>,
          fence,
        );
      if (written.kind === "rejected") {
        if (written.code === "unavailable") {
          await refreshLeaseStatusV1();
        }
        return repositoryRejectionV1(written.code);
      }
      return await verifyCommittedWriteV1(
        written,
        slotId,
        fence,
        candidate.snapshot.commandSequence,
        () =>
          makeRecordV1(candidate, slotId, reason, written.recordRevision) as DeepReadonly<
            PersistenceSaveRecordV1<TSnapshot>
          >,
      );
    } catch {
      return faultedV1();
    }
  };

  const verifyCommittedWriteV1 = async (
    written: Extract<SaveRepositoryWriteResultV1, { readonly kind: "saved" }>,
    slotId: "auto.current" | PlayerWritableSaveSlotIdV1,
    fence: DeepReadonly<SessionLeaseFenceV1>,
    capturedCommandSequence: NonNegativeSafeInteger,
    expectedRecord: () => DeepReadonly<PersistenceSaveRecordV1<TSnapshot>>,
  ): Promise<PersistenceOperationResultV1> => {
    try {
      const observed = await options.repository.read(slotId);
      if (observed.health === "unavailable") {
        rememberFailureV1(observed.code);
        return rejectedV1("unavailable");
      }
      const fenceVerification = await verifyFenceV1(fence);
      if (fenceVerification.kind === "unavailable") {
        return rejectedV1("unavailable");
      }
      if (
        fenceVerification.kind !== "owned" ||
        observed.health !== "valid" ||
        Number(observed.hostRevision) !== Number(written.recordRevision) ||
        observed.record.recordRevision !== written.recordRevision ||
        observed.record.slot.capturedCommandSequence !== capturedCommandSequence
      ) {
        return rejectedV1("conflict");
      }
      const receiptMatch = matchesCommittedSaveWriteReceiptInternalV1(
        options.repository,
        written,
        Object.freeze({
          slotId,
          recordRevision: written.recordRevision,
          bytes: observed.bytes,
        }),
      );
      if (receiptMatch === false) {
        return rejectedV1("conflict");
      }
      if (receiptMatch === undefined) {
        const expectedBytes = encodeRecordV1(expectedRecord());
        if (!bytesEqualV1(observed.bytes, expectedBytes)) {
          return rejectedV1("conflict");
        }
      }
      return Object.freeze({ kind: "saved" as const, slotId });
    } catch {
      return faultedV1();
    }
  };

  let lastSuccessfulAutoSnapshot: DeepReadonly<TSnapshot> | null = null;
  let lastSuccessfulAutoFence: DeepReadonly<SessionLeaseFenceV1> | null = null;
  let lastSuccessfulAutoPhysicalOrder: NonNegativeSafeInteger | null = null;
  let nextAutoPhysicalOrder = parseNonNegativeSafeInteger(0);
  let lastSuccessfulAutoClearOrder = parseNonNegativeSafeInteger(0);
  const autoPhysicalOrderByAttempt = new WeakMap<object, NonNegativeSafeInteger>();
  const takeNextAutoPhysicalOrderV1 = (): NonNegativeSafeInteger => {
    nextAutoPhysicalOrder = parseNonNegativeSafeInteger(Number(nextAutoPhysicalOrder) + 1);
    return nextAutoPhysicalOrder;
  };
  let autoSaveAttemptsBySnapshot = new WeakMap<
    object,
    {
      readonly anchorEpoch: NonNegativeSafeInteger;
      readonly fence: DeepReadonly<SessionLeaseFenceV1> | null;
      readonly attemptIdentity: object;
      readonly settled: Promise<PersistenceAutoSaveAttemptReceiptInternalV1>;
    }
  >();
  const autoQueue = createAutoSaveQueueInternalV1<
    AutoCandidateV1<TSnapshot>,
    PersistenceOperationResultV1
  >(
    {
      async write(candidate) {
        autoWrites += 1;
        try {
          const savedAt = options.metadataClock.now();
          const summary = captureSummaryV1(candidate.snapshot);
          autoPhysicalOrderByAttempt.set(candidate.attemptIdentity, takeNextAutoPhysicalOrderV1());
          return await schedulePhysicalV1(() =>
            writeVerifiedV1(
              Object.freeze({ ...candidate, savedAt, summary }),
              "auto.current",
              candidate.fence,
            )
          );
        } catch {
          return faultedV1();
        } finally {
          autoWrites -= 1;
        }
      },
      isSuccessfulResult(result) {
        return result.kind === "saved" || lifecycle !== "active";
      },
      onCurrentResult(candidate, result) {
        if (result.kind === "saved") {
          lastSuccessfulAutoSnapshot = candidate.snapshot;
          lastSuccessfulAutoFence = candidate.fence === null
            ? null
            : Object.freeze({ ...candidate.fence });
          lastSuccessfulAutoPhysicalOrder =
            autoPhysicalOrderByAttempt.get(candidate.attemptIdentity) ?? null;
          rememberSuccessV1(candidate.snapshot.commandSequence);
        } else if (result.kind === "rejected" || result.kind === "faulted") {
          rememberOperationFailureV1(result.code);
        }
      },
      onFailure() {
        rememberFailureV1("persistence.unexpected");
      },
    },
    {
      ...(testOptions?.autoSaveInitialAnchorEpoch === undefined
        ? {}
        : { initialAnchorEpoch: testOptions.autoSaveInitialAnchorEpoch }),
    },
  );

  const sameAutoSaveFenceV1 = (
    left: DeepReadonly<SessionLeaseFenceV1> | null,
    right: DeepReadonly<SessionLeaseFenceV1> | null,
  ): boolean =>
    left === null || right === null
      ? left === right
      : left.ownerId === right.ownerId && left.fencingToken === right.fencingToken;

  const createTrackedAutoSaveAttemptV1 = (
    attemptMap: typeof autoSaveAttemptsBySnapshot,
    snapshot: DeepReadonly<TSnapshot>,
    fence: DeepReadonly<SessionLeaseFenceV1> | null,
    anchorEpoch: NonNegativeSafeInteger,
    attemptIdentity: object,
    receipt: Promise<AutoSaveAttemptReceiptInternalV1<PersistenceOperationResultV1>>,
  ): Promise<PersistenceAutoSaveAttemptReceiptInternalV1> => {
    const snapshotKey = snapshot as object;
    const settled = receipt
      .then((attemptReceipt): PersistenceAutoSaveAttemptReceiptInternalV1 => {
        if (attemptReceipt.kind === "superseded") {
          return Object.freeze({ kind: "superseded" as const });
        }
        if (attemptReceipt.kind === "rejected") {
          return Object.freeze({ kind: "failed" as const, result: null });
        }
        return attemptReceipt.result.kind === "saved"
          ? Object.freeze({ kind: "saved" as const })
          : Object.freeze({
            kind: "failed" as const,
            result: attemptReceipt.result,
          });
      })
      .catch(() =>
        Object.freeze({
          kind: "failed" as const,
          result: null,
        })
      );
    const tracked = Object.freeze({
      anchorEpoch,
      fence: fence === null ? null : Object.freeze({ ...fence }),
      attemptIdentity,
      settled,
    });
    attemptMap.set(snapshotKey, tracked);
    void settled.then(() => {
      if (attemptMap.get(snapshotKey) === tracked) {
        attemptMap.delete(snapshotKey);
      }
    });
    return settled;
  };

  const trackAutoSaveAttemptV1 = (
    snapshot: DeepReadonly<TSnapshot>,
    fence: DeepReadonly<SessionLeaseFenceV1> | null,
    anchorEpoch: NonNegativeSafeInteger,
    attemptIdentity: object,
    receipt: Promise<AutoSaveAttemptReceiptInternalV1<PersistenceOperationResultV1>>,
  ): Promise<PersistenceAutoSaveAttemptReceiptInternalV1> =>
    createTrackedAutoSaveAttemptV1(
      autoSaveAttemptsBySnapshot,
      snapshot,
      fence,
      anchorEpoch,
      attemptIdentity,
      receipt,
    );

  const prepareAnchorCommitV1 = (
    snapshot: DeepReadonly<TSnapshot>,
    simulationLineage: readonly DeepReadonly<SimulationAdoptionV1>[],
    clearLastFailure: boolean,
    onReplacementCommit?: () => void,
  ) => {
    if (lifecycle !== "active" || playerMutationsFenced) {
      throw new TypeError("Persistence service cannot prepare an anchor");
    }
    const nextLineage = copyLineageV1(simulationLineage);
    const nextAttemptsBySnapshot = new WeakMap<
      object,
      {
        readonly anchorEpoch: NonNegativeSafeInteger;
        readonly fence: DeepReadonly<SessionLeaseFenceV1> | null;
        readonly attemptIdentity: object;
        readonly settled: Promise<PersistenceAutoSaveAttemptReceiptInternalV1>;
      }
    >();
    const fence = options.lease.captureFence();
    if (lifecycle !== "active" || playerMutationsFenced) {
      throw new TypeError("Persistence service changed lifecycle during anchor preparation");
    }
    const attemptIdentity = Object.freeze({});
    const candidate = Object.freeze({
      snapshot,
      simulationLineage: nextLineage,
      fence,
      attemptIdentity,
    });
    const autoPlan = prepareAutoSaveAnchorWithReceiptInternalV1<
      AutoCandidateV1<TSnapshot>,
      PersistenceOperationResultV1
    >(autoQueue, candidate);
    void createTrackedAutoSaveAttemptV1(
      nextAttemptsBySnapshot,
      snapshot,
      fence,
      autoPlan.anchorEpoch,
      attemptIdentity,
      autoPlan.receipt,
    );
    return Object.freeze({
      commit() {
        // Auto Save token admission happens before any other live authority
        // assignment, so an invalid/stale token cannot partially install the
        // Persistence participant.
        commitPreparedAutoSaveAnchorInternalV1(autoPlan.prepared);
        lastSuccessfulAutoSnapshot = null;
        lastSuccessfulAutoFence = null;
        lastSuccessfulAutoPhysicalOrder = null;
        autoSaveAttemptsBySnapshot = nextAttemptsBySnapshot;
        currentLineage = nextLineage;
        safelySavedCommandSequence = null;
        if (clearLastFailure) lastFailureCode = null;
      },
      afterPublication() {
        try {
          onReplacementCommit?.();
        } catch {
          // Package-internal presentation attribution is observational and
          // cannot turn a valid authoritative replacement into a fault.
        }
        runPreparedAutoSaveAnchorPostCommitInternalV1(autoPlan.prepared);
      },
    });
  };

  const establishAnchorV1 = (
    snapshot: DeepReadonly<TSnapshot>,
    simulationLineage: readonly DeepReadonly<SimulationAdoptionV1>[],
  ): void => {
    if (lifecycle !== "active" || playerMutationsFenced) return;
    const prepared = prepareAnchorCommitV1(snapshot, simulationLineage, false);
    prepared.commit();
    prepared.afterPublication();
  };

  const captureTrackedAutoSaveV1 = (
    snapshot: DeepReadonly<TSnapshot>,
  ): Promise<PersistenceAutoSaveAttemptReceiptInternalV1> => {
    if (lifecycle !== "active") {
      return Promise.resolve(
        Object.freeze({
          kind: "failed" as const,
          result: faultedV1("runtime_disposed"),
        }),
      );
    }
    if (snapshot === null || typeof snapshot !== "object") {
      rememberFailureV1("persistence.capture_invalid");
      return Promise.resolve(
        Object.freeze({
          kind: "failed" as const,
          result: faultedV1("persistence.capture_invalid"),
        }),
      );
    }
    const snapshotKey = snapshot as object;
    const fence = options.lease.captureFence();
    const anchorEpoch = autoQueue.anchorEpoch();
    const existing = autoSaveAttemptsBySnapshot.get(snapshotKey);
    const existingPhysicalOrder = existing === undefined
      ? undefined
      : autoPhysicalOrderByAttempt.get(existing.attemptIdentity);
    if (
      existing !== undefined &&
      existing.anchorEpoch === anchorEpoch &&
      sameAutoSaveFenceV1(existing.fence, fence) &&
      (existingPhysicalOrder === undefined ||
        Number(existingPhysicalOrder) > Number(lastSuccessfulAutoClearOrder))
    ) {
      return existing.settled;
    }

    const attemptIdentity = Object.freeze({});
    let receipt: ReturnType<
      typeof enqueueAutoSaveWithReceiptInternalV1<
        AutoCandidateV1<TSnapshot>,
        PersistenceOperationResultV1
      >
    >;
    try {
      receipt = enqueueAutoSaveWithReceiptInternalV1<
        AutoCandidateV1<TSnapshot>,
        PersistenceOperationResultV1
      >(
        autoQueue,
        Object.freeze({
          snapshot,
          simulationLineage: currentLineage,
          fence,
          attemptIdentity,
        }),
      );
    } catch {
      rememberFailureV1("persistence.capture_invalid");
      return Promise.resolve(
        Object.freeze({
          kind: "failed" as const,
          result: faultedV1("persistence.capture_invalid"),
        }),
      );
    }
    return trackAutoSaveAttemptV1(snapshot, fence, anchorEpoch, attemptIdentity, receipt);
  };

  const captureAutoSaveV1 = (snapshot: DeepReadonly<TSnapshot>): void => {
    if (lifecycle !== "active" || playerMutationsFenced) return;
    void captureTrackedAutoSaveV1(snapshot);
  };

  const matchesSuccessfulAutoSaveV1 = (snapshot: DeepReadonly<TSnapshot>): boolean => {
    const fence = options.lease.captureFence();
    return (
      lastSuccessfulAutoSnapshot === snapshot &&
      lastSuccessfulAutoFence !== null &&
      lastSuccessfulAutoPhysicalOrder !== null &&
      Number(lastSuccessfulAutoPhysicalOrder) > Number(lastSuccessfulAutoClearOrder) &&
      fence !== null &&
      lastSuccessfulAutoFence.ownerId === fence.ownerId &&
      lastSuccessfulAutoFence.fencingToken === fence.fencingToken &&
      autoQueue.isIdle()
    );
  };

  const refreshSuccessfulAutoSaveV1 = async (
    snapshot: DeepReadonly<TSnapshot>,
    enqueueAfterRefresh: boolean,
  ): Promise<PersistenceAutoSaveAttemptReceiptInternalV1> => {
    try {
      await refreshLeaseStatusV1();
    } catch {
      rememberFailureV1("persistence.unexpected");
      return Object.freeze({ kind: "failed" as const, result: null });
    }
    if (matchesSuccessfulAutoSaveV1(snapshot)) {
      return Object.freeze({ kind: "saved" as const });
    }
    return enqueueAfterRefresh
      ? captureTrackedAutoSaveV1(snapshot)
      : Object.freeze({ kind: "superseded" as const });
  };

  const captureAutoSaveWithReceiptV1 = (
    snapshot: DeepReadonly<TSnapshot>,
  ): Promise<PersistenceAutoSaveAttemptReceiptInternalV1> => {
    if (playerMutationsFenced) {
      const acceptedPhysicalTail = physicalTail;
      const acceptedLeaseTail = leaseMutationTail;
      return Promise.all([acceptedPhysicalTail, acceptedLeaseTail]).then(
        () => refreshSuccessfulAutoSaveV1(snapshot, true),
        () => refreshSuccessfulAutoSaveV1(snapshot, true),
      );
    }
    return matchesSuccessfulAutoSaveV1(snapshot)
      ? refreshSuccessfulAutoSaveV1(snapshot, false)
      : captureTrackedAutoSaveV1(snapshot);
  };

  if ((options.autoSaveCapture ?? "committed_snapshots") === "committed_snapshots") {
    options.runtimeControl.subscribeCommittedSnapshots(captureAutoSaveV1);
  }

  const validationRejectionV1 = (
    result: SaveImportValidationResultV1<PersistenceSaveRecordV1<TSnapshot>>,
  ): PersistenceOperationResultV1 | null => {
    if (result.kind === "faulted") return faultedV1(result.code);
    if (result.kind === "inspect_only") {
      return rejectedV1("code" in result ? "migration_unavailable" : "incompatible");
    }
    if (result.kind !== "rejected") return null;
    if (result.code === "migration.rejected" || result.code === "migration.output_invalid") {
      return rejectedV1("migration_rejected");
    }
    return rejectedV1(
      result.code === "compatibility.lineage_limit" ? "lineage_limit" : "invalid_record",
    );
  };

  const replacementOutcomeFromValidationV1 = (
    validation: SaveImportValidationResultV1<PersistenceSaveRecordV1<TSnapshot>>,
    operation: "loaded" | "imported",
  ) => {
    if (validation.kind === "rejected" && validation.code === "rng.invalid_state") {
      rememberFailureV1(validation.code);
    }
    const rejection = validationRejectionV1(validation);
    if (rejection !== null) {
      return Object.freeze({ kind: "preserve" as const, result: rejection });
    }
    if (validation.kind !== "exact" && validation.kind !== "adopted") {
      throw new TypeError("invalid runnable Save validation result");
    }
    const lineage = validation.kind === "adopted"
      ? Object.freeze([...validation.candidate.simulationLineage, validation.adoption])
      : validation.candidate.simulationLineage;
    return Object.freeze({
      kind: "replace" as const,
      snapshot: validation.candidate.snapshot as TSnapshot,
      result: Object.freeze({
        kind: operation,
        compatibility: validation.kind,
        commandSequence: validation.candidate.snapshot.commandSequence,
      }) as PersistenceOperationResultV1,
      anchor: "replace_replay_base" as const,
      simulationLineage: lineage,
      migration: validation.migration,
    });
  };

  const replacementOutcomeV1 = (bytes: Uint8Array, operation: "loaded" | "imported") =>
    replacementOutcomeFromValidationV1(
      validateSaveImportCandidateV1(bytes, options.validation),
      operation,
    );

  const prepareStoredSlotV1 = async (slotId: SaveSlotIdV1) => {
    const read = await options.repository.readRaw(slotId);
    if (read.health !== "stored") return read;
    const preparation = prepareSaveImportCandidateInternalV1(
      read.bytes,
      options.validation,
      instrumentation,
    );
    if (preparation.kind === "rejected") {
      return Object.freeze({
        health: "invalid" as const,
        slotId,
        hostRevision: read.hostRevision,
        code: preparation.code,
      });
    }
    const physicalFailure = options.repository.validatePhysical(
      slotId,
      read.hostRevision,
      preparation.envelope,
    );
    if (physicalFailure !== null) {
      return Object.freeze({
        health: "invalid" as const,
        slotId,
        hostRevision: read.hostRevision,
        code: physicalFailure,
      });
    }
    return Object.freeze({
      health: "prepared" as const,
      slotId,
      hostRevision: read.hostRevision,
      bytes: read.bytes,
      preparation,
    });
  };

  const validateStoredSlotInternalV1 = async (
    slotId: SaveSlotIdV1,
    executeMigration: boolean,
  ) => {
    const read = await prepareStoredSlotV1(slotId);
    if (read.health !== "prepared") return read;
    let validation: SaveImportValidationResultV1<PersistenceSaveRecordV1<TSnapshot>>;
    if (read.preparation.kind === "migration_pending") {
      if (!executeMigration) {
        validation = read.preparation.result;
      } else {
        const resumed = resumeSaveImportCandidateInternalV1(
          read.preparation,
          options.validation,
          instrumentation,
        );
        validation = resumed.kind === "prepared"
          ? finishSaveImportCandidateInternalV1(resumed, options.validation)
          : resumed;
      }
    } else {
      validation = finishSaveImportCandidateInternalV1(read.preparation, options.validation);
    }
    return Object.freeze({
      health: "validated" as const,
      slotId,
      hostRevision: read.hostRevision,
      bytes: read.bytes,
      envelope: read.preparation.envelope,
      validation,
    });
  };
  const validateStoredSlotForInspectionV1 = (slotId: SaveSlotIdV1) =>
    validateStoredSlotInternalV1(slotId, false);
  const validateStoredSlotWithMigrationV1 = (slotId: SaveSlotIdV1) =>
    validateStoredSlotInternalV1(slotId, true);

  const bindReplacementCommitV1 = <TResult>(
    outcome: object,
    simulationLineage: readonly DeepReadonly<SimulationAdoptionV1>[],
    migrationReceipt: DeepReadonly<SaveStateMigrationReceiptV1> | null,
    expectedSessionOwner: AuthoritativeReplacementOwnerInternalV1 | null | undefined,
    clearLastFailure: boolean,
    normalizePrepareFailure: (error: unknown) => TResult,
    onReplacementCommit?: () => void,
    publicationContext?: AuthoritativeReplacementPublicationContextInternalV1,
  ): void => {
    bindAuthoritativeReplacementCommitInternalV1<TSnapshot, TResult>(
      outcome,
      {
        prepare: (snapshot, anchor, owner, preparation) => {
          if (anchor !== "replace_replay_base") {
            throw new TypeError("Persistence replacement requires a replay-base anchor");
          }
          if (
            expectedSessionOwner !== null &&
            (expectedSessionOwner === undefined || owner !== expectedSessionOwner)
          ) {
            throw new TypeError("Persistence replacement reached a different Session owner");
          }
          const prepared = prepareAnchorCommitV1(
            snapshot,
            simulationLineage,
            clearLastFailure,
            onReplacementCommit,
          );
          return createPreparedAuthoritativeReplacementCommitInternalV1({
            owner,
            preparation,
            migrationReceipt,
            ...(publicationContext === undefined ? {} : { publicationContext }),
            commit: prepared.commit,
            afterPublication: prepared.afterPublication,
          });
        },
        normalizePrepareFailure,
      },
    );
  };

  const enqueueReplacementV1 = (
    operation: (
      current: DeepReadonly<TSnapshot>,
    ) => Promise<ReturnType<typeof replacementOutcomeV1>>,
    onReplacementCommit?: () => void,
    publicationContext?: AuthoritativeReplacementPublicationContextInternalV1,
  ): Promise<PersistenceOperationResultV1> => {
    if (lifecycle !== "active" || playerMutationsFenced) {
      return Promise.resolve(faultedV1("runtime_disposed"));
    }
    let legacyReplacement:
      | {
        readonly simulationLineage: readonly DeepReadonly<SimulationAdoptionV1>[];
        readonly migration: DeepReadonly<SaveStateMigrationReceiptV1> | null;
      }
      | null = null;
    const prepareReplacementV1 = (
      snapshot: DeepReadonly<TSnapshot>,
      anchor: "preserve_log" | "replace_replay_base",
    ): void => {
      const replacement = legacyReplacement;
      legacyReplacement = null;
      if (
        replacement === null ||
        anchor !== "replace_replay_base" ||
        replacement.migration !== null
      ) {
        throw new TypeError("Persistence replacement requires the atomic Session participant");
      }
      const prepared = prepareAnchorCommitV1(
        snapshot,
        replacement.simulationLineage,
        true,
        onReplacementCommit,
      );
      prepared.commit();
      prepared.afterPublication();
    };
    return options.runtimeControl.enqueueAuthoritative<PersistenceOperationResultV1>(
      async (current) => {
        if (lifecycle !== "active") {
          return Object.freeze({
            kind: "preserve" as const,
            result: faultedV1("runtime_disposed"),
          });
        }
        try {
          const outcome = await operation(current);
          if (lifecycle !== "active") {
            return Object.freeze({
              kind: "preserve" as const,
              result: faultedV1("runtime_disposed"),
            });
          }
          if (outcome.kind === "replace") {
            legacyReplacement = Object.freeze({
              simulationLineage: outcome.simulationLineage,
              migration: outcome.migration,
            });
            const replacement = Object.freeze({
              kind: outcome.kind,
              snapshot: outcome.snapshot,
              result: outcome.result,
              anchor: outcome.anchor,
            });
            bindReplacementCommitV1(
              replacement,
              outcome.simulationLineage,
              outcome.migration,
              authoritativeReplacementOwner ?? null,
              true,
              () => {
                rememberFailureV1("persistence.unexpected");
                return faultedV1();
              },
              onReplacementCommit,
              publicationContext,
            );
            bindAuthoritativeReplacementPrepareCallbackInternalV1(
              prepareReplacementV1,
              replacement,
            );
            return replacement;
          }
          return outcome;
        } catch {
          rememberFailureV1("persistence.unexpected");
          return Object.freeze({
            kind: "preserve" as const,
            result: faultedV1(),
          });
        }
      },
      () => {
        rememberFailureV1("persistence.unexpected");
        return faultedV1();
      },
      prepareReplacementV1,
      () => faultedV1("runtime_disposed"),
    );
  };

  // Export filenames carry the export instant as UTC `yyyyMMddHHmmss`, from
  // the metadata clock so every Host suggests the same name. This dates the
  // file but does not promise uniqueness within one second; no-clobber Hosts
  // apply their own collision policy. An unparsable instant falls back to the
  // bare configured name.
  const exportFilenameV1 = (): string => {
    const suffix = formatExportTimestampV1(options.metadataClock.now());
    if (suffix === null) return options.exportFilename;
    const filename = options.exportFilename;
    const dot = filename.lastIndexOf(".");
    return dot > 0
      ? `${filename.slice(0, dot)}-${suffix}${filename.slice(dot)}`
      : `${filename}-${suffix}`;
  };

  const makeExportV1 = (
    record: DeepReadonly<PersistenceSaveRecordV1<TSnapshot>>,
  ): ExportedSaveV1 => {
    const bytes = Uint8Array.from(encodeRecordV1(record));
    return Object.freeze({
      filename: exportFilenameV1(),
      mediaType: "application/json" as const,
      digest: digestBytes(bytes),
      bytes,
    });
  };

  const makeStoredExportV1 = (storedBytes: Uint8Array): ExportedSaveV1 => {
    const bytes = Uint8Array.from(storedBytes);
    return Object.freeze({
      filename: exportFilenameV1(),
      mediaType: "application/json" as const,
      digest: digestBytes(bytes),
      bytes,
    });
  };

  const admitRebootstrapSaveV1 = (
    save: DeepReadonly<ExportedSaveV1>,
  ): ExportedSaveV1 => {
    if (
      typeof save.filename !== "string" ||
      save.filename.length === 0 ||
      save.mediaType !== "application/json"
    ) {
      throw new TypeError("persistence.rebootstrap_save_invalid");
    }
    const bytes = Uint8Array.from(save.bytes);
    const digest = parseDigest(save.digest);
    if (digestBytes(bytes) !== digest) {
      throw new TypeError("persistence.rebootstrap_save_digest_mismatch");
    }
    return Object.freeze({
      filename: save.filename,
      mediaType: "application/json" as const,
      digest,
      bytes,
    });
  };

  const normalizeRebootstrapCandidateSaveV1 = (
    candidate: DeepReadonly<PersistenceSaveRecordV1<TSnapshot>>,
    simulationLineage: readonly DeepReadonly<SimulationAdoptionV1>[],
  ): ExportedSaveV1 => {
    // `finishSaveImportCandidateInternalV1` already admitted this candidate.
    // Rebuild only the successor-owned provenance/lineage fields, then trust
    // the typed representation rather than repeating schema/envelope admission.
    const normalized: DeepReadonly<PersistenceSaveRecordV1<TSnapshot>> = Object.freeze({
      ...candidate,
      provenance: options.provenance,
      simulationLineage: copyLineageV1(simulationLineage),
    });
    return makeExportV1(normalized);
  };

  const leaseOperationV1 = async (
    operation: () => Promise<SessionLeaseOperationResultV1>,
  ): Promise<SessionLeaseOperationResultV1> => {
    try {
      const result = await operation();
      if (result.kind === "updated") leaseStatus = result.status;
      else rememberFailureV1(result.code);
      return result;
    } catch {
      rememberFailureV1("unavailable");
      return Object.freeze({ kind: "rejected", code: "unavailable" });
    }
  };

  const publicLeaseMutationV1 = (
    operation: () => Promise<SessionLeaseOperationResultV1>,
  ): Promise<SessionLeaseOperationResultV1> => {
    if (lifecycle !== "active" || playerMutationsFenced || rebootstrapTransferPending) {
      return Promise.resolve(
        Object.freeze({ kind: "rejected" as const, code: "conflict" as const }),
      );
    }
    const result = Promise.resolve().then(() => leaseOperationV1(operation));
    const tracked = result.then(() => undefined);
    leaseMutationTail = Promise.all([leaseMutationTail, tracked]).then(() => undefined);
    return result;
  };

  const loadV1 = (
    slot: SaveSlotIdV1,
    onReplacementCommit?: () => void,
    publicationContext?: AuthoritativeReplacementPublicationContextInternalV1,
  ): Promise<PersistenceOperationResultV1> => {
    if (!slotWithinCountV1(slot)) {
      return Promise.resolve(faultedV1("persistence.invalid_slot"));
    }
    return enqueueReplacementV1(
      async () => {
        const read = await validateStoredSlotWithMigrationV1(slot);
        if (read.health === "empty") {
          return Object.freeze({
            kind: "preserve" as const,
            result: rejectedV1("empty_slot"),
          });
        }
        if (read.health === "unavailable") {
          rememberFailureV1(read.code);
          return Object.freeze({
            kind: "preserve" as const,
            result: rejectedV1("unavailable"),
          });
        }
        if (read.health === "invalid") {
          if (read.code === "rng.invalid_state") rememberFailureV1(read.code);
          return Object.freeze({
            kind: "preserve" as const,
            result: rejectedV1("invalid_record"),
          });
        }
        return replacementOutcomeFromValidationV1(read.validation, "loaded");
      },
      onReplacementCommit,
      publicationContext,
    );
  };

  const importSaveV1 = (
    bytes: Uint8Array,
    onReplacementCommit?: () => void,
    publicationContext?: AuthoritativeReplacementPublicationContextInternalV1,
  ): Promise<PersistenceOperationResultV1> => {
    const accepted = Uint8Array.from(bytes);
    return enqueueReplacementV1(
      async () => replacementOutcomeV1(accepted, "imported"),
      onReplacementCommit,
      publicationContext,
    );
  };

  const rewriteRejectedV1 = (
    code: Extract<SaveRewriteOperationResultV1, { readonly kind: "rejected" }>["code"],
  ): SaveRewriteOperationResultV1 => Object.freeze({ kind: "rejected", code });

  const backupRejectedV1 = (
    code: Extract<SaveBackupOperationResultV1, { readonly kind: "rejected" }>["code"],
  ): SaveBackupOperationResultV1 => Object.freeze({ kind: "rejected", code });

  const normalizeStoredRewriteRecordV1 = (
    record: DeepReadonly<PersistenceSaveRecordV1<TSnapshot>>,
    simulationLineage: readonly DeepReadonly<SimulationAdoptionV1>[],
  ): DeepReadonly<PersistenceSaveRecordV1<TSnapshot>> => {
    const normalized = options.validation.codec.recordSchema.parse({
      ...record,
      provenance: options.provenance,
      simulationLineage: copyLineageV1(simulationLineage),
    });
    options.validation.codec.validateEnvelope(
      normalized as DeepReadonly<PersistenceSaveRecordV1<TSnapshot>>,
    );
    return normalized as DeepReadonly<PersistenceSaveRecordV1<TSnapshot>>;
  };

  const mapRewriteValidationFailureV1 = (
    validation: SaveImportValidationResultV1<PersistenceSaveRecordV1<TSnapshot>>,
  ): SaveRewriteOperationResultV1 => {
    if (validation.kind === "faulted") {
      return Object.freeze({ kind: "faulted", code: validation.code });
    }
    if (validation.kind === "inspect_only") {
      return rewriteRejectedV1("code" in validation ? "migration_unavailable" : "incompatible");
    }
    if (validation.kind !== "rejected") return rewriteRejectedV1("invalid_record");
    if (
      validation.code === "migration.rejected" || validation.code === "migration.output_invalid"
    ) {
      return rewriteRejectedV1("migration_rejected");
    }
    if (validation.code === "compatibility.lineage_limit") {
      return rewriteRejectedV1("reanchor_required");
    }
    return rewriteRejectedV1("invalid_record");
  };

  const runLeaseFencedRecoveryV1 = <
    TResult extends SaveRewriteOperationResultV1 | SaveBackupOperationResultV1,
  >(
    slot: SaveSlotIdV1,
    faulted: (code: string) => TResult,
    rejected: (code: "busy" | "unavailable") => TResult,
    operation: (fence: DeepReadonly<SessionLeaseFenceV1>) => Promise<TResult>,
  ): Promise<TResult> => {
    if (!slotWithinCountV1(slot)) return Promise.resolve(faulted("persistence.invalid_slot"));
    if (lifecycle !== "active" || playerMutationsFenced) {
      return Promise.resolve(faulted("runtime_disposed"));
    }
    if (foregroundWrites > 0) return Promise.resolve(rejected("busy"));
    const fence = options.lease.captureFence();
    if (fence === null) return Promise.resolve(rejected("unavailable"));
    foregroundWrites += 1;
    return schedulePhysicalV1(() =>
      lifecycle === "active" ? operation(fence) : Promise.resolve(faulted("runtime_disposed"))
    ).finally(() => {
      foregroundWrites -= 1;
    });
  };

  const port: PersistencePortV1 = Object.freeze({
    lease: Object.freeze({
      async getStatus() {
        try {
          return observeLeaseStatusV1(await options.lease.getStatus());
        } catch {
          return observeLeaseStatusV1(
            Object.freeze({
              kind: "unavailable" as const,
              ownerId: null,
              fencingToken: null,
              code: "persistence.unexpected",
            }),
          );
        }
      },
      requestHandoff: () => publicLeaseMutationV1(() => options.lease.requestHandoff()),
      approveHandoff: (requestId: LeaseHandoffRequestId) =>
        publicLeaseMutationV1(() => options.lease.approveHandoff(requestId)),
      takeOver: () => publicLeaseMutationV1(() => options.lease.takeOver()),
      takeOverUnowned: (expectedFencingToken: PositiveSafeInteger) =>
        publicLeaseMutationV1(() => options.lease.takeOverUnowned(expectedFencingToken)),
      release: () => publicLeaseMutationV1(() => options.lease.release()),
    }),

    async listSlots() {
      try {
        const reads = await Promise.all(slotIds.map(validateStoredSlotForInspectionV1));
        const dispositions: Array<{
          readonly runnable: boolean;
          readonly summary: SaveSlotSummaryV1;
        }> = reads.map((read) => {
          if (read.health !== "validated") {
            if (read.health === "unavailable") rememberFailureV1(read.code);
            const warningCode = "code" in read ? read.code : null;
            return Object.freeze({
              runnable: false,
              summary: Object.freeze({
                slotId: read.slotId,
                health: read.health,
                recordRevision: null,
                capturedCommandSequence: null,
                savedAt: null,
                annotation: null,
                warningCodes: Object.freeze(warningCode === null ? [] : [warningCode]),
              }) satisfies SaveSlotSummaryV1,
            });
          }
          const validation = read.validation;
          const warningCodes = validation.kind === "rejected" || validation.kind === "faulted"
            ? [validation.code]
            : validation.kind === "inspect_only"
            ? "code" in validation ? [validation.code] : [
              ...validation.mismatches.map(({ code }) => code),
              ...validation.warnings.map(({ code }) => code),
            ]
            : validation.warnings.map(({ code }) => code);
          const lineageLimited = validation.kind === "rejected" &&
            validation.code === "compatibility.lineage_limit";
          return Object.freeze({
            runnable: validation.kind === "exact" || validation.kind === "adopted",
            summary: Object.freeze({
              slotId: read.slotId,
              health: (validation.kind === "rejected" && !lineageLimited) ||
                  validation.kind === "faulted"
                ? ("invalid" as const)
                : ("valid" as const),
              recordRevision: read.envelope.recordRevision,
              capturedCommandSequence: read.envelope.slot.capturedCommandSequence,
              savedAt: read.envelope.savedAt,
              annotation: read.envelope.annotation ?? null,
              warningCodes: Object.freeze(warningCodes),
            }) satisfies SaveSlotSummaryV1,
          });
        });
        const current = dispositions[0];
        const previous = dispositions[1];
        if (
          current !== undefined &&
          previous !== undefined &&
          !current.runnable &&
          previous.runnable
        ) {
          dispositions[1] = Object.freeze({
            runnable: true,
            summary: Object.freeze({
              ...previous.summary,
              health: "recovery_candidate" as const,
            }),
          });
        }
        return Object.freeze(dispositions.map(({ summary }) => summary));
      } catch {
        rememberFailureV1("persistence.unexpected");
        return Object.freeze(
          slotIds.map((slotId) =>
            Object.freeze({
              slotId,
              health: "unavailable" as const,
              recordRevision: null,
              capturedCommandSequence: null,
              savedAt: null,
              annotation: null,
              warningCodes: Object.freeze(["persistence.unexpected"]),
            })
          ),
        );
      }
    },

    async inspectSave(slot: SaveSlotIdV1) {
      if (!slotWithinCountV1(slot)) {
        return Object.freeze({
          kind: "faulted" as const,
          slotId: null,
          code: "persistence.invalid_slot",
          diagnostics: saveInspectionDiagnosticsV1({
            codes: Object.freeze(["persistence.invalid_slot"]),
          }),
        });
      }
      if (lifecycle !== "active" || playerMutationsFenced) {
        return Object.freeze({
          kind: "faulted" as const,
          slotId: slot,
          code: "runtime_disposed",
          diagnostics: saveInspectionDiagnosticsV1({
            codes: Object.freeze(["runtime_disposed"]),
          }),
        });
      }
      try {
        const read = await validateStoredSlotWithMigrationV1(slot);
        if (read.health === "empty") {
          return Object.freeze({
            kind: "rejected" as const,
            slotId: slot,
            code: "empty_slot" as const,
            diagnostics: saveInspectionDiagnosticsV1({
              codes: Object.freeze(["empty_slot"]),
            }),
          });
        }
        if (read.health === "unavailable") {
          return Object.freeze({
            kind: "rejected" as const,
            slotId: slot,
            code: "unavailable" as const,
            diagnostics: saveInspectionDiagnosticsV1({
              codes: Object.freeze([read.code]),
            }),
          });
        }
        if (read.health === "invalid") {
          return Object.freeze({
            kind: "rejected" as const,
            slotId: slot,
            code: "invalid_record" as const,
            diagnostics: saveInspectionDiagnosticsV1({
              codes: Object.freeze([read.code]),
            }),
          });
        }
        return projectSaveInspectionValidationV1(slot, read.validation);
      } catch {
        return Object.freeze({
          kind: "faulted" as const,
          slotId: slot,
          code: "persistence.unexpected",
          diagnostics: saveInspectionDiagnosticsV1({
            codes: Object.freeze(["persistence.unexpected"]),
          }),
        });
      }
    },

    async inspectBackup(slot: SaveSlotIdV1) {
      if (!slotWithinCountV1(slot)) {
        return Object.freeze({
          kind: "faulted" as const,
          slotId: null,
          code: "persistence.invalid_slot",
        });
      }
      if (lifecycle !== "active" || playerMutationsFenced) {
        return Object.freeze({
          kind: "faulted" as const,
          slotId: slot,
          code: "runtime_disposed",
        });
      }
      try {
        const backup = await options.repository.readMigrationBackup(slot);
        if (backup.health === "unavailable") {
          return Object.freeze({
            kind: "rejected" as const,
            slotId: slot,
            code: "unavailable" as const,
          });
        }
        if (backup.health === "empty" || backup.health === "invalid") {
          return Object.freeze({
            kind: "rejected" as const,
            slotId: slot,
            code: backup.health === "empty" ? "empty_backup" as const : "invalid_backup" as const,
          });
        }
        return Object.freeze({
          kind: "available" as const,
          slotId: slot,
        });
      } catch {
        return Object.freeze({
          kind: "faulted" as const,
          slotId: slot,
          code: "persistence.unexpected",
        });
      }
    },

    upgradeSave(slot: SaveSlotIdV1) {
      return runLeaseFencedRecoveryV1<SaveRewriteOperationResultV1>(
        slot,
        (code) => Object.freeze({ kind: "faulted", code }),
        rewriteRejectedV1,
        async (fence) => {
          try {
            const backup = await options.repository.readMigrationBackup(slot);
            if (backup.health === "unavailable") return rewriteRejectedV1("unavailable");
            if (backup.health !== "empty") return rewriteRejectedV1("backup_pending");
            const read = await validateStoredSlotWithMigrationV1(slot);
            if (read.health === "empty") return rewriteRejectedV1("empty_slot");
            if (read.health === "unavailable") return rewriteRejectedV1("unavailable");
            if (read.health === "invalid") return rewriteRejectedV1("invalid_record");
            const validation = read.validation;
            if (validation.kind !== "exact" && validation.kind !== "adopted") {
              return mapRewriteValidationFailureV1(validation);
            }
            if (validation.kind === "exact" && validation.migration === null) {
              return rewriteRejectedV1("not_required");
            }
            const lineage = validation.kind === "adopted"
              ? Object.freeze([...validation.candidate.simulationLineage, validation.adoption])
              : validation.candidate.simulationLineage;
            const candidate = normalizeStoredRewriteRecordV1(validation.candidate, lineage);
            const written = await options.repository.rewriteWithMigrationBackup(
              slot,
              Object.freeze({ hostRevision: read.hostRevision, bytes: read.bytes }),
              candidate,
              fence,
            );
            if (written.kind === "rejected") {
              return rewriteRejectedV1(written.code);
            }
            return Object.freeze({
              kind: "upgraded" as const,
              slotId: slot,
              compatibility: validation.kind,
            });
          } catch {
            return Object.freeze({ kind: "faulted" as const, code: "persistence.unexpected" });
          }
        },
      );
    },

    reanchorSave(slot: SaveSlotIdV1) {
      return runLeaseFencedRecoveryV1<SaveRewriteOperationResultV1>(
        slot,
        (code) => Object.freeze({ kind: "faulted", code }),
        rewriteRejectedV1,
        async (fence) => {
          try {
            const backup = await options.repository.readMigrationBackup(slot);
            if (backup.health === "unavailable") return rewriteRejectedV1("unavailable");
            if (backup.health !== "empty") return rewriteRejectedV1("backup_pending");
            const read = await prepareStoredSlotV1(slot);
            if (read.health === "empty") return rewriteRejectedV1("empty_slot");
            if (read.health === "unavailable") return rewriteRejectedV1("unavailable");
            if (read.health === "invalid") return rewriteRejectedV1("invalid_record");
            const prepared = read.preparation.kind === "migration_pending"
              ? resumeSaveImportCandidateInternalV1(
                read.preparation,
                options.validation,
                instrumentation,
              )
              : read.preparation;
            if (prepared.kind !== "prepared") {
              if (prepared.kind === "inspect_only") {
                return rewriteRejectedV1(
                  "code" in prepared ? "migration_unavailable" : "incompatible",
                );
              }
              if (prepared.kind === "faulted") {
                return Object.freeze({ kind: "faulted" as const, code: prepared.code });
              }
              if (prepared.kind === "rejected") {
                return prepared.code === "migration.rejected" ||
                    prepared.code === "migration.output_invalid"
                  ? rewriteRejectedV1("migration_rejected")
                  : rewriteRejectedV1("invalid_record");
              }
              return rewriteRejectedV1("invalid_record");
            }
            const validation = finishSaveReanchorCandidateInternalV1(
              prepared,
              options.validation,
              options.provenance,
            );
            if (validation.kind !== "ready") {
              if (validation.code === "reanchor.not_required") {
                return rewriteRejectedV1("not_required");
              }
              if (validation.code === "reanchor.incompatible") {
                return rewriteRejectedV1("incompatible");
              }
              return rewriteRejectedV1("invalid_record");
            }
            const candidate = normalizeStoredRewriteRecordV1(validation.candidate, []);
            const written = await options.repository.rewriteWithMigrationBackup(
              slot,
              Object.freeze({ hostRevision: read.hostRevision, bytes: read.bytes }),
              candidate,
              fence,
            );
            if (written.kind === "rejected") return rewriteRejectedV1(written.code);
            return Object.freeze({ kind: "reanchored" as const, slotId: slot });
          } catch {
            return Object.freeze({ kind: "faulted" as const, code: "persistence.unexpected" });
          }
        },
      );
    },

    restoreBackup(slot: SaveSlotIdV1) {
      return runLeaseFencedRecoveryV1<SaveBackupOperationResultV1>(
        slot,
        (code) => Object.freeze({ kind: "faulted", code }),
        backupRejectedV1,
        async (fence) => {
          try {
            const restored = await options.repository.restoreMigrationBackup(slot, fence);
            return restored.kind === "rejected"
              ? backupRejectedV1(restored.code)
              : Object.freeze({ kind: "restored" as const, slotId: slot });
          } catch {
            return Object.freeze({ kind: "faulted" as const, code: "persistence.unexpected" });
          }
        },
      );
    },

    async exportBackup(slot: SaveSlotIdV1) {
      if (!slotWithinCountV1(slot)) {
        return Object.freeze({ kind: "faulted" as const, code: "persistence.invalid_slot" });
      }
      if (lifecycle !== "active" || playerMutationsFenced) {
        return Object.freeze({ kind: "faulted" as const, code: "runtime_disposed" });
      }
      try {
        const first = await options.repository.readMigrationBackup(slot);
        if (first.health === "empty") {
          return Object.freeze({ kind: "rejected" as const, code: "empty_backup" as const });
        }
        if (first.health === "unavailable") {
          return Object.freeze({ kind: "rejected" as const, code: "unavailable" as const });
        }
        if (first.health === "invalid") {
          return Object.freeze({ kind: "rejected" as const, code: "invalid_backup" as const });
        }
        const second = await options.repository.readMigrationBackup(slot);
        if (second.health === "unavailable") {
          return Object.freeze({ kind: "rejected" as const, code: "unavailable" as const });
        }
        if (
          second.health !== "stored" ||
          second.hostRevision !== first.hostRevision ||
          !bytesEqualV1(second.bytes, first.bytes)
        ) {
          return Object.freeze({ kind: "rejected" as const, code: "conflict" as const });
        }
        return Object.freeze({
          kind: "exported" as const,
          slotId: slot,
          file: makeStoredExportV1(first.bytes),
        });
      } catch {
        return Object.freeze({ kind: "faulted" as const, code: "persistence.unexpected" });
      }
    },

    discardBackup(slot: SaveSlotIdV1) {
      return runLeaseFencedRecoveryV1<SaveBackupOperationResultV1>(
        slot,
        (code) => Object.freeze({ kind: "faulted", code }),
        backupRejectedV1,
        async (fence) => {
          try {
            const discarded = await options.repository.discardMigrationBackup(slot, fence);
            return discarded.kind === "rejected"
              ? backupRejectedV1(discarded.code)
              : Object.freeze({ kind: "discarded" as const, slotId: slot });
          } catch {
            return Object.freeze({ kind: "faulted" as const, code: "persistence.unexpected" });
          }
        },
      );
    },

    async getStatus() {
      try {
        await refreshLeaseStatusV1();
      } catch {
        observeLeaseStatusV1(
          Object.freeze({
            kind: "unavailable" as const,
            ownerId: null,
            fencingToken: null,
            code: "persistence.unexpected",
          }),
        );
      }
      const runtimeStatus = options.runtimeControl.inspectForRuntime().status;
      return Object.freeze({
        available: leaseStatus.kind !== "unavailable",
        busy: runtimeStatus === "busy" || foregroundWrites > 0 || autoWrites > 0 ||
          !autoQueue.isIdle(),
        safelySavedCommandSequence,
        lastFailureCode: rebootstrapFailureCode ?? lastFailureCode,
      });
    },

    save(slot: PlayerWritableSaveSlotIdV1) {
      if (lifecycle !== "active" || playerMutationsFenced) {
        return Promise.resolve(faultedV1("runtime_disposed"));
      }
      if (!isPlayerWritableSaveSlotIdV1(slot) || !slotWithinCountV1(slot)) {
        return Promise.resolve(faultedV1("persistence.invalid_slot"));
      }
      const runtime = options.runtimeControl.inspectForRuntime();
      if (runtime.status !== "ready" || foregroundWrites > 0) {
        return Promise.resolve(rejectedV1("busy"));
      }
      // Persistence-safepoint gate: a player-slot write never exports a
      // state its application declared mid-span; the next safepoint commit
      // makes saving available again.
      if (
        options.classifyWriteCandidate?.(
          (runtime.snapshot as { readonly state: DeepReadonly<TState> }).state,
        ) === "in_flight"
      ) {
        return Promise.resolve(rejectedV1("in_flight"));
      }
      const fence = options.lease.captureFence();
      if (fence === null) {
        rememberFailureV1("unavailable");
        return Promise.resolve(rejectedV1("unavailable"));
      }
      let candidate: SaveCandidateV1<TSnapshot>;
      const acceptedAnchorEpoch = autoQueue.anchorEpoch();
      try {
        candidate = captureV1(runtime.snapshot);
      } catch {
        rememberFailureV1("persistence.capture_failed");
        return Promise.resolve(faultedV1("persistence.capture_failed"));
      }
      foregroundWrites += 1;
      return schedulePhysicalV1(() =>
        lifecycle === "active"
          ? writeVerifiedV1(candidate, slot, fence)
          : Promise.resolve(faultedV1("runtime_disposed"))
      )
        .then((result) => {
          if (acceptedAnchorEpoch === autoQueue.anchorEpoch()) {
            if (result.kind === "saved") {
              rememberSuccessV1(candidate.snapshot.commandSequence);
            } else if (result.kind === "rejected" || result.kind === "faulted") {
              rememberOperationFailureV1(result.code);
            }
          }
          return result;
        })
        .finally(() => {
          foregroundWrites -= 1;
        });
    },

    annotateSave(slot: PlayerWritableSaveSlotIdV1, note: string) {
      if (lifecycle !== "active" || playerMutationsFenced) {
        return Promise.resolve(faultedV1("runtime_disposed"));
      }
      if (!isPlayerWritableSaveSlotIdV1(slot) || !slotWithinCountV1(slot)) {
        return Promise.resolve(faultedV1("persistence.invalid_slot"));
      }
      let normalizedNote: string | null;
      try {
        normalizedNote = parseSaveNoteV1(note);
      } catch {
        return Promise.resolve(rejectedV1("invalid_note"));
      }
      if (foregroundWrites > 0) return Promise.resolve(rejectedV1("busy"));
      const fence = options.lease.captureFence();
      if (fence === null) {
        rememberFailureV1("unavailable");
        return Promise.resolve(rejectedV1("unavailable"));
      }
      const acceptedAnchorEpoch = autoQueue.anchorEpoch();
      foregroundWrites += 1;
      return schedulePhysicalV1(async () => {
        if (lifecycle !== "active") return faultedV1("runtime_disposed");
        try {
          const read = await prepareStoredSlotV1(slot);
          if (read.health === "empty") return rejectedV1("empty_slot");
          if (read.health === "unavailable") {
            rememberFailureV1(read.code);
            return rejectedV1("unavailable");
          }
          if (read.health === "invalid") return rejectedV1("invalid_record");
          if (read.preparation.kind === "migration_pending") {
            return rejectedV1("migration_unavailable");
          }
          const stored = read.preparation.record as PersistenceSaveRecordV1<TSnapshot>;
          const summary = stored.annotation?.summary ?? null;
          const { annotation: _dropped, ...bare } = stored;
          // Only the player note changes: snapshot, capture time, and the
          // application summary are preserved byte-for-byte semantics.
          const updated: PersistenceSaveRecordV1<TSnapshot> =
            summary === null && normalizedNote === null
              ? (bare as PersistenceSaveRecordV1<TSnapshot>)
              : Object.freeze({
                ...bare,
                annotation: Object.freeze({ summary, note: normalizedNote }),
              } as PersistenceSaveRecordV1<TSnapshot>);
          const written = await options.repository.rewritePlayer(
            slot,
            Object.freeze({
              hostRevision: read.hostRevision,
              bytes: read.bytes,
            }),
            updated as DeepReadonly<PersistenceSaveRecordV1<TSnapshot>>,
            fence,
          );
          if (written.kind === "rejected") {
            if (written.code === "unavailable") await refreshLeaseStatusV1();
            return repositoryRejectionV1(written.code);
          }
          const result = await verifyCommittedWriteV1(
            written,
            slot,
            fence,
            stored.slot.capturedCommandSequence,
            () => {
              const expected = options.validation.codec.recordSchema.parse({
                ...updated,
                recordRevision: written.recordRevision,
              });
              options.validation.codec.validateEnvelope(
                expected as DeepReadonly<PersistenceSaveRecordV1<TSnapshot>>,
              );
              return expected as DeepReadonly<PersistenceSaveRecordV1<TSnapshot>>;
            },
          );
          return result;
        } catch {
          return faultedV1();
        }
      })
        .then((result) => {
          if (acceptedAnchorEpoch === autoQueue.anchorEpoch()) {
            if (result.kind === "saved") lastFailureCode = null;
            else if (result.kind === "rejected" || result.kind === "faulted") {
              rememberOperationFailureV1(result.code);
            }
          }
          return result;
        })
        .finally(() => {
          foregroundWrites -= 1;
        });
    },

    load: loadV1,

    clear(slot: SaveSlotIdV1) {
      if (lifecycle !== "active" || playerMutationsFenced) {
        return Promise.resolve(faultedV1("runtime_disposed"));
      }
      if (!slotWithinCountV1(slot)) {
        return Promise.resolve(faultedV1("persistence.invalid_slot"));
      }
      if (foregroundWrites > 0) return Promise.resolve(rejectedV1("busy"));
      const acceptedFence = options.lease.captureFence();
      if (acceptedFence === null) {
        return Promise.resolve(rejectedV1("unavailable"));
      }
      const acceptedAnchorEpoch = autoQueue.anchorEpoch();
      const acceptedAutoClearOrder = slot === "auto.current" ? takeNextAutoPhysicalOrderV1() : null;
      foregroundWrites += 1;
      return schedulePhysicalV1(async () => {
        if (lifecycle !== "active") return faultedV1("runtime_disposed");
        try {
          const result = await options.repository.clear(slot, acceptedFence);
          if (result.kind === "rejected") {
            if (acceptedAnchorEpoch === autoQueue.anchorEpoch()) {
              rememberOperationFailureV1(result.code);
            }
            return repositoryRejectionV1(result.code);
          }
          if (acceptedAutoClearOrder !== null) {
            lastSuccessfulAutoClearOrder = acceptedAutoClearOrder;
            lastSuccessfulAutoSnapshot = null;
            lastSuccessfulAutoFence = null;
            lastSuccessfulAutoPhysicalOrder = null;
          }
          if (acceptedAnchorEpoch === autoQueue.anchorEpoch()) {
            safelySavedCommandSequence = null;
            lastFailureCode = null;
          }
          return Object.freeze({ kind: "cleared" as const, slotId: slot });
        } catch {
          if (acceptedAnchorEpoch === autoQueue.anchorEpoch()) {
            rememberFailureV1("persistence.unexpected");
          }
          return faultedV1();
        }
      }).finally(() => {
        foregroundWrites -= 1;
      });
    },

    async exportSave(slot: SaveSlotIdV1) {
      if (!slotWithinCountV1(slot)) {
        return Object.freeze({
          kind: "faulted" as const,
          code: "persistence.invalid_slot",
        });
      }
      try {
        const first = await validateStoredSlotForInspectionV1(slot);
        if (first.health === "empty") return exportRejectedV1("empty_slot");
        if (first.health === "unavailable") {
          rememberFailureV1(first.code);
          return exportRejectedV1("unavailable");
        }
        if (first.health === "invalid") {
          return exportRejectedV1("invalid_record");
        }
        const bytes = first.bytes;
        const validation = first.validation;
        if (validation.kind === "rejected" && validation.code !== "compatibility.lineage_limit") {
          return exportRejectedV1("invalid_record");
        }
        const second = await options.repository.readRaw(slot);
        if (second.health === "unavailable") {
          rememberFailureV1(second.code);
          return exportRejectedV1("unavailable");
        }
        if (second.health !== "stored") return exportRejectedV1("conflict");
        if (second.hostRevision !== first.hostRevision || !bytesEqualV1(bytes, second.bytes)) {
          return exportRejectedV1("conflict");
        }
        return Object.freeze({
          kind: "exported" as const,
          slotId: slot,
          file: makeStoredExportV1(bytes),
        });
      } catch {
        return Object.freeze({
          kind: "faulted" as const,
          code: "persistence.unexpected",
        });
      }
    },

    exportCurrentSave() {
      try {
        const snapshot = options.runtimeControl.inspectForRuntime().snapshot;
        const exportSlotId = manualSlotCount === 0 ? "quick" : manualSaveSlotIdV1(1);
        const record = makeRecordV1(captureV1(snapshot), exportSlotId, exportSlotId);
        return Promise.resolve(
          makeExportV1(record as DeepReadonly<PersistenceSaveRecordV1<TSnapshot>>),
        );
      } catch {
        return Promise.reject(new TypeError("failed to export current Save"));
      }
    },

    importSave: importSaveV1,
  });

  const releaseRebootstrapFenceV1 = async (
    fence: DeepReadonly<SessionLeaseFenceV1>,
  ): Promise<DeepReadonly<SessionLeaseFenceV1>> => {
    try {
      const result = await options.lease.releaseFence(fence);
      if (
        result.kind === "updated" &&
        result.status.kind === "unowned" &&
        result.status.fencingToken === fence.fencingToken
      ) {
        leaseStatus = result.status;
        return Object.freeze({ ...fence });
      }
    } catch {
      // The stable internal failure below intentionally hides Host details.
    }
    rebootstrapFailureCode = "lease_release_failed";
    rememberFailureV1(rebootstrapFailureCode);
    throw new TypeError("persistence.rebootstrap_lease_release_failed");
  };

  const captureExactRebootstrapSaveV1 = async (): Promise<{
    readonly save: ExportedSaveV1;
    readonly lease: DeepReadonly<SessionLeaseFenceV1>;
  }> => {
    await leaseMutationTail;
    await autoQueue.idle();
    await physicalTail;
    const captured = await options.runtimeControl.readAtQueueFront((snapshot) => {
      if (
        options.classifyWriteCandidate !== undefined &&
        options.classifyWriteCandidate(snapshot.state) !== "safepoint"
      ) {
        throw new TypeError("persistence.rebootstrap_current_not_safepoint");
      }
      const fence = options.lease.captureFence();
      if (fence === null) {
        throw new TypeError("persistence.rebootstrap_writer_unavailable");
      }
      const exportSlotId = manualSlotCount === 0 ? "quick" : manualSaveSlotIdV1(1);
      const record = makeRecordV1(captureV1(snapshot), exportSlotId, exportSlotId);
      const save = makeExportV1(
        record as DeepReadonly<PersistenceSaveRecordV1<TSnapshot>>,
      );
      return Object.freeze({
        snapshot,
        save,
        lease: Object.freeze({ ...fence }),
        settled: captureAutoSaveWithReceiptV1(snapshot),
      });
    });
    const receipt = await captured.settled;
    await autoQueue.idle();
    await physicalTail;
    const current = await options.runtimeControl.readAtQueueFront((snapshot) => snapshot);
    const fence = options.lease.captureFence();
    if (
      receipt.kind !== "saved" ||
      current !== captured.snapshot ||
      fence === null ||
      fence.ownerId !== captured.lease.ownerId ||
      fence.fencingToken !== captured.lease.fencingToken
    ) {
      rebootstrapFailureCode = "rebootstrap_capture_failed";
      rememberFailureV1(rebootstrapFailureCode);
      throw new TypeError("persistence.rebootstrap_exact_capture_failed");
    }
    return Object.freeze({ save: captured.save, lease: captured.lease });
  };

  const disposeForRebootstrapV1 = (): Promise<PersistenceRebootstrapHandoffInternalV1> => {
    if (rebootstrapDisposalPromise !== null) return rebootstrapDisposalPromise;
    playerMutationsFenced = true;
    rebootstrapTransferPending = true;
    rebootstrapDisposalPromise = (async () => {
      let releaseAttempted = false;
      try {
        let save: DeepReadonly<ExportedSaveV1>;
        let releaseFence: DeepReadonly<SessionLeaseFenceV1> | null;
        if (rebootstrapPhase === "none" && leaseAcquisition === "deferred_rebootstrap") {
          throw new TypeError("persistence.rebootstrap_incoming_save_unavailable");
        }
        if (rebootstrapPhase === "none" || rebootstrapPhase === "anchored") {
          const captured = await captureExactRebootstrapSaveV1();
          save = captured.save;
          releaseFence = captured.lease;
        } else {
          if (rebootstrapSave === null || rebootstrapLease === null) {
            throw new TypeError("persistence.rebootstrap_state_invalid");
          }
          save = rebootstrapSave;
          releaseFence = options.lease.captureFence();
          if (releaseFence === null) {
            const status = await refreshLeaseStatusV1();
            if (
              status.kind !== "unowned" ||
              status.fencingToken !== rebootstrapLease.fencingToken
            ) {
              throw new TypeError("persistence.rebootstrap_lease_currentness_lost");
            }
            lifecycle = "disposed";
            return Object.freeze({ save, lease: rebootstrapLease });
          }
        }
        releaseAttempted = true;
        const released = await releaseRebootstrapFenceV1(releaseFence);
        lifecycle = "disposed";
        return Object.freeze({ save, lease: released });
      } catch (error) {
        const ownedFence = options.lease.captureFence();
        if (ownedFence !== null && !releaseAttempted) {
          try {
            await options.lease.releaseFence(ownedFence);
          } catch {
            // Cleanup is best-effort after the ready handoff has already failed closed.
          }
        }
        lifecycle = "disposed";
        throw error;
      }
    })();
    return rebootstrapDisposalPromise;
  };

  const adoptRebootstrapHandoffV1 = (
    handoff: DeepReadonly<PersistenceRebootstrapHandoffInternalV1>,
  ): Promise<void> => {
    if (rebootstrapAdoptionPromise !== null) return rebootstrapAdoptionPromise;
    rebootstrapAdoptionPromise = (async () => {
      if (
        lifecycle !== "active" ||
        leaseAcquisition !== "deferred_rebootstrap" ||
        rebootstrapPhase !== "none"
      ) {
        throw new TypeError("persistence.rebootstrap_adoption_unavailable");
      }
      const admittedSave = admitRebootstrapSaveV1(handoff.save);
      const preparation = prepareSaveImportCandidateInternalV1(
        admittedSave.bytes,
        options.validation,
        instrumentation,
      );
      if (preparation.kind === "rejected") {
        throw new TypeError(`persistence.rebootstrap_save_rejected:${preparation.code}`);
      }
      // The bytes are now a genuine admitted Save. Candidate-specific
      // compatibility/migration may still reject before takeover, in which
      // case this exact predecessor payload remains a valid retry input.
      rebootstrapSave = admittedSave;
      rebootstrapLease = Object.freeze({ ...handoff.lease });
      rebootstrapPhase = "prepared";
      const prepared = preparation.kind === "migration_pending"
        ? resumeSaveImportCandidateInternalV1(preparation, options.validation, instrumentation)
        : preparation;
      if (prepared.kind !== "prepared") {
        const code = "code" in prepared ? prepared.code : prepared.kind;
        throw new TypeError(`persistence.rebootstrap_save_rejected:${code}`);
      }
      const validation = finishSaveImportCandidateInternalV1(prepared, options.validation);
      if (validation.kind !== "exact" && validation.kind !== "adopted") {
        const code = "code" in validation ? validation.code : validation.kind;
        throw new TypeError(`persistence.rebootstrap_save_rejected:${code}`);
      }
      const lineage = validation.kind === "adopted"
        ? Object.freeze([...validation.candidate.simulationLineage, validation.adoption])
        : validation.candidate.simulationLineage;
      rebootstrapSave = normalizeRebootstrapCandidateSaveV1(validation.candidate, lineage);

      type InstallResultV1 =
        | { readonly kind: "installed" }
        | { readonly kind: "failed"; readonly error: unknown };
      const installed = Object.freeze({ kind: "installed" as const });
      const outcome = Object.freeze({
        kind: "replace" as const,
        snapshot: validation.candidate.snapshot as TSnapshot,
        result: installed,
        anchor: "replace_replay_base" as const,
      });
      bindReplacementCommitV1<InstallResultV1>(
        outcome,
        lineage,
        validation.migration,
        authoritativeReplacementOwner,
        true,
        (error) => Object.freeze({ kind: "failed" as const, error }),
        () => {
          rebootstrapPhase = "anchored";
        },
      );

      let takeover;
      try {
        takeover = await options.lease.takeOverUnowned(handoff.lease.fencingToken);
      } catch {
        takeover = null;
      }
      const fence = options.lease.captureFence();
      if (
        takeover === null ||
        takeover.kind !== "updated" ||
        takeover.status.kind !== "owned" ||
        fence === null ||
        fence.ownerId !== takeover.status.ownerId ||
        fence.fencingToken !== takeover.status.fencingToken ||
        Number(fence.fencingToken) !== Number(handoff.lease.fencingToken) + 1
      ) {
        rebootstrapFailureCode = "lease_takeover_failed";
        rememberFailureV1(rebootstrapFailureCode);
        throw new TypeError("persistence.rebootstrap_lease_takeover_failed");
      }
      leaseStatus = takeover.status;
      rebootstrapLease = Object.freeze({ ...fence });
      rebootstrapPhase = "taken_over";

      const result = await options.runtimeControl.enqueueAuthoritative<InstallResultV1>(
        async () => outcome,
        (error) => Object.freeze({ kind: "failed" as const, error }),
        undefined,
        () =>
          Object.freeze({
            kind: "failed" as const,
            error: new TypeError("persistence.rebootstrap_session_invalidated"),
          }),
      );
      const anchorInstalledV1 = (): boolean => rebootstrapPhase === "anchored";
      if (result.kind !== "installed" || !anchorInstalledV1()) {
        throw result.kind === "failed"
          ? result.error
          : new TypeError("persistence.rebootstrap_anchor_not_installed");
      }
      rebootstrapTransferPending = false;
    })();
    return rebootstrapAdoptionPromise;
  };

  const disposeV1 = (): Promise<void> => {
    if (disposalPromise !== null) return disposalPromise;
    playerMutationsFenced = true;
    rebootstrapTransferPending = true;
    disposalPromise = (async () => {
      try {
        await leaseMutationTail;
        await autoQueue.idle();
        await physicalTail;
      } catch {
        rememberFailureV1("persistence.unexpected");
      }
      lifecycle = "disposing";
      const fence = options.lease.captureFence();
      if (fence !== null) {
        try {
          const result = await options.lease.releaseFence(fence);
          if (result.kind === "updated") leaseStatus = result.status;
        } catch {
          rememberFailureV1("lease_release_failed");
        }
      }
      lifecycle = "disposed";
    })();
    return disposalPromise;
  };

  const service: PersistenceServiceV1<TSnapshot> = Object.freeze({
    port,
    getSimulationLineage: () => currentLineage,
    establishAnchor: establishAnchorV1,
    captureAutoSave: captureAutoSaveV1,
    autoSaveIdle: () => autoQueue.idle(),
    dispose: disposeV1,
  });
  persistenceServiceControlsInternalV1.set(
    service,
    Object.freeze({
      captureAutoSaveWithReceipt: (snapshot: unknown) =>
        captureAutoSaveWithReceiptV1(snapshot as DeepReadonly<TSnapshot>),
      loadWithReplacementCommit: (
        slot: SaveSlotIdV1,
        onReplacementCommit: () => void,
        publicationContext?: AuthoritativeReplacementPublicationContextInternalV1,
      ) => loadV1(slot, onReplacementCommit, publicationContext),
      importWithReplacementCommit: (
        bytes: Uint8Array,
        onReplacementCommit: () => void,
        publicationContext?: AuthoritativeReplacementPublicationContextInternalV1,
      ) => importSaveV1(bytes, onReplacementCommit, publicationContext),
      bindAnchorReplacement: <TResult>(
        outcome: object,
        simulationLineage: readonly DeepReadonly<SimulationAdoptionV1>[],
        onReplacementCommit: () => void,
        normalizePrepareFailure: (error: unknown) => TResult,
        publicationContext?: AuthoritativeReplacementPublicationContextInternalV1,
      ) =>
        bindReplacementCommitV1(
          outcome,
          simulationLineage,
          null,
          authoritativeReplacementOwner,
          false,
          (error) => {
            rememberFailureV1("persistence.unexpected");
            return normalizePrepareFailure(error);
          },
          onReplacementCommit,
          publicationContext,
        ),
      fencePlayerMutations: () => {
        playerMutationsFenced = true;
      },
      disposeForRebootstrap: disposeForRebootstrapV1,
      adoptRebootstrapHandoff: adoptRebootstrapHandoffV1,
    }),
  );
  return service;
}

type ExactFieldsV1 = Readonly<Record<string, unknown>>;

function exactFieldsV1(value: unknown, keys: readonly string[], label: string): ExactFieldsV1 {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Object.prototype ||
    Object.getOwnPropertySymbols(value).length > 0
  ) {
    throw new TypeError(`invalid ${label}`);
  }
  const descriptors = Object.getOwnPropertyDescriptors(value);
  if (Object.keys(descriptors).toSorted().join("\0") !== [...keys].toSorted().join("\0")) {
    throw new TypeError(`invalid ${label} fields`);
  }
  const fields: Record<string, unknown> = {};
  for (const key of keys) {
    const descriptor = descriptors[key];
    if (
      descriptor === undefined ||
      descriptor.get !== undefined ||
      descriptor.set !== undefined ||
      !("value" in descriptor) ||
      descriptor.enumerable !== true
    ) {
      throw new TypeError(`invalid ${label} field ${key}`);
    }
    fields[key] = descriptor.value;
  }
  return Object.freeze(fields);
}

function denseArrayV1<T>(
  value: unknown,
  label: string,
  parse: (entry: unknown, index: number) => T,
  maximumLength = 10_000,
): readonly T[] {
  if (
    !Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Array.prototype ||
    Object.getOwnPropertySymbols(value).length > 0 ||
    value.length > maximumLength
  ) {
    throw new TypeError(`invalid ${label}`);
  }
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const expected = Array.from({ length: value.length }, (_, index) => String(index));
  const actual = Object.keys(descriptors)
    .filter((key) => key !== "length")
    .toSorted((left, right) => Number(left) - Number(right));
  if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) {
    throw new TypeError(`invalid ${label} fields`);
  }
  return Object.freeze(
    expected.map((key, index) => {
      const descriptor = descriptors[key];
      if (
        descriptor === undefined ||
        descriptor.get !== undefined ||
        descriptor.set !== undefined ||
        !("value" in descriptor) ||
        descriptor.enumerable !== true
      ) {
        throw new TypeError(`invalid ${label} entry`);
      }
      return parse(descriptor.value, index);
    }),
  );
}

function nonemptyStringV1(value: unknown, label: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new TypeError(`invalid ${label}`);
  }
  return value;
}

function parsePatchReplacementV1(value: unknown): PatchReplacementTraceV1 {
  const fields = exactFieldsV1(
    value,
    ["surface", "symbolId", "kind", "previousProviderDigest", "nextProviderDigest"],
    "PatchReplacementTraceV1",
  );
  const surface = fields.surface;
  const kind = fields.kind;
  if (
    (surface !== "simulation" && surface !== "presentation") ||
    (kind !== "rule" && kind !== "value" && kind !== "text" && kind !== "asset") ||
    (surface === "simulation" && kind !== "rule" && kind !== "value") ||
    (surface === "presentation" && kind === "rule")
  ) {
    throw new TypeError("invalid Patch replacement kind");
  }
  const previousProviderDigest = parseDigest(fields.previousProviderDigest);
  const nextProviderDigest = parseDigest(fields.nextProviderDigest);
  return Object.freeze({
    surface,
    symbolId: nonemptyStringV1(fields.symbolId, "Patch symbol ID"),
    kind,
    previousProviderDigest,
    nextProviderDigest,
  });
}

function parseAppliedHotfixV1(value: unknown, index: number): AppliedHotfixV1 {
  const fields = exactFieldsV1(value, ["identity", "ordinal", "replacements"], "AppliedHotfixV1");
  const identity = exactFieldsV1(
    fields.identity,
    ["id", "revision", "digest"],
    "AppliedHotfixV1 identity",
  );
  const ordinal = parsePositiveSafeInteger(fields.ordinal);
  if (Number(ordinal) !== index + 1) {
    throw new TypeError("invalid Applied Hotfix ordinal");
  }
  return Object.freeze({
    identity: Object.freeze({
      id: nonemptyStringV1(identity.id, "Hotfix ID"),
      revision: parsePositiveSafeInteger(identity.revision),
      digest: parseDigest(identity.digest),
    }),
    ordinal,
    replacements: denseArrayV1(
      fields.replacements,
      "Applied Hotfix replacements",
      parsePatchReplacementV1,
    ),
  });
}

function parsePatchSetIdentityV1(value: unknown): PatchSetIdentityV1 {
  const fields = exactFieldsV1(
    value,
    ["digest", "simulationDigest", "presentationDigest", "appliedHotfixes"],
    "PatchSetIdentityV1",
  );
  const appliedHotfixes = denseArrayV1(
    fields.appliedHotfixes,
    "PatchSet applied Hotfixes",
    parseAppliedHotfixV1,
  );
  if (new Set(appliedHotfixes.map(({ identity }) => identity.id)).size !== appliedHotfixes.length) {
    throw new TypeError("duplicate applied Hotfix identity");
  }
  return Object.freeze({
    digest: parseDigest(fields.digest),
    simulationDigest: parseDigest(fields.simulationDigest),
    presentationDigest: parseDigest(fields.presentationDigest),
    appliedHotfixes,
  });
}

const buildProvenanceSchemaV1: RuntimeSchemaV1<BuildProvenanceV1> = Object.freeze({
  parse(value: unknown) {
    const fields = exactFieldsV1(value, ["story", "engine", "resolved"], "BuildProvenanceV1");
    const story = exactFieldsV1(fields.story, ["id", "revision", "digest"], "Story provenance");
    const engine = exactFieldsV1(fields.engine, ["version", "digest"], "Engine provenance");
    const resolved = exactFieldsV1(
      fields.resolved,
      [
        "stateContractRevision",
        "stateContractDigest",
        "simulationDigest",
        "presentationDigest",
        "patchSet",
      ],
      "Resolved provenance",
    );
    return Object.freeze({
      story: Object.freeze({
        id: nonemptyStringV1(story.id, "Story ID"),
        revision: parsePositiveSafeInteger(story.revision),
        digest: parseDigest(story.digest),
      }),
      engine: Object.freeze({
        version: nonemptyStringV1(engine.version, "engine version"),
        digest: parseDigest(engine.digest),
      }),
      resolved: Object.freeze({
        stateContractRevision: parsePositiveSafeInteger(resolved.stateContractRevision),
        stateContractDigest: parseDigest(resolved.stateContractDigest),
        simulationDigest: parseDigest(resolved.simulationDigest),
        presentationDigest: parseDigest(resolved.presentationDigest),
        patchSet: parsePatchSetIdentityV1(resolved.patchSet),
      }),
    });
  },
});

function parseSaveSlotIdV1(value: unknown): SaveSlotIdV1 {
  // Shape-only: a record written by a build with a larger manual slot count
  // still parses; the port enforces this application's count.
  if (!isSaveSlotIdShapeV1(value)) throw new TypeError("invalid Save slot ID");
  return value;
}

const saveSlotMetadataSchemaV1: RuntimeSchemaV1<SaveRepositorySlotMetadataV1> = Object.freeze({
  parse(value: unknown) {
    const fields = exactFieldsV1(
      value,
      ["storyId", "slotId", "writeReason", "capturedCommandSequence"],
      "Save slot metadata",
    );
    const writeReason = fields.writeReason;
    if (
      writeReason !== "auto" &&
      writeReason !== "quick" &&
      (typeof writeReason !== "string" || manualSaveSlotIndexV1(writeReason) === null)
    ) {
      throw new TypeError("invalid Save write reason");
    }
    return Object.freeze({
      storyId: nonemptyStringV1(fields.storyId, "Save Story ID"),
      slotId: parseSaveSlotIdV1(fields.slotId),
      writeReason: writeReason as SaveRepositorySlotMetadataV1["writeReason"],
      capturedCommandSequence: parseNonNegativeSafeInteger(fields.capturedCommandSequence),
    });
  },
});

const simulationLineageSchemaV1: RuntimeSchemaV1<readonly SimulationAdoptionV1[]> = Object.freeze({
  parse(value: unknown) {
    return denseArrayV1(
      value,
      "simulation lineage",
      (entry) => {
        const fields = exactFieldsV1(
          entry,
          [
            "fromSimulationDigest",
            "toSimulationDigest",
            "viaSimulationPatchSetDigest",
            "adoptedAtCommandSequence",
          ],
          "SimulationAdoptionV1",
        );
        const fromSimulationDigest = parseDigest(fields.fromSimulationDigest);
        const toSimulationDigest = parseDigest(fields.toSimulationDigest);
        if (fromSimulationDigest === toSimulationDigest) {
          throw new TypeError("empty simulation adoption");
        }
        return Object.freeze({
          fromSimulationDigest,
          toSimulationDigest,
          viaSimulationPatchSetDigest: parseDigest(fields.viaSimulationPatchSetDigest),
          adoptedAtCommandSequence: parseNonNegativeSafeInteger(fields.adoptedAtCommandSequence),
        });
      },
      16,
    );
  },
});

function createStandardPersistenceDependenciesV1<
  TState,
  TSnapshot extends {
    readonly state: TState;
    readonly commandSequence: NonNegativeSafeInteger;
  },
>(
  options: CreateStandardPersistenceServiceOptionsV1<TState, TSnapshot>,
  instrumentation?: SnapshotWorkInstrumentationV1,
): {
  readonly repository: SaveRepositoryV1<PersistenceSaveRecordV1<TSnapshot>>;
  readonly lease: SessionLeaseV1;
  readonly validation: SaveImportValidationContextV1<
    TState,
    TSnapshot,
    PersistenceSaveRecordV1<TSnapshot>
  >;
} {
  const adoptionDeclarations = admitAdoptionDeclarationsInternalV1(
    options.adoptionDeclarations,
  );
  const recordSchema = createSaveRecordEnvelopeSchemaV1(
    options.snapshotSchema,
    buildProvenanceSchemaV1,
    saveSlotMetadataSchemaV1,
    simulationLineageSchemaV1,
  );
  const codec: SaveCodecContextV1<TSnapshot, PersistenceSaveRecordV1<TSnapshot>> = Object.freeze({
    recordSchema,
    validateEnvelope(record: DeepReadonly<PersistenceSaveRecordV1<TSnapshot>>) {
      const expectedReason =
        record.slot.slotId === "auto.current" || record.slot.slotId === "auto.previous"
          ? "auto"
          : record.slot.slotId;
      if (
        record.slot.storyId !== record.provenance.story.id ||
        record.slot.writeReason !== expectedReason ||
        record.slot.capturedCommandSequence !== record.snapshot.commandSequence
      ) {
        throw new TypeError("invalid Save envelope identity");
      }
      for (let index = 0; index < record.simulationLineage.length; index += 1) {
        const current = record.simulationLineage[index];
        const previous = record.simulationLineage[index - 1];
        const next = record.simulationLineage[index + 1];
        if (
          current === undefined ||
          current.toSimulationDigest !==
            (next?.fromSimulationDigest ?? record.provenance.resolved.simulationDigest) ||
          (previous !== undefined &&
            previous.adoptedAtCommandSequence > current.adoptedAtCommandSequence) ||
          current.adoptedAtCommandSequence > record.snapshot.commandSequence
        ) {
          throw new TypeError("invalid simulation lineage chain");
        }
      }
    },
  });
  const lease = createSessionLeaseV1({
    records: options.records,
    storyId: options.provenance.story.id,
    ownerId: options.ownerId,
    nextHandoffRequestId: options.nextHandoffRequestId,
  });
  const repository = createSaveRepositoryInternalV1(
    {
      records: options.records,
      storyId: options.provenance.story.id,
      codec,
    },
    instrumentation,
    { writeReceiptEvidence: true },
  );
  const validation: SaveImportValidationContextV1<
    TState,
    TSnapshot,
    PersistenceSaveRecordV1<TSnapshot>
  > = Object.freeze({
    codec,
    currentStateContractRevision: options.provenance.resolved.stateContractRevision,
    saveStateMigrations: options.saveStateMigrations,
    classifyCompatibility(record: DeepReadonly<PersistenceSaveRecordV1<TSnapshot>>) {
      return classifySaveCompatibilityV1({
        stored: record.provenance,
        current: options.provenance,
        simulationLineage: record.simulationLineage,
        adoptionDeclarations,
        candidateCommandSequence: record.snapshot.commandSequence,
      });
    },
    validateReferences: options.validateReferences,
    validateInvariants: options.validateInvariants,
  });
  return Object.freeze({ repository, lease, validation });
}

function createStandardPersistenceServiceInternalV1<
  TState,
  TSnapshot extends {
    readonly state: TState;
    readonly commandSequence: NonNegativeSafeInteger;
  },
>(
  options: CreateStandardPersistenceServiceOptionsV1<TState, TSnapshot>,
  instrumentation?: SnapshotWorkInstrumentationV1,
  testOptions?: PersistenceServiceTestOptionsInternalV1<TState>,
): Promise<PersistenceServiceV1<TSnapshot>> {
  const dependencies = createStandardPersistenceDependenciesV1(options, instrumentation);
  const repository = testOptions?.wrapRepositoryForWriteReceiptFallback === true
    ? Object.freeze({ ...dependencies.repository })
    : dependencies.repository;
  return createPersistenceServiceWithDependenciesV1(
    {
      runtimeControl: options.runtimeControl,
      ...dependencies,
      repository,
      provenance: options.provenance,
      initialSimulationLineage: options.initialSimulationLineage,
      metadataClock: options.metadataClock,
      exportFilename: options.exportFilename,
      ...(options.manualSaveSlotCount === undefined
        ? {}
        : { manualSaveSlotCount: options.manualSaveSlotCount }),
      ...(options.leaseAcquisition === undefined
        ? {}
        : { leaseAcquisition: options.leaseAcquisition }),
      ...(options.autoSaveCapture === undefined
        ? {}
        : { autoSaveCapture: options.autoSaveCapture }),
      ...(options.summarizeSave === undefined
        ? {}
        : { summarizeSave: options.summarizeSave.bind(options) }),
      ...(options.classifyWriteCandidate === undefined
        ? {}
        : { classifyWriteCandidate: options.classifyWriteCandidate.bind(options) }),
      ...(options.collectVersionStamp === undefined
        ? {}
        : { collectVersionStamp: options.collectVersionStamp.bind(options) }),
    },
    instrumentation,
    testOptions,
  );
}

export function createPersistenceServiceV1<
  TState,
  TSnapshot extends {
    readonly state: TState;
    readonly commandSequence: NonNegativeSafeInteger;
  },
>(
  options: CreatePersistenceServiceOptionsV1<TState, TSnapshot>,
): Promise<PersistenceServiceV1<TSnapshot>>;
export function createPersistenceServiceV1<
  TState,
  TSnapshot extends {
    readonly state: TState;
    readonly commandSequence: NonNegativeSafeInteger;
  },
>(
  options: CreateStandardPersistenceServiceOptionsV1<TState, TSnapshot>,
): Promise<PersistenceServiceV1<TSnapshot>>;
export function createPersistenceServiceV1<
  TState,
  TSnapshot extends {
    readonly state: TState;
    readonly commandSequence: NonNegativeSafeInteger;
  },
>(
  options:
    | CreatePersistenceServiceOptionsV1<TState, TSnapshot>
    | CreateStandardPersistenceServiceOptionsV1<TState, TSnapshot>,
): Promise<PersistenceServiceV1<TSnapshot>> {
  if ("repository" in options) {
    return createPersistenceServiceWithDependenciesV1(options);
  }
  return createStandardPersistenceServiceInternalV1(options);
}

/**
 * @internal Instrumented standard-composition test/bench path; intentionally
 * absent from runtime package barrels.
 */
export function createInstrumentedPersistenceServiceV1<
  TState,
  TSnapshot extends {
    readonly state: TState;
    readonly commandSequence: NonNegativeSafeInteger;
  },
>(
  options: CreateStandardPersistenceServiceOptionsV1<TState, TSnapshot>,
  instrumentation?: SnapshotWorkInstrumentationV1,
  testOptions?: PersistenceServiceTestOptionsInternalV1<TState>,
): Promise<PersistenceServiceV1<TSnapshot>> {
  return createStandardPersistenceServiceInternalV1(options, instrumentation, testOptions);
}
