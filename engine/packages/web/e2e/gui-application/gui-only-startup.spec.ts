// SPDX-License-Identifier: MIT
import { expect, test } from "../../../../../scripts/testing/playwright-test.ts";

test("the focused GUI entry reaches its first real Browser presentation", async ({ page }) => {
  await page.goto("/");

  const shell = page.locator("#sillymaker-application-boot-shell");
  await expect(shell).toHaveAttribute("data-sillymaker-startup-state", "ready");
  await expect(shell).toHaveAttribute(
    "data-sillymaker-startup-product-commit",
    "presentation",
  );
  await expect(shell).toBeHidden();
  await expect(page.locator("[data-application-id='conformance-gui-only']"))
    .toBeVisible();
  await expect(page.getByRole("main", { name: "GUI-only conformance" }))
    .toContainText("Ready");
});
