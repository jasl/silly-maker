// SPDX-License-Identifier: MIT
// System chrome copy (bilingual): root labels, save-dialog copy, save-safepoint
// notices, and the locale selector. In-game text goes through the textId catalog
// in presentation.ts; this file is label data for the engine's default surfaces (system menu/saves/settings).
import type { DeepReadonly } from "@sillymaker/base";
import type { DefaultGameRootLabelsV1, SaveOverlayLabelsV1 } from "@sillymaker/ui";
import type { DefaultSettingsLabelsV1 } from "@sillymaker/ui/reference/settings";

import type { CatcafeUiPublicationV1 } from "./ui-kit.ts";

export const catcafeRootLabelsV1: Partial<DefaultGameRootLabelsV1> = {
  systemMenuLabel: "系统",
  saveLabel: "保存",
  settingsLabel: "设置",
  settingsTitle: "设置",
  settingsEmptyText: "暂无可配置项。",
  settingsMutedLabel: "静音",
  titleNewGameLabel: "新游戏",
  titleContinueLabel: "继续",
  titleLoadGameLabel: "载入存档",
  closeLabel: "关闭",
};

const catcafeRootLabelsEnV1: Partial<DefaultGameRootLabelsV1> = {
  systemMenuLabel: "System",
  saveLabel: "Save",
  settingsLabel: "Settings",
  settingsTitle: "Settings",
  settingsEmptyText: "No settings available yet.",
  settingsMutedLabel: "Mute",
  titleNewGameLabel: "New game",
  titleContinueLabel: "Continue",
  titleLoadGameLabel: "Load game",
  closeLabel: "Close",
};

export const catcafeReferenceSettingsLabelsV1: DefaultSettingsLabelsV1 = {
  bgmVolumeLabel: "音乐音量",
  voiceVolumeLabel: "语音音量",
  sfxVolumeLabel: "音效音量",
  mutedLabel: "静音",
  textSpeedLabel: "文字速度",
  autoWaitLabel: "自动播放停留",
  fullscreenLabel: "切换全屏",
  developerToolsLabel: "开发者工具",
};

const catcafeReferenceSettingsLabelsEnV1: DefaultSettingsLabelsV1 = {
  bgmVolumeLabel: "Music volume",
  voiceVolumeLabel: "Voice volume",
  sfxVolumeLabel: "Effects volume",
  mutedLabel: "Mute",
  textSpeedLabel: "Text speed",
  autoWaitLabel: "Auto-forward wait",
  fullscreenLabel: "Toggle fullscreen",
  developerToolsLabel: "Developer tools",
};

/**
 * Save safepoints: authoritative snapshots are always atomically consistent (any
 * commit point is technically saveable); this expresses a game-design boundary —
 * no manual saves mid-dialogue or mid-contest, to avoid loading back into the middle of a performance. Auto/quick saves are unaffected.
 */
export function catcafeSaveGuardForLocaleV1(
  locale: string | null,
): (publication: unknown) => { allowed: boolean; reasonText?: string } {
  const zh = locale !== "en";
  return (publication) => {
    const semantic = (publication as DeepReadonly<CatcafeUiPublicationV1>).semantic;
    if (semantic.narrative.pending !== null) {
      return ({
        allowed: false,
        reasonText: zh
          ? "对话进行中——推进到日常画面后即可存档。"
          : "Dialogue in progress — advance to daily play to save.",
      });
    }
    if (semantic.game.contest !== null) {
      return ({
        allowed: false,
        reasonText: zh
          ? "运动会回合中——比赛结束后即可存档。"
          : "Contest round in progress — finish the match to save.",
      });
    }
    return ({ allowed: true });
  };
}

/** System chrome (save/settings dialogs) picks the boot-time locale preference; takes effect after reload. */
export function catcafeChromeForLocaleV1(locale: string | null): {
  readonly labels: Partial<DefaultGameRootLabelsV1>;
  readonly settingsLabels: DefaultSettingsLabelsV1;
  readonly saveLabels: SaveOverlayLabelsV1;
} {
  return locale === "en"
    ? ({
      labels: catcafeRootLabelsEnV1,
      settingsLabels: catcafeReferenceSettingsLabelsEnV1,
      saveLabels: catcafeSaveOverlayLabelsEnV1,
    })
    : ({
      labels: catcafeRootLabelsV1,
      settingsLabels: catcafeReferenceSettingsLabelsV1,
      saveLabels: catcafeSaveOverlayLabelsV1,
    });
}

