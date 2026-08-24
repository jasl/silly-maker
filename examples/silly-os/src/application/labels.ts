// SPDX-License-Identifier: MIT
// System chrome copy (bilingual): root labels. In-game text goes through the
// textId catalog in presentation.ts; this is label data for the engine's default surfaces.
import type { DefaultGameRootLabelsV1 } from "@sillymaker/ui";

export const osRootLabelsZhV1: Partial<DefaultGameRootLabelsV1> = {
  systemMenuLabel: "系统",
  saveLabel: "保存",
  settingsLabel: "设置",
  settingsTitle: "设置",
  settingsEmptyText: "暂无可配置项。",
  titleNewGameLabel: "启动 SillyOS 98",
  titleContinueLabel: "继续上次会话",
  titleLoadGameLabel: "载入存档",
};

export const osRootLabelsEnV1: Partial<DefaultGameRootLabelsV1> = {
  systemMenuLabel: "System",
  saveLabel: "Save",
  settingsLabel: "Settings",
  settingsTitle: "Settings",
  settingsEmptyText: "Nothing to configure yet.",
  titleNewGameLabel: "Start SillyOS 98",
  titleContinueLabel: "Resume last session",
  titleLoadGameLabel: "Load save",
};
