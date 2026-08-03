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
import type { SaveStateMigrationRegistryV1 } from "../../contracts/save-state-migration.ts";
import type {
  ExportedSaveV1,
  PersistenceOperationResultV1,
  PersistenceStatusV1,
  SaveCodecContextV1,
  SaveExportOperationResultV1,
  SaveImportInvariantViewV1,
  SaveImportValidationContextV1,
  SaveImportValidationResultV1,
  SaveRecordEnvelopeV1,
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
import type { GameSessionRuntimeControlV1 } from "../session/game-session.ts";
import { lookupInstalledSnapshotDigestInternalV1 } from "../session/game-session.ts";
import type { AutoSaveAttemptReceiptInternalV1 } from "./auto-save-queue.ts";
import {
  createAutoSaveQueueV1,
  enqueueAutoSaveWithReceiptInternalV1,
  establishAutoSaveAnchorWithReceiptInternalV1,
} from "./auto-save-queue.ts";
import {
  classifySaveCompatibilityV1,
  finishSaveImportCandidateInternalV1,
  prepareSaveImportCandidateInternalV1,
  resumeSaveImportCandidateInternalV1,
  validateSaveImportCandidateV1,
} from "./compatibility.ts";
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
  SessionLeaseOperationResultV1
>;

export type PersistenceRebootstrapDisposalV1 =
  | {
    readonly ownership: "released";
    readonly code: null;
    readonly fence: DeepReadonly<SessionLeaseFenceV1>;
  }
  | {
    readonly ownership: "read_only";
    readonly code: "lease_release_failed";
    readonly fence: null;
  };

export type PersistenceRebootstrapTakeoverV1 =
  | {
    readonly ownership: "writable";
    readonly code: null;
    readonly fence: DeepReadonly<SessionLeaseFenceV1>;
  }
  | {
    readonly ownership: "read_only";
    readonly code: "lease_release_failed" | "lease_takeover_failed";
    readonly fence: null;
  };

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
  disposeForRebootstrap(): Promise<PersistenceRebootstrapDisposalV1>;
  takeOverForRebootstrap(
    previous: DeepReadonly<PersistenceRebootstrapDisposalV1>,
  ): Promise<PersistenceRebootstrapTakeoverV1>;
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
  ): Promise<PersistenceOperationResultV1>;
  importWithReplacementCommit(
    bytes: Uint8Array,
    onReplacementCommit: () => void,
  ): Promise<PersistenceOperationResultV1>;
  fencePlayerMutations(): void;
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

/** @internal Binds application presentation attribution to one queued load commit. */
export function loadWithReplacementCommitInternalV1<TSnapshot>(
  service: PersistenceServiceV1<TSnapshot>,
  slot: SaveSlotIdV1,
  onReplacementCommit: () => void,
): Promise<PersistenceOperationResultV1> {
  const control = persistenceServiceControlsInternalV1.get(service);
  if (control === undefined) {
    throw new TypeError("Persistence service does not support replacement commit binding");
  }
  return control.loadWithReplacementCommit(slot, onReplacementCommit);
}

