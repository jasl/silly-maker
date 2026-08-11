// SPDX-License-Identifier: MIT
import type { Page } from "@playwright/test";

import { bookshopTargetUrlV1, expect, test } from "./fixtures.ts";

const automationKeyV1 = "__SILLYMAKER_AUTOMATION_V1__";

async function advanceSayV1(page: Page): Promise<void> {
  const dialogue = page.locator("[data-dialogue='say']");
  await expect(dialogue).toHaveAttribute("data-dialogue-reveal", "complete");
  await dialogue.locator("[data-dialogue-advance]").click();
}

test("Bookshop updates Choice availability without replacing the occurrence", async ({ page }) => {
  await page.goto(bookshopTargetUrlV1("?capability=automation_bridge"));
  await page.getByRole("button", { name: "新游戏" }).click();
  await page.getByRole("button", { name: "开始故事" }).click();
  for (let index = 0; index < 4; index += 1) await advanceSayV1(page);
  await page.getByRole("button", { name: "帮阿澄找那本绝版诗集" }).click();
  for (let index = 0; index < 3; index += 1) await advanceSayV1(page);

  const dialogue = page.locator("[data-dialogue='choice']");
  await expect(dialogue).toHaveAttribute(
    "data-dialogue-occurrence",
    "interaction-occurrence.9",
  );
  const buy = page.getByRole("button", { name: "花一枚硬币买下它" });
  await expect(buy).toBeDisabled();
  await expect(page.getByText("硬币不足")).toBeVisible();

  await page.evaluate(async (key) => {
    const automation = Reflect.get(globalThis, key) as
      | Readonly<{ dispatch(invocation: unknown): Promise<unknown> }>
      | undefined;
    if (automation === undefined) throw new TypeError("automation bridge unavailable");
    await automation.dispatch({ kind: "invoke", actionId: "bookshop.earn_coin" });
  }, automationKeyV1);
  await expect(dialogue).toHaveAttribute(
    "data-dialogue-occurrence",
    "interaction-occurrence.9",
  );
  await expect(buy).toBeEnabled();
  await expect(page.getByText("硬币不足")).toHaveCount(0);
  await buy.click();
  await expect(page.locator("[data-dialogue='say']")).toHaveAttribute(
    "data-dialogue-occurrence",
    "interaction-occurrence.10",
  );
});
