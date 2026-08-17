// SPDX-License-Identifier: MIT
// The Studio binding: only what a file scan cannot discover — the content
// catalog, the real stage renderers bound to a live asset registry, and
// the content authoring manifest (what the Studio Content browser offers).
// Scene and motion documents are enumerated by the Project Authoring Index
// over the dev-server ports, so a new `*.scene.json` or `*.motion.json`
// needs no registration here. Loaded only by the dev-server studio entry
// (`sillymaker.config.ts` `studio`); never part of the player bundle or
// the application composition.
import { resolveAssetManifestV1 } from "@sillymaker/base/authoring";
import { createAssetRegistryV1 } from "@sillymaker/ui";
import { createBrowserImageLoaderV1 } from "@sillymaker/web";
import type { StudioBindingV1 } from "@sillymaker/studio";

import type { CatcafeAssetRegistryV1 } from "../application/ui-kit.ts";
import { createCatcafeStageRenderersV1 } from "../game/features/stage/renderers.tsx";
import {
  catcafeAssetPacksV1,
  catcafeAssetSlotsV1,
  catcafeStageContentCatalogV1,
} from "../content/presentation.ts";

// The same registry construction the composition uses, on the dev server's
// own origin: the manifest is plain resolved Story data and the browser
// loader fetches/decodes the packaged art, so the canvas positions real
// backgrounds and poses. Runtime paths resolve against the server root —
// the Studio page lives under /__sillymaker/studio/, so baseURI-relative
// resolution would miss the app's assets. Guarded so a non-browser import
// falls back to the code-native rendering instead of crashing.
const registryV1: CatcafeAssetRegistryV1 | null = typeof document === "undefined"
  ? null
  : (createAssetRegistryV1(
    resolveAssetManifestV1(catcafeAssetSlotsV1, catcafeAssetPacksV1),
    createBrowserImageLoaderV1({
      resolveRuntimeUrl: (runtimePath) => new URL(`/${runtimePath}`, document.baseURI).href,
      createImage: () => new Image(),
    }),
    () => {
      // Asset faults keep the code-native fallback on the dev canvas.
    },
  ) as CatcafeAssetRegistryV1);

export const catcafeStudioBindingV1: StudioBindingV1 = Object.freeze({
  catalog: catcafeStageContentCatalogV1,
  renderers: createCatcafeStageRenderersV1(registryV1),
  ...(registryV1 === null ? {} : { assets: registryV1 }),
  // The content authoring manifest: what the Studio Content browser offers
  // for scene construction (defaults + structured appearance controls).
  contents: Object.freeze([
    {
      contentId: "content.catcafe.background.shopfront",
      label: "猫舍店面",
      category: "background" as const,
      defaultLayerId: "layer.catcafe.background",
      defaultZOrder: 0,
    },
    {
      contentId: "content.catcafe.background.backyard",
      label: "后院",
      category: "background" as const,
      defaultLayerId: "layer.catcafe.background",
      defaultZOrder: 0,
    },
    {
      contentId: "content.catcafe.character.xiaoyu",
      label: "小雨",
      category: "character" as const,
      defaultLayerId: "layer.catcafe.characters",
      defaultZOrder: 10,
      defaultAppearance: Object.freeze({ stage: "kitten", expression: "calm" }),
      appearanceFields: Object.freeze([
        Object.freeze({
          key: "stage",
          label: "成长阶段",
          values: Object.freeze(["kitten", "junior", "adolescent"]),
        }),
        Object.freeze({
          key: "expression",
          label: "表情",
          values: Object.freeze(["calm", "happy", "purring", "grumpy", "hissing"]),
        }),
      ]),
    },
  ]),
});
