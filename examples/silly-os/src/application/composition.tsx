// SPDX-License-Identifier: MIT
// 组合层：把桌面 shell、应用注册表、设置与外壳文案组装成可启动应用。
// 只编排，不拥有玩法——窗口管理器在 desktop 切片，应用在各自切片。
import type { PlayerProfileStoreV1 } from "@sillymaker/base/runtime";
import type { DefaultGameRootSlotsV1, GameUiProjectorV1 } from "@sillymaker/ui";
import type { WebGameApplicationV1 } from "@sillymaker/web";

import type { OsApplicationInstanceV1 } from "./core-definition.ts";
import { osCoreApplicationDefinitionV1 } from "./core-definition.ts";
import type {
  OsActionDescriptorV1,
  OsActionResultV1,
  OsInvocationV1,
  OsPreviewV1,
} from "./semantic.ts";
import type {
  OsGameViewV1,
  OsNarrativeViewV1,
  OsQueriesV1,
  OsSimulationTypesV1,
} from "../simulation.ts";
import { osResolveLocaleV1 } from "../presentation.ts";
import type {
  OsPresentationViewV1,
  OsSemanticPortV1,
  OsSemanticPublicationV1,
  OsUiPublicationV1,
} from "./ui-kit.ts";
import { osRootLabelsEnV1, osRootLabelsZhV1 } from "./labels.ts";
import { osDesktopCanvasV1, osWallpaperStylesV1 } from "../features/desktop/desktop.tsx";
import { createOsWindowManagerV1 } from "../features/desktop/window-manager.ts";
import { OsShellV1 } from "./ui.tsx";

export type { OsUiPublicationV1 } from "./ui-kit.ts";

const projectorDefinitionV1: GameUiProjectorV1<
  OsSemanticPublicationV1,
  null,
  Record<never, never>,
  OsPresentationViewV1,
  never
> = {
  resolvedCatalog: null,
  initialUiState: Object.freeze({}),
  project: (input) =>
    Object.freeze({
      view: Object.freeze({ anchorEpoch: input.uiState.anchor.epoch }),
      requiredAssetIds: Object.freeze([]),
    }),
};

export const osUiProjectorV1 = Object.freeze(projectorDefinitionV1);

function createOsUiSlotsV1(input: {
  readonly instance: OsApplicationInstanceV1;
  readonly playerProfile: PlayerProfileStoreV1;
}): DefaultGameRootSlotsV1<OsUiPublicationV1, OsSemanticPortV1, never> {
  const wm = createOsWindowManagerV1();
  return {
    background: (context) => (
      <div
        data-os-wallpaper={context.publication.semantic.game.wallpaperId}
        style={{
          position: "absolute",
          inset: 0,
          ...osWallpaperStylesV1[context.publication.semantic.game.wallpaperId],
        }}
      />
    ),
    hud: (context) => (
      <OsShellV1
        publication={context.publication}
        semantic={context.semantic}
        playerProfile={input.playerProfile}
        instance={input.instance}
        wm={wm}
      />
    ),
  };
}

export const osGameApplicationV1: WebGameApplicationV1<
  unknown,
  unknown,
  OsSimulationTypesV1,
  OsQueriesV1,
  OsGameViewV1,
  OsNarrativeViewV1,
  OsActionDescriptorV1,
  OsInvocationV1,
  OsPreviewV1,
  OsActionResultV1,
  null,
  Record<never, never>,
  OsPresentationViewV1,
  never,
  never
> = Object.freeze({
  applicationId: "example-silly-os",
  accessibleName: "SillyOS 98",
  // fluid：桌面平铺整个浏览器区域（手机竖屏亦然），无固定画布无黑边。
  viewport: Object.freeze({
    canvas: osDesktopCanvasV1,
    mode: "fluid" as const,
    fallbackSize: Object.freeze({ width: 1280, height: 960 }),
  }),
  core: osCoreApplicationDefinitionV1,
  ui: ({
    instance,
    playerProfile,
  }: {
    readonly instance: OsApplicationInstanceV1;
    readonly playerProfile: PlayerProfileStoreV1;
  }) => {
    const requested =
      typeof navigator === "undefined" ? [] : (navigator.languages ?? [navigator.language]);
    const locale = osResolveLocaleV1(playerProfile.current().preferences.locale, requested);
    const zh = locale === "zh-CN";
    return Object.freeze({
      projector: osUiProjectorV1,
      overlayIds: Object.freeze([] as const),
      slots: createOsUiSlotsV1({ instance, playerProfile }),
      // 无 titleScreen：开机直达桌面。持久化完全由引擎内部处理，不暴露
      // 存档 UI / 槽位规则（电脑语义：硬盘随关机保存、开机恢复）。
      labels: zh ? osRootLabelsZhV1 : osRootLabelsEnV1,
      hideSystemMenu: true,
    });
  },
});
