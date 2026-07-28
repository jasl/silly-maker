// SPDX-License-Identifier: MIT
// 猫切片·成长规则：小雨立绘按周龄同步（跨日/快进/进入后日谈时刷新）。
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
