// SPDX-License-Identifier: MIT
import type { Page } from "@playwright/test";

import { expect, templateTargetUrlV1, test } from "./fixtures.ts";

async function advanceSayV1(page: Page): Promise<void> {
  const dialogue = page.locator("[data-dialogue='say']");
  await expect(dialogue).toHaveAttribute("data-dialogue-reveal", "complete");
  await dialogue.locator("[data-dialogue-advance]").click();
}

test("Template uses the production Narrative renderer through completion", async ({ page }) => {
  await page.goto(templateTargetUrlV1());
  await page.getByRole("button", { name: "新游戏" }).click();
  await page.getByRole("button", { name: "开始故事" }).click();
  await advanceSayV1(page);
  await page.getByRole("button", { name: "去看看檐下的动静" }).click();
  await advanceSayV1(page);
  await advanceSayV1(page);
  await expect(page.locator("[data-dialogue]")).toHaveCount(0);
  await expect(page.locator("[data-template-narrative='completed']")).toContainText(
    "本段落已结束",
  );
});

test("the scene-first starter advertises Studio from the debug dock", async ({ page }) => {
  await page.goto(templateTargetUrlV1("?capability=debug_tools"));
  await page.getByRole("button", { name: "调试" }).click();
  const studio = page.getByRole("group", { name: "调试" }).getByRole("link", { name: "Studio" });
  await expect(studio).toHaveAttribute("href", "/__sillymaker/studio/");
  await expect(studio).toHaveAttribute("target", "_blank");
});

test("the starter Studio opens the opening scene with its cue-bound motion", async ({ page }) => {
  await page.goto(templateTargetUrlV1("__sillymaker/studio/"));

  // The navigator lists the scene by label and auto-opens the first one;
  // the canvas draws through the starter's real renderers.
  const sceneButton = page.getByRole("button", { name: "雨后的庭院" });
  await expect(sceneButton).toHaveAttribute("aria-pressed", "true");
  const canvas = page.locator("[data-studio-canvas]");
  await expect(canvas.locator('[data-stage-key="layer.template.characters:tag.mei"]'))
    .toBeVisible();

  // Mei's entrance cue carries its motion binding in the cue table.
  const meiRow = page.locator('[data-studio-cue="cue.template.opening.mei-enters"]');
  await expect(meiRow.getByRole("combobox")).toHaveValue("motion.template.mei-entrance");
});