export const catcafeSaveOverlayLabelsV1: SaveOverlayLabelsV1 = {
  accessibleName: "保存",
  title: "保存",
  savedAtText: (isoInstant: string) => new Date(isoInstant).toLocaleString("zh-CN"),
  storageLoading: "正在读取本地存档…",
  storageReady: "本地存档可用",
  storageBusy: "存档操作进行中",
  storageUnavailable: "本地存储不可用",
  slotsUnavailable: "无法读取存档槽",
  safelySaved: (commandSequence: number) => `已安全保存至指令 ${String(commandSequence)}`,
  lastFailure: (code: string) => `上次存档失败：${code}`,
  slotNames: {
    "auto.current": "当前自动存档",
    "auto.previous": "上一自动存档",
    quick: "快速存档",
    manualSlot: (index: number) => `手动存档 ${index}`,
  },
  slotHealth: {
    empty: "空",
    valid: "可用",
    invalid: "已损坏",
    recovery_candidate: "可恢复",
    unavailable: "不可用",
  },
  quickSave: "快速保存",
  manualSave: "手动保存",
  importSave: "导入存档",
  exportCurrentSave: "导出当前进度",
  loadSlot: (slotName: string) => `载入${slotName}`,
  clearSlot: (slotName: string) => `清除${slotName}`,
  exportSlot: (slotName: string) => `导出${slotName}`,
  confirmation: {
    loadTitle: (slotName: string) => `载入${slotName}`,
    loadDescription: (slotName: string) => `当前进度将被${slotName}替换。`,
    clearTitle: (slotName: string) => `清除${slotName}`,
    clearDescription: (slotName: string) => `${slotName}将被永久清除。`,
    importTitle: "导入存档",
    importDescription: "当前进度将被所选存档替换。",
    confirmLabel: "确认",
    cancelLabel: "取消",
    pendingText: "正在处理…",
    completedText: "操作完成",
    failedText: "操作失败",
  },
  operation: {
    saving: (slotName: string) => `正在保存到${slotName}…`,
    loading: (slotName: string) => `正在载入${slotName}…`,
    clearing: (slotName: string) => `正在清除${slotName}…`,
    importing: "正在导入存档…",
    exporting: (slotName: string) => `正在导出${slotName}…`,
    exportingCurrent: "正在导出当前进度…",
    saved: (slotName: string) => `已保存到${slotName}`,
    cleared: (slotName: string) => `已清除${slotName}`,
    loadedExact: "已载入存档",
    loadedAdopted: "已兼容载入存档",
    importedExact: "已导入存档",
    importedAdopted: "已兼容导入存档",
    importCancelled: "已取消导入存档",
    importFileRejected: {
      too_large: "所选存档文件过大",
      unsupported_type: "所选文件类型不受支持",
    },
    exported: (slotName: string) => `已导出${slotName}`,
    exportedCurrent: "已导出当前进度",
    rejected: {
      busy: "会话正忙",
      unavailable: "存储不可用",
      empty_slot: "存档槽为空",
      conflict: "存档发生冲突",
      in_flight: "正在过场，暂不可保存",
      invalid_record: "存档无效",
      invalid_note: "备注不合法",
      lineage_limit: "存档兼容链过长",
      migration_unavailable: "当前版本尚未提供此存档所需的迁移",
      migration_rejected: "存档迁移失败",
      incompatible: "存档不兼容",
    },
    exportRejected: {
      unavailable: "存储不可用",
      empty_slot: "存档槽为空",
      conflict: "存档发生冲突",
      invalid_record: "存档无效",
    },
    faulted: (code: string) => `存档故障：${code}`,
    unexpectedFailure: "存档操作意外失败",
  },
  recovery: {
    checking: "正在检查存档兼容性…",
    confirmation: {
      reanchorTitle: (slotName: string) => `重建${slotName}兼容基线`,
      reanchorDescription: (slotName: string) =>
        `${slotName}将以当前版本重建兼容基线，并保留可恢复备份。`,
      restoreTitle: (slotName: string) => `恢复${slotName}备份`,
      restoreDescription: (slotName: string) => `${slotName}将被升级前备份替换。`,
      discardTitle: (slotName: string) => `丢弃${slotName}备份`,
      discardDescription: (slotName: string) => `${slotName}的升级前备份将被永久删除。`,
    },
    disposition: {
      direct: "可直接载入",
      migration_required: "需要升级存档数据",
      adoption_required: "需要应用兼容更新",
      migration_and_adoption_required: "需要升级存档数据并应用兼容更新",
      migration_unavailable: "当前版本尚未提供所需迁移",
      migration_rejected: "存档迁移未通过安全检查",
      incompatible: "存档与当前版本不兼容",
      reanchor_required: "兼容历史已达上限，需要重建基线",
      invalid_record: "无法安全检查此存档",
      unavailable: "暂时无法检查此存档",
      faulted: "存档兼容性检查失败",
    },
    backup: {
      available: "升级前备份可用",
      invalid: "升级前备份已损坏",
      unavailable: "暂时无法检查升级前备份",
    },
    action: {
      inspect: "检查兼容性与备份",
      upgrade: "安全升级",
      reanchor: "重建兼容基线",
      restore: "恢复升级前备份",
      exportBackup: "导出升级前备份",
      discard: "丢弃升级前备份",
    },
    operation: {
      upgrading: (slotName: string) => `正在升级${slotName}…`,
      reanchoring: (slotName: string) => `正在重建${slotName}兼容基线…`,
      restoring: (slotName: string) => `正在恢复${slotName}备份…`,
      exportingBackup: (slotName: string) => `正在导出${slotName}备份…`,
      discarding: (slotName: string) => `正在丢弃${slotName}备份…`,
      upgradedExact: "存档已升级",
      upgradedAdopted: "存档已升级并应用兼容更新",
      reanchored: "兼容基线已重建",
      restored: "升级前备份已恢复；请载入该存档槽以继续",
      backupExported: "升级前备份已导出",
      discarded: "升级前备份已丢弃",
      rejected: {
        busy: "恢复操作正在进行，请稍后重试",
        unavailable: "本地存储暂时不可用",
        empty_slot: "该槽位没有可升级的存档",
        backup_pending: "请先导出、恢复或丢弃现有升级前备份",
        conflict: "存档已被其他页面更新，请重新检查",
        invalid_record: "存档记录无效，无法执行此操作",
        migration_unavailable: "当前版本尚未提供所需迁移",
        migration_rejected: "存档迁移未通过安全检查",
        incompatible: "该存档与当前版本不兼容",
        reanchor_required: "需要先重建兼容基线",
        not_required: "该存档无需执行此操作",
        empty_backup: "该槽位没有升级前备份",
        invalid_backup: "升级前备份已损坏",
      },
      faulted: "恢复操作失败，请重试",
    },
  },
};

