// SPDX-License-Identifier: MIT
import type {
  DeepReadonly,
  ExportedSaveV1,
  ManualSaveSlotIdV1,
  PersistenceOperationResultV1,
  PersistenceStatusV1,
  SaveBackupExportOperationResultV1,
  SaveBackupInspectionResultV1,
  SaveBackupOperationResultV1,
  SaveExportOperationResultV1,
  SaveInspectionResultV1,
  SaveRewriteOperationResultV1,
  SaveSlotHealthV1,
  SaveSlotSummaryV1,
} from "@sillymaker/base";
import { manualSaveSlotIndexV1 } from "@sillymaker/base";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import type { ReactElement } from "react";
import { Button } from "../primitives/button.tsx";
import type { SystemDialogSavesConfirmationIntentInternalV1 } from "../system/system-dialog-managed-host.tsx";
import type {
  SystemDialogConfirmationOperationBindingInternalV1,
  SystemDialogConfirmationResultDeliveryInternalV1,
} from "../system/system-dialog-managed-session.ts";
import styles from "./save-overlay.module.css";

export type SaveUiWritableSlotIdV1 = "quick" | ManualSaveSlotIdV1;
export type SaveUiReadableSlotIdV1 = "auto.current" | "auto.previous" | SaveUiWritableSlotIdV1;
export type SaveUiImportFileRejectionCodeV1 = "too_large" | "unsupported_type";
export type SaveUiImportResultV1 =
  | PersistenceOperationResultV1
  | { readonly kind: "cancelled" }
  | { readonly kind: "rejected"; readonly code: SaveUiImportFileRejectionCodeV1 };

export type SaveUiBackupExportResultV1 =
  | { readonly kind: "exported"; readonly slotId: SaveUiReadableSlotIdV1 }
  | Extract<SaveBackupExportOperationResultV1, { readonly kind: "rejected" | "faulted" }>;

interface SaveOverlayRecoveryPortV1 {
  inspectSave(slotId: SaveUiReadableSlotIdV1): Promise<SaveInspectionResultV1>;
  inspectBackup(slotId: SaveUiReadableSlotIdV1): Promise<SaveBackupInspectionResultV1>;
  upgradeSave(slotId: SaveUiReadableSlotIdV1): Promise<SaveRewriteOperationResultV1>;
  reanchorSave(slotId: SaveUiReadableSlotIdV1): Promise<SaveRewriteOperationResultV1>;
  restoreBackup(slotId: SaveUiReadableSlotIdV1): Promise<SaveBackupOperationResultV1>;
  exportBackup(slotId: SaveUiReadableSlotIdV1): Promise<SaveUiBackupExportResultV1>;
  discardBackup(slotId: SaveUiReadableSlotIdV1): Promise<SaveBackupOperationResultV1>;
}

/**
 * The UI consumes the existing player-safe persistence port. The sync-or-Promise status return
 * is the only structural compatibility allowance: the runtime exposes an asynchronous
 * read, while application shells may already hold the same immutable status value.
 */
export interface SaveOverlayPortV1 {
  getStatus(): DeepReadonly<PersistenceStatusV1> | Promise<DeepReadonly<PersistenceStatusV1>>;
  listSlots(): Promise<readonly DeepReadonly<SaveSlotSummaryV1>[]>;
  readonly recovery?: SaveOverlayRecoveryPortV1;
  save(slotId: SaveUiWritableSlotIdV1): Promise<PersistenceOperationResultV1>;
  load(slotId: SaveUiReadableSlotIdV1): Promise<PersistenceOperationResultV1>;
  clear(slotId: SaveUiReadableSlotIdV1): Promise<PersistenceOperationResultV1>;
  /** Rewrites the stored record's player note (empty string clears it). */
  annotateSave(slotId: SaveUiWritableSlotIdV1, note: string): Promise<PersistenceOperationResultV1>;
  importSave(): Promise<SaveUiImportResultV1>;
  exportSave(slotId: SaveUiReadableSlotIdV1): Promise<SaveExportOperationResultV1>;
  exportCurrentSave(): Promise<ExportedSaveV1>;
}

type PersistenceRejectedCodeV1 = Extract<
  PersistenceOperationResultV1,
  { readonly kind: "rejected" }
>["code"];
type ExportRejectedCodeV1 = Extract<
  SaveExportOperationResultV1,
  { readonly kind: "rejected" }
>["code"];
type RecoveryRejectedCodeV1 =
  | Extract<SaveRewriteOperationResultV1, { readonly kind: "rejected" }>["code"]
  | Extract<SaveBackupOperationResultV1, { readonly kind: "rejected" }>["code"]
  | Extract<SaveUiBackupExportResultV1, { readonly kind: "rejected" }>["code"];

/** Fixed names for the system slots plus a formatter for numbered manual slots. */
export interface SaveOverlaySlotNamesV1 {
  readonly "auto.current": string;
  readonly "auto.previous": string;
  readonly quick: string;
  readonly manualSlot: (index: number) => string;
}

