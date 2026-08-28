// SPDX-License-Identifier: MIT
import { expect, gotoLabV1, test } from "./fixtures.ts";

test("loads the externalized build version stamp", async ({ page }) => {
  await gotoLabV1(page, "?capability=debug_tools");

  const inlineVersionStampCount = await page.locator("script:not([src])").evaluateAll(
    (scripts) =>
      scripts.filter((script) => script.textContent?.includes("__SILLYMAKER_VERSIONS__"))
        .length,
  );
  expect(inlineVersionStampCount).toBe(0);

  await page.getByRole("button", { name: "调试" }).click();
  const versionStamp = page.locator("[data-debug-dock-versions='true']");
  await expect(versionStamp).toContainText("app 0.0.0");
  await expect(versionStamp).toContainText("engine 0.0.0");
});
