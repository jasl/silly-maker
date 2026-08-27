// SPDX-License-Identifier: MIT
import { defineTextContentManifestV1, parseTextContentPackIdV1 } from "@sillymaker/base";

/** Build-known text packs kept outside the resident Player module graph. */
export const vnReferenceTourOpeningTextPackIdV1 = parseTextContentPackIdV1(
  "text-pack.vn-reference-tour.opening",
);
export const vnReferenceTourEndingTextPackIdV1 = parseTextContentPackIdV1(
  "text-pack.vn-reference-tour.ending",
);

export const vnReferenceTourTextContentManifestV1 = defineTextContentManifestV1({
  revision: 2,
  defaultLocale: "zh-CN",
  locales: [
    { locale: "zh-CN", fallbackLocale: null },
    { locale: "en", fallbackLocale: "zh-CN" },
  ],
  packs: [
    {
      packId: vnReferenceTourOpeningTextPackIdV1,
      variants: [
        {
          locale: "zh-CN",
          runtimePath: "assets/content/opening.zh-CN.text-pack.json",
        },
        {
          locale: "en",
          runtimePath: "assets/content/opening.en.text-pack.json",
        },
      ],
    },
    {
      packId: vnReferenceTourEndingTextPackIdV1,
      variants: [
        {
          locale: "zh-CN",
          runtimePath: "assets/content/ending.zh-CN.text-pack.json",
        },
        {
          locale: "en",
          runtimePath: "assets/content/ending.en.text-pack.json",
        },
      ],
    },
  ],
});
