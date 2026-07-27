// SPDX-License-Identifier: MIT
import { expect, gotoLabV1, test } from "./fixtures.ts";

const debugVocabularyV1 = /debug|semantic|revision|replay|fixture|diagnostic/iu;

test.describe("engine player/debug boundary", () => {
  test("resident player DOM carries no debug vocabulary", async ({ page }) => {
    await gotoLabV1(page);
    const text = await page.getByRole("application").textContent();
    expect(text ?? "").not.toMatch(debugVocabularyV1);
    await expect(page.getByRole("button", { name: /开发工具/u })).toHaveCount(0);
  });

  test("the DevDock appears only behind debug_tools and hosts the debug surface", async ({
    page,
  }) => {
    await gotoLabV1(page, "?capability=debug_tools");
    const launcher = page.getByRole("button", { name: "打开左侧开发工具" });
    await expect(launcher).toBeVisible();
    await launcher.click();
    await expect(page.getByRole("complementary", { name: "左侧开发工具" })).toBeVisible();
  });

  test("rejects malformed capability requests without partial grants", async ({ page }) => {
    await gotoLabV1(page, "?capability=debug_tools&capability=debug_tools");
    await expect(page.getByRole("button", { name: /开发工具/u })).toHaveCount(0);
  });
});
