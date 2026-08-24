// SPDX-License-Identifier: MIT
import {
  debugBundleJsonLimitsV1,
  parseNonNegativeSafeInteger,
  parseStrictJson,
  saveJsonLimitsV1,
  type ExportedDebugBundleV1,
  type ExportedSaveV1,
  type HostFilePortV1,
  type PersistenceOperationResultV1,
  type PersistenceStatusV1,
  type SaveBackupExportOperationResultV1,
  type SaveBackupInspectionResultV1,
  type SaveBackupOperationResultV1,
  type SaveExportOperationResultV1,
  type SaveInspectionResultV1,
  type SaveRewriteOperationResultV1,
  type SaveSlotSummaryV1,
} from "@sillymaker/base";
import type {
  DiagnosticExportContentCategoryIdV1,
  DiagnosticExportPortV1,
  DiagnosticExportPreviewV1,
  SaveOverlayPortV1,
  SaveUiReadableSlotIdV1,
  SaveUiWritableSlotIdV1,
} from "@sillymaker/ui";

export interface PlayerUiPersistenceSourceV1 {
  getStatus(): PersistenceStatusV1 | Promise<PersistenceStatusV1>;
  listSlots(): Promise<readonly SaveSlotSummaryV1[]>;
  inspectSave(slotId: SaveUiReadableSlotIdV1): Promise<SaveInspectionResultV1>;
  inspectBackup(slotId: SaveUiReadableSlotIdV1): Promise<SaveBackupInspectionResultV1>;
  upgradeSave(slotId: SaveUiReadableSlotIdV1): Promise<SaveRewriteOperationResultV1>;
  reanchorSave(slotId: SaveUiReadableSlotIdV1): Promise<SaveRewriteOperationResultV1>;
  restoreBackup(slotId: SaveUiReadableSlotIdV1): Promise<SaveBackupOperationResultV1>;
  exportBackup(slotId: SaveUiReadableSlotIdV1): Promise<SaveBackupExportOperationResultV1>;
  discardBackup(slotId: SaveUiReadableSlotIdV1): Promise<SaveBackupOperationResultV1>;
  save(slotId: SaveUiWritableSlotIdV1): Promise<PersistenceOperationResultV1>;
  load(slotId: SaveUiReadableSlotIdV1): Promise<PersistenceOperationResultV1>;
  clear(slotId: SaveUiReadableSlotIdV1): Promise<PersistenceOperationResultV1>;
  annotateSave(slotId: SaveUiWritableSlotIdV1, note: string): Promise<PersistenceOperationResultV1>;
  importSave(bytes: Uint8Array): Promise<PersistenceOperationResultV1>;
  exportSave(slotId: SaveUiReadableSlotIdV1): Promise<SaveExportOperationResultV1>;
  exportCurrentSave(): Promise<ExportedSaveV1>;
}

export interface PlayerUiDiagnosticsSourceV1 {
  exportDebugBundle(): Promise<ExportedDebugBundleV1>;
}

export interface PlayerUiPortsV1 {
  readonly save: SaveOverlayPortV1;
  readonly diagnostics: DiagnosticExportPortV1;
}

function detachExportedDebugBundleV1(value: ExportedDebugBundleV1): ExportedDebugBundleV1 {
  return Object.freeze({
    filename: value.filename,
    mediaType: value.mediaType,
    digest: value.digest,
    bytes: Uint8Array.from(value.bytes),
  });
}

function classifyDebugBundleCategoriesV1(
  bytes: Uint8Array,
): readonly DiagnosticExportContentCategoryIdV1[] {
  const decoded = parseStrictJson(bytes, debugBundleJsonLimitsV1);
  if (!decoded.ok) throw new TypeError("invalid prepared Debug Bundle Strict JSON");
  const envelope = decoded.value;
  if (envelope === null || typeof envelope !== "object" || Array.isArray(envelope)) {
    throw new TypeError("invalid prepared Debug Bundle envelope");
  }
  const categories: DiagnosticExportContentCategoryIdV1[] = [
    "provenance",
    "capabilities_and_integrity",
    "replay_evidence",
    "diagnostics_and_runtime_failures",
  ];
  if (Object.hasOwn(envelope, "failure")) {
    categories.push("failure_context");
  }
  if (Object.hasOwn(envelope, "uiContext")) {
    categories.push("ui_context");
  }
  return Object.freeze(categories);
}

function createDiagnosticPreviewV1(exported: ExportedDebugBundleV1): DiagnosticExportPreviewV1 {
  return Object.freeze({
    filename: exported.filename,
    mediaType: exported.mediaType,
    digest: exported.digest,
    encodedByteLength: parseNonNegativeSafeInteger(exported.bytes.byteLength),
    categories: classifyDebugBundleCategoriesV1(exported.bytes),
  });
}

function downloadV1(
  files: HostFilePortV1,
  file: ExportedSaveV1 | ExportedDebugBundleV1,
): Promise<void> {
  return files.download({
    filename: file.filename,
    mediaType: file.mediaType,
    bytes: file.bytes,
  });
}

