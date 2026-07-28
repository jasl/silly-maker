import type { AssetId, DeepReadonly, AudioIntentV1 } from "@sillymaker/base";
import { projectStageRenderTarget } from "@sillymaker/base/story";
import type {
  DefaultGameRootSlotsV1,
  GameUiProjectorV1,
  KeyboardActionMapV1,
  AudioHostV1,
  RuntimeAssetLoaderV1,
  PointerActionMapV1,
} from "@sillymaker/ui";
import { createAssetRegistryV1, GameAudioV1, systemInputActionIdsV1 } from "@sillymaker/ui";
import type { PlayerProfileStoreV1 } from "@sillymaker/base/runtime";
import type { WebGameApplicationV1 } from "@sillymaker/web";
import { createWebAudioHostV1 } from "@sillymaker/web";

import type {
  CatcafeActionDescriptorV1,
  CatcafeActionResultV1,
  CatcafeInvocationV1,
  CatcafePreviewV1,
} from "./semantic.ts";
import type { CatcafeApplicationInstanceV1, CatcafeExtensionsV1 } from "./core-definition.ts";
import { catcafeCoreApplicationDefinitionV1 } from "./core-definition.ts";
import type {
  CatcafeAssetRegistryV1,
  CatcafeSemanticPortV1,
  CatcafeSemanticPublicationV1,
} from "./ui-kit.ts";
export type {
  CatcafePresentationViewV1,
  CatcafeUiOverlayIdV1,
  CatcafeUiPublicationV1,
} from "./ui-kit.ts";
import type {
  CatcafePresentationViewV1,
  CatcafeUiOverlayIdV1,
  CatcafeUiPublicationV1,
} from "./ui-kit.ts";
import { CatcafeAlbumViewV1 } from "../features/album/index.tsx";
import { createCatcafeStageRenderersV1 } from "../features/stage/renderers.tsx";
import { CatcafeStageV1 } from "../features/stage/stage-view.tsx";
import { catcafeChromeForLocaleV1, catcafeSaveGuardForLocaleV1 } from "./labels.ts";
export {
  catcafeChromeForLocaleV1,
  catcafeRootLabelsV1,
  catcafeSaveGuardForLocaleV1,
  catcafeSaveOverlayLabelsV1,
} from "./labels.ts";
import type {
  CatcafeGameViewV1,
  CatcafeNarrativeViewV1,
  CatcafeQueriesV1,
  CatcafeSimulationTypesV1,
} from "../simulation.ts";
import { catcafeAudioManifestV1, resolveCatcafeEffectAssetV1 } from "../features/audio/index.ts";
import { catcafeStageContentCatalogV1, catcafeTextForLocaleV1 } from "../presentation.ts";
import { CatcafeHudV1, CatcafeNarrativePanelV1, CatcafeSettingsV1 } from "./ui.tsx";

export const catcafeViewportCanvasV1 = Object.freeze({ width: 1280, height: 720 });

const projectorDefinitionV1: GameUiProjectorV1<
  CatcafeSemanticPublicationV1,
  null,
  Record<never, never>,
  CatcafePresentationViewV1,
  AssetId
> = {
  resolvedCatalog: null,
  initialUiState: Object.freeze({}),
  project: (input) => {
    const projection = projectStageRenderTarget(
      input.semantic.game.stage,
      catcafeStageContentCatalogV1,
    );
    return Object.freeze({
      view: Object.freeze({
        anchorEpoch: input.uiState.anchor.epoch,
        stageTarget: projection.target,
      }),
      requiredAssetIds: projection.target.requiredAssetIds,
    });
  },
};

export const catcafeUiProjectorV1 = Object.freeze(projectorDefinitionV1);

/** 连续声音意图来自游戏视图；host 惰性创建（首个用户手势解锁播放）。 */
const selectCatcafeAudioIntentV1 = (publication: unknown): AudioIntentV1 =>
  (publication as { readonly game: { readonly audio: AudioIntentV1 } }).game.audio;

const createCatcafeAudioHostV1 = (): AudioHostV1 =>
  createWebAudioHostV1({
    manifest: catcafeAudioManifestV1,
    resolveRuntimeUrl: (runtimePath) => new URL(runtimePath, document.baseURI).href,
  });

