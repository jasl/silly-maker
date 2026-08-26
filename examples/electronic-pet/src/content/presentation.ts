// SPDX-License-Identifier: MIT
import { definePresentationPatchSurface, parseTextCatalogSetV1 } from "@sillymaker/base";

export const electronicPetTextCatalogsV1 = parseTextCatalogSetV1({
  defaultLocale: "zh-CN",
  catalogs: [
    {
      locale: "zh-CN",
      fallbackLocale: null,
      entries: [
        { textId: "text.pet.home.name", text: "小猫的新家" },
        { textId: "text.pet.interaction.neck", text: "轻轻抚摸颈肩" },
      ],
    },
  ],
});

export const electronicPetPresentationPatchSurfaceV1 = definePresentationPatchSurface({});

export const electronicPetPresentationDefinitionV1 = {
  textCatalogs: electronicPetTextCatalogsV1,
  assetSlots: [] as readonly [],
  assetPacks: [] as readonly [],
  patchSurface: electronicPetPresentationPatchSurfaceV1,
  materializePresentation: () => ({
    kind: "electronic-pet" as const,
    textCatalogs: electronicPetTextCatalogsV1,
  }),
};
