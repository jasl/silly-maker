// @vitest-environment jsdom
// SPDX-License-Identifier: MIT
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { digestCanonical } from "@sillymaker/base";
import { createMemoryHostRecordStoreV1 } from "@sillymaker/base/testkit";
import { createPlayerProfileStoreV1 } from "@sillymaker/base/runtime";

import { createCatcafeApplicationInstanceV1 } from "../application/core-application.ts";
import { createCatcafeDevDockContributionsV1 } from "../application/dev-dock.tsx";
import { catcafeContentIdsV1, catcafeNodeIdsV1 } from "../game/features/dialogue/script.ts";
import { catcafeNarrativePreviewCasesV1 } from "../tooling/narrative-preview.ts";

afterEach(cleanup);

function contentIdsV1(previewId: string): readonly string[] {
  const preview = catcafeNarrativePreviewCasesV1.find(
    (candidate) => candidate.previewId === previewId,
  );
  if (preview === undefined) throw new TypeError(`missing preview ${previewId}`);
  return preview.target.layers.flatMap((layer) => layer.entries.map((entry) => entry.contentId));
}

describe("Cat Cafe detached Narrative preview", () => {
  it("covers every script node and names both post-choice routes", () => {
    expect(catcafeNarrativePreviewCasesV1).toHaveLength(12);
    expect(new Set(catcafeNarrativePreviewCasesV1.map((row) => row.previewId)).size).toBe(12);
    expect(
      [...new Set(catcafeNarrativePreviewCasesV1.map((row) => row.nodeId))].toSorted(),
    ).toEqual([...catcafeNodeIdsV1].toSorted());

    expect(
      catcafeNarrativePreviewCasesV1
        .filter((row) => row.nodeId === "node.catcafe.tutorial")
        .map((row) => row.route),
    ).toEqual(["named", "later"]);
    expect(
      catcafeNarrativePreviewCasesV1
        .filter((row) => row.nodeId === "node.catcafe.close")
        .map((row) => row.route),
    ).toEqual(["named", "later"]);

    expect(contentIdsV1("node.catcafe.opening")).toEqual([
      catcafeContentIdsV1.backgroundShopfront,
    ]);
    expect(contentIdsV1("node.catcafe.kitten-enters")).toEqual([
      catcafeContentIdsV1.backgroundShopfront,
      catcafeContentIdsV1.characterXiaoyu,
    ]);
    expect(contentIdsV1("node.catcafe.unnamed@later")).toEqual([
      catcafeContentIdsV1.backgroundShopfront,
      catcafeContentIdsV1.characterXiaoyu,
    ]);
  });

  it("switches passive settled targets without changing the live application digest", async () => {
    const instance = await createCatcafeApplicationInstanceV1();
    const playerProfile = await createPlayerProfileStoreV1({
      records: createMemoryHostRecordStoreV1(),
      storyId: "story.example.cat-cafe",
    });
    try {
      const before = digestCanonical("sillymaker:state:v1", instance.semantic.observe());
      const contributions = createCatcafeDevDockContributionsV1({
        instance,
        playerProfile,
        registry: null,
      });
      const previewPanel = contributions.panels.find(
        (panel) => panel.id === "catcafe.narrative-preview",
      );
      if (previewPanel === undefined) throw new TypeError("missing Narrative preview panel");

      const view = render(previewPanel.render());
      const selector = screen.getByRole("combobox", { name: "剧情节点" });
      fireEvent.change(selector, { target: { value: "node.catcafe.unnamed@later" } });
      expect(
        view.container.querySelector("[data-cc-narrative-preview='node.catcafe.unnamed@later']"),
      )
        .toBeVisible();
      expect(screen.getByText("名字先欠着。她不在意，已经把你的围裙当成了床。")).toBeVisible();
      expect(view.container.querySelector("[data-cc-cat='kitten']")).toBeVisible();

      fireEvent.change(selector, { target: { value: "node.catcafe.tutorial@named" } });
      expect(
        view.container.querySelector("[data-cc-narrative-preview='node.catcafe.tutorial@named']"),
      )
        .toBeVisible();
      expect(screen.getByRole("group", { name: "剧情舞台预览" })).toBeVisible();
      expect(digestCanonical("sillymaker:state:v1", instance.semantic.observe())).toBe(before);
    } finally {
      await instance.dispose();
    }
  });
});
