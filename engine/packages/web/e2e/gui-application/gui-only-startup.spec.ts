// SPDX-License-Identifier: MIT
import { expect, test } from "../../../../../scripts/testing/playwright-test.ts";

test("the focused GUI entry stays interactive until its required domain becomes ready", async ({ page }) => {
  await page.goto("/");

  const shell = page.locator("#sillymaker-application-boot-shell");
  await expect(shell).toHaveAttribute(
    "data-sillymaker-startup-state",
    "starting",
  );
  await expect(shell).toHaveAttribute(
    "data-sillymaker-startup-product-commit",
    "presentation",
  );
  await expect(shell).toHaveAttribute(
    "data-sillymaker-startup-required-domain",
    "pending",
  );
  await expect(shell).toBeHidden();
  await expect(page.locator("[data-application-id='conformance-gui-only']"))
    .toBeVisible();
  await expect(page.getByRole("status")).toHaveText(
    "Required service unavailable",
  );

  await page.getByRole("button", { name: "Retry connection" }).click();

  await expect(page.getByRole("status")).toHaveText("Required service ready");
  await expect(shell).toHaveAttribute("data-sillymaker-startup-state", "ready");
  await expect(shell).toHaveAttribute(
    "data-sillymaker-startup-required-domain",
    "ready",
  );
});
