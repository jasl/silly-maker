// SPDX-License-Identifier: MIT
import { expect, gotoLabV1, test } from "./fixtures.ts";

/**
 * Real-pointer evidence for narrative asides: the collector latch raises a
 * zero-authority dialogue box whose pages a real click advances locally
 * (free navigation first, where nothing dismisses it), and the mid-hold
 * fenced write presents the same aside over the still-running tripwire
 * hold until the `when` reroute onto the catch say force-dismisses it.
 * Channel arithmetic (stamps, watermark, drops) is pinned headless; this
 * suite proves the pointer path end to end.
 */
test.describe("engine narrative aside", () => {
  test("a real pointer pages through an aside and the catch cut dismisses the mid-hold one", async ({ page }) => {
    await gotoLabV1(page);
    const aside = page.locator("[data-lab-aside='true']");
    const asideAdvance = page.locator("[data-lab-aside-advance]");

    // The crate enters on first collect, during free navigation.
    await page.getByRole("button", { name: "采集样本" }).click();
    const zone = page.getByRole("button", { name: "样本箱采集口" });
    await expect(zone).toBeVisible();
    await expect(aside).not.toBeAttached();

    // Engaging the collector raises the aside; with no pending at all the
    // box idles until real clicks page through and dismiss it — advancing
    // is purely local, no command, no isolation.
    await page.getByRole("button", { name: "切换收集器" }).click();
    await expect(aside).toBeVisible();
    await expect(page.getByText("收集器咔哒咬合，绊线绷紧了。")).toBeVisible();
    await asideAdvance.click();
    await expect(page.getByText("低鸣渐起——别出声，等它靠近。")).toBeVisible();
    await asideAdvance.click();
    await expect(aside).not.toBeAttached();

    // Disengaging projects no aside (the latch only clunks on engage) and
    // leaves a clean switch for the tripwire watch.
    await page.getByRole("button", { name: "切换收集器" }).click();
    await expect(aside).not.toBeAttached();

    // Walk to the shared tripwire hold through the decision menu.
    await page.getByRole("button", { name: "开始演习" }).click();
    await expect(page.getByText("环境采样进行中，保持观察。")).toBeVisible();
    await expect(page.locator("[data-lab-say-reveal='complete']")).toBeAttached();
    await page.getByRole("button", { name: "继续" }).click();
    await expect(page.getByRole("button", { name: "释放脉冲" })).toBeVisible();
    await zone.click();
    await expect(page.locator("[data-lab-interaction='hold']")).toBeVisible();

    // The fenced mid-hold write presents the aside over the running hold;
    // the arm's reroute onto the isolated catch say force-dismisses it.
    await zone.click();
    await expect(aside).toBeVisible();
    await expect(page.locator("[data-lab-interaction='hold']")).toBeVisible();
    await expect(page.getByText("有动静——正好抓个正着。")).toBeVisible({ timeout: 15_000 });
    await expect(aside).not.toBeAttached();
  });
});
