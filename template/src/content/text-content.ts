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
  revision: 1,
  packs: [
    {
      packId: templateOpeningTextPackIdV1,
      runtimePath: "assets/content/opening.text-pack.json",
      byteLength: 824,
      sha256: "sha256:ea0c687dfc167faa63381e04894c5a70252d9ef78a531871e936065a67b5c5b5",
      entryCount: 6,
    },
    {
      packId: templateEndingTextPackIdV1,
      runtimePath: "assets/content/ending.text-pack.json",
      byteLength: 1196,
      sha256: "sha256:44f29a669e5f941511527ab4344655cfc186863b2450645d971ad1cab396c555",
      entryCount: 6,
    },
  ],
});
