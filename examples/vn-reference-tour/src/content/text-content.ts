// SPDX-License-Identifier: MIT
import { defineTextContentManifestV1, parseTextContentPackIdV1 } from "@sillymaker/base";

export const vnReferenceTourSharedTextPackIdV1 = parseTextContentPackIdV1(
  "text-pack.vn-reference-tour.shared",
);
export const vnReferenceTourArchiveTextPackIdV1 = parseTextContentPackIdV1(
  "text-pack.vn-reference-tour.route.archive",
);
export const vnReferenceTourPresentTextPackIdV1 = parseTextContentPackIdV1(
  "text-pack.vn-reference-tour.route.present",
);

export const vnReferenceTourTextContentManifestV1 = defineTextContentManifestV1({
  revision: 3,
  defaultLocale: "zh-CN",
  locales: [
    { locale: "zh-CN", fallbackLocale: null },
    { locale: "en", fallbackLocale: "zh-CN" },
  ],
  packs: [
    {
      packId: vnReferenceTourSharedTextPackIdV1,
      variants: [
        { locale: "zh-CN", runtimePath: "assets/content/shared.zh-CN.text-pack.json" },
        { locale: "en", runtimePath: "assets/content/shared.en.text-pack.json" },
      ],
    },
    {
      packId: vnReferenceTourArchiveTextPackIdV1,
      variants: [
        { locale: "zh-CN", runtimePath: "assets/content/archive.zh-CN.text-pack.json" },
        { locale: "en", runtimePath: "assets/content/archive.en.text-pack.json" },
      ],
    },
    {
      packId: vnReferenceTourPresentTextPackIdV1,
      variants: [
        { locale: "zh-CN", runtimePath: "assets/content/present.zh-CN.text-pack.json" },
        { locale: "en", runtimePath: "assets/content/present.en.text-pack.json" },
      ],
    },
  ],
});