/** @internal Binds application presentation attribution to one queued import commit. */
export function importWithReplacementCommitInternalV1<TSnapshot>(
  service: PersistenceServiceV1<TSnapshot>,
  bytes: Uint8Array,
  onReplacementCommit: () => void,
): Promise<PersistenceOperationResultV1> {
  const control = persistenceServiceControlsInternalV1.get(service);
  if (control === undefined) {
    throw new TypeError("Persistence service does not support replacement commit binding");
  }
  return control.importWithReplacementCommit(bytes, onReplacementCommit);
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
  readonly adoptionDeclaration: DeepReadonly<PatchSetAdoptionDeclarationV1> | null;
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
  let safelySavedCommandSequence: NonNegativeSafeInteger | null = null;
  let lastFailureCode: string | null = null;
  let rebootstrapFailureCode: "lease_release_failed" | "lease_takeover_failed" | null = null;
  let foregroundWrites = 0;
  let autoWrites = 0;
  let physicalTail: Promise<void> = Promise.resolve();
  let lifecycle: "active" | "disposing" | "disposed" = "active";
  let playerMutationsFenced = false;
  let rebootstrapTransferPending = leaseAcquisition === "deferred_rebootstrap";
  let leaseMutationTail: Promise<void> = Promise.resolve();
  let publicReleaseFence: DeepReadonly<SessionLeaseFenceV1> | null = null;
  let disposalPromise: Promise<PersistenceRebootstrapDisposalV1> | null = null;
  let takeoverPromise: Promise<PersistenceRebootstrapTakeoverV1> | null = null;
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
  const autoQueue = createAutoSaveQueueV1<AutoCandidateV1<TSnapshot>, PersistenceOperationResultV1>(
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
  );

  const sameAutoSaveFenceV1 = (
    left: DeepReadonly<SessionLeaseFenceV1> | null,
    right: DeepReadonly<SessionLeaseFenceV1> | null,
  ): boolean =>
    left === null || right === null
      ? left === right
      : left.ownerId === right.ownerId && left.fencingToken === right.fencingToken;

  const trackAutoSaveAttemptV1 = (
    snapshot: DeepReadonly<TSnapshot>,
    fence: DeepReadonly<SessionLeaseFenceV1> | null,
    anchorEpoch: NonNegativeSafeInteger,
    attemptIdentity: object,
    receipt: Promise<AutoSaveAttemptReceiptInternalV1<PersistenceOperationResultV1>>,
  ): Promise<PersistenceAutoSaveAttemptReceiptInternalV1> => {
    const snapshotKey = snapshot as object;
    const attemptMap = autoSaveAttemptsBySnapshot;
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

  const establishAnchorV1 = (
    snapshot: DeepReadonly<TSnapshot>,
    simulationLineage: readonly DeepReadonly<SimulationAdoptionV1>[],
  ): void => {
    if (lifecycle !== "active" || playerMutationsFenced) return;
    const nextLineage = copyLineageV1(simulationLineage);
    lastSuccessfulAutoSnapshot = null;
    lastSuccessfulAutoFence = null;
    lastSuccessfulAutoPhysicalOrder = null;
    autoSaveAttemptsBySnapshot = new WeakMap();
    const fence = options.lease.captureFence();
    const attemptIdentity = Object.freeze({});
    const receipt = establishAutoSaveAnchorWithReceiptInternalV1<
      AutoCandidateV1<TSnapshot>,
      PersistenceOperationResultV1
    >(
      autoQueue,
      Object.freeze({
        snapshot,
        simulationLineage: nextLineage,
        fence,
        attemptIdentity,
      }),
    );
    void trackAutoSaveAttemptV1(snapshot, fence, autoQueue.anchorEpoch(), attemptIdentity, receipt);
    currentLineage = nextLineage;
    safelySavedCommandSequence = null;
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
  const validateStoredSlotForLoadV1 = (slotId: SaveSlotIdV1) =>
    validateStoredSlotInternalV1(slotId, true);

  const enqueueReplacementV1 = (
    operation: (
      current: DeepReadonly<TSnapshot>,
    ) => Promise<ReturnType<typeof replacementOutcomeV1>>,
    onReplacementCommit?: () => void,
  ): Promise<PersistenceOperationResultV1> => {
    if (lifecycle !== "active" || playerMutationsFenced) {
      return Promise.resolve(faultedV1("runtime_disposed"));
    }
    let preparedLineage: readonly DeepReadonly<SimulationAdoptionV1>[] | null = null;
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
            preparedLineage = outcome.simulationLineage;
            return Object.freeze({
              kind: outcome.kind,
              snapshot: outcome.snapshot,
              result: outcome.result,
              anchor: outcome.anchor,
            });
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
      (committedSnapshot) => {
        if (preparedLineage === null) {
          throw new TypeError("missing committed persistence lineage");
        }
        establishAnchorV1(committedSnapshot, preparedLineage);
        try {
          onReplacementCommit?.();
        } catch {
          // Package-internal presentation attribution is observational and
          // cannot turn a valid authoritative replacement into a fault.
        }
        lastFailureCode = null;
      },
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
    trackSuccessfulRelease = false,
  ): Promise<SessionLeaseOperationResultV1> => {
    if (lifecycle !== "active" || playerMutationsFenced || rebootstrapTransferPending) {
      return Promise.resolve(
        Object.freeze({ kind: "rejected" as const, code: "conflict" as const }),
      );
    }
    const acceptedReleaseFence = trackSuccessfulRelease ? options.lease.captureFence() : null;
    const result = Promise.resolve().then(() => leaseOperationV1(operation));
    const tracked = result.then((settled) => {
      if (
        acceptedReleaseFence !== null &&
        settled.kind === "updated" &&
        settled.status.kind === "unowned" &&
        settled.status.fencingToken === acceptedReleaseFence.fencingToken
      ) {
        publicReleaseFence = Object.freeze({ ...acceptedReleaseFence });
      }
    });
    leaseMutationTail = Promise.all([leaseMutationTail, tracked]).then(() => undefined);
    return result;
  };

  const loadV1 = (
    slot: SaveSlotIdV1,
    onReplacementCommit?: () => void,
  ): Promise<PersistenceOperationResultV1> => {
    if (!slotWithinCountV1(slot)) {
      return Promise.resolve(faultedV1("persistence.invalid_slot"));
    }
    return enqueueReplacementV1(async () => {
      const read = await validateStoredSlotForLoadV1(slot);
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
    }, onReplacementCommit);
  };

  const importSaveV1 = (
    bytes: Uint8Array,
    onReplacementCommit?: () => void,
  ): Promise<PersistenceOperationResultV1> => {
    const accepted = Uint8Array.from(bytes);
    return enqueueReplacementV1(
      async () => replacementOutcomeV1(accepted, "imported"),
      onReplacementCommit,
    );
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
      release: () => publicLeaseMutationV1(() => options.lease.release(), true),
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

  const disposeForRebootstrapV1 = (): Promise<PersistenceRebootstrapDisposalV1> => {
    if (disposalPromise !== null) return disposalPromise;
    lifecycle = "disposing";
    rebootstrapTransferPending = true;
    const preDrainFence = options.lease.captureFence();
    disposalPromise = (async () => {
      await leaseMutationTail;
      let observedAfterDrain: SessionLeaseStatusV1 | null = null;
      try {
        observedAfterDrain = await refreshLeaseStatusV1();
      } catch {
        rememberFailureV1("persistence.unexpected");
      }
      const releaseFence = options.lease.captureFence();
      const releasedFenceCandidate = publicReleaseFence ?? preDrainFence;
      const alreadyReleasedFence = releaseFence === null &&
          observedAfterDrain?.kind === "unowned" &&
          releasedFenceCandidate !== null &&
          observedAfterDrain.fencingToken === releasedFenceCandidate.fencingToken
        ? releasedFenceCandidate
        : null;
      try {
        const runtime = options.runtimeControl.inspectForRuntime();
        autoQueue.establishAnchor(
          Object.freeze({
            snapshot: runtime.snapshot,
            simulationLineage: currentLineage,
            fence: releaseFence,
            attemptIdentity: Object.freeze({}),
          }),
        );
        safelySavedCommandSequence = null;
        await autoQueue.idle();
        await physicalTail;
      } catch {
        rememberFailureV1("persistence.unexpected");
      }
      lifecycle = "disposed";

      if (alreadyReleasedFence !== null) {
        return Object.freeze({
          ownership: "released" as const,
          code: null,
          fence: Object.freeze({ ...alreadyReleasedFence }),
        });
      }
      if (releaseFence !== null) {
        try {
          const result = await options.lease.releaseFence(releaseFence);
          if (
            result.kind === "updated" &&
            result.status.kind === "unowned" &&
            result.status.fencingToken === releaseFence.fencingToken
          ) {
            leaseStatus = result.status;
            return Object.freeze({
              ownership: "released" as const,
              code: null,
              fence: Object.freeze({ ...releaseFence }),
            });
          }
        } catch {
          // The stable lifecycle result below intentionally hides Host-specific failures.
        }
      }
      rebootstrapFailureCode = "lease_release_failed";
      rememberFailureV1(rebootstrapFailureCode);
      return Object.freeze({
        ownership: "read_only" as const,
        code: "lease_release_failed" as const,
        fence: null,
      });
    })();
    return disposalPromise;
  };

  const takeOverForRebootstrapV1 = (
    previous: DeepReadonly<PersistenceRebootstrapDisposalV1>,
  ): Promise<PersistenceRebootstrapTakeoverV1> => {
    if (takeoverPromise !== null) return takeoverPromise;
    takeoverPromise = (async () => {
      if (lifecycle !== "active" || previous.ownership === "read_only") {
        const code = previous.ownership === "read_only"
          ? previous.code
          : ("lease_takeover_failed" as const);
        rebootstrapFailureCode = code;
        rememberFailureV1(code);
        return Object.freeze({
          ownership: "read_only" as const,
          code,
          fence: null,
        });
      }
      try {
        const result = await options.lease.takeOverUnowned(previous.fence.fencingToken);
        const fence = options.lease.captureFence();
        if (
          result.kind === "updated" &&
          result.status.kind === "owned" &&
          fence !== null &&
          fence.ownerId === result.status.ownerId &&
          fence.fencingToken === result.status.fencingToken &&
          Number(fence.fencingToken) === Number(previous.fence.fencingToken) + 1
        ) {
          leaseStatus = result.status;
          rebootstrapTransferPending = false;
          return Object.freeze({
            ownership: "writable" as const,
            code: null,
            fence: Object.freeze({ ...fence }),
          });
        }
      } catch {
        // The stable lifecycle result below intentionally hides Host-specific failures.
      }
      rebootstrapFailureCode = "lease_takeover_failed";
      rememberFailureV1(rebootstrapFailureCode);
      return Object.freeze({
        ownership: "read_only" as const,
        code: "lease_takeover_failed" as const,
        fence: null,
      });
    })();
    return takeoverPromise;
  };

  const service: PersistenceServiceV1<TSnapshot> = Object.freeze({
    port,
    getSimulationLineage: () => currentLineage,
    establishAnchor: establishAnchorV1,
    captureAutoSave: captureAutoSaveV1,
    autoSaveIdle: () => autoQueue.idle(),
    disposeForRebootstrap: disposeForRebootstrapV1,
    takeOverForRebootstrap: takeOverForRebootstrapV1,
  });
  persistenceServiceControlsInternalV1.set(
    service,
    Object.freeze({
      captureAutoSaveWithReceipt: (snapshot: unknown) =>
        captureAutoSaveWithReceiptV1(snapshot as DeepReadonly<TSnapshot>),
      loadWithReplacementCommit: (
        slot: SaveSlotIdV1,
        onReplacementCommit: () => void,
      ) => loadV1(slot, onReplacementCommit),
      importWithReplacementCommit: (
        bytes: Uint8Array,
        onReplacementCommit: () => void,
      ) => importSaveV1(bytes, onReplacementCommit),
      fencePlayerMutations: () => {
        playerMutationsFenced = true;
      },
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
        adoptionDeclaration: options.adoptionDeclaration,
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
