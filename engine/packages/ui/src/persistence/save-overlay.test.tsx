// @vitest-environment jsdom
// SPDX-License-Identifier: MIT
import "@testing-library/jest-dom/vitest";
import {
  parseDigest,
  parseNonNegativeSafeInteger,
  type ExportedSaveV1,
  type PersistenceOperationResultV1,
  type PersistenceStatusV1,
  type SaveBackupInspectionResultV1,
  type SaveBackupOperationResultV1,
  type SaveExportOperationResultV1,
  type SaveInspectionResultV1,
  type SaveRewriteOperationResultV1,
  type SaveSlotHealthV1,
  type SaveSlotIdV1,
  type SaveSlotSummaryV1,
} from "@sillymaker/base";
import { act, cleanup, render, screen, waitFor, within } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { StrictMode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { SystemDialogHostConfirmationRequestInternalV1 } from "../system/system-dialog-managed-host.tsx";
import {
  SaveOverlayContentInternalV1,
  type SaveOverlayLabelsV1,
  type SaveOverlayPortV1,
  type SaveUiBackupExportResultV1,
  type SaveUiImportResultV1,
  type SaveUiWritableSlotIdV1,
} from "./save-overlay.tsx";

afterEach(cleanup);

const slotIdsV1 = Object.freeze(
  [
    "auto.current",
    "auto.previous",
    "quick",
    "manual.1",
    "manual.2",
  ] as const satisfies readonly SaveSlotIdV1[],
);

const exportedSaveV1 = Object.freeze({
  filename: "tavern-save.json",
  mediaType: "application/json",
  digest: parseDigest(`sha256:${"0".repeat(64)}`),
  bytes: new Uint8Array([1, 2, 3]),
}) satisfies ExportedSaveV1;

const labelsV1 = Object.freeze({
  accessibleName: "存档管理",
  title: "存档管理",
  storageLoading: "正在读取本地存档状态…",
  storageReady: "本地存储可用",
  storageBusy: "本地存储正忙",
  storageUnavailable: "本地存储不可用",
  slotsUnavailable: "无法读取存档槽位",
  safelySaved: (sequence: number) => `已安全保存至指令 ${sequence}`,
  lastFailure: (code: string) => `最近一次存储错误：${code}`,
  slotNames: Object.freeze({
    "auto.current": "当前自动存档",
    "auto.previous": "上一自动存档",
    quick: "快速存档",
    manualSlot: (index: number) => `手动存档 ${index}`,
  }),
  slotHealth: Object.freeze({
    empty: "空槽位",
    valid: "存档有效",
    invalid: "存档损坏",
    recovery_candidate: "可恢复的备用存档",
    unavailable: "槽位不可用",
  }),
  quickSave: "快速保存",
  manualSave: "手动保存",
  importSave: "导入存档",
  exportCurrentSave: "导出当前进度",
  loadSlot: (slotName: string) => `读取${slotName}`,
  clearSlot: (slotName: string) => `清除${slotName}`,
  exportSlot: (slotName: string) => `导出${slotName}`,
  confirmation: Object.freeze({
    loadTitle: (slotName: string) => `确认读取${slotName}`,
    loadDescription: (slotName: string) => `当前进度将被${slotName}替换。`,
    clearTitle: (slotName: string) => `确认清除${slotName}`,
    clearDescription: (slotName: string) => `${slotName}将被永久清除。`,
    importTitle: "确认导入存档",
    importDescription: "当前进度将被所选存档替换。",
    confirmLabel: "确认操作",
    cancelLabel: "取消操作",
    pendingText: "正在提交操作…",
    completedText: "操作已返回结果",
    failedText: "操作未能提交",
  }),
  operation: Object.freeze({
    saving: (slotName: string) => `正在安全写入${slotName}…`,
    loading: (slotName: string) => `正在读取${slotName}…`,
    clearing: (slotName: string) => `正在清除${slotName}…`,
    importing: "正在导入存档…",
    exporting: (slotName: string) => `正在导出${slotName}…`,
    exportingCurrent: "正在导出当前进度…",
    saved: (slotName: string) => `${slotName}已保存`,
    cleared: (slotName: string) => `${slotName}已清除`,
    loadedExact: "已读取完全兼容的存档",
    loadedAdopted: "已读取并采用兼容补丁的存档",
    importedExact: "已导入完全兼容的存档",
    importedAdopted: "已导入并采用兼容补丁的存档",
    importCancelled: "已取消导入存档",
    importFileRejected: Object.freeze({
      too_large: "所选存档文件过大",
      unsupported_type: "所选文件类型不受支持",
    }),
    exported: (slotName: string) => `${slotName}已导出`,
    exportedCurrent: "当前进度已导出",
    rejected: Object.freeze({
      busy: "存储正忙，请稍后重试",
      unavailable: "本地存储不可用",
      empty_slot: "该槽位没有存档",
      conflict: "存档已被其他页面更新",
      in_flight: "正在过场，暂不可保存",
      invalid_record: "存档记录无效",
      invalid_note: "备注不合法",
      lineage_limit: "存档兼容链超过限制",
      migration_unavailable: "当前版本尚未提供此存档所需的迁移",
      migration_rejected: "存档迁移失败",
      incompatible: "存档与当前游戏不兼容",
    }),
    exportRejected: Object.freeze({
      unavailable: "本地存储不可用",
      empty_slot: "该槽位没有存档",
      conflict: "存档已被其他页面更新",
      invalid_record: "存档记录无效",
    }),
    faulted: (code: string) => `存档操作失败：${code}`,
    unexpectedFailure: "存档操作发生未预期错误",
  }),
  recovery: Object.freeze({
    checking: "正在检查兼容性…",
    disposition: Object.freeze({
      direct: "可直接读取",
      migration_required: "需要升级存档格式",
      adoption_required: "需要采用兼容补丁",
      migration_and_adoption_required: "需要升级并采用兼容补丁",
      migration_unavailable: "当前版本尚未提供所需迁移",
      migration_rejected: "存档迁移未通过安全检查",
      incompatible: "与当前版本不兼容",
      reanchor_required: "兼容历史已满，需要重建",
      invalid_record: "无法安全检查此存档",
      unavailable: "暂时无法检查此存档",
      faulted: "兼容性检查失败",
    }),
    backup: Object.freeze({
      available: "迁移前备份可用",
      invalid: "迁移前备份已损坏",
      unavailable: "暂时无法检查迁移前备份",
    }),
    action: Object.freeze({
      inspect: "检查兼容性与备份",
      upgrade: "安全升级",
      reanchor: "重建兼容历史",
      restore: "恢复迁移前备份",
      exportBackup: "导出迁移前备份",
      discard: "丢弃迁移前备份",
    }),
    confirmation: Object.freeze({
      reanchorTitle: (slotName: string) => `重建${slotName}兼容历史`,
      reanchorDescription: (slotName: string) => `${slotName}将写入当前格式，并保留可恢复备份。`,
      restoreTitle: (slotName: string) => `恢复${slotName}备份`,
      restoreDescription: (slotName: string) => `${slotName}的当前内容将被迁移前备份替换。`,
      discardTitle: (slotName: string) => `丢弃${slotName}备份`,
      discardDescription: (slotName: string) => `${slotName}的迁移前备份将被永久删除。`,
    }),
    operation: Object.freeze({
      upgrading: (slotName: string) => `正在升级${slotName}…`,
      reanchoring: (slotName: string) => `正在重建${slotName}兼容历史…`,
      restoring: (slotName: string) => `正在恢复${slotName}备份…`,
      exportingBackup: (slotName: string) => `正在导出${slotName}备份…`,
      discarding: (slotName: string) => `正在丢弃${slotName}备份…`,
      upgradedExact: "存档已升级",
      upgradedAdopted: "存档已升级并采用兼容补丁",
      reanchored: "兼容历史已重建",
      restored: "迁移前备份已恢复，请确认后再读取",
      backupExported: "迁移前备份已导出",
      discarded: "迁移前备份已丢弃",
      rejected: Object.freeze({
        busy: "恢复操作正在进行，请稍后重试",
        unavailable: "本地存储暂时不可用",
        empty_slot: "该槽位没有可升级的存档",
        backup_pending: "请先处理现有迁移前备份",
        conflict: "存档已被其他页面更新，请重新检查",
        invalid_record: "存档记录无效，无法执行此操作",
        migration_unavailable: "当前版本尚未提供所需迁移",
        migration_rejected: "存档迁移未通过安全检查",
        incompatible: "该存档与当前版本不兼容",
        reanchor_required: "需要先重建兼容历史",
        not_required: "该存档无需执行此操作",
        empty_backup: "该槽位没有迁移前备份",
        invalid_backup: "迁移前备份已损坏",
      }),
      faulted: "恢复操作失败，请重试",
    }),
  }),
}) satisfies SaveOverlayLabelsV1;

function statusV1(overrides: Partial<PersistenceStatusV1> = {}): PersistenceStatusV1 {
  return Object.freeze({
    available: true,
    busy: false,
    safelySavedCommandSequence: null,
    lastFailureCode: null,
    ...overrides,
  });
}

function slotV1(slotId: SaveSlotIdV1, health: SaveSlotHealthV1): SaveSlotSummaryV1 {
  return Object.freeze({
    slotId,
    health,
    recordRevision: null,
    capturedCommandSequence: null,
    savedAt: null,
    annotation: null,
    warningCodes: Object.freeze([]),
  });
}

interface FixtureOptionsV1 {
  readonly status?: PersistenceStatusV1 | Promise<PersistenceStatusV1>;
  readonly slots?: readonly SaveSlotSummaryV1[];
  readonly saveResult?: PersistenceOperationResultV1 | Promise<PersistenceOperationResultV1>;
  readonly loadResult?: PersistenceOperationResultV1 | Promise<PersistenceOperationResultV1>;
  readonly clearResult?: PersistenceOperationResultV1 | Promise<PersistenceOperationResultV1>;
  readonly importResult?: SaveUiImportResultV1 | Promise<SaveUiImportResultV1>;
  readonly exportResult?: SaveExportOperationResultV1 | Promise<SaveExportOperationResultV1>;
  readonly inspectionResult?: SaveInspectionResultV1 | Promise<SaveInspectionResultV1>;
  readonly backupInspectionResult?:
    | SaveBackupInspectionResultV1
    | Promise<SaveBackupInspectionResultV1>;
  readonly rewriteResult?: SaveRewriteOperationResultV1 | Promise<SaveRewriteOperationResultV1>;
  readonly backupResult?: SaveBackupOperationResultV1 | Promise<SaveBackupOperationResultV1>;
  readonly backupExportResult?:
    | SaveUiBackupExportResultV1
    | Promise<SaveUiBackupExportResultV1>;
  readonly recovery?: boolean;
}

const inspectionDiagnosticsV1 = Object.freeze({
  codes: Object.freeze([]),
  migrationAttempt: null,
  migrationReasonCode: null,
  storedStateContractRevision: null,
  currentStateContractRevision: null,
});

const recoveryActionNamesV1 = Object.freeze(
  [
    labelsV1.recovery.action.upgrade,
    labelsV1.recovery.action.reanchor,
    labelsV1.recovery.action.restore,
    labelsV1.recovery.action.exportBackup,
    labelsV1.recovery.action.discard,
  ] as const,
);

type RecoveryActionNameV1 = (typeof recoveryActionNamesV1)[number];

function expectExactRecoveryActionsV1(
  slot: HTMLElement,
  expectedActions: readonly RecoveryActionNameV1[],
): void {
  const expected = new Set<string>(expectedActions);
  for (const actionName of recoveryActionNamesV1) {
    const action = within(slot).queryByRole("button", { name: actionName });
    if (expected.has(actionName)) {
      expect(action).toBeEnabled();
    } else {
      expect(action).not.toBeInTheDocument();
    }
  }
}

function acceptedInspectionResultV1(
  kind:
    | "direct"
    | "migration_required"
    | "adoption_required"
    | "migration_and_adoption_required",
): SaveInspectionResultV1 {
  const common = Object.freeze({
    slotId: "quick" as const,
    warnings: Object.freeze([]),
    diagnostics: inspectionDiagnosticsV1,
  });
  switch (kind) {
    case "direct":
      return Object.freeze({ kind, ...common });
    case "migration_required":
      return Object.freeze({ kind, ...common, migration: Object.freeze({}) as never });
    case "adoption_required":
      return Object.freeze({ kind, ...common, adoption: Object.freeze({}) as never });
    case "migration_and_adoption_required":
      return Object.freeze({
        kind,
        ...common,
        migration: Object.freeze({}) as never,
        adoption: Object.freeze({}) as never,
      });
    default: {
      const unreachableKind: never = kind;
      throw new TypeError(`unreachable inspection kind: ${String(unreachableKind)}`);
    }
  }
}

function inspectOnlyResultV1(
  code: Extract<SaveInspectionResultV1, { readonly kind: "inspect_only" }>["code"],
): SaveInspectionResultV1 {
  return Object.freeze({
    kind: "inspect_only",
    slotId: "quick",
    code,
    diagnostics: inspectionDiagnosticsV1,
  });
}

function rejectedInspectionResultV1(
  code: Extract<SaveInspectionResultV1, { readonly kind: "rejected" }>["code"],
): SaveInspectionResultV1 {
  return Object.freeze({
    kind: "rejected",
    slotId: "quick",
    code,
    diagnostics: inspectionDiagnosticsV1,
  });
}

function fixtureV1(options: FixtureOptionsV1 = {}) {
  const slots = options.slots ??
    slotIdsV1.map((slotId) => slotV1(slotId, slotId === "quick" ? "valid" : "empty"));
  const getStatus = vi.fn(() => options.status ?? statusV1());
  const listSlots = vi.fn(async () => slots);
  const save = vi.fn(async (slotId: SaveUiWritableSlotIdV1) =>
    Promise.resolve(options.saveResult ?? Object.freeze({ kind: "saved" as const, slotId }))
  );
  const load = vi.fn(async (_slotId: SaveSlotIdV1) =>
    Promise.resolve(
      options.loadResult ??
        Object.freeze({
          kind: "loaded" as const,
          compatibility: "exact" as const,
          commandSequence: parseNonNegativeSafeInteger(0),
        }),
    )
  );
  const clear = vi.fn(async (slotId: SaveSlotIdV1) =>
    Promise.resolve(options.clearResult ?? Object.freeze({ kind: "cleared" as const, slotId }))
  );
  const importSave = vi.fn(async () =>
    Promise.resolve(
      options.importResult ??
        Object.freeze({
          kind: "imported" as const,
          compatibility: "exact" as const,
          commandSequence: parseNonNegativeSafeInteger(0),
        }),
    )
  );
  const exportSave = vi.fn(async (slotId: SaveSlotIdV1) =>
    Promise.resolve(
      options.exportResult ??
        Object.freeze({ kind: "exported" as const, slotId, file: exportedSaveV1 }),
    )
  );
  const exportCurrentSave = vi.fn(async () => exportedSaveV1);
  const inspectSave = vi.fn(async (slotId: SaveSlotIdV1) =>
    Promise.resolve(
      options.inspectionResult ??
        Object.freeze({
          kind: "direct" as const,
          slotId,
          warnings: Object.freeze([]),
          diagnostics: inspectionDiagnosticsV1,
        }),
    )
  );
  const inspectBackup = vi.fn(async (slotId: SaveSlotIdV1) =>
    Promise.resolve(
      options.backupInspectionResult ??
        Object.freeze({ kind: "rejected" as const, slotId, code: "empty_backup" as const }),
    )
  );
  const upgradeSave = vi.fn(async (slotId: SaveSlotIdV1) =>
    Promise.resolve(
      options.rewriteResult ??
        Object.freeze({ kind: "upgraded" as const, slotId, compatibility: "exact" as const }),
    )
  );
  const reanchorSave = vi.fn(async (slotId: SaveSlotIdV1) =>
    Promise.resolve(options.rewriteResult ?? Object.freeze({ kind: "reanchored" as const, slotId }))
  );
  const restoreBackup = vi.fn(async (slotId: SaveSlotIdV1) =>
    Promise.resolve(options.backupResult ?? Object.freeze({ kind: "restored" as const, slotId }))
  );
  const discardBackup = vi.fn(async (slotId: SaveSlotIdV1) =>
    Promise.resolve(options.backupResult ?? Object.freeze({ kind: "discarded" as const, slotId }))
  );
  const exportBackup = vi.fn(async (slotId: SaveSlotIdV1) =>
    Promise.resolve(
      options.backupExportResult ??
        Object.freeze({ kind: "exported" as const, slotId }),
    )
  );
  const annotateSave = vi.fn(async (slotId: SaveUiWritableSlotIdV1, _note: string) =>
    Promise.resolve(Object.freeze({ kind: "saved" as const, slotId }))
  );
  const recovery = Object.freeze({
    inspectSave,
    inspectBackup,
    upgradeSave,
    reanchorSave,
    restoreBackup,
    exportBackup,
    discardBackup,
  });
  const port = Object.freeze({
    getStatus,
    listSlots,
    ...(options.recovery === false ? {} : { recovery }),
    save,
    load,
    clear,
    annotateSave,
    importSave,
    exportSave,
    exportCurrentSave,
  }) satisfies SaveOverlayPortV1;
  return Object.freeze({
    port,
    getStatus,
    listSlots,
    inspectSave,
    inspectBackup,
    upgradeSave,
    reanchorSave,
    restoreBackup,
    exportBackup,
    discardBackup,
    save,
    load,
    clear,
    annotateSave,
    importSave,
    exportSave,
    exportCurrentSave,
  });
}

function renderFixtureV1(fixture = fixtureV1()) {
  const confirmationIntent = Object.freeze({
    requestConfirmationInternalV1(
      input: SystemDialogHostConfirmationRequestInternalV1,
    ) {
      void input.operationBinding.dispatch(input.invocation).then(
        (outcome) => {
          if (outcome.kind === "retain_root") {
            input.operationBinding.resultSink(
              Object.freeze({ kind: "settled", result: outcome.result }),
            );
          }
          input.operationBinding.finalizeExactRoot();
        },
        (error: unknown) => {
          input.operationBinding.resultSink(Object.freeze({ kind: "faulted", error }));
          input.operationBinding.finalizeExactRoot();
        },
      );
      return Object.freeze({
        kind: "preparing" as const,
        code: "system_dialog.confirmation_preparation_started" as const,
      });
    },
  });
  return render(
    <SaveOverlayContentInternalV1
      port={fixture.port}
      labels={labelsV1}
      closeLabel="关闭"
      guard={Object.freeze({ allowed: true })}
      confirmationIntent={confirmationIntent}
      onCloseInternalV1={vi.fn()}
    />,
  );
}

function renderCapturedFixtureV1(fixture: ReturnType<typeof fixtureV1>) {
  const requests: SystemDialogHostConfirmationRequestInternalV1[] = [];
  const view = render(
    <SaveOverlayContentInternalV1
      port={fixture.port}
      labels={labelsV1}
      closeLabel="关闭"
      guard={Object.freeze({ allowed: true })}
      confirmationIntent={Object.freeze({
        requestConfirmationInternalV1(input: SystemDialogHostConfirmationRequestInternalV1) {
          requests.push(input);
          return Object.freeze({
            kind: "preparing" as const,
            code: "system_dialog.confirmation_preparation_started" as const,
          });
        },
      })}
      onCloseInternalV1={vi.fn()}
    />,
  );
  return Object.freeze({ requests, view });
}

async function inspectQuickSlotV1(): Promise<HTMLElement> {
  await screen.findByText("快速存档");
  const quick = document.querySelector<HTMLElement>("[data-slot-id='quick']");
  if (quick === null) throw new TypeError("missing Quick Save row");
  await userEvent.setup().click(
    within(quick).getByRole("button", { name: "检查兼容性与备份" }),
  );
  return quick;
}

type InspectionDispositionCaseIdV1 =
  | Exclude<
    SaveInspectionResultV1["kind"],
    "inspect_only" | "rejected" | "faulted"
  >
  | `inspect_only:${Extract<
    SaveInspectionResultV1,
    { readonly kind: "inspect_only" }
  >["code"]}`
  | `rejected:${Extract<SaveInspectionResultV1, { readonly kind: "rejected" }>["code"]}`
  | "faulted";

interface InspectionDispositionCaseV1 {
  readonly result: SaveInspectionResultV1;
  readonly expectedText: string | null;
  readonly expectedActions: readonly RecoveryActionNameV1[];
  readonly hiddenTexts: readonly string[];
}

const inspectionDispositionCasesV1 = Object.freeze(
  {
    direct: Object.freeze({
      result: acceptedInspectionResultV1("direct"),
      expectedText: "可直接读取",
      expectedActions: Object.freeze([]),
      hiddenTexts: Object.freeze([]),
    }),
    migration_required: Object.freeze({
      result: acceptedInspectionResultV1("migration_required"),
      expectedText: "需要升级存档格式",
      expectedActions: Object.freeze([labelsV1.recovery.action.upgrade]),
      hiddenTexts: Object.freeze([]),
    }),
    adoption_required: Object.freeze({
      result: acceptedInspectionResultV1("adoption_required"),
      expectedText: "需要采用兼容补丁",
      expectedActions: Object.freeze([labelsV1.recovery.action.upgrade]),
      hiddenTexts: Object.freeze([]),
    }),
    migration_and_adoption_required: Object.freeze({
      result: acceptedInspectionResultV1("migration_and_adoption_required"),
      expectedText: "需要升级并采用兼容补丁",
      expectedActions: Object.freeze([labelsV1.recovery.action.upgrade]),
      hiddenTexts: Object.freeze([]),
    }),
    "inspect_only:migration_unavailable": Object.freeze({
      result: inspectOnlyResultV1("migration_unavailable"),
      expectedText: "当前版本尚未提供所需迁移",
      expectedActions: Object.freeze([]),
      hiddenTexts: Object.freeze(["migration_unavailable"]),
    }),
    "inspect_only:incompatible": Object.freeze({
      result: inspectOnlyResultV1("incompatible"),
      expectedText: "与当前版本不兼容",
      expectedActions: Object.freeze([]),
      hiddenTexts: Object.freeze(["incompatible"]),
    }),
    "inspect_only:reanchor_required": Object.freeze({
      result: inspectOnlyResultV1("reanchor_required"),
      expectedText: "兼容历史已满，需要重建",
      expectedActions: Object.freeze([labelsV1.recovery.action.reanchor]),
      hiddenTexts: Object.freeze(["reanchor_required"]),
    }),
    "rejected:empty_slot": Object.freeze({
      result: rejectedInspectionResultV1("empty_slot"),
      expectedText: null,
      expectedActions: Object.freeze([]),
      hiddenTexts: Object.freeze(["empty_slot"]),
    }),
    "rejected:unavailable": Object.freeze({
      result: rejectedInspectionResultV1("unavailable"),
      expectedText: "暂时无法检查此存档",
      expectedActions: Object.freeze([]),
      hiddenTexts: Object.freeze(["unavailable"]),
    }),
    "rejected:invalid_record": Object.freeze({
      result: rejectedInspectionResultV1("invalid_record"),
      expectedText: "无法安全检查此存档",
      expectedActions: Object.freeze([]),
      hiddenTexts: Object.freeze(["invalid_record"]),
    }),
    "rejected:migration_rejected": Object.freeze({
      result: rejectedInspectionResultV1("migration_rejected"),
      expectedText: "存档迁移未通过安全检查",
      expectedActions: Object.freeze([]),
      hiddenTexts: Object.freeze(["migration_rejected"]),
    }),
    faulted: Object.freeze({
      result: Object.freeze({
        kind: "faulted",
        slotId: "quick",
        code: "private.stack.storage.key",
        diagnostics: Object.freeze({
          ...inspectionDiagnosticsV1,
          codes: Object.freeze(["private.raw.digest"]),
        }),
      }),
      expectedText: "兼容性检查失败",
      expectedActions: Object.freeze([]),
      hiddenTexts: Object.freeze(["private.stack", "private.raw.digest"]),
    }),
  } satisfies Record<InspectionDispositionCaseIdV1, InspectionDispositionCaseV1>,
);

type BackupInspectionCaseIdV1 =
  | Exclude<SaveBackupInspectionResultV1["kind"], "rejected" | "faulted">
  | `rejected:${Extract<
    SaveBackupInspectionResultV1,
    { readonly kind: "rejected" }
  >["code"]}`
  | "faulted";

interface BackupInspectionCaseV1 {
  readonly result: SaveBackupInspectionResultV1;
  readonly expectedText: string | null;
  readonly expectedActions: readonly RecoveryActionNameV1[];
  readonly hiddenTexts: readonly string[];
}

const backupInspectionCasesV1 = Object.freeze(
  {
    available: Object.freeze({
      result: Object.freeze({ kind: "available", slotId: "quick" }),
      expectedText: "迁移前备份可用",
      expectedActions: Object.freeze([
        labelsV1.recovery.action.restore,
        labelsV1.recovery.action.exportBackup,
        labelsV1.recovery.action.discard,
      ]),
      hiddenTexts: Object.freeze([]),
    }),
    "rejected:empty_backup": Object.freeze({
      result: Object.freeze({ kind: "rejected", slotId: "quick", code: "empty_backup" }),
      expectedText: null,
      expectedActions: Object.freeze([]),
      hiddenTexts: Object.freeze(["empty_backup"]),
    }),
    "rejected:unavailable": Object.freeze({
      result: Object.freeze({ kind: "rejected", slotId: "quick", code: "unavailable" }),
      expectedText: "暂时无法检查迁移前备份",
      expectedActions: Object.freeze([]),
      hiddenTexts: Object.freeze(["unavailable"]),
    }),
    "rejected:invalid_backup": Object.freeze({
      result: Object.freeze({ kind: "rejected", slotId: "quick", code: "invalid_backup" }),
      expectedText: "迁移前备份已损坏",
      expectedActions: Object.freeze([labelsV1.recovery.action.discard]),
      hiddenTexts: Object.freeze(["invalid_backup"]),
    }),
    faulted: Object.freeze({
      result: Object.freeze({
        kind: "faulted",
        slotId: null,
        code: "private.backup.stack.storage.key",
      }),
      expectedText: "暂时无法检查迁移前备份",
      expectedActions: Object.freeze([]),
      hiddenTexts: Object.freeze(["private.backup.stack"]),
    }),
  } satisfies Record<BackupInspectionCaseIdV1, BackupInspectionCaseV1>,
);

type RewriteRejectionCodeV1 = Extract<
  SaveRewriteOperationResultV1,
  { readonly kind: "rejected" }
>["code"];
type BackupRejectionCodeV1 = Extract<
  SaveBackupOperationResultV1,
  { readonly kind: "rejected" }
>["code"];
type BackupExportRejectionCodeV1 = Extract<
  SaveUiBackupExportResultV1,
  { readonly kind: "rejected" }
>["code"];

const rewriteRejectionCopyV1 = Object.freeze(
  {
    busy: "恢复操作正在进行，请稍后重试",
    unavailable: "本地存储暂时不可用",
    empty_slot: "该槽位没有可升级的存档",
    backup_pending: "请先处理现有迁移前备份",
    conflict: "存档已被其他页面更新，请重新检查",
    invalid_record: "存档记录无效，无法执行此操作",
    migration_unavailable: "当前版本尚未提供所需迁移",
    migration_rejected: "存档迁移未通过安全检查",
    incompatible: "该存档与当前版本不兼容",
    reanchor_required: "需要先重建兼容历史",
    not_required: "该存档无需执行此操作",
  } satisfies Record<RewriteRejectionCodeV1, string>,
);

const backupRejectionCopyV1 = Object.freeze(
  {
    busy: "恢复操作正在进行，请稍后重试",
    unavailable: "本地存储暂时不可用",
    empty_backup: "该槽位没有迁移前备份",
    conflict: "存档已被其他页面更新，请重新检查",
    invalid_backup: "迁移前备份已损坏",
    invalid_record: "存档记录无效，无法执行此操作",
  } satisfies Record<BackupRejectionCodeV1, string>,
);

const backupExportRejectionCopyV1 = Object.freeze(
  {
    unavailable: "本地存储暂时不可用",
    empty_backup: "该槽位没有迁移前备份",
    conflict: "存档已被其他页面更新，请重新检查",
    invalid_backup: "迁移前备份已损坏",
  } satisfies Record<BackupExportRejectionCodeV1, string>,
);

async function expectRecoveryRejectionV1(
  family: "rewrite" | "backup" | "backup_export",
  code: RewriteRejectionCodeV1 | BackupRejectionCodeV1 | BackupExportRejectionCodeV1,
  expectedText: string,
): Promise<void> {
  let fixture: ReturnType<typeof fixtureV1>;
  let actionName: RecoveryActionNameV1;
  switch (family) {
    case "rewrite":
      fixture = fixtureV1({
        inspectionResult: acceptedInspectionResultV1("migration_required"),
        rewriteResult: Object.freeze({
          kind: "rejected",
          code: code as RewriteRejectionCodeV1,
        }),
      });
      actionName = labelsV1.recovery.action.upgrade;
      break;
    case "backup":
      fixture = fixtureV1({
        backupInspectionResult: Object.freeze({ kind: "available", slotId: "quick" }),
        backupResult: Object.freeze({
          kind: "rejected",
          code: code as BackupRejectionCodeV1,
        }),
      });
      actionName = labelsV1.recovery.action.restore;
      break;
    case "backup_export":
      fixture = fixtureV1({
        backupInspectionResult: Object.freeze({ kind: "available", slotId: "quick" }),
        backupExportResult: Object.freeze({
          kind: "rejected",
          code: code as BackupExportRejectionCodeV1,
        }),
      });
      actionName = labelsV1.recovery.action.exportBackup;
      break;
  }

  renderFixtureV1(fixture);
  const quick = await inspectQuickSlotV1();
  await userEvent.setup().click(within(quick).getByRole("button", { name: actionName }));

  const result = await screen.findByTestId("save-operation-result");
  await waitFor(() => expect(result).toHaveTextContent(expectedText));
  expect(result).not.toHaveTextContent(code);
  switch (family) {
    case "rewrite":
      expect(fixture.upgradeSave).toHaveBeenCalledExactlyOnceWith("quick");
      break;
    case "backup":
      expect(fixture.restoreBackup).toHaveBeenCalledExactlyOnceWith("quick");
      break;
    case "backup_export":
      expect(fixture.exportBackup).toHaveBeenCalledExactlyOnceWith("quick");
      break;
  }
}

describe("SaveOverlayContentInternalV1 managed confirmation boundary", () => {
  it("maps a successful load to successor without calling the root close intent", async () => {
    const fixture = fixtureV1();
    const requests: SystemDialogHostConfirmationRequestInternalV1[] = [];
    const onCloseInternalV1 = vi.fn();
    render(
      <SaveOverlayContentInternalV1
        port={fixture.port}
        labels={labelsV1}
        closeLabel="关闭"
        guard={Object.freeze({ allowed: true })}
        confirmationIntent={Object.freeze({
          requestConfirmationInternalV1(
            input: SystemDialogHostConfirmationRequestInternalV1,
          ) {
            requests.push(input);
            return Object.freeze({
              kind: "preparing" as const,
              code: "system_dialog.confirmation_preparation_started" as const,
            });
          },
        })}
        onCloseInternalV1={onCloseInternalV1}
      />,
    );

    await userEvent.setup().click(
      await screen.findByRole("button", { name: "读取快速存档" }),
    );
    const request = requests[0];
    if (request === undefined) throw new Error("expected confirmation request");
    expect(fixture.load).not.toHaveBeenCalled();
    await expect(request.operationBinding.dispatch(request.invocation)).resolves.toEqual({
      kind: "successor",
    });
    expect(fixture.load).toHaveBeenCalledExactlyOnceWith("quick");
    expect(onCloseInternalV1).not.toHaveBeenCalled();
  });

  it("delivers a retained result only through the child-bound sink and exact-root finalizer", async () => {
    const fixture = fixtureV1();
    const requests: SystemDialogHostConfirmationRequestInternalV1[] = [];
    render(
      <SaveOverlayContentInternalV1
        port={fixture.port}
        labels={labelsV1}
        closeLabel="关闭"
        guard={Object.freeze({ allowed: true })}
        confirmationIntent={Object.freeze({
          requestConfirmationInternalV1(
            input: SystemDialogHostConfirmationRequestInternalV1,
          ) {
            requests.push(input);
            return Object.freeze({
              kind: "preparing" as const,
              code: "system_dialog.confirmation_preparation_started" as const,
            });
          },
        })}
        onCloseInternalV1={vi.fn()}
      />,
    );

    await userEvent.setup().click(
      await screen.findByRole("button", { name: "清除快速存档" }),
    );
    const request = requests[0];
    if (request === undefined) throw new Error("expected confirmation request");
    let outcome: Awaited<ReturnType<typeof request.operationBinding.dispatch>> | undefined;
    await act(async () => {
      outcome = await request.operationBinding.dispatch(request.invocation);
    });
    expect(screen.getByTestId("save-operation-result")).toHaveTextContent(
      "正在清除快速存档…",
    );
    if (outcome?.kind !== "retain_root") throw new Error("expected retained result");
    const retainedResult = outcome.result;

    act(() => {
      request.operationBinding.resultSink(
        Object.freeze({ kind: "settled", result: retainedResult }),
      );
      request.operationBinding.finalizeExactRoot();
    });
    expect(screen.getByTestId("save-operation-result")).toHaveTextContent("快速存档已清除");
    expect(screen.getByTestId("save-operation-result")).not.toHaveFocus();
    await waitFor(() => expect(fixture.getStatus).toHaveBeenCalledTimes(2));
  });
});

describe("SaveOverlayContentInternalV1", () => {
  it("shows every port slot in port order but writes only Quick and numbered Manual", async () => {
    renderFixtureV1();

    expect((await screen.findAllByRole("listitem")).map((entry) => entry.dataset.slotId)).toEqual(
      slotIdsV1,
    );
    expect(screen.queryByRole("button", { name: "写入当前自动存档" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "快速保存" })).toBeEnabled();
    const manualSaves = screen.getAllByRole("button", { name: "手动保存" });
    expect(manualSaves).toHaveLength(2);
    for (const button of manualSaves) expect(button).toBeEnabled();
    expect(screen.getByText("手动存档 2")).toBeVisible();
  });

  it("accepts the asynchronous status port without creating another authority", async () => {
    const fixture = fixtureV1({ status: Promise.resolve(statusV1({ busy: true })) });
    renderFixtureV1(fixture);

    expect(await screen.findByText("本地存储正忙")).toBeVisible();
    expect(screen.getByRole("button", { name: "快速保存" })).toBeDisabled();
    expect(fixture.getStatus).toHaveBeenCalledOnce();
  });

  it("subscribes to the live read-only guard projection", async () => {
    const fixture = fixtureV1();
    const allowedPublication = Object.freeze({ allowed: true });
    const blockedPublication = Object.freeze({ allowed: false });
    let publication: Readonly<{ allowed: boolean }> = allowedPublication;
    let listener: (() => void) | null = null;
    const guardProjection = Object.freeze({
      getSnapshot: () => publication,
      subscribe(nextListener: () => void) {
        listener = nextListener;
        return () => {
          listener = null;
        };
      },
      evaluate(value: unknown) {
        return value === blockedPublication
          ? Object.freeze({ allowed: false, reasonText: "剧情进行中不可保存" })
          : Object.freeze({ allowed: true });
      },
    });

    render(
      <SaveOverlayContentInternalV1
        port={fixture.port}
        labels={labelsV1}
        closeLabel="关闭"
        guardProjection={guardProjection}
        confirmationIntent={Object.freeze({
          requestConfirmationInternalV1: vi.fn(() =>
            Object.freeze({
              kind: "unchanged" as const,
              code: "system_dialog.confirmation_already_requested" as const,
            })
          ),
        })}
        onCloseInternalV1={vi.fn()}
      />,
    );

    const quickSave = await screen.findByRole("button", { name: "快速保存" });
    expect(quickSave).toBeEnabled();

    publication = blockedPublication;
    act(() => listener?.());

    expect(quickSave).toBeDisabled();
    expect(screen.getByText("剧情进行中不可保存")).toBeVisible();
    expect(fixture.save).not.toHaveBeenCalled();
  });

  it("remains live across the StrictMode setup-cleanup-setup probe", async () => {
    const fixture = fixtureV1({ status: Promise.resolve(statusV1()) });
    render(
      <StrictMode>
        <SaveOverlayContentInternalV1
          port={fixture.port}
          labels={labelsV1}
          closeLabel="关闭"
          guard={Object.freeze({ allowed: true })}
          confirmationIntent={Object.freeze({
            requestConfirmationInternalV1: vi.fn(() =>
              Object.freeze({
                kind: "unchanged" as const,
                code: "system_dialog.confirmation_already_requested" as const,
              })
            ),
          })}
          onCloseInternalV1={vi.fn()}
        />
      </StrictMode>,
    );

    expect(await screen.findByText("本地存储可用")).toBeVisible();
    expect(screen.getByRole("button", { name: "快速保存" })).toBeEnabled();
  });

  it("maps slot health and preserves the port's slot order verbatim", async () => {
    renderFixtureV1(
      fixtureV1({
        slots: Object.freeze([
          slotV1("auto.current", "empty"),
          slotV1("auto.previous", "valid"),
          slotV1("quick", "invalid"),
          slotV1("manual.1", "recovery_candidate"),
        ]),
      }),
    );

    const entries = await screen.findAllByRole("listitem");
    expect(entries.map((entry) => entry.dataset.slotId)).toEqual([
      "auto.current",
      "auto.previous",
      "quick",
      "manual.1",
    ]);
    expect(entries.map((entry) => entry.querySelector("[data-slot-health]")?.textContent)).toEqual([
      "空槽位",
      "存档有效",
      "存档损坏",
      "可恢复的备用存档",
    ]);
  });

  it("keeps invalid Quick and Manual slots explicitly writable", async () => {
    const fixture = fixtureV1({
      slots: Object.freeze([
        slotV1("auto.current", "empty"),
        slotV1("auto.previous", "empty"),
        slotV1("quick", "invalid"),
        slotV1("manual.1", "invalid"),
      ]),
    });
    renderFixtureV1(fixture);
    const user = userEvent.setup();
    const quickSave = await screen.findByRole("button", { name: "快速保存" });
    const manualSave = screen.getByRole("button", { name: "手动保存" });

    expect(quickSave).toBeEnabled();
    expect(manualSave).toBeEnabled();
    await user.click(quickSave);
    await waitFor(() => expect(fixture.save).toHaveBeenCalledWith("quick"));
    await user.click(manualSave);
    await waitFor(() => expect(fixture.save).toHaveBeenCalledWith("manual.1"));
  });

  it("does not report success before the persistence operation commits", async () => {
    let resolveSave!: (result: PersistenceOperationResultV1) => void;
    const pending = new Promise<PersistenceOperationResultV1>((resolve) => {
      resolveSave = resolve;
    });
    const fixture = fixtureV1({ saveResult: pending });
    renderFixtureV1(fixture);

    await userEvent.setup().click(await screen.findByRole("button", { name: "快速保存" }));
    expect(screen.getByText("正在安全写入快速存档…")).toBeVisible();
    expect(screen.queryByText("快速存档已保存")).not.toBeInTheDocument();

    resolveSave(Object.freeze({ kind: "saved", slotId: "quick" }));
    expect(await screen.findByText("快速存档已保存")).toBeVisible();
  });

  it("keeps current-session export available when storage is unavailable", async () => {
    const fixture = fixtureV1({
      status: statusV1({ available: false }),
      slots: slotIdsV1.map((slotId) => slotV1(slotId, "unavailable")),
    });
    renderFixtureV1(fixture);

    expect(await screen.findByText("本地存储不可用")).toBeVisible();
    const exportCurrent = screen.getByRole("button", { name: "导出当前进度" });
    expect(exportCurrent).toBeEnabled();
    expect(screen.getByRole("button", { name: "快速保存" })).toBeDisabled();
    await userEvent.setup().click(exportCurrent);
    expect(fixture.exportCurrentSave).toHaveBeenCalledOnce();
    expect(await screen.findByText("当前进度已导出")).toBeVisible();
  });

  it("requires explicit confirmation before load, clear, and import", async () => {
    const fixture = fixtureV1({
      slots: Object.freeze([
        slotV1("auto.current", "valid"),
        slotV1("auto.previous", "empty"),
        slotV1("quick", "invalid"),
        slotV1("manual.1", "valid"),
      ]),
    });
    const requests: SystemDialogHostConfirmationRequestInternalV1[] = [];
    render(
      <SaveOverlayContentInternalV1
        port={fixture.port}
        labels={labelsV1}
        closeLabel="关闭"
        guard={Object.freeze({ allowed: true })}
        confirmationIntent={Object.freeze({
          requestConfirmationInternalV1(
            input: SystemDialogHostConfirmationRequestInternalV1,
          ) {
            requests.push(input);
            return Object.freeze({
              kind: "preparing" as const,
              code: "system_dialog.confirmation_preparation_started" as const,
            });
          },
        })}
        onCloseInternalV1={vi.fn()}
      />,
    );
    const user = userEvent.setup();

    const load = await screen.findByRole("button", { name: "读取当前自动存档" });
    await user.click(load);
    expect(fixture.load).not.toHaveBeenCalled();

    const clear = await screen.findByRole("button", { name: "清除快速存档" });
    await user.click(clear);
    expect(fixture.clear).not.toHaveBeenCalled();

    const importSave = await screen.findByRole("button", { name: "导入存档" });
    await user.click(importSave);
    expect(fixture.importSave).not.toHaveBeenCalled();
    expect(requests.map(({ invocation }) => invocation)).toEqual([
      { kind: "load", slotId: "auto.current" },
      { kind: "clear", slotId: "quick" },
      { kind: "import" },
    ]);
  });

  it("projects a cancelled Host file selection without inventing a persistence result", async () => {
    const fixture = fixtureV1({ importResult: Object.freeze({ kind: "cancelled" }) });
    renderFixtureV1(fixture);
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: "导入存档" }));

    expect(await screen.findByText("已取消导入存档")).toBeVisible();
    expect(screen.queryByText("存档操作发生未预期错误")).not.toBeInTheDocument();
  });

  it.each(
    [
      ["too_large", "所选存档文件过大"],
      ["unsupported_type", "所选文件类型不受支持"],
    ] as const,
  )("projects Host file rejection %s independently", async (code, expectedText) => {
    const fixture = fixtureV1({
      importResult: Object.freeze({ kind: "rejected", code }),
    });
    renderFixtureV1(fixture);
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: "导入存档" }));

    const result = await screen.findByTestId("save-operation-result");
    await waitFor(() => expect(result).toHaveTextContent(expectedText));
    expect(result).not.toHaveFocus();
  });

  it("reports conflict and fault results truthfully without stealing focus", async () => {
    const fixture = fixtureV1({
      slots: slotIdsV1.map((slotId) => slotV1(slotId, "valid")),
      loadResult: Object.freeze({ kind: "rejected", code: "conflict" }),
      saveResult: Object.freeze({ kind: "faulted", code: "persistence.write_failed" }),
    });
    renderFixtureV1(fixture);
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: "读取当前自动存档" }));
    const result = await screen.findByTestId("save-operation-result");
    await waitFor(() => expect(result).toHaveTextContent("存档已被其他页面更新"));
    expect(result).not.toHaveFocus();

    await user.click(screen.getByRole("button", { name: "快速保存" }));
    expect(await screen.findByText("存档操作失败：persistence.write_failed")).toBeVisible();
    expect(result).not.toHaveFocus();
  });

  it("refreshes after a retained result without focusing its summary", async () => {
    let resolvePostOperationStatus!: (status: PersistenceStatusV1) => void;
    const postOperationStatus = new Promise<PersistenceStatusV1>((resolve) => {
      resolvePostOperationStatus = resolve;
    });
    const fixture = fixtureV1({
      slots: slotIdsV1.map((slotId) => slotV1(slotId, "valid")),
      loadResult: Object.freeze({ kind: "rejected", code: "conflict" }),
    });
    fixture.getStatus.mockReturnValueOnce(statusV1()).mockReturnValueOnce(postOperationStatus);
    renderFixtureV1(fixture);
    const user = userEvent.setup();
    const opener = await screen.findByRole("button", { name: "读取当前自动存档" });

    await user.click(opener);

    const result = await screen.findByTestId("save-operation-result");
    await waitFor(() => expect(result).toHaveTextContent("存档已被其他页面更新"));
    expect(opener).toBeDisabled();
    expect(result).not.toHaveFocus();

    resolvePostOperationStatus(statusV1());
    await waitFor(() => expect(opener).toBeEnabled());
  });

  it("leaves the rendered semantic publication untouched when import is rejected", async () => {
    const fixture = fixtureV1({
      importResult: Object.freeze({ kind: "rejected", code: "incompatible" }),
    });
    render(
      <>
        <output data-testid="semantic-publication">revision:7</output>
        <SaveOverlayContentInternalV1
          port={fixture.port}
          labels={labelsV1}
          closeLabel="关闭"
          guard={Object.freeze({ allowed: true })}
          confirmationIntent={Object.freeze({
            requestConfirmationInternalV1(
              input: SystemDialogHostConfirmationRequestInternalV1,
            ) {
              void input.operationBinding.dispatch(input.invocation).then(
                (outcome) => {
                  if (outcome.kind === "retain_root") {
                    input.operationBinding.resultSink(
                      Object.freeze({ kind: "settled", result: outcome.result }),
                    );
                  }
                  input.operationBinding.finalizeExactRoot();
                },
              );
              return Object.freeze({
                kind: "preparing" as const,
                code: "system_dialog.confirmation_preparation_started" as const,
              });
            },
          })}
          onCloseInternalV1={vi.fn()}
        />
      </>,
    );
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: "导入存档" }));

    expect(await screen.findByText("存档与当前游戏不兼容")).toBeVisible();
    expect(screen.getByTestId("semantic-publication")).toHaveTextContent("revision:7");
  });

  it("projects migration-unavailable as its distinct Player-facing outcome", async () => {
    const fixture = fixtureV1({
      importResult: Object.freeze({ kind: "rejected", code: "migration_unavailable" }),
    });
    renderFixtureV1(fixture);
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: "导入存档" }));

    expect(await screen.findByText("当前版本尚未提供此存档所需的迁移")).toBeVisible();
  });

  it("projects migration rejection without exposing migration diagnostics", async () => {
    const fixture = fixtureV1({
      importResult: Object.freeze({ kind: "rejected", code: "migration_rejected" }),
    });
    renderFixtureV1(fixture);
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: "导入存档" }));

    expect(await screen.findByText("存档迁移失败")).toBeVisible();
  });

  it("bounds thrown export failures instead of leaking an unhandled rejection", async () => {
    const fixture = fixtureV1();
    fixture.exportCurrentSave.mockRejectedValueOnce(new Error("browser export failed"));
    renderFixtureV1(fixture);

    await userEvent.setup().click(await screen.findByRole("button", { name: "导出当前进度" }));

    expect(await screen.findByText("存档操作发生未预期错误")).toBeVisible();
  });

  it("does not inspect every slot eagerly and reads only the explicitly selected slot", async () => {
    const fixture = fixtureV1();
    renderFixtureV1(fixture);

    await screen.findByText("本地存储可用");
    expect(fixture.inspectSave).not.toHaveBeenCalled();
    expect(fixture.inspectBackup).not.toHaveBeenCalled();

    await inspectQuickSlotV1();
    expect(fixture.inspectSave).toHaveBeenCalledExactlyOnceWith("quick");
    expect(fixture.inspectBackup).toHaveBeenCalledExactlyOnceWith("quick");
  });

  it.each(Object.entries(inspectionDispositionCasesV1))(
    "maps inspection disposition %s to exact player copy and actions",
    async (_caseId, testCase) => {
      const fixture = fixtureV1({ inspectionResult: testCase.result });
      renderFixtureV1(fixture);

      const quick = await inspectQuickSlotV1();
      if (testCase.expectedText === null) {
        await waitFor(() => {
          expect(quick.querySelector("[data-save-inspection]")).toBeNull();
        });
      } else {
        expect(await within(quick).findByText(testCase.expectedText)).toBeVisible();
      }
      expectExactRecoveryActionsV1(quick, testCase.expectedActions);
      for (const hiddenText of testCase.hiddenTexts) {
        expect(quick).not.toHaveTextContent(hiddenText);
      }
    },
  );

  it.each(Object.entries(backupInspectionCasesV1))(
    "maps backup inspection disposition %s to exact player copy and actions",
    async (_caseId, testCase) => {
      const fixture = fixtureV1({ backupInspectionResult: testCase.result });
      renderFixtureV1(fixture);

      const quick = await inspectQuickSlotV1();
      if (testCase.expectedText === null) {
        await waitFor(() => {
          expect(quick.querySelector("[data-save-backup]")).toBeNull();
        });
      } else {
        expect(await within(quick).findByText(testCase.expectedText)).toBeVisible();
      }
      expectExactRecoveryActionsV1(quick, testCase.expectedActions);
      for (const hiddenText of testCase.hiddenTexts) {
        expect(quick).not.toHaveTextContent(hiddenText);
      }
    },
  );

  it("keeps recovery an atomic opt-in capability for legacy labels and ports", async () => {
    const fixture = fixtureV1();
    const { recovery: _recoveryPort, ...legacyPort } = fixture.port;
    const { recovery: _recoveryLabels, ...legacyLabels } = labelsV1;
    const view = render(
      <SaveOverlayContentInternalV1
        port={Object.freeze(legacyPort)}
        labels={labelsV1}
        closeLabel="关闭"
        guard={Object.freeze({ allowed: true })}
        confirmationIntent={Object.freeze({ requestConfirmationInternalV1: vi.fn() })}
        onCloseInternalV1={vi.fn()}
      />,
    );

    await screen.findByText("本地存储可用");
    expect(screen.queryByRole("button", { name: "检查兼容性与备份" })).toBeNull();
    view.rerender(
      <SaveOverlayContentInternalV1
        port={fixture.port}
        labels={Object.freeze(legacyLabels)}
        closeLabel="关闭"
        guard={Object.freeze({ allowed: true })}
        confirmationIntent={Object.freeze({ requestConfirmationInternalV1: vi.fn() })}
        onCloseInternalV1={vi.fn()}
      />,
    );
    expect(screen.queryByRole("button", { name: "检查兼容性与备份" })).toBeNull();
    expect(fixture.inspectSave).not.toHaveBeenCalled();
  });

  it("coalesces double activation while one slot inspection is pending", async () => {
    let resolveInspection!: (result: SaveInspectionResultV1) => void;
    const inspection = new Promise<SaveInspectionResultV1>((resolve) => {
      resolveInspection = resolve;
    });
    const fixture = fixtureV1({ inspectionResult: inspection });
    renderFixtureV1(fixture);
    const quick = await screen.findByText("快速存档").then(() =>
      document.querySelector<HTMLElement>("[data-slot-id='quick']")
    );
    if (quick === null) throw new TypeError("missing Quick Save row");
    const inspect = within(quick).getByRole("button", { name: "检查兼容性与备份" });

    await userEvent.setup().dblClick(inspect);
    expect(fixture.inspectSave).toHaveBeenCalledExactlyOnceWith("quick");
    expect(fixture.inspectBackup).toHaveBeenCalledExactlyOnceWith("quick");
    expect(inspect).toBeDisabled();
    for (const manualSave of screen.getAllByRole("button", { name: "手动保存" })) {
      expect(manualSave).toBeDisabled();
    }
    expect(screen.getByRole("button", { name: "导入存档" })).toBeDisabled();
    const status = within(quick).getByRole("status");
    expect(status).toHaveAttribute("aria-live", "polite");
    expect(status).toHaveAttribute("aria-atomic", "true");
    expect(status).toHaveTextContent("正在检查兼容性…");

    resolveInspection(Object.freeze({
      kind: "direct",
      slotId: "quick",
      warnings: Object.freeze([]),
      diagnostics: inspectionDiagnosticsV1,
    }));
    expect(await within(quick).findByText("可直接读取")).toBeVisible();
    expect(inspect).toBeEnabled();
  });

  it("rejects mismatched single-slot inspection results without exposing actions", async () => {
    const fixture = fixtureV1({
      inspectionResult: Object.freeze({
        kind: "migration_required",
        slotId: "manual.1",
        migration: Object.freeze({}) as never,
        warnings: Object.freeze([]),
        diagnostics: inspectionDiagnosticsV1,
      }),
    });
    renderFixtureV1(fixture);

    const quick = await inspectQuickSlotV1();
    expect(await within(quick).findByText("兼容性检查失败")).toBeVisible();
    expect(within(quick).queryByRole("button", { name: "安全升级" })).toBeNull();
  });

  it("projects a migration disposition and upgrades it without opening confirmation", async () => {
    const fixture = fixtureV1({
      inspectionResult: Object.freeze({
        kind: "migration_required",
        slotId: "quick",
        migration: Object.freeze({}) as never,
        warnings: Object.freeze([]),
        diagnostics: inspectionDiagnosticsV1,
      }),
    });
    const requestConfirmationInternalV1 = vi.fn();
    render(
      <SaveOverlayContentInternalV1
        port={fixture.port}
        labels={labelsV1}
        closeLabel="关闭"
        guard={Object.freeze({ allowed: true })}
        confirmationIntent={Object.freeze({ requestConfirmationInternalV1 })}
        onCloseInternalV1={vi.fn()}
      />,
    );

    await screen.findByText("快速存档");
    const quick = await inspectQuickSlotV1();
    expect(await within(quick).findByText("需要升级存档格式")).toBeVisible();
    await userEvent.setup().click(within(quick).getByRole("button", { name: "安全升级" }));

    await waitFor(() => expect(fixture.upgradeSave).toHaveBeenCalledExactlyOnceWith("quick"));
    expect(requestConfirmationInternalV1).not.toHaveBeenCalled();
    expect(await screen.findByText("存档已升级")).toBeVisible();
  });

  it("routes re-anchor through the managed confirmation child and never trusts inspection", async () => {
    const fixture = fixtureV1({
      inspectionResult: Object.freeze({
        kind: "inspect_only",
        slotId: "quick",
        code: "reanchor_required",
        diagnostics: inspectionDiagnosticsV1,
      }),
    });
    const { requests } = renderCapturedFixtureV1(fixture);

    await screen.findByText("快速存档");
    const quick = await inspectQuickSlotV1();
    await userEvent.setup().click(
      within(quick).getByRole("button", {
        name: "重建兼容历史",
      }),
    );
    expect(fixture.reanchorSave).not.toHaveBeenCalled();
    expect(requests.map(({ invocation }) => invocation)).toEqual([
      { kind: "reanchor", slotId: "quick" },
    ]);
    const request = requests[0];
    if (request === undefined) throw new TypeError("missing re-anchor confirmation");
    await expect(
      request.operationBinding.dispatch(Object.freeze({ kind: "reanchor", slotId: "manual.1" })),
    ).rejects.toThrow("ui.save_overlay_confirmation_invocation_mismatch");
    expect(fixture.reanchorSave).not.toHaveBeenCalled();
    const outcome = await request.operationBinding.dispatch(request.invocation);
    expect(fixture.reanchorSave).toHaveBeenCalledExactlyOnceWith("quick");
    if (outcome.kind !== "retain_root") throw new TypeError("expected retained re-anchor result");
    act(() => {
      request.operationBinding.resultSink(
        Object.freeze({ kind: "settled", result: outcome.result }),
      );
      request.operationBinding.finalizeExactRoot();
    });
    expect(screen.getByTestId("save-operation-result")).toHaveTextContent("兼容历史已重建");
  });

  it("offers one managed backup recovery surface and keeps export confirmation-free", async () => {
    const fixture = fixtureV1({
      backupInspectionResult: Object.freeze({ kind: "available", slotId: "quick" }),
    });
    const { requests } = renderCapturedFixtureV1(fixture);

    await screen.findByText("快速存档");
    const quick = await inspectQuickSlotV1();
    expect(await within(quick).findByText("迁移前备份可用")).toBeVisible();
    const user = userEvent.setup();
    await user.click(within(quick).getByRole("button", { name: "导出迁移前备份" }));
    await waitFor(() => expect(fixture.exportBackup).toHaveBeenCalledExactlyOnceWith("quick"));
    expect(requests).toHaveLength(0);
    expect(await screen.findByText("迁移前备份已导出")).toBeVisible();

    await user.click(within(quick).getByRole("button", { name: "恢复迁移前备份" }));
    await user.click(within(quick).getByRole("button", { name: "丢弃迁移前备份" }));
    expect(requests.map(({ invocation }) => invocation)).toEqual([
      { kind: "restore", slotId: "quick" },
      { kind: "discard", slotId: "quick" },
    ]);
    expect(fixture.restoreBackup).not.toHaveBeenCalled();
    expect(fixture.discardBackup).not.toHaveBeenCalled();
  });

  it("never displays inspection fault codes or raw diagnostic authority", async () => {
    const fixture = fixtureV1({
      inspectionResult: Object.freeze({
        kind: "faulted",
        slotId: "quick",
        code: "secret.stack.and.storage.key",
        diagnostics: Object.freeze({
          ...inspectionDiagnosticsV1,
          codes: Object.freeze(["secret.digest"]),
        }),
      }),
      backupInspectionResult: Object.freeze({
        kind: "rejected",
        slotId: "quick",
        code: "invalid_backup",
      }),
    });
    renderFixtureV1(fixture);

    await screen.findByText("快速存档");
    const quick = await inspectQuickSlotV1();
    expect(await within(quick).findByText("兼容性检查失败")).toBeVisible();
    expect(within(quick).getByText("迁移前备份已损坏")).toBeVisible();
    expect(document.body).not.toHaveTextContent("secret.stack");
    expect(document.body).not.toHaveTextContent("secret.digest");
    expect(screen.queryByRole("button", { name: "恢复迁移前备份" })).toBeNull();
    expect(screen.queryByRole("button", { name: "导出迁移前备份" })).toBeNull();
    expect(within(quick).getByRole("button", { name: "丢弃迁移前备份" })).toBeEnabled();
  });

  it("offers rewrite actions only after the pending backup generation is resolved", async () => {
    const fixture = fixtureV1({
      inspectionResult: Object.freeze({
        kind: "migration_required",
        slotId: "quick",
        migration: Object.freeze({}) as never,
        warnings: Object.freeze([]),
        diagnostics: inspectionDiagnosticsV1,
      }),
      backupInspectionResult: Object.freeze({ kind: "available", slotId: "quick" }),
    });
    renderFixtureV1(fixture);

    const quick = await inspectQuickSlotV1();
    expect(await within(quick).findByText("需要升级存档格式")).toBeVisible();
    expect(within(quick).queryByRole("button", { name: "安全升级" })).toBeNull();
    expect(within(quick).getByRole("button", { name: "恢复迁移前备份" })).toBeEnabled();
    expect(within(quick).getByRole("button", { name: "导出迁移前备份" })).toBeEnabled();
    expect(within(quick).getByRole("button", { name: "丢弃迁移前备份" })).toBeEnabled();
  });

  it("ignores a late result from a finalized confirmation generation", async () => {
    const fixture = fixtureV1({
      backupInspectionResult: Object.freeze({ kind: "available", slotId: "quick" }),
    });
    const { requests } = renderCapturedFixtureV1(fixture);

    const quick = await inspectQuickSlotV1();
    const user = userEvent.setup();
    await user.click(within(quick).getByRole("button", { name: "恢复迁移前备份" }));
    const firstRequest = requests[0];
    if (firstRequest === undefined) throw new TypeError("missing first restore confirmation");
    let firstOutcome:
      | Awaited<ReturnType<typeof firstRequest.operationBinding.dispatch>>
      | undefined;
    await act(async () => {
      firstOutcome = await firstRequest.operationBinding.dispatch(firstRequest.invocation);
    });
    if (firstOutcome?.kind !== "retain_root") throw new TypeError("missing first restore result");
    const firstResult = firstOutcome.result;
    act(() => firstRequest.operationBinding.finalizeExactRoot());

    await waitFor(() => {
      expect(within(quick).getByRole("button", { name: "检查兼容性与备份" })).toBeEnabled();
    });
    await user.click(within(quick).getByRole("button", { name: "检查兼容性与备份" }));
    expect(await within(quick).findByText("迁移前备份可用")).toBeVisible();
    await user.click(within(quick).getByRole("button", { name: "丢弃迁移前备份" }));
    const secondRequest = requests[1];
    if (secondRequest === undefined) throw new TypeError("missing second discard confirmation");
    let secondOutcome:
      | Awaited<ReturnType<typeof secondRequest.operationBinding.dispatch>>
      | undefined;
    await act(async () => {
      secondOutcome = await secondRequest.operationBinding.dispatch(secondRequest.invocation);
    });
    if (secondOutcome?.kind !== "retain_root") throw new TypeError("missing second discard result");
    const secondResult = secondOutcome.result;
    expect(screen.getByTestId("save-operation-result")).toHaveTextContent(
      "正在丢弃快速存档备份…",
    );

    act(() => {
      firstRequest.operationBinding.resultSink(
        Object.freeze({ kind: "settled", result: firstResult }),
      );
    });
    expect(screen.getByTestId("save-operation-result")).toHaveTextContent(
      "正在丢弃快速存档备份…",
    );
    expect(screen.queryByText("迁移前备份已恢复", { exact: false })).toBeNull();

    act(() => {
      secondRequest.operationBinding.resultSink(
        Object.freeze({ kind: "settled", result: secondResult }),
      );
      secondRequest.operationBinding.finalizeExactRoot();
    });
    expect(screen.getByTestId("save-operation-result")).toHaveTextContent("迁移前备份已丢弃");
  });

  it("fences a confirmed recovery settlement and refresh after unmount", async () => {
    let resolveRestore!: (result: SaveBackupOperationResultV1) => void;
    const restoreResult = new Promise<SaveBackupOperationResultV1>((resolve) => {
      resolveRestore = resolve;
    });
    const fixture = fixtureV1({
      backupInspectionResult: Object.freeze({ kind: "available", slotId: "quick" }),
      backupResult: restoreResult,
    });
    const { requests, view } = renderCapturedFixtureV1(fixture);

    const quick = await inspectQuickSlotV1();
    await userEvent.setup().click(
      within(quick).getByRole("button", { name: "恢复迁移前备份" }),
    );
    const request = requests[0];
    if (request === undefined) throw new TypeError("missing restore confirmation");
    let dispatchPromise!: ReturnType<typeof request.operationBinding.dispatch>;
    act(() => {
      dispatchPromise = request.operationBinding.dispatch(request.invocation);
    });
    expect(screen.getByTestId("save-operation-result")).toHaveTextContent(
      "正在恢复快速存档备份…",
    );
    const statusReadsBeforeUnmount = fixture.getStatus.mock.calls.length;
    const slotReadsBeforeUnmount = fixture.listSlots.mock.calls.length;
    view.unmount();

    resolveRestore(Object.freeze({ kind: "restored", slotId: "quick" }));
    const outcome = await dispatchPromise;
    if (outcome.kind !== "retain_root") throw new TypeError("missing unmounted restore result");
    act(() => {
      request.operationBinding.resultSink(
        Object.freeze({ kind: "settled", result: outcome.result }),
      );
      request.operationBinding.finalizeExactRoot();
    });
    await Promise.resolve();

    expect(fixture.getStatus).toHaveBeenCalledTimes(statusReadsBeforeUnmount);
    expect(fixture.listSlots).toHaveBeenCalledTimes(slotReadsBeforeUnmount);
  });

  it("allows a fresh restore inspection and retry after a bounded failure", async () => {
    const fixture = fixtureV1({
      backupInspectionResult: Object.freeze({ kind: "available", slotId: "quick" }),
    });
    fixture.restoreBackup
      .mockRejectedValueOnce(new Error("private.restore.stack.storage.key"))
      .mockResolvedValueOnce(Object.freeze({ kind: "restored", slotId: "quick" }));
    renderFixtureV1(fixture);

    const quick = await inspectQuickSlotV1();
    const user = userEvent.setup();
    await user.click(within(quick).getByRole("button", { name: "恢复迁移前备份" }));
    expect(await screen.findByText("存档操作发生未预期错误")).toBeVisible();
    expect(document.body).not.toHaveTextContent("private.restore.stack");
    await waitFor(() => {
      expect(within(quick).queryByText("迁移前备份可用")).toBeNull();
      expect(within(quick).getByRole("button", { name: "检查兼容性与备份" })).toBeEnabled();
    });

    await user.click(within(quick).getByRole("button", { name: "检查兼容性与备份" }));
    expect(await within(quick).findByText("迁移前备份可用")).toBeVisible();
    await user.click(within(quick).getByRole("button", { name: "恢复迁移前备份" }));

    expect(await screen.findByText("迁移前备份已恢复，请确认后再读取")).toBeVisible();
    expect(fixture.inspectSave).toHaveBeenCalledTimes(2);
    expect(fixture.inspectBackup).toHaveBeenCalledTimes(2);
    expect(fixture.restoreBackup).toHaveBeenCalledTimes(2);
    expect(fixture.restoreBackup).toHaveBeenNthCalledWith(1, "quick");
    expect(fixture.restoreBackup).toHaveBeenNthCalledWith(2, "quick");
  });

  it.each(Object.entries(rewriteRejectionCopyV1))(
    "maps rewrite rejection %s without exposing its stable code",
    async (code, expectedText) => {
      await expectRecoveryRejectionV1(
        "rewrite",
        code as RewriteRejectionCodeV1,
        expectedText,
      );
    },
  );

  it.each(Object.entries(backupRejectionCopyV1))(
    "maps backup rejection %s without exposing its stable code",
    async (code, expectedText) => {
      await expectRecoveryRejectionV1(
        "backup",
        code as BackupRejectionCodeV1,
        expectedText,
      );
    },
  );

  it.each(Object.entries(backupExportRejectionCopyV1))(
    "maps backup export rejection %s without exposing its stable code",
    async (code, expectedText) => {
      await expectRecoveryRejectionV1(
        "backup_export",
        code as BackupExportRejectionCodeV1,
        expectedText,
      );
    },
  );

  it.each(
    [
      {
        name: "upgrade rejects a re-anchor success",
        operation: "upgrade",
        result: Object.freeze({ kind: "reanchored", slotId: "quick" }),
        forbiddenText: "兼容历史已重建",
      },
      {
        name: "upgrade rejects another slot",
        operation: "upgrade",
        result: Object.freeze({ kind: "upgraded", slotId: "manual.1", compatibility: "exact" }),
        forbiddenText: "存档已升级",
      },
      {
        name: "re-anchor rejects an upgrade success",
        operation: "reanchor",
        result: Object.freeze({ kind: "upgraded", slotId: "quick", compatibility: "exact" }),
        forbiddenText: "存档已升级",
      },
      {
        name: "re-anchor rejects another slot",
        operation: "reanchor",
        result: Object.freeze({ kind: "reanchored", slotId: "manual.1" }),
        forbiddenText: "兼容历史已重建",
      },
      {
        name: "restore rejects a discard success",
        operation: "restore",
        result: Object.freeze({ kind: "discarded", slotId: "quick" }),
        forbiddenText: "迁移前备份已丢弃",
      },
      {
        name: "restore rejects another slot",
        operation: "restore",
        result: Object.freeze({ kind: "restored", slotId: "manual.1" }),
        forbiddenText: "迁移前备份已恢复",
      },
      {
        name: "discard rejects a restore success",
        operation: "discard",
        result: Object.freeze({ kind: "restored", slotId: "quick" }),
        forbiddenText: "迁移前备份已恢复",
      },
      {
        name: "discard rejects another slot",
        operation: "discard",
        result: Object.freeze({ kind: "discarded", slotId: "manual.1" }),
        forbiddenText: "迁移前备份已丢弃",
      },
      {
        name: "backup export rejects another slot",
        operation: "backup_export",
        result: Object.freeze({ kind: "exported", slotId: "manual.1" }),
        forbiddenText: "迁移前备份已导出",
      },
    ] as const,
  )("fails closed when $name", async ({ operation, result, forbiddenText }) => {
    const rewriteOperation = operation === "upgrade" || operation === "reanchor";
    const backupOperation = operation === "restore" || operation === "discard" ||
      operation === "backup_export";
    const fixture = fixtureV1({
      inspectionResult: operation === "upgrade"
        ? acceptedInspectionResultV1("migration_required")
        : operation === "reanchor"
        ? inspectOnlyResultV1("reanchor_required")
        : acceptedInspectionResultV1("direct"),
      ...(backupOperation
        ? {
          backupInspectionResult: Object.freeze({
            kind: "available" as const,
            slotId: "quick" as const,
          }),
        }
        : {}),
      ...(rewriteOperation ? { rewriteResult: result as SaveRewriteOperationResultV1 } : {}),
      ...(operation === "restore" || operation === "discard"
        ? { backupResult: result as SaveBackupOperationResultV1 }
        : {}),
      ...(operation === "backup_export"
        ? { backupExportResult: result as SaveUiBackupExportResultV1 }
        : {}),
    });
    renderFixtureV1(fixture);
    const quick = await inspectQuickSlotV1();
    const actionName = operation === "upgrade"
      ? labelsV1.recovery.action.upgrade
      : operation === "reanchor"
      ? labelsV1.recovery.action.reanchor
      : operation === "restore"
      ? labelsV1.recovery.action.restore
      : operation === "discard"
      ? labelsV1.recovery.action.discard
      : labelsV1.recovery.action.exportBackup;

    await userEvent.setup().click(within(quick).getByRole("button", { name: actionName }));

    expect(await screen.findByText("恢复操作失败，请重试")).toBeVisible();
    expect(screen.queryByText(forbiddenText, { exact: false })).toBeNull();
    switch (operation) {
      case "upgrade":
        expect(fixture.upgradeSave).toHaveBeenCalledExactlyOnceWith("quick");
        break;
      case "reanchor":
        expect(fixture.reanchorSave).toHaveBeenCalledExactlyOnceWith("quick");
        break;
      case "restore":
        expect(fixture.restoreBackup).toHaveBeenCalledExactlyOnceWith("quick");
        break;
      case "discard":
        expect(fixture.discardBackup).toHaveBeenCalledExactlyOnceWith("quick");
        break;
      case "backup_export":
        expect(fixture.exportBackup).toHaveBeenCalledExactlyOnceWith("quick");
        break;
    }
  });
});
