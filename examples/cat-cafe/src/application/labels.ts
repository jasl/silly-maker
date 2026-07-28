// SPDX-License-Identifier: MIT
// 系统外壳文案（中英双语）：根标签、存档对话框文案、存档安全点提示与
// locale 选择器。游戏内文本走 presentation.ts 的 textId 目录；这里是
// 引擎默认表面（系统菜单/存档/设置）的标签数据。
import type { DeepReadonly } from "@sillymaker/base";
import type { DefaultGameRootLabelsV1, SaveOverlayLabelsV1 } from "@sillymaker/ui";

import type { CatcafeUiPublicationV1 } from "./ui-kit.ts";

export const catcafeRootLabelsV1: Partial<DefaultGameRootLabelsV1> = Object.freeze({
  systemMenuLabel: "系统",
  saveLabel: "保存",
  settingsLabel: "设置",
  settingsTitle: "设置",
  settingsEmptyText: "暂无可配置项。",
  settingsBgmVolumeLabel: "音乐音量",
  settingsVoiceVolumeLabel: "语音音量",
  settingsSfxVolumeLabel: "音效音量",
  settingsMutedLabel: "静音",
  settingsTextSpeedLabel: "文字速度",
  settingsAutoWaitLabel: "自动播放停留",
  settingsFullscreenLabel: "切换全屏",
  settingsDeveloperToolsLabel: "开发者工具",
  titleNewGameLabel: "新游戏",
  titleContinueLabel: "继续",
  titleLoadGameLabel: "载入存档",
  closeLabel: "关闭",
});

const catcafeRootLabelsEnV1: Partial<DefaultGameRootLabelsV1> = Object.freeze({
  systemMenuLabel: "System",
  saveLabel: "Save",
  settingsLabel: "Settings",
  settingsTitle: "Settings",
  settingsEmptyText: "No settings available yet.",
  settingsBgmVolumeLabel: "Music volume",
  settingsVoiceVolumeLabel: "Voice volume",
  settingsSfxVolumeLabel: "Effects volume",
  settingsMutedLabel: "Mute",
  settingsTextSpeedLabel: "Text speed",
  settingsAutoWaitLabel: "Auto-forward wait",
  settingsFullscreenLabel: "Toggle fullscreen",
  settingsDeveloperToolsLabel: "Developer tools",
  titleNewGameLabel: "New game",
  titleContinueLabel: "Continue",
  titleLoadGameLabel: "Load game",
  closeLabel: "Close",
});

/**
 * 存档安全点：权威快照始终原子一致（技术上任何提交点都能存），这里表达
 * 的是游戏设计边界——对话推进中与运动会回合中不做手动存档，避免读回
 * 断在演出中间的档。自动/快速存档机制不受影响。
 */
export function catcafeSaveGuardForLocaleV1(
  locale: string | null,
): (publication: unknown) => { allowed: boolean; reasonText?: string } {
  const zh = locale !== "en";
  return (publication) => {
    const semantic = (publication as DeepReadonly<CatcafeUiPublicationV1>).semantic;
    if (semantic.narrative.pending !== null) {
      return Object.freeze({
        allowed: false,
        reasonText: zh
          ? "对话进行中——推进到日常画面后即可存档。"
          : "Dialogue in progress — advance to daily play to save.",
      });
    }
    if (semantic.game.contest !== null) {
      return Object.freeze({
        allowed: false,
        reasonText: zh
          ? "运动会回合中——比赛结束后即可存档。"
          : "Contest round in progress — finish the match to save.",
      });
    }
    return Object.freeze({ allowed: true });
  };
}

/** 系统 chrome（保存/设置对话框）按启动时的语言偏好选择；重载后生效。 */
export function catcafeChromeForLocaleV1(locale: string | null): {
  readonly labels: Partial<DefaultGameRootLabelsV1>;
  readonly saveLabels: SaveOverlayLabelsV1;
} {
  return locale === "en"
    ? Object.freeze({ labels: catcafeRootLabelsEnV1, saveLabels: catcafeSaveOverlayLabelsEnV1 })
    : Object.freeze({ labels: catcafeRootLabelsV1, saveLabels: catcafeSaveOverlayLabelsV1 });
}