export interface SaveOverlayLabelsV1 {
  readonly accessibleName: string;
  readonly title: string;
  readonly storageLoading: string;
  readonly storageReady: string;
  readonly storageBusy: string;
  readonly storageUnavailable: string;
  readonly slotsUnavailable: string;
  readonly safelySaved: (commandSequence: number) => string;
  readonly lastFailure: (code: string) => string;
  readonly slotNames: SaveOverlaySlotNamesV1;
  readonly slotHealth: Readonly<Record<SaveSlotHealthV1, string>>;
  readonly quickSave: string;
  readonly manualSave: string;
  /** Formats a slot's savedAt instant; defaults to the locale string. */
  readonly savedAtText?: (isoInstant: string) => string;
  readonly importSave: string;
  readonly exportCurrentSave: string;
  readonly loadSlot: (slotName: string) => string;
  readonly clearSlot: (slotName: string) => string;
  readonly exportSlot: (slotName: string) => string;
  readonly confirmation: {
    readonly loadTitle: (slotName: string) => string;
    readonly loadDescription: (slotName: string) => string;
    readonly clearTitle: (slotName: string) => string;
    readonly clearDescription: (slotName: string) => string;
    readonly importTitle: string;
    readonly importDescription: string;
    readonly confirmLabel: string;
    readonly cancelLabel: string;
    readonly pendingText: string;
    readonly completedText: string;
    readonly failedText: string;
  };
  readonly operation: {
    readonly saving: (slotName: string) => string;
    readonly loading: (slotName: string) => string;
    readonly clearing: (slotName: string) => string;
    readonly importing: string;
    readonly exporting: (slotName: string) => string;
    readonly exportingCurrent: string;
    readonly saved: (slotName: string) => string;
    readonly cleared: (slotName: string) => string;
    readonly loadedExact: string;
    readonly loadedAdopted: string;
    readonly importedExact: string;
    readonly importedAdopted: string;
    readonly importCancelled: string;
    readonly importFileRejected: Readonly<Record<SaveUiImportFileRejectionCodeV1, string>>;
    readonly exported: (slotName: string) => string;
    readonly exportedCurrent: string;
    readonly rejected: Readonly<Record<PersistenceRejectedCodeV1, string>>;
    readonly exportRejected: Readonly<Record<ExportRejectedCodeV1, string>>;
    readonly faulted: (code: string) => string;
    readonly unexpectedFailure: string;
  };
  readonly recovery?: {
    readonly checking: string;
    readonly disposition: Readonly<{
      direct: string;
      migration_required: string;
      adoption_required: string;
      migration_and_adoption_required: string;
      migration_unavailable: string;
      migration_rejected: string;
      incompatible: string;
      reanchor_required: string;
      invalid_record: string;
      unavailable: string;
      faulted: string;
    }>;
    readonly backup: Readonly<{
      available: string;
      invalid: string;
      unavailable: string;
    }>;
    readonly action: Readonly<{
      inspect: string;
      upgrade: string;
      reanchor: string;
      restore: string;
      exportBackup: string;
      discard: string;
    }>;
    readonly confirmation: Readonly<{
      reanchorTitle: (slotName: string) => string;
      reanchorDescription: (slotName: string) => string;
      restoreTitle: (slotName: string) => string;
      restoreDescription: (slotName: string) => string;
      discardTitle: (slotName: string) => string;
      discardDescription: (slotName: string) => string;
    }>;
    readonly operation: Readonly<{
      upgrading: (slotName: string) => string;
      reanchoring: (slotName: string) => string;
      restoring: (slotName: string) => string;
      exportingBackup: (slotName: string) => string;
      discarding: (slotName: string) => string;
      upgradedExact: string;
      upgradedAdopted: string;
      reanchored: string;
      restored: string;
      backupExported: string;
      discarded: string;
      rejected: Readonly<Record<RecoveryRejectedCodeV1, string>>;
      faulted: string;
    }>;
  };
}

/**
 * Story-declared safepoint. Authoritative snapshots are always committed
 * atomically, so persistence itself never tears — the guard expresses the
 * game-design boundary (no manual saves mid-dialogue, mid-battle…). Manual
 * writes are disabled with the stated reason; loads and exports stay open.
 */
export interface SaveOverlayGuardV1 {
  readonly allowed: boolean;
  readonly reasonText?: string;
}

export interface SaveOverlayGuardProjectionInternalV1 {
  getSnapshot(): unknown;
  subscribe(listener: () => void): () => void;
  evaluate(publication: unknown): SaveOverlayGuardV1 | undefined;
}

export interface SaveOverlayContentPropsInternalV1 {
  readonly port: SaveOverlayPortV1;
  readonly labels: SaveOverlayLabelsV1;
  readonly guard?: SaveOverlayGuardV1;
  readonly guardProjection?: SaveOverlayGuardProjectionInternalV1;
  readonly confirmationIntent: SystemDialogSavesConfirmationIntentInternalV1;
  readonly closeLabel: string;
  onCloseInternalV1(): void;
}

function slotNameV1(labels: SaveOverlayLabelsV1, slotId: SaveUiReadableSlotIdV1): string {
  if (slotId === "auto.current" || slotId === "auto.previous" || slotId === "quick") {
    return labels.slotNames[slotId];
  }
  const index = manualSaveSlotIndexV1(slotId);
  if (index === null) throw new TypeError(`ui.save_overlay_unknown_slot:${slotId}`);
  return labels.slotNames.manualSlot(index);
}

function writableSlotIdV1(slotId: SaveUiReadableSlotIdV1): SaveUiWritableSlotIdV1 | null {
  if (slotId === "quick") return slotId;
  return manualSaveSlotIndexV1(slotId) === null ? null : (slotId as SaveUiWritableSlotIdV1);
}

interface SlotRecoveryReadV1 {
  readonly inspection: DeepReadonly<SaveInspectionResultV1>;
  readonly backup: DeepReadonly<SaveBackupInspectionResultV1>;
}

type SlotRecoveryReadStateV1 =
  | { readonly kind: "pending" }
  | { readonly kind: "ready"; readonly value: SlotRecoveryReadV1 }
  | { readonly kind: "failed" };

type SlotRecoveryByIdV1 = Readonly<Record<string, SlotRecoveryReadStateV1>>;

type SlotReadStateV1 =
  | {
    readonly kind: "loading";
    /** Last known slot list so rows survive a refresh (kept disabled). */
    readonly slots: readonly DeepReadonly<SaveSlotSummaryV1>[] | null;
  }
  | {
    readonly kind: "ready";
    readonly status: DeepReadonly<PersistenceStatusV1>;
    readonly slots: readonly DeepReadonly<SaveSlotSummaryV1>[];
  }
  | { readonly kind: "failed" };

type SaveOperationContextV1 =
  | { readonly kind: "save"; readonly slotId: SaveUiWritableSlotIdV1 }
  | { readonly kind: "load"; readonly slotId: SaveUiReadableSlotIdV1 }
  | { readonly kind: "clear"; readonly slotId: SaveUiReadableSlotIdV1 }
  | { readonly kind: "export"; readonly slotId: SaveUiReadableSlotIdV1 }
  | {
    readonly kind: "upgrade" | "reanchor" | "restore_backup" | "export_backup" | "discard_backup";
    readonly slotId: SaveUiReadableSlotIdV1;
  }
  | { readonly kind: "import" }
  | { readonly kind: "export_current" };

type PersistenceOperationViewResultV1 =
  | { readonly kind: "saved" | "cleared"; readonly slotId: SaveUiReadableSlotIdV1 }
  | { readonly kind: "loaded" | "imported"; readonly compatibility: "exact" | "adopted" }
  | { readonly kind: "rejected"; readonly code: PersistenceRejectedCodeV1 }
  | { readonly kind: "faulted"; readonly code: string };

