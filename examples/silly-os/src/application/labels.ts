// SPDX-License-Identifier: MIT
// 系统外壳文案（中英双语）：根标签。游戏内文本走
// presentation.ts 的 textId 目录；这里是引擎默认表面的标签数据。
import type { DefaultGameRootLabelsV1 } from "@sillymaker/ui";

export const osRootLabelsZhV1: Partial<DefaultGameRootLabelsV1> = Object.freeze({
  systemMenuLabel: "系统",
  saveLabel: "保存",
  settingsLabel: "设置",
  settingsTitle: "设置",
  settingsEmptyText: "暂无可配置项。",
  titleNewGameLabel: "启动 SillyOS 98",
  titleContinueLabel: "继续上次会话",
  titleLoadGameLabel: "载入存档",
});

export const osRootLabelsEnV1: Partial<DefaultGameRootLabelsV1> = Object.freeze({
  systemMenuLabel: "System",
  saveLabel: "Save",
  settingsLabel: "Settings",
  settingsTitle: "Settings",
  settingsEmptyText: "Nothing to configure yet.",
  titleNewGameLabel: "Start SillyOS 98",
  titleContinueLabel: "Resume last session",
  titleLoadGameLabel: "Load save",
});
