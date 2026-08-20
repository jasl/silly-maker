// SPDX-License-Identifier: MIT
import type { Page } from "@playwright/test";
import { expect, gotoLabV1, test } from "./fixtures.ts";

/**
 * Live browser evidence for the three authoritative monitor archetypes: the
 * host session-time reporter feeds real presentation-clock time into the
 * Story's unfenced time command, and the settled counters surface on the
 * monitor HUD probe. Counter arithmetic is pinned by the headless
 * monitor-drill suite; these tests prove the composed loop moves in a real
 * browser without a single manual tick.
 */

function monitorProbeV1(page: Page) {
  return page.locator("[data-lab-monitors]");
}

async function pollCounterV1(
  page: Page,
  attribute: string,
  minimum: number,
): Promise<void> {
  await expect
    .poll(
      async () => Number(await monitorProbeV1(page).getAttribute(attribute)),
      { timeout: 8_000 },
    )
    .toBeGreaterThanOrEqual(minimum);
}

test.describe("engine monitor pacing", () => {
  test("@smoke drill run: ambient self-ignition accumulates and the decision gauge charges in realtime", async ({ page }) => {
    await gotoLabV1(page);
    const probe = monitorProbeV1(page);
    await expect(probe).toHaveAttribute("data-lab-gauge-level", "0");
    await expect(probe).toHaveAttribute("data-lab-realtime-active", "false");

    // Chamber say: the scene-scoped ambient monitor self-ignites on session
    // time alone — no input, no hold, just the reporter feeding the clock.
    await page.getByRole("button", { name: "开始演习" }).click();
    await expect(page.getByText("环境采样进行中，保持观察。")).toBeVisible();
    await pollCounterV1(page, "data-lab-ambient-ignitions", 1);

    // The decision menu: the gauge monitor charges while the menu idles and
    // declares a realtime reaction span (the host pins presentation to 1x).
    await expect(page.locator("[data-lab-say-reveal='complete']")).toBeAttached();
    await page.getByRole("button", { name: "继续" }).click();
    await expect(page.getByRole("button", { name: "释放脉冲" })).toBeVisible();
    await expect(probe).toHaveAttribute("data-lab-realtime-active", "true");
    await pollCounterV1(page, "data-lab-gauge-level", 1);

    // Release: the charge converts at resolution, the gauge clears, and the
    // realtime span closes with the menu.
    await page.getByRole("button", { name: "释放脉冲" }).click();
    await expect(page.getByText("脉冲释放完毕。")).toBeVisible();
    await expect(probe).toHaveAttribute("data-lab-gauge-level", "0");
    await expect(probe).toHaveAttribute("data-lab-realtime-active", "false");
  });

  test("collector drips on session time across ordinary boundaries and retains progress while off", async ({ page }) => {
    await gotoLabV1(page);
    const probe = monitorProbeV1(page);

    // Engage: the retained collector accrues from reported session time
    // while free navigation continues (no narrative pending at all).
    await page.getByRole("button", { name: "切换收集器" }).click();
    await expect(probe).toHaveAttribute("data-lab-collector-engaged", "true");
    await pollCounterV1(page, "data-lab-collector-units", 1);

    // The drip keeps flowing across an ordinary say boundary. The narrative
    // surface owns pointer ingress while a say is current, so this stretch
    // only reads the probe and drives the story through its own buttons.
    await page.getByRole("button", { name: "开始演习" }).click();
    await expect(page.getByText("环境采样进行中，保持观察。")).toBeVisible();
    const unitsAtSay = Number(await probe.getAttribute("data-lab-collector-units"));
    await pollCounterV1(page, "data-lab-collector-units", unitsAtSay + 1);

    // Play the drill out (vent: no conversion) to return to free navigation.
    await expect(page.locator("[data-lab-say-reveal='complete']")).toBeAttached();
    await page.getByRole("button", { name: "继续" }).click();
    await page.getByRole("button", { name: "放空蓄力" }).click();
    await expect(page.getByText("脉冲释放完毕。")).toBeVisible();
    await expect(page.locator("[data-lab-say-reveal='complete']")).toBeAttached();
    await page.getByRole("button", { name: "继续" }).click();
    await expect(page.locator("[data-lab-interaction]")).toHaveCount(0);

    // Disengage: the gate closes, banked units and the sub-threshold
    // remainder stay (retention arithmetic is pinned headless; here the
    // counter must simply stop moving and keep its value).
    await page.getByRole("button", { name: "切换收集器" }).click();
    await expect(probe).toHaveAttribute("data-lab-collector-engaged", "false");
    const unitsAtOff = Number(await probe.getAttribute("data-lab-collector-units"));
    expect(unitsAtOff).toBeGreaterThanOrEqual(unitsAtSay + 1);
    await page.waitForTimeout(600);
    await expect(probe).toHaveAttribute(
      "data-lab-collector-units",
      String(unitsAtOff),
    );
  });
});