type SaveExportOperationViewResultV1 =
  | { readonly kind: "exported"; readonly slotId: SaveUiReadableSlotIdV1 }
  | { readonly kind: "rejected"; readonly code: ExportRejectedCodeV1 }
  | { readonly kind: "faulted"; readonly code: string };

type SaveImportFileSelectionViewResultV1 =
  | { readonly kind: "cancelled" }
  | { readonly kind: "rejected"; readonly code: SaveUiImportFileRejectionCodeV1 };

type SaveOperationViewV1 =
  | { readonly kind: "idle" }
  | { readonly kind: "pending"; readonly context: SaveOperationContextV1 }
  | {
    readonly kind: "persistence_result";
    readonly context: Exclude<
      SaveOperationContextV1,
      { readonly kind: "export" | "export_current" }
    >;
    readonly result: PersistenceOperationViewResultV1;
  }
  | {
    readonly kind: "export_result";
    readonly context: Extract<SaveOperationContextV1, { readonly kind: "export" }>;
    readonly result: SaveExportOperationViewResultV1;
  }
  | {
    readonly kind: "import_file_selection_result";
    readonly result: SaveImportFileSelectionViewResultV1;
  }
  | { readonly kind: "recovery_result"; readonly text: string }
  | { readonly kind: "current_exported" }
  | { readonly kind: "unexpected_failure" };

type ConfirmedSaveOperationV1 =
  | { readonly kind: "load"; readonly slotId: SaveUiReadableSlotIdV1 }
  | { readonly kind: "clear"; readonly slotId: SaveUiReadableSlotIdV1 }
  | { readonly kind: "reanchor"; readonly slotId: SaveUiReadableSlotIdV1 }
  | { readonly kind: "restore"; readonly slotId: SaveUiReadableSlotIdV1 }
  | { readonly kind: "discard"; readonly slotId: SaveUiReadableSlotIdV1 }
  | { readonly kind: "import" };

function unreachableV1(value: never): never {
  throw new TypeError(`ui.save_overlay_unreachable:${String(value)}`);
}

function requiredRecoveryLabelsV1(
  labels: SaveOverlayLabelsV1,
): NonNullable<SaveOverlayLabelsV1["recovery"]> {
  if (labels.recovery === undefined) {
    throw new TypeError("ui.save_overlay_recovery_labels_unavailable");
  }
  return labels.recovery;
}

function slotHealthTextV1(health: SaveSlotHealthV1, labels: SaveOverlayLabelsV1): string {
  switch (health) {
    case "empty":
      return labels.slotHealth.empty;
    case "valid":
      return labels.slotHealth.valid;
    case "invalid":
      return labels.slotHealth.invalid;
    case "recovery_candidate":
      return labels.slotHealth.recovery_candidate;
    case "unavailable":
      return labels.slotHealth.unavailable;
    default:
      return unreachableV1(health);
  }
}

function persistenceRejectedTextV1(
  code: PersistenceRejectedCodeV1,
  labels: SaveOverlayLabelsV1,
): string {
  switch (code) {
    case "busy":
      return labels.operation.rejected.busy;
    case "unavailable":
      return labels.operation.rejected.unavailable;
    case "empty_slot":
      return labels.operation.rejected.empty_slot;
    case "conflict":
      return labels.operation.rejected.conflict;
    case "in_flight":
      return labels.operation.rejected.in_flight;
    case "invalid_record":
      return labels.operation.rejected.invalid_record;
    case "invalid_note":
      return labels.operation.rejected.invalid_note;
    case "lineage_limit":
      return labels.operation.rejected.lineage_limit;
    case "migration_unavailable":
      return labels.operation.rejected.migration_unavailable;
    case "migration_rejected":
      return labels.operation.rejected.migration_rejected;
    case "incompatible":
      return labels.operation.rejected.incompatible;
    default:
      return unreachableV1(code);
  }
}

function exportRejectedTextV1(code: ExportRejectedCodeV1, labels: SaveOverlayLabelsV1): string {
  switch (code) {
    case "unavailable":
      return labels.operation.exportRejected.unavailable;
    case "empty_slot":
      return labels.operation.exportRejected.empty_slot;
    case "conflict":
      return labels.operation.exportRejected.conflict;
    case "invalid_record":
      return labels.operation.exportRejected.invalid_record;
    default:
      return unreachableV1(code);
  }
}

function inspectionTextV1(
  result: DeepReadonly<SaveInspectionResultV1>,
  recovery: NonNullable<SaveOverlayLabelsV1["recovery"]>,
): string {
  switch (result.kind) {
    case "direct":
    case "migration_required":
    case "adoption_required":
    case "migration_and_adoption_required":
      return recovery.disposition[result.kind];
    case "inspect_only":
      return recovery.disposition[result.code];
    case "rejected":
      return result.code === "empty_slot"
        ? ""
        : result.code === "unavailable"
        ? recovery.disposition.unavailable
        : result.code === "migration_rejected"
        ? recovery.disposition.migration_rejected
        : recovery.disposition.invalid_record;
    case "faulted":
      return recovery.disposition.faulted;
    default:
      return unreachableV1(result);
  }
}

function backupTextV1(
  result: DeepReadonly<SaveBackupInspectionResultV1>,
  recovery: NonNullable<SaveOverlayLabelsV1["recovery"]>,
): string {
  switch (result.kind) {
    case "available":
      return recovery.backup.available;
    case "rejected":
      if (result.code === "empty_backup") return "";
      return result.code === "invalid_backup"
        ? recovery.backup.invalid
        : recovery.backup.unavailable;
    case "faulted":
      return recovery.backup.unavailable;
    default:
      return unreachableV1(result);
  }
}

function rewriteResultTextV1(
  result: SaveRewriteOperationResultV1,
  recovery: NonNullable<SaveOverlayLabelsV1["recovery"]>,
  expectedKind: "upgrade" | "reanchor",
  expectedSlotId: SaveUiReadableSlotIdV1,
): string {
  switch (result.kind) {
    case "upgraded":
      if (expectedKind !== "upgrade" || result.slotId !== expectedSlotId) {
        return recovery.operation.faulted;
      }
      return result.compatibility === "exact"
        ? recovery.operation.upgradedExact
        : recovery.operation.upgradedAdopted;
    case "reanchored":
      if (expectedKind !== "reanchor" || result.slotId !== expectedSlotId) {
        return recovery.operation.faulted;
      }
      return recovery.operation.reanchored;
    case "rejected":
      return recovery.operation.rejected[result.code];
    case "faulted":
      return recovery.operation.faulted;
    default:
      return unreachableV1(result);
  }
}