const catcafeSaveOverlayLabelsEnV1: SaveOverlayLabelsV1 = {
  accessibleName: "Save",
  title: "Save",
  savedAtText: (isoInstant: string) => new Date(isoInstant).toLocaleString("en-US"),
  storageLoading: "Reading local saves…",
  storageReady: "Local saves available",
  storageBusy: "Save operation in progress",
  storageUnavailable: "Local storage unavailable",
  slotsUnavailable: "Cannot read save slots",
  safelySaved: (commandSequence: number) =>
    `Safely saved through command ${String(commandSequence)}`,
  lastFailure: (code: string) => `Last save failed: ${code}`,
  slotNames: {
    "auto.current": "Current autosave",
    "auto.previous": "Previous autosave",
    quick: "Quicksave",
    manualSlot: (index: number) => `Manual save ${index}`,
  },
  slotHealth: {
    empty: "Empty",
    valid: "Available",
    invalid: "Corrupted",
    recovery_candidate: "Recoverable",
    unavailable: "Unavailable",
  },
  quickSave: "Quicksave",
  manualSave: "Manual save",
  importSave: "Import save",
  exportCurrentSave: "Export current progress",
  loadSlot: (slotName: string) => `Load ${slotName}`,
  clearSlot: (slotName: string) => `Clear ${slotName}`,
  exportSlot: (slotName: string) => `Export ${slotName}`,
  confirmation: {
    loadTitle: (slotName: string) => `Load ${slotName}`,
    loadDescription: (slotName: string) => `Current progress will be replaced by ${slotName}.`,
    clearTitle: (slotName: string) => `Clear ${slotName}`,
    clearDescription: (slotName: string) => `${slotName} will be cleared permanently.`,
    importTitle: "Import save",
    importDescription: "Current progress will be replaced by the selected save.",
    confirmLabel: "Confirm",
    cancelLabel: "Cancel",
    pendingText: "Working…",
    completedText: "Done",
    failedText: "Operation failed",
  },
  operation: {
    saving: (slotName: string) => `Saving to ${slotName}…`,
    loading: (slotName: string) => `Loading ${slotName}…`,
    clearing: (slotName: string) => `Clearing ${slotName}…`,
    importing: "Importing save…",
    exporting: (slotName: string) => `Exporting ${slotName}…`,
    exportingCurrent: "Exporting current progress…",
    saved: (slotName: string) => `Saved to ${slotName}`,
    cleared: (slotName: string) => `Cleared ${slotName}`,
    loadedExact: "Save loaded",
    loadedAdopted: "Save loaded with adaptation",
    importedExact: "Save imported",
    importedAdopted: "Save imported with adaptation",
    importCancelled: "Import cancelled",
    importFileRejected: {
      too_large: "The selected save file is too large",
      unsupported_type: "The selected file type is unsupported",
    },
    exported: (slotName: string) => `Exported ${slotName}`,
    exportedCurrent: "Exported current progress",
    rejected: {
      busy: "The session is busy",
      unavailable: "Storage unavailable",
      empty_slot: "The save slot is empty",
      conflict: "The save conflicted",
      in_flight: "The game is mid-transition",
      invalid_record: "The save is invalid",
      invalid_note: "The note is not valid",
      lineage_limit: "The save compatibility chain is too long",
      migration_unavailable: "This version cannot migrate that save yet",
      migration_rejected: "The save migration failed",
      incompatible: "The save is incompatible",
    },
    exportRejected: {
      unavailable: "Storage unavailable",
      empty_slot: "The save slot is empty",
      conflict: "The save conflicted",
      invalid_record: "The save is invalid",
    },
    faulted: (code: string) => `Save fault: ${code}`,
    unexpectedFailure: "The save operation failed unexpectedly",
  },
  recovery: {
    checking: "Checking save compatibility…",
    confirmation: {
      reanchorTitle: (slotName: string) => `Rebuild ${slotName} compatibility baseline`,
      reanchorDescription: (slotName: string) =>
        `${slotName} will be rewritten for this version with a recoverable backup.`,
      restoreTitle: (slotName: string) => `Restore ${slotName} backup`,
      restoreDescription: (slotName: string) =>
        `${slotName} will be replaced by its pre-upgrade backup.`,
      discardTitle: (slotName: string) => `Discard ${slotName} backup`,
      discardDescription: (slotName: string) =>
        `${slotName}'s pre-upgrade backup will be deleted permanently.`,
    },
    disposition: {
      direct: "Ready to load",
      migration_required: "Save data upgrade required",
      adoption_required: "Compatibility update required",
      migration_and_adoption_required: "Save data upgrade and compatibility update required",
      migration_unavailable: "This version cannot migrate the save yet",
      migration_rejected: "The save did not pass migration safety checks",
      incompatible: "The save is incompatible with this version",
      reanchor_required: "The compatibility history is full and needs a new baseline",
      invalid_record: "This save cannot be checked safely",
      unavailable: "This save cannot be checked right now",
      faulted: "Save compatibility check failed",
    },
    backup: {
      available: "Pre-upgrade backup available",
      invalid: "Pre-upgrade backup is corrupted",
      unavailable: "Pre-upgrade backup cannot be checked right now",
    },
    action: {
      inspect: "Check compatibility and backup",
      upgrade: "Upgrade safely",
      reanchor: "Rebuild compatibility baseline",
      restore: "Restore pre-upgrade backup",
      exportBackup: "Export pre-upgrade backup",
      discard: "Discard pre-upgrade backup",
    },
    operation: {
      upgrading: (slotName: string) => `Upgrading ${slotName}…`,
      reanchoring: (slotName: string) => `Rebuilding ${slotName} compatibility baseline…`,
      restoring: (slotName: string) => `Restoring ${slotName} backup…`,
      exportingBackup: (slotName: string) => `Exporting ${slotName} backup…`,
      discarding: (slotName: string) => `Discarding ${slotName} backup…`,
      upgradedExact: "Save upgraded",
      upgradedAdopted: "Save upgraded with its compatibility update",
      reanchored: "Compatibility baseline rebuilt",
      restored: "Pre-upgrade backup restored; load the slot to continue",
      backupExported: "Pre-upgrade backup exported",
      discarded: "Pre-upgrade backup discarded",
      rejected: {
        busy: "A recovery action is already running. Try again shortly",
        unavailable: "Local storage is unavailable right now",
        empty_slot: "This slot has no save to upgrade",
        backup_pending: "Export, restore, or discard the existing pre-upgrade backup first",
        conflict: "The save changed in another page. Check it again",
        invalid_record: "The save record is invalid and cannot be changed safely",
        migration_unavailable: "This version cannot migrate the save yet",
        migration_rejected: "The save did not pass migration safety checks",
        incompatible: "The save is incompatible with this version",
        reanchor_required: "Rebuild the compatibility baseline first",
        not_required: "This save does not need that action",
        empty_backup: "This slot has no pre-upgrade backup",
        invalid_backup: "The pre-upgrade backup is corrupted",
      },
      faulted: "Recovery failed. Please try again",
    },
  },
};