export const catcafeSaveOverlayLabelsV1: SaveOverlayLabelsV1 = Object.freeze({
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
  slotNames: Object.freeze({
    "auto.current": "当前自动存档",
    "auto.previous": "上一自动存档",
    quick: "快速存档",
    manual: "手动存档",
  }),
  slotHealth: Object.freeze({
    empty: "空",
    valid: "可用",
    invalid: "已损坏",
    recovery_candidate: "可恢复",
    unavailable: "不可用",
  }),
  quickSave: "快速保存",
  manualSave: "手动保存",
  importSave: "导入存档",
  exportCurrentSave: "导出当前进度",
  loadSlot: (slotName: string) => `载入${slotName}`,
  clearSlot: (slotName: string) => `清除${slotName}`,
  exportSlot: (slotName: string) => `导出${slotName}`,
  confirmation: Object.freeze({
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
  }),
  operation: Object.freeze({
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
    importFileRejected: Object.freeze({
      too_large: "所选存档文件过大",
      unsupported_type: "所选文件类型不受支持",
    }),
    exported: (slotName: string) => `已导出${slotName}`,
    exportedCurrent: "已导出当前进度",
    rejected: Object.freeze({
      busy: "会话正忙",
      unavailable: "存储不可用",
      empty_slot: "存档槽为空",
      conflict: "存档发生冲突",
      invalid_record: "存档无效",
      lineage_limit: "存档兼容链过长",
      incompatible: "存档不兼容",
    }),
    exportRejected: Object.freeze({
      unavailable: "存储不可用",
      empty_slot: "存档槽为空",
      conflict: "存档发生冲突",
      invalid_record: "存档无效",
    }),
    faulted: (code: string) => `存档故障：${code}`,
    unexpectedFailure: "存档操作意外失败",
  }),
});

const catcafeSaveOverlayLabelsEnV1: SaveOverlayLabelsV1 = Object.freeze({
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
  slotNames: Object.freeze({
    "auto.current": "Current autosave",
    "auto.previous": "Previous autosave",
    quick: "Quicksave",
    manual: "Manual save",
  }),
  slotHealth: Object.freeze({
    empty: "Empty",
    valid: "Available",
    invalid: "Corrupted",
    recovery_candidate: "Recoverable",
    unavailable: "Unavailable",
  }),
  quickSave: "Quicksave",
  manualSave: "Manual save",
  importSave: "Import save",
  exportCurrentSave: "Export current progress",
  loadSlot: (slotName: string) => `Load ${slotName}`,
  clearSlot: (slotName: string) => `Clear ${slotName}`,
  exportSlot: (slotName: string) => `Export ${slotName}`,
  confirmation: Object.freeze({
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
  }),
  operation: Object.freeze({
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
    importFileRejected: Object.freeze({
      too_large: "The selected save file is too large",
      unsupported_type: "The selected file type is unsupported",
    }),
    exported: (slotName: string) => `Exported ${slotName}`,
    exportedCurrent: "Exported current progress",
    rejected: Object.freeze({
      busy: "The session is busy",
      unavailable: "Storage unavailable",
      empty_slot: "The save slot is empty",
      conflict: "The save conflicted",
      invalid_record: "The save is invalid",
      lineage_limit: "The save compatibility chain is too long",
      incompatible: "The save is incompatible",
    }),
    exportRejected: Object.freeze({
      unavailable: "Storage unavailable",
      empty_slot: "The save slot is empty",
      conflict: "The save conflicted",
      invalid_record: "The save is invalid",
    }),
    faulted: (code: string) => `Save fault: ${code}`,
    unexpectedFailure: "The save operation failed unexpectedly",
  }),
});