function backupResultTextV1(
  result: SaveBackupOperationResultV1,
  recovery: NonNullable<SaveOverlayLabelsV1["recovery"]>,
  expectedKind: "restore" | "discard",
  expectedSlotId: SaveUiReadableSlotIdV1,
): string {
  switch (result.kind) {
    case "restored":
      return expectedKind === "restore" && result.slotId === expectedSlotId
        ? recovery.operation.restored
        : recovery.operation.faulted;
    case "discarded":
      return expectedKind === "discard" && result.slotId === expectedSlotId
        ? recovery.operation.discarded
        : recovery.operation.faulted;
    case "rejected":
      return recovery.operation.rejected[result.code];
    case "faulted":
      return recovery.operation.faulted;
    default:
      return unreachableV1(result);
  }
}

function backupExportResultTextV1(
  result: SaveUiBackupExportResultV1,
  recovery: NonNullable<SaveOverlayLabelsV1["recovery"]>,
  expectedSlotId: SaveUiReadableSlotIdV1,
): string {
  switch (result.kind) {
    case "exported":
      return result.slotId === expectedSlotId
        ? recovery.operation.backupExported
        : recovery.operation.faulted;
    case "rejected":
      return recovery.operation.rejected[result.code];
    case "faulted":
      return recovery.operation.faulted;
    default:
      return unreachableV1(result);
  }
}

function persistenceResultTextV1(
  result: PersistenceOperationViewResultV1,
  labels: SaveOverlayLabelsV1,
): string {
  switch (result.kind) {
    case "saved":
      return labels.operation.saved(slotNameV1(labels, result.slotId));
    case "cleared":
      return labels.operation.cleared(slotNameV1(labels, result.slotId));
    case "loaded":
      switch (result.compatibility) {
        case "exact":
          return labels.operation.loadedExact;
        case "adopted":
          return labels.operation.loadedAdopted;
        default:
          return unreachableV1(result.compatibility);
      }
    case "imported":
      switch (result.compatibility) {
        case "exact":
          return labels.operation.importedExact;
        case "adopted":
          return labels.operation.importedAdopted;
        default:
          return unreachableV1(result.compatibility);
      }
    case "rejected":
      return persistenceRejectedTextV1(result.code, labels);
    case "faulted":
      return labels.operation.faulted(result.code);
    default:
      return unreachableV1(result);
  }
}

function exportResultTextV1(
  result: SaveExportOperationViewResultV1,
  labels: SaveOverlayLabelsV1,
): string {
  switch (result.kind) {
    case "exported":
      return labels.operation.exported(slotNameV1(labels, result.slotId));
    case "rejected":
      return exportRejectedTextV1(result.code, labels);
    case "faulted":
      return labels.operation.faulted(result.code);
    default:
      return unreachableV1(result);
  }
}

function projectPersistenceResultV1(
  result: PersistenceOperationResultV1,
): PersistenceOperationViewResultV1 {
  switch (result.kind) {
    case "saved":
    case "cleared":
      return Object.freeze({ kind: result.kind, slotId: result.slotId });
    case "loaded":
    case "imported":
      return Object.freeze({ kind: result.kind, compatibility: result.compatibility });
    case "rejected":
      return Object.freeze({ kind: result.kind, code: result.code });
    case "faulted":
      return Object.freeze({ kind: result.kind, code: result.code });
    default:
      return unreachableV1(result);
  }
}

function projectExportResultV1(
  result: SaveExportOperationResultV1,
): SaveExportOperationViewResultV1 {
  switch (result.kind) {
    case "exported":
      return Object.freeze({ kind: result.kind, slotId: result.slotId });
    case "rejected":
      return Object.freeze({ kind: result.kind, code: result.code });
    case "faulted":
      return Object.freeze({ kind: result.kind, code: result.code });
    default:
      return unreachableV1(result);
  }
}

function projectImportResultV1(
  result: SaveUiImportResultV1,
):
  | Extract<SaveOperationViewV1, { readonly kind: "persistence_result" }>
  | Extract<SaveOperationViewV1, { readonly kind: "import_file_selection_result" }> {
  const context = Object.freeze({ kind: "import" as const });
  if (result.kind === "cancelled") {
    return Object.freeze({
      kind: "import_file_selection_result",
      result: Object.freeze({ kind: "cancelled" }),
    });
  }
  if (result.kind === "rejected") {
    switch (result.code) {
      case "too_large":
      case "unsupported_type":
        return Object.freeze({
          kind: "import_file_selection_result",
          result: Object.freeze({ kind: "rejected", code: result.code }),
        });
      default:
        return Object.freeze({
          kind: "persistence_result",
          context,
          result: Object.freeze({ kind: "rejected", code: result.code }),
        });
    }
  }
  return Object.freeze({
    kind: "persistence_result",
    context,
    result: projectPersistenceResultV1(result),
  });
}

function confirmedContextV1(invocation: ConfirmedSaveOperationV1): SaveOperationContextV1 {
  switch (invocation.kind) {
    case "load":
    case "clear":
    case "reanchor":
      return invocation;
    case "restore":
      return Object.freeze({ kind: "restore_backup", slotId: invocation.slotId });
    case "discard":
      return Object.freeze({ kind: "discard_backup", slotId: invocation.slotId });
    case "import":
      return invocation;
    default:
      return unreachableV1(invocation);
  }
}

function pendingTextV1(context: SaveOperationContextV1, labels: SaveOverlayLabelsV1): string {
  switch (context.kind) {
    case "save":
      return labels.operation.saving(slotNameV1(labels, context.slotId));
    case "load":
      return labels.operation.loading(slotNameV1(labels, context.slotId));
    case "clear":
      return labels.operation.clearing(slotNameV1(labels, context.slotId));
    case "import":
      return labels.operation.importing;
    case "export":
      return labels.operation.exporting(slotNameV1(labels, context.slotId));
    case "export_current":
      return labels.operation.exportingCurrent;
    case "upgrade": {
      const recovery = requiredRecoveryLabelsV1(labels);
      return recovery.operation.upgrading(slotNameV1(labels, context.slotId));
    }
    case "reanchor": {
      const recovery = requiredRecoveryLabelsV1(labels);
      return recovery.operation.reanchoring(slotNameV1(labels, context.slotId));
    }
    case "restore_backup": {
      const recovery = requiredRecoveryLabelsV1(labels);
      return recovery.operation.restoring(slotNameV1(labels, context.slotId));
    }
    case "export_backup": {
      const recovery = requiredRecoveryLabelsV1(labels);
      return recovery.operation.exportingBackup(slotNameV1(labels, context.slotId));
    }
    case "discard_backup": {
      const recovery = requiredRecoveryLabelsV1(labels);
      return recovery.operation.discarding(slotNameV1(labels, context.slotId));
    }
    default:
      return unreachableV1(context);
  }
}

