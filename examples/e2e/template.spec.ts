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
