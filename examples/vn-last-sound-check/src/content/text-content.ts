// SPDX-License-Identifier: MIT
import { defineTextContentManifestV1, parseTextContentPackIdV1 } from "@sillymaker/base";

export const vnLastSoundCheckSharedTextPackIdV1 = parseTextContentPackIdV1(
  "text-pack.vn-last-sound-check.shared",
);
export const vnLastSoundCheckArchiveTextPackIdV1 = parseTextContentPackIdV1(
  "text-pack.vn-last-sound-check.route.archive",
);
export const vnLastSoundCheckPresentTextPackIdV1 = parseTextContentPackIdV1(
  "text-pack.vn-last-sound-check.route.present",
);

export const vnLastSoundCheckTextContentManifestV1 = defineTextContentManifestV1({
  revision: 3,
  defaultLocale: "zh-CN",
  locales: [
    { locale: "zh-CN", fallbackLocale: null },
    { locale: "en", fallbackLocale: "zh-CN" },
  ],
  packs: [
    {
      packId: vnLastSoundCheckSharedTextPackIdV1,
      variants: [
        { locale: "zh-CN", runtimePath: "assets/content/shared.zh-CN.text-pack.json" },
        { locale: "en", runtimePath: "assets/content/shared.en.text-pack.json" },
      ],
    },
    {
      packId: vnLastSoundCheckArchiveTextPackIdV1,
      variants: [
        { locale: "zh-CN", runtimePath: "assets/content/archive.zh-CN.text-pack.json" },
        { locale: "en", runtimePath: "assets/content/archive.en.text-pack.json" },
      ],
    },
    {
      packId: vnLastSoundCheckPresentTextPackIdV1,
      variants: [
        { locale: "zh-CN", runtimePath: "assets/content/present.zh-CN.text-pack.json" },
        { locale: "en", runtimePath: "assets/content/present.en.text-pack.json" },
      ],
    },
  ],
});