function operationTextV1(state: SaveOperationViewV1, labels: SaveOverlayLabelsV1): string {
  switch (state.kind) {
    case "idle":
      return "";
    case "pending":
      return pendingTextV1(state.context, labels);
    case "persistence_result":
      return persistenceResultTextV1(state.result, labels);
    case "export_result":
      return exportResultTextV1(state.result, labels);
    case "import_file_selection_result":
      return state.result.kind === "cancelled"
        ? labels.operation.importCancelled
        : labels.operation.importFileRejected[state.result.code];
    case "recovery_result":
      return state.text;
    case "current_exported":
      return labels.operation.exportedCurrent;
    case "unexpected_failure":
      return labels.operation.unexpectedFailure;
    default:
      return unreachableV1(state);
  }
}

function storageStatusTextV1(readState: SlotReadStateV1, labels: SaveOverlayLabelsV1): string {
  switch (readState.kind) {
    case "loading":
      return labels.storageLoading;
    case "failed":
      return labels.slotsUnavailable;
    case "ready":
      if (!readState.status.available) return labels.storageUnavailable;
      if (readState.status.busy) return labels.storageBusy;
      return labels.storageReady;
    default:
      return unreachableV1(readState);
  }
}

function defaultSavedAtTextV1(isoInstant: string): string {
  const parsed = new Date(isoInstant);
  return Number.isNaN(parsed.getTime()) ? isoInstant : parsed.toLocaleString();
}

function canLoadSlotV1(health: SaveSlotHealthV1 | null): boolean {
  return health === "valid" || health === "recovery_candidate";
}

function canClearSlotV1(health: SaveSlotHealthV1 | null): boolean {
  return health === "valid" || health === "invalid" || health === "recovery_candidate";
}

function canExportSlotV1(health: SaveSlotHealthV1 | null): boolean {
  return health === "valid" || health === "recovery_candidate";
}

const staticGuardPublicationInternalV1 = Object.freeze({});

function subscribeStaticGuardInternalV1(_listener: () => void): () => void {
  return () => undefined;
}

function getStaticGuardPublicationInternalV1(): unknown {
  return staticGuardPublicationInternalV1;
}

