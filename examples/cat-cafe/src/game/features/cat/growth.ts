// SPDX-License-Identifier: MIT
// Cat slice · growth rule: 小雨's character art tracks week age (refreshed on rollover/fast-forward/entering postgame).
import { parseStageMutation } from "@sillymaker/base/story";

import { catcafeStageForWeekV1 } from "../../content.ts";

export function catcafeGrowthMutationV1(week: number, path: string) {
  return parseStageMutation(
    {
      kind: "setAppearance",
      layerId: "layer.catcafe.characters",
      tag: "tag.xiaoyu",
      appearance: {
        stage: ["kitten", "junior", "adolescent"][catcafeStageForWeekV1(week)] as string,
        expression: "calm",
      },
    },
    path,
  );
}