/** Bridges the player-safe persistence port to explicit, local-only file operations. */
export function createPlayerSaveUiPortV1(input: {
  readonly files: HostFilePortV1;
  readonly persistence: PlayerUiPersistenceSourceV1;
}): SaveOverlayPortV1 {
  return Object.freeze({
    getStatus: () => input.persistence.getStatus(),
    listSlots: async () => await input.persistence.listSlots(),
    recovery: Object.freeze({
      inspectSave: async (slotId: SaveUiReadableSlotIdV1) =>
        await input.persistence.inspectSave(slotId),
      inspectBackup: async (slotId: SaveUiReadableSlotIdV1) =>
        await input.persistence.inspectBackup(slotId),
      upgradeSave: async (slotId: SaveUiReadableSlotIdV1) =>
        await input.persistence.upgradeSave(slotId),
      reanchorSave: async (slotId: SaveUiReadableSlotIdV1) =>
        await input.persistence.reanchorSave(slotId),
      restoreBackup: async (slotId: SaveUiReadableSlotIdV1) =>
        await input.persistence.restoreBackup(slotId),
      async exportBackup(slotId: SaveUiReadableSlotIdV1) {
        const result = await input.persistence.exportBackup(slotId);
        if (result.kind !== "exported") return result;
        if (result.slotId !== slotId) {
          return Object.freeze({ kind: "faulted" as const, code: "persistence.invalid_result" });
        }
        try {
          await downloadV1(input.files, result.file);
        } catch {
          return Object.freeze({ kind: "faulted" as const, code: "file.download_failed" });
        }
        return Object.freeze({ kind: "exported" as const, slotId: result.slotId });
      },
      discardBackup: async (slotId: SaveUiReadableSlotIdV1) =>
        await input.persistence.discardBackup(slotId),
    }),
    save: async (slotId: SaveUiWritableSlotIdV1) => await input.persistence.save(slotId),
    load: async (slotId: SaveUiReadableSlotIdV1) => await input.persistence.load(slotId),
    clear: async (slotId: SaveUiReadableSlotIdV1) => await input.persistence.clear(slotId),
    annotateSave: async (slotId: SaveUiWritableSlotIdV1, note: string) =>
      await input.persistence.annotateSave(slotId, note),
    async importSave() {
      const selection = await input.files.selectOne({
        acceptedMediaTypes: Object.freeze(["application/json"]),
        maximumBytes: saveJsonLimitsV1.maxBytes,
      });
      if (selection.kind !== "selected") return selection;
      return await input.persistence.importSave(selection.bytes);
    },
    async exportSave(slotId: SaveUiReadableSlotIdV1) {
      const result = await input.persistence.exportSave(slotId);
      if (result.kind === "exported") await downloadV1(input.files, result.file);
      return result;
    },
    async exportCurrentSave() {
      const exported = await input.persistence.exportCurrentSave();
      await downloadV1(input.files, exported);
      return exported;
    },
  }) satisfies SaveOverlayPortV1;
}

/** Bridges player-safe application ports to explicit, local-only UI file operations. */
export function createPlayerUiPortsV1(input: {
  readonly files: HostFilePortV1;
  readonly persistence: PlayerUiPersistenceSourceV1;
  readonly diagnostics: PlayerUiDiagnosticsSourceV1;
}): PlayerUiPortsV1 {
  const save = createPlayerSaveUiPortV1({ files: input.files, persistence: input.persistence });
  let diagnosticGeneration = 0;
  let preparedDiagnostic:
    | {
      readonly exported: ExportedDebugBundleV1;
      readonly preview: DiagnosticExportPreviewV1;
    }
    | undefined;
  const diagnostics = Object.freeze({
    async prepareDebugBundle() {
      if (preparedDiagnostic !== undefined) return preparedDiagnostic.preview;
      const generation = diagnosticGeneration + 1;
      diagnosticGeneration = generation;
      preparedDiagnostic = undefined;
      const exported = detachExportedDebugBundleV1(
        await input.diagnostics.exportDebugBundle(),
      );
      const preview = createDiagnosticPreviewV1(exported);
      if (generation !== diagnosticGeneration) {
        throw new TypeError("prepared Debug Bundle was discarded");
      }
      preparedDiagnostic = Object.freeze({ exported, preview });
      return preview;
    },
    async savePreparedDebugBundle() {
      const prepared = preparedDiagnostic;
      if (prepared === undefined) throw new TypeError("no prepared Debug Bundle");
      await downloadV1(input.files, prepared.exported);
      if (preparedDiagnostic === prepared) {
        preparedDiagnostic = undefined;
        diagnosticGeneration += 1;
      }
    },
    discardPreparedDebugBundle() {
      diagnosticGeneration += 1;
      preparedDiagnostic = undefined;
    },
  }) satisfies DiagnosticExportPortV1;
  return Object.freeze({ save, diagnostics });
}