export function SaveOverlayContentInternalV1(
  props: SaveOverlayContentPropsInternalV1,
): ReactElement {
  const [readState, setReadState] = useState<SlotReadStateV1>(() =>
    Object.freeze({ kind: "loading", slots: null })
  );
  const [recoveryBySlot, setRecoveryBySlot] = useState<SlotRecoveryByIdV1>(() => Object.freeze({}));
  const [operationState, setOperationState] = useState<SaveOperationViewV1>(() =>
    Object.freeze({ kind: "idle" })
  );
  const mountedRef = useRef(true);
  const readGenerationRef = useRef(0);
  const recoveryGenerationRef = useRef(0);
  const recoveryReadActiveRef = useRef(false);
  const operationActiveRef = useRef(false);
  const confirmedOperationTokenRef = useRef<object | null>(null);

  const guardPublication = useSyncExternalStore(
    props.guardProjection?.subscribe ?? subscribeStaticGuardInternalV1,
    props.guardProjection?.getSnapshot ?? getStaticGuardPublicationInternalV1,
    props.guardProjection?.getSnapshot ?? getStaticGuardPublicationInternalV1,
  );
  const guard = props.guardProjection === undefined
    ? props.guard
    : props.guardProjection.evaluate(guardPublication);

  useLayoutEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      readGenerationRef.current += 1;
      recoveryGenerationRef.current += 1;
      recoveryReadActiveRef.current = false;
      confirmedOperationTokenRef.current = null;
    };
  }, []);

  const refresh = useCallback(async (): Promise<void> => {
    const generation = readGenerationRef.current + 1;
    readGenerationRef.current = generation;
    if (mountedRef.current) {
      setReadState((previous) =>
        Object.freeze({
          kind: "loading",
          slots: previous.kind === "failed" ? null : previous.slots,
        })
      );
    }
    try {
      const [status, slots] = await Promise.all([props.port.getStatus(), props.port.listSlots()]);
      if (!mountedRef.current || readGenerationRef.current !== generation) return;
      setReadState(
        Object.freeze({
          kind: "ready",
          status,
          slots: Object.freeze([...slots]),
        }),
      );
    } catch {
      if (!mountedRef.current || readGenerationRef.current !== generation) return;
      setReadState(Object.freeze({ kind: "failed" }));
    }
  }, [props.port]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const recoveryPort = props.port.recovery;
  const recoveryLabels = props.labels.recovery;
  const recoveryEnabled = recoveryPort !== undefined && recoveryLabels !== undefined;

  const inspectRecoveryV1 = useCallback(
    async (slotId: SaveUiReadableSlotIdV1): Promise<void> => {
      if (recoveryPort === undefined || recoveryLabels === undefined) return;
      if (recoveryReadActiveRef.current || operationActiveRef.current) return;
      recoveryReadActiveRef.current = true;
      const generation = recoveryGenerationRef.current + 1;
      recoveryGenerationRef.current = generation;
      setRecoveryBySlot(Object.freeze({
        [slotId]: Object.freeze({ kind: "pending" as const }),
      }));
      try {
        const [inspection, backup] = await Promise.all([
          recoveryPort.inspectSave(slotId),
          recoveryPort.inspectBackup(slotId),
        ]);
        if (!mountedRef.current || recoveryGenerationRef.current !== generation) return;
        recoveryReadActiveRef.current = false;
        if (
          (inspection.slotId !== null && inspection.slotId !== slotId) ||
          (backup.slotId !== null && backup.slotId !== slotId)
        ) {
          setRecoveryBySlot(Object.freeze({
            [slotId]: Object.freeze({ kind: "failed" as const }),
          }));
          return;
        }
        setRecoveryBySlot(Object.freeze({
          [slotId]: Object.freeze({
            kind: "ready" as const,
            value: Object.freeze({ inspection, backup }),
          }),
        }));
      } catch {
        if (!mountedRef.current || recoveryGenerationRef.current !== generation) return;
        recoveryReadActiveRef.current = false;
        setRecoveryBySlot(Object.freeze({
          [slotId]: Object.freeze({ kind: "failed" as const }),
        }));
      }
    },
    [recoveryLabels, recoveryPort],
  );

  const finishOperationV1 = useCallback(
    (invalidateSlot?: SaveUiReadableSlotIdV1 | null): void => {
      operationActiveRef.current = false;
      if (!mountedRef.current) return;
      if (invalidateSlot !== undefined) {
        recoveryGenerationRef.current += 1;
        setRecoveryBySlot((previous) => {
          if (invalidateSlot === null) return Object.freeze({});
          const next = { ...previous };
          delete next[invalidateSlot];
          return Object.freeze(next);
        });
      }
      void refresh();
    },
    [refresh],
  );

  const runPersistenceOperationV1 = useCallback(
    async (
      context: Exclude<SaveOperationContextV1, { readonly kind: "export" | "export_current" }>,
      operation: () => Promise<PersistenceOperationResultV1>,
    ): Promise<PersistenceOperationResultV1 | null> => {
      if (operationActiveRef.current) return null;
      operationActiveRef.current = true;
      if (mountedRef.current) setOperationState(Object.freeze({ kind: "pending", context }));
      try {
        const result = await operation();
        if (mountedRef.current) {
          setOperationState(
            Object.freeze({
              kind: "persistence_result",
              context,
              result: projectPersistenceResultV1(result),
            }),
          );
        }
        return result;
      } catch {
        if (mountedRef.current) {
          setOperationState(Object.freeze({ kind: "unexpected_failure" }));
        }
        throw new Error("ui.persistence_operation_threw");
      } finally {
        finishOperationV1(context.kind === "import" ? null : context.slotId);
      }
    },
    [finishOperationV1],
  );

  const runExportOperationV1 = useCallback(
    async (
      context: Extract<SaveOperationContextV1, { readonly kind: "export" }>,
    ): Promise<void> => {
      if (operationActiveRef.current) return;
      operationActiveRef.current = true;
      if (mountedRef.current) setOperationState(Object.freeze({ kind: "pending", context }));
      try {
        const result = await props.port.exportSave(context.slotId);
        if (mountedRef.current) {
          setOperationState(
            Object.freeze({
              kind: "export_result",
              context,
              result: projectExportResultV1(result),
            }),
          );
        }
      } catch {
        if (mountedRef.current) {
          setOperationState(Object.freeze({ kind: "unexpected_failure" }));
        }
      } finally {
        finishOperationV1();
      }
    },
    [finishOperationV1, props.port],
  );

  const runCurrentExportV1 = useCallback(async (): Promise<void> => {
    if (operationActiveRef.current) return;
    operationActiveRef.current = true;
    const context = Object.freeze({ kind: "export_current" as const });
    if (mountedRef.current) setOperationState(Object.freeze({ kind: "pending", context }));
    try {
      await props.port.exportCurrentSave();
      if (mountedRef.current) setOperationState(Object.freeze({ kind: "current_exported" }));
    } catch {
      if (mountedRef.current) setOperationState(Object.freeze({ kind: "unexpected_failure" }));
    } finally {
      finishOperationV1();
    }
  }, [finishOperationV1, props.port]);

  const runRecoveryOperationV1 = useCallback(
    async (
      context: Extract<SaveOperationContextV1, { readonly slotId: SaveUiReadableSlotIdV1 }>,
      operation: () => Promise<
        | SaveRewriteOperationResultV1
        | SaveBackupOperationResultV1
        | SaveUiBackupExportResultV1
      >,
    ): Promise<void> => {
      if (operationActiveRef.current || recoveryLabels === undefined) return;
      operationActiveRef.current = true;
      if (mountedRef.current) setOperationState(Object.freeze({ kind: "pending", context }));
      try {
        const result = await operation();
        if (!mountedRef.current) return;
        const text = context.kind === "upgrade" || context.kind === "reanchor"
          ? rewriteResultTextV1(
            result as SaveRewriteOperationResultV1,
            recoveryLabels,
            context.kind,
            context.slotId,
          )
          : context.kind === "export_backup"
          ? backupExportResultTextV1(
            result as SaveUiBackupExportResultV1,
            recoveryLabels,
            context.slotId,
          )
          : backupResultTextV1(
            result as SaveBackupOperationResultV1,
            recoveryLabels,
            context.kind === "restore_backup" ? "restore" : "discard",
            context.slotId,
          );
        setOperationState(Object.freeze({ kind: "recovery_result", text }));
      } catch {
        if (mountedRef.current) {
          setOperationState(Object.freeze({
            kind: "recovery_result",
            text: recoveryLabels.operation.faulted,
          }));
        }
      } finally {
        finishOperationV1(context.kind === "export_backup" ? undefined : context.slotId);
      }
    },
    [finishOperationV1, recoveryLabels],
  );

  const requestConfirmedOperationV1 = useCallback(
    (invocation: ConfirmedSaveOperationV1): void => {
      const exactInvocation = Object.freeze(invocation);
      const context = confirmedContextV1(exactInvocation);
      const operationToken = Object.freeze({});
      let resultDelivered = false;

      const operationBinding = Object.freeze({
        async dispatch(
          dispatchedInvocation: DeepReadonly<ConfirmedSaveOperationV1>,
        ) {
          if (
            dispatchedInvocation.kind !== exactInvocation.kind ||
            (exactInvocation.kind !== "import" &&
              (dispatchedInvocation.kind === "import" ||
                dispatchedInvocation.slotId !== exactInvocation.slotId))
          ) {
            throw new TypeError("ui.save_overlay_confirmation_invocation_mismatch");
          }
          if (operationActiveRef.current) {
            throw new Error("ui.persistence_operation_busy");
          }

          operationActiveRef.current = true;
          confirmedOperationTokenRef.current = operationToken;
          if (mountedRef.current) {
            setOperationState(Object.freeze({ kind: "pending", context }));
          }

          switch (exactInvocation.kind) {
            case "load": {
              const result = await props.port.load(exactInvocation.slotId);
              return result.kind === "loaded"
                ? Object.freeze({ kind: "successor" as const })
                : Object.freeze({ kind: "retain_root" as const, result });
            }
            case "clear": {
              const result = await props.port.clear(exactInvocation.slotId);
              return Object.freeze({ kind: "retain_root" as const, result });
            }
            case "import": {
              const result = await props.port.importSave();
              return result.kind === "imported"
                ? Object.freeze({ kind: "successor" as const })
                : Object.freeze({ kind: "retain_root" as const, result });
            }
            case "reanchor": {
              if (recoveryPort === undefined) {
                throw new TypeError("ui.save_overlay_recovery_port_unavailable");
              }
              const result = await recoveryPort.reanchorSave(exactInvocation.slotId);
              return Object.freeze({ kind: "retain_root" as const, result });
            }
            case "restore": {
              if (recoveryPort === undefined) {
                throw new TypeError("ui.save_overlay_recovery_port_unavailable");
              }
              const result = await recoveryPort.restoreBackup(exactInvocation.slotId);
              return Object.freeze({ kind: "retain_root" as const, result });
            }
            case "discard": {
              if (recoveryPort === undefined) {
                throw new TypeError("ui.save_overlay_recovery_port_unavailable");
              }
              const result = await recoveryPort.discardBackup(exactInvocation.slotId);
              return Object.freeze({ kind: "retain_root" as const, result });
            }
            default:
              return unreachableV1(exactInvocation);
          }
        },
        resultSink(delivery: SystemDialogConfirmationResultDeliveryInternalV1): void {
          if (
            confirmedOperationTokenRef.current !== operationToken ||
            !mountedRef.current
          ) return;

          if (delivery.kind === "faulted") {
            resultDelivered = true;
            setOperationState(Object.freeze({ kind: "unexpected_failure" }));
            return;
          }

          try {
            switch (exactInvocation.kind) {
              case "load":
              case "clear":
                setOperationState(
                  Object.freeze({
                    kind: "persistence_result",
                    context: exactInvocation,
                    result: projectPersistenceResultV1(
                      delivery.result as PersistenceOperationResultV1,
                    ),
                  }),
                );
                break;
              case "import":
                setOperationState(projectImportResultV1(delivery.result as SaveUiImportResultV1));
                break;
              case "reanchor":
                setOperationState(Object.freeze({
                  kind: "recovery_result",
                  text: rewriteResultTextV1(
                    delivery.result as SaveRewriteOperationResultV1,
                    requiredRecoveryLabelsV1(props.labels),
                    "reanchor",
                    exactInvocation.slotId,
                  ),
                }));
                break;
              case "restore":
              case "discard":
                setOperationState(Object.freeze({
                  kind: "recovery_result",
                  text: backupResultTextV1(
                    delivery.result as SaveBackupOperationResultV1,
                    requiredRecoveryLabelsV1(props.labels),
                    exactInvocation.kind,
                    exactInvocation.slotId,
                  ),
                }));
                break;
              default:
                unreachableV1(exactInvocation);
            }
            resultDelivered = true;
          } catch {
            resultDelivered = true;
            setOperationState(Object.freeze({ kind: "unexpected_failure" }));
            throw new TypeError("ui.save_overlay_operation_result_invalid");
          }
        },
        finalizeExactRoot(): void {
          if (
            confirmedOperationTokenRef.current !== operationToken ||
            !mountedRef.current
          ) return;
          confirmedOperationTokenRef.current = null;
          if (!resultDelivered) {
            setOperationState((previous) =>
              previous.kind === "pending" && previous.context === context
                ? Object.freeze({ kind: "idle" })
                : previous
            );
          }
          finishOperationV1(exactInvocation.kind === "import" ? null : exactInvocation.slotId);
        },
      }) satisfies SystemDialogConfirmationOperationBindingInternalV1;

      props.confirmationIntent.requestConfirmationInternalV1(
        Object.freeze({ invocation: exactInvocation, operationBinding }),
      );
    },
    [finishOperationV1, props.confirmationIntent, props.labels, props.port, recoveryPort],
  );

  const status = readState.kind === "ready" ? readState.status : null;
  const recoveryReadPending = Object.values(recoveryBySlot).some(
    (state) => state.kind === "pending",
  );
  const operationPending = operationState.kind === "pending" || recoveryReadPending;
  const storageOperationsEnabled = status?.available === true && !status.busy && !operationPending;
  const saveAllowed = guard?.allowed !== false;
  const writeOperationsEnabled = storageOperationsEnabled && saveAllowed;

  return (
    <section
      className={styles["save-overlay"]}
      aria-label={props.labels.accessibleName}
      data-save-overlay="true"
    >
      <header className={styles["save-overlay__header"]}>
        <h2>{props.labels.title}</h2>
        <Button data-save-overlay-close="true" onClick={props.onCloseInternalV1}>
          {props.closeLabel}
        </Button>
        {saveAllowed || guard?.reasonText === undefined
          ? null
          : (
            <p role="status" data-save-guard="blocked">
              {guard.reasonText}
            </p>
          )}
        <p role="status" aria-live="polite">
          {storageStatusTextV1(readState, props.labels)}
        </p>
        {status?.safelySavedCommandSequence === null ||
            status?.safelySavedCommandSequence === undefined
          ? null
          : <p>{props.labels.safelySaved(status.safelySavedCommandSequence)}</p>}
        {status?.lastFailureCode === null || status?.lastFailureCode === undefined
          ? null
          : <p>{props.labels.lastFailure(status.lastFailureCode)}</p>}
      </header>

      <ul className={styles["save-overlay__slots"]}>
        {(readState.kind === "failed" ? [] : (readState.slots ?? [])).map((summary) => {
          const slotId = summary.slotId as SaveUiReadableSlotIdV1;
          const health = readState.kind === "ready" ? summary.health : null;
          const slotName = slotNameV1(props.labels, slotId);
          const writableSlotId = writableSlotIdV1(slotId);
          const recoveryState = recoveryBySlot[slotId];
          const recoveryRead = recoveryState?.kind === "ready" ? recoveryState.value : null;
          const inspection = recoveryRead?.inspection ?? null;
          const backup = recoveryRead?.backup ?? null;
          const backupEmpty = backup?.kind === "rejected" && backup.code === "empty_backup";
          const upgradeAvailable = inspection?.kind === "migration_required" ||
            inspection?.kind === "adoption_required" ||
            inspection?.kind === "migration_and_adoption_required";
          const reanchorAvailable = inspection?.kind === "inspect_only" &&
            inspection.code === "reanchor_required";
          const backupAvailable = backup?.kind === "available";
          const invalidBackup = backup?.kind === "rejected" && backup.code === "invalid_backup";
          const inspectionText = recoveryRead === null || recoveryLabels === undefined
            ? ""
            : inspectionTextV1(recoveryRead.inspection, recoveryLabels);
          const backupText = recoveryRead === null || recoveryLabels === undefined
            ? ""
            : backupTextV1(recoveryRead.backup, recoveryLabels);
          return (
            <li key={slotId} className={styles["save-overlay__slot"]} data-slot-id={slotId}>
              <h3>{slotName}</h3>
              <p data-slot-health={health ?? "unreadable"}>
                {health === null
                  ? props.labels.storageLoading
                  : slotHealthTextV1(health, props.labels)}
              </p>
              {summary.savedAt === null ? null : (
                <p data-slot-saved-at={summary.savedAt}>
                  {(props.labels.savedAtText ?? defaultSavedAtTextV1)(summary.savedAt)}
                </p>
              )}
              <div className={styles["save-overlay__slot-actions"]}>
                {writableSlotId === null ? null : (
                  <Button
                    disabled={!writeOperationsEnabled}
                    onClick={() =>
                      void runPersistenceOperationV1(
                        Object.freeze({ kind: "save", slotId: writableSlotId }),
                        () => props.port.save(writableSlotId),
                      ).catch(() => undefined)}
                  >
                    {writableSlotId === "quick" ? props.labels.quickSave : props.labels.manualSave}
                  </Button>
                )}
                <Button
                  disabled={!storageOperationsEnabled || !canLoadSlotV1(health)}
                  onClick={() =>
                    requestConfirmedOperationV1(Object.freeze({ kind: "load", slotId }))}
                >
                  {props.labels.loadSlot(slotName)}
                </Button>
                <Button
                  disabled={!storageOperationsEnabled || !canClearSlotV1(health)}
                  onClick={() =>
                    requestConfirmedOperationV1(Object.freeze({ kind: "clear", slotId }))}
                >
                  {props.labels.clearSlot(slotName)}
                </Button>
                <Button
                  disabled={!storageOperationsEnabled || !canExportSlotV1(health)}
                  onClick={() =>
                    void runExportOperationV1(Object.freeze({ kind: "export", slotId }))}
                >
                  {props.labels.exportSlot(slotName)}
                </Button>
              </div>
              {!recoveryEnabled || recoveryPort === undefined || recoveryLabels === undefined
                ? null
                : (
                  <div
                    className={styles["save-overlay__recovery"]}
                    data-save-recovery={slotId}
                  >
                    <Button
                      data-save-recovery-action="inspect"
                      disabled={!storageOperationsEnabled || recoveryState?.kind === "pending"}
                      onClick={() => void inspectRecoveryV1(slotId)}
                    >
                      {recoveryLabels.action.inspect}
                    </Button>
                    <div
                      className={styles["save-overlay__recovery-status"]}
                      role="status"
                      aria-live="polite"
                      aria-atomic="true"
                    >
                      {recoveryState?.kind === "pending"
                        ? <p>{recoveryLabels.checking}</p>
                        : recoveryState?.kind === "failed"
                        ? <p>{recoveryLabels.disposition.faulted}</p>
                        : recoveryRead === null
                        ? null
                        : (
                          <>
                            {inspectionText === ""
                              ? null
                              : (
                                <p data-save-inspection={recoveryRead.inspection.kind}>
                                  {inspectionText}
                                </p>
                              )}
                            {backupText === ""
                              ? null
                              : (
                                <p data-save-backup={recoveryRead.backup.kind}>
                                  {backupText}
                                </p>
                              )}
                          </>
                        )}
                    </div>
                    {recoveryRead === null
                      ? null
                      : (
                        <div className={styles["save-overlay__slot-actions"]}>
                          {!upgradeAvailable || !backupEmpty ? null : (
                            <Button
                              data-save-recovery-action="upgrade"
                              disabled={!storageOperationsEnabled}
                              onClick={() =>
                                void runRecoveryOperationV1(
                                  Object.freeze({ kind: "upgrade", slotId }),
                                  () => recoveryPort.upgradeSave(slotId),
                                )}
                            >
                              {recoveryLabels.action.upgrade}
                            </Button>
                          )}
                          {!reanchorAvailable || !backupEmpty ? null : (
                            <Button
                              data-save-recovery-action="reanchor"
                              disabled={!storageOperationsEnabled}
                              onClick={() =>
                                requestConfirmedOperationV1(
                                  Object.freeze({ kind: "reanchor", slotId }),
                                )}
                            >
                              {recoveryLabels.action.reanchor}
                            </Button>
                          )}
                          {!backupAvailable ? null : (
                            <>
                              <Button
                                data-save-recovery-action="restore"
                                disabled={!storageOperationsEnabled}
                                onClick={() =>
                                  requestConfirmedOperationV1(
                                    Object.freeze({ kind: "restore", slotId }),
                                  )}
                              >
                                {recoveryLabels.action.restore}
                              </Button>
                              <Button
                                data-save-recovery-action="export-backup"
                                disabled={!storageOperationsEnabled}
                                onClick={() =>
                                  void runRecoveryOperationV1(
                                    Object.freeze({ kind: "export_backup", slotId }),
                                    () => recoveryPort.exportBackup(slotId),
                                  )}
                              >
                                {recoveryLabels.action.exportBackup}
                              </Button>
                            </>
                          )}
                          {!backupAvailable && !invalidBackup ? null : (
                            <Button
                              data-save-recovery-action="discard"
                              disabled={!storageOperationsEnabled}
                              onClick={() =>
                                requestConfirmedOperationV1(
                                  Object.freeze({ kind: "discard", slotId }),
                                )}
                            >
                              {recoveryLabels.action.discard}
                            </Button>
                          )}
                        </div>
                      )}
                  </div>
                )}
            </li>
          );
        })}
      </ul>

      <div className={styles["save-overlay__global-actions"]}>
        <Button
          disabled={!storageOperationsEnabled}
          onClick={() => requestConfirmedOperationV1(Object.freeze({ kind: "import" }))}
        >
          {props.labels.importSave}
        </Button>
        <Button disabled={operationPending} onClick={() => void runCurrentExportV1()}>
          {props.labels.exportCurrentSave}
        </Button>
      </div>

      <p
        className={styles["save-overlay__result"]}
        data-testid="save-operation-result"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {operationTextV1(operationState, props.labels)}
      </p>
    </section>
  );
}
