// SPDX-License-Identifier: MIT
import { defineTextContentManifestV1, parseTextContentPackIdV1 } from "@sillymaker/base";

/** Build-known text packs kept outside the resident Player module graph. */
export const templateOpeningTextPackIdV1 = parseTextContentPackIdV1(
  "text-pack.template.opening",
);
export const templateEndingTextPackIdV1 = parseTextContentPackIdV1(
  "text-pack.template.ending",
);

export const templateTextContentManifestV1 = defineTextContentManifestV1({
  revision: 2,
  defaultLocale: "zh-CN",
  locales: [
    { locale: "zh-CN", fallbackLocale: null },
    { locale: "en", fallbackLocale: "zh-CN" },
  ],
  packs: [
    {
      packId: templateOpeningTextPackIdV1,
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
      packId: templateEndingTextPackIdV1,
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
