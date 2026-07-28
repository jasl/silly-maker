// SPDX-License-Identifier: MIT
import type { ResolvedAssetManifestV1 } from "@sillymaker/base";
import type { CoreGameApplicationInstanceV1 } from "@sillymaker/base/runtime";
import { defineCoreGameApplication } from "@sillymaker/base/story";

import type {
  CatcafeActionDescriptorV1,
  CatcafeActionResultV1,
  CatcafeInvocationV1,
  CatcafePreviewV1,
} from "./semantic.ts";
import { catcafeSemanticAdapterV1 } from "./semantic.ts";
import type {
  CatcafeGameViewV1,
  CatcafeNarrativeViewV1,
  CatcafeQueriesV1,
  CatcafeSimulationTypesV1,
} from "../simulation.ts";
import { catcafeStoryEntryV1 } from "../story.ts";

/**
 * The Host-neutral core application: the GamePackage entry plus the
 * semantic adapter. Session, persistence, diagnostics, and lifecycle come
 * from the Base composer; this module never touches React or the DOM, so
 * headless simulation and the browser boot share it.
 */
export const catcafeCoreApplicationDefinitionV1 = defineCoreGameApplication<
  unknown,
  unknown,
  CatcafeSimulationTypesV1,
  CatcafeQueriesV1,
  CatcafeGameViewV1,
  CatcafeNarrativeViewV1,
  CatcafeActionDescriptorV1,
  CatcafeInvocationV1,
  CatcafePreviewV1,
  CatcafeActionResultV1
>({
  entry: catcafeStoryEntryV1,
  semantic: catcafeSemanticAdapterV1,
  exportFilename: "catcafe-save.json",
  // 开机续档：标题屏"继续上次会话"由此成为真话——刷新后自动恢复
  // 自动存档，玩家不必手动"载入存档"。
  resumeFromAutosave: true,
  // 玩家回滚（R7）：运动会开赛与结局确认是硬边界——比赛不能"回到开赛
  // 之前"重排（防重掷：RNG 随快照，回退重试同一结果），确认过的结局
  // 不可撤销。其余提交都是普通检查点。
  rollback: {
    capacity: 24,
    classify: (command) =>
      command.kind === "cc.enter_contest" || command.kind === "cc.enter_postgame"
        ? "barrier"
        : "checkpoint",
  },
  // The resolved asset manifest rides the extensions surface so the web UI
  // can build its asset registry; extensions observe, never own.
  createExtensions: (context) => ({
    extensions: Object.freeze({
      assets: (context.resolved as { readonly assets: ResolvedAssetManifestV1 }).assets,
    }),
  }),
});

export interface CatcafeExtensionsV1 {
  readonly assets: ResolvedAssetManifestV1;
}

export type CatcafeApplicationInstanceV1 = CoreGameApplicationInstanceV1<
  CatcafeSimulationTypesV1,
  CatcafeGameViewV1,
  CatcafeNarrativeViewV1,
  CatcafeActionDescriptorV1,
  CatcafeInvocationV1,
  CatcafePreviewV1,
  CatcafeActionResultV1
>;
