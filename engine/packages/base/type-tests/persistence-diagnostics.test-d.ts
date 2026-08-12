// SPDX-License-Identifier: MIT
import type {
  ExportedDebugBundleV1,
  ExportedSaveV1,
  PersistenceOperationResultV1,
  PlayerPersistencePortV1,
  PositiveSafeInteger,
  SaveExportOperationResultV1,
  SaveBackupExportOperationResultV1,
  SaveBackupInspectionResultV1,
  SaveBackupOperationResultV1,
  SaveInspectionResultV1,
  SaveRewriteOperationResultV1,
  SessionLeaseStatusV1,
} from "@sillymaker/base";

declare const persistence: PlayerPersistencePortV1<
  never,
  never,
  PersistenceOperationResultV1,
  ExportedSaveV1,
  SaveExportOperationResultV1,
  SessionLeaseStatusV1,
  never,
  SaveInspectionResultV1,
  SaveBackupInspectionResultV1,
  SaveRewriteOperationResultV1,
  SaveBackupOperationResultV1,
  SaveBackupExportOperationResultV1
>;

export const stored: Promise<SaveExportOperationResultV1> = persistence.exportSave("quick");
export const current: Promise<ExportedSaveV1> = persistence.exportCurrentSave();
export const inspected: Promise<SaveInspectionResultV1> = persistence.inspectSave("quick");
export const inspectedBackup: Promise<SaveBackupInspectionResultV1> = persistence.inspectBackup(
  "quick",
);
export const upgraded: Promise<SaveRewriteOperationResultV1> = persistence.upgradeSave("quick");
export const reanchored: Promise<SaveRewriteOperationResultV1> = persistence.reanchorSave("quick");
export const restored: Promise<SaveBackupOperationResultV1> = persistence.restoreBackup("quick");
export const backup: Promise<SaveBackupExportOperationResultV1> = persistence.exportBackup("quick");
export const discarded: Promise<SaveBackupOperationResultV1> = persistence.discardBackup("quick");

declare const rewrite: SaveRewriteOperationResultV1;
if (rewrite.kind === "upgraded") {
  const compatibility: "exact" | "adopted" = rewrite.compatibility;
  compatibility;
}
if (rewrite.kind === "reanchored") {
  rewrite.slotId;
  // @ts-expect-error re-anchor resets lineage instead of reporting load compatibility
  rewrite.compatibility;
}
if (rewrite.kind === "rejected") {
  const code:
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
    | "not_required" = rewrite.code;
  code;
}

declare const backupOperation: SaveBackupOperationResultV1;
export const invalidBackupAuthority: SaveBackupOperationResultV1 = {
  kind: "rejected",
  code: "invalid_record",
};
if (backupOperation.kind === "restored" || backupOperation.kind === "discarded") {
  backupOperation.slotId;
}
if (backupOperation.kind === "rejected") {
  const code:
    | "busy"
    | "unavailable"
    | "empty_backup"
    | "conflict"
    | "invalid_backup"
    | "invalid_record" = backupOperation.code;
  code;
}

declare const backupExport: SaveBackupExportOperationResultV1;
if (backupExport.kind === "exported") {
  backupExport.slotId;
  backupExport.file.bytes;
}
// @ts-expect-error backup operations never expose Host record revisions
backupOperation.hostRevision;
// @ts-expect-error backup operations never expose package-internal CAS authority
backupOperation.commit;
// @ts-expect-error backup export never exposes a storage key
backupExport.key;
// @ts-expect-error the Player port never exposes the repository
persistence.repository;

declare const persistenceResult: PersistenceOperationResultV1;
// @ts-expect-error exports are deliberately absent from general persistence results
persistenceResult.kind === "exported";

export const unowned: SessionLeaseStatusV1 = {
  kind: "unowned",
  ownerId: null,
  fencingToken: 1 as PositiveSafeInteger,
};
export const unavailable: SessionLeaseStatusV1 = {
  kind: "unavailable",
  ownerId: null,
  fencingToken: null,
  code: "storage-disabled",
};

declare const bundle: ExportedDebugBundleV1;
// @ts-expect-error Debug export has no arbitrary summary
bundle.summary;
