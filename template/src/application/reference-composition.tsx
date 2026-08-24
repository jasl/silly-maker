// SPDX-License-Identifier: MIT
import { createReferencePlayerOuterUiV1 } from "@sillymaker/web/reference";
import type { DefaultSettingsLabelsV1 } from "@sillymaker/ui/reference/settings";

import { createTemplateGameApplicationWithOuterUiV1 } from "./composition.tsx";

const templateReferenceSettingsLabelsV1: Partial<DefaultSettingsLabelsV1> = Object.freeze({
  bgmVolumeLabel: "音乐音量",
  voiceVolumeLabel: "语音音量",
  sfxVolumeLabel: "音效音量",
  mutedLabel: "静音",
  textSpeedLabel: "文字速度",
  autoWaitLabel: "自动播放停留",
  fullscreenLabel: "切换全屏",
  developerToolsLabel: "开发者工具",
});

/** Explicit full/reference Player; the default Template entry remains minimal. */
export const templateReferenceGameApplicationV1 = createTemplateGameApplicationWithOuterUiV1((
  input,
) =>
  createReferencePlayerOuterUiV1({
    instance: input.instance,
    capabilities: input.capabilities,
    playerProfile: input.playerProfile,
    presentationFreeze: input.presentationFreeze,
    presentationRate: input.presentationRate,
    settingsLabels: templateReferenceSettingsLabelsV1,
  })
);