export function createCatcafeUiSlotsV1(input: {
  readonly instance: CatcafeApplicationInstanceV1;
  readonly playerProfile: PlayerProfileStoreV1;
  readonly registry: CatcafeAssetRegistryV1 | null;
}): DefaultGameRootSlotsV1<CatcafeUiPublicationV1, CatcafeSemanticPortV1, CatcafeUiOverlayIdV1> {
  const renderers = createCatcafeStageRenderersV1(input.registry);
  const slots: DefaultGameRootSlotsV1<
    CatcafeUiPublicationV1,
    CatcafeSemanticPortV1,
    CatcafeUiOverlayIdV1
  > = {
    background: (context) => (
      <CatcafeStageV1
        context={context}
        instance={input.instance}
        playerProfile={input.playerProfile}
        registry={input.registry}
        renderers={renderers}
      />
    ),
    hud: (context) => (
      <>
        <GameAudioV1
          ports={input.instance}
          createHost={createCatcafeAudioHostV1}
          selectIntent={selectCatcafeAudioIntentV1}
          resolveEffectAsset={resolveCatcafeEffectAssetV1}
          playerProfile={input.playerProfile}
        />
        <CatcafeHudV1
          publication={context.publication}
          semantic={context.semantic}
          playerProfile={input.playerProfile}
          instance={input.instance}
          registry={input.registry}
          openAlbum={() =>
            context.intents.execute(
              Object.freeze({ kind: "overlay.open" as const, overlayId: "overlay.catcafe.album" }),
            )
          }
        />
      </>
    ),
    narrative: (context) => (
      <CatcafeNarrativePanelV1
        publication={context.publication}
        semantic={context.semantic}
        playerProfile={input.playerProfile}
      />
    ),
    settingsSections: () => [
      <CatcafeSettingsV1 key="catcafe-settings" playerProfile={input.playerProfile} />,
    ],
    overlayResolver: () =>
      Object.freeze({
        resolve: (overlayId: DeepReadonly<CatcafeUiOverlayIdV1>) =>
          overlayId === "overlay.catcafe.album"
            ? Object.freeze({
                accessibleName: catcafeTextForLocaleV1(
                  input.playerProfile.current().preferences.locale,
                  "text.cc.album.title",
                ),
                content: (
                  <CatcafeAlbumViewV1
                    playerProfile={input.playerProfile}
                    registry={input.registry}
                  />
                ),
              })
            : null,
      }),
  };
  return Object.freeze(slots);
}

export const catcafeKeyboardMapV1: KeyboardActionMapV1 = Object.freeze({
  Enter: systemInputActionIdsV1.narrativeAdvance,
  Space: systemInputActionIdsV1.narrativeAdvance,
});

/** VN 惯例：右键=返回/关闭（overlay、系统面板），舞台上抑制系统菜单。 */
export const catcafePointerMapV1: PointerActionMapV1 = Object.freeze({
  secondary: systemInputActionIdsV1.cancel,
});

export const catcafeGameApplicationV1: WebGameApplicationV1<
  unknown,
  unknown,
  CatcafeSimulationTypesV1,
  CatcafeQueriesV1,
  CatcafeGameViewV1,
  CatcafeNarrativeViewV1,
  CatcafeActionDescriptorV1,
  CatcafeInvocationV1,
  CatcafePreviewV1,
  CatcafeActionResultV1,
  null,
  Record<never, never>,
  CatcafePresentationViewV1,
  AssetId,
  CatcafeUiOverlayIdV1
> = Object.freeze({
  applicationId: "example-cat-cafe",
  accessibleName: "雨巷猫舍",
  viewport: Object.freeze({
    canvas: catcafeViewportCanvasV1,
    fallbackSize: Object.freeze({ width: 1280, height: 720 }),
    // 等比放大撑满窗口（fit 缩放天然保比例、必要时留黑边）。
    maxScale: 4,
  }),
  core: catcafeCoreApplicationDefinitionV1,
  ui: ({
    instance,
    playerProfile,
    assetLoader,
    reportFailure,
  }: {
    readonly instance: CatcafeApplicationInstanceV1;
    readonly playerProfile: PlayerProfileStoreV1;
    readonly assetLoader?: RuntimeAssetLoaderV1;
    reportFailure?(code: string, error: unknown): void;
  }) => {
    // 资产 registry：resolved manifest 经 extensions 面到达（观察，不夺权）。
    const manifest = (instance.extensions as CatcafeExtensionsV1 | undefined)?.assets;
    const registry: CatcafeAssetRegistryV1 | null =
      manifest !== undefined && assetLoader !== undefined
        ? (createAssetRegistryV1(manifest, assetLoader, (diagnostic) => {
            reportFailure?.("catcafe.asset_fault", diagnostic);
          }) as CatcafeAssetRegistryV1)
        : null;
    return Object.freeze({
      dispose: () => registry?.dispose(),
      titleScreen: Object.freeze({
        title: catcafeTextForLocaleV1(
          playerProfile.current().preferences.locale,
          "text.cc.app.name",
        ),
        backgroundUrl: "examples/cat-cafe/assets/cc-bg-title.webp",
        // 片头：本作完全由 AI 生成（代码、文本、美术、音频）。
        splash: Object.freeze({
          lines:
            playerProfile.current().preferences.locale === "en"
              ? Object.freeze([
                  "This game is entirely AI-generated",
                  "Code, story, art, and audio · SillyMaker Engine",
                ])
              : Object.freeze([
                  "本游戏内容完全由 AI 生成",
                  "代码 · 剧本 · 美术 · 音频 — SillyMaker 引擎",
                ]),
        }),
      }),
      projector: catcafeUiProjectorV1,
      overlayIds: Object.freeze(["overlay.catcafe.album"] as const),
      slots: createCatcafeUiSlotsV1({ instance, playerProfile, registry }),
      ...(() => {
        const locale = playerProfile.current().preferences.locale;
        const chrome = catcafeChromeForLocaleV1(locale);
        return {
          labels: chrome.labels,
          saveLabels: chrome.saveLabels,
          saveGuard: catcafeSaveGuardForLocaleV1(locale),
        };
      })(),
      inputMaps: Object.freeze({ keyboard: catcafeKeyboardMapV1, pointer: catcafePointerMapV1 }),
      loadDevDockContributions: () =>
        import("./dev-dock.tsx").then((module) =>
          module.createCatcafeDevDockContributionsV1({ instance }),
        ),
    });
  },
});
