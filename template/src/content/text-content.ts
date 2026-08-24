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
    },
    {
      packId: templateEndingTextPackIdV1,
      runtimePath: "assets/content/ending.text-pack.json",
    },
  ],
});
