// SPDX-License-Identifier: MIT
import type { CoreGameApplicationInstanceV1 } from "@sillymaker/base/runtime";
import { defineCoreGameApplication } from "@sillymaker/base/story";

import type {
  OsActionDescriptorV1,
  OsActionResultV1,
  OsInvocationV1,
  OsPreviewV1,
} from "./semantic.ts";
import { osSemanticAdapterV1 } from "./semantic.ts";
import type {
  OsGameViewV1,
  OsNarrativeViewV1,
  OsQueriesV1,
  OsSimulationTypesV1,
} from "../simulation.ts";
import { osStoryEntryV1 } from "../story.ts";

/** Host 中立核心应用：桌面模拟无回退需求（扫雷回退=作弊），不配 rollback。 */
export const osCoreApplicationDefinitionV1 = defineCoreGameApplication<
  unknown,
  unknown,
  OsSimulationTypesV1,
  OsQueriesV1,
  OsGameViewV1,
  OsNarrativeViewV1,
  OsActionDescriptorV1,
  OsInvocationV1,
  OsPreviewV1,
  OsActionResultV1
>({
  entry: osStoryEntryV1,
  semantic: osSemanticAdapterV1,
  exportFilename: "silly-os-save.json",
  // 开机恢复上次关机状态（电脑语义；对玩家不暴露存档规则）。
  resumeFromAutosave: true,
});

export type OsApplicationInstanceV1 = CoreGameApplicationInstanceV1<
  OsSimulationTypesV1,
  OsGameViewV1,
  OsNarrativeViewV1,
  OsActionDescriptorV1,
  OsInvocationV1,
  OsPreviewV1,
  OsActionResultV1
>;
