// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";

import {
  admitSceneInspectorContributionSetInternalV1,
  emptySceneInspectorContributionSetInternalV1,
} from "./scene-inspector-contributions.ts";

describe("Scene Inspector contribution admission", () => {
  const contributionV1 = (id = "tool.test.scene-properties") => ({
    id,
    title: "游戏专属场景属性",
    render: () => null,
  });

  it("accepts an ordinary build-known set and preserves authored order", () => {
    const input = {
      properties: [
        contributionV1("tool.test.first"),
        { ...contributionV1("tool.test.second"), title: "很长的中文工具标题".repeat(20) },
      ],
    };
    const admitted = admitSceneInspectorContributionSetInternalV1(input);

    expect(admitted.properties.map(({ id }) => id)).toEqual([
      "tool.test.first",
      "tool.test.second",
    ]);
  });

  it("uses the empty set when omitted and rejects malformed or duplicate entries", () => {
    expect(admitSceneInspectorContributionSetInternalV1(undefined)).toBe(
      emptySceneInspectorContributionSetInternalV1,
    );
    expect(() =>
      admitSceneInspectorContributionSetInternalV1({
        properties: [contributionV1(), contributionV1()],
      })
    ).toThrow("studio.scene_inspector_contribution_duplicate:tool.test.scene-properties");
    expect(() =>
      admitSceneInspectorContributionSetInternalV1({
        properties: [{ ...contributionV1(), title: "" }],
      })
    ).toThrow("studio.scene_inspector_contribution_invalid");
  });
});
