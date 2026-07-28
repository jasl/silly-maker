// SPDX-License-Identifier: MIT
import type { Page } from "@playwright/test";

import { catcafeTargetUrlV1, expect, test } from "./fixtures.ts";

/**
 * Stage hit regions in a real browser, proven on the cat-cafe example:
 * content-resolved zones render as focusable buttons inside the stage,
 * pointer/touch/keyboard all reach the same semantic path, and gameplay
 * rules (trust bands, daily budget) stay authoritative.
 */

async function playOpeningV1(page: Page): Promise<void> {
  // The title screen is the game's front door; New game starts the
  // opening scene automatically (no separate begin-story action).
  await page.getByRole("button", { name: "新游戏" }).click();
  for (let index = 0; index < 3; index += 1) {
    await page.locator("[data-cc-advance]").click();
  }
  await page.getByRole("button", { name: "就叫「小雨」" }).click();
  await page.locator("[data-cc-advance]").click();
  await page.locator("[data-cc-advance]").click();
  await expect(page.locator("[data-cc-narrative]")).toHaveCount(0);
}

test("pointer petting routes through hit regions with table-driven reactions", async ({ page }) => {
  await page.goto(catcafeTargetUrlV1());
  await playOpeningV1(page);

  // Four zones resolved from the content catalog for the kitten stage.
  await expect(page.locator("[data-stage-hit-region]")).toHaveCount(4);
  await expect(page.locator("[data-cc-stats]")).toContainText("信任10");

  // Low trust + tail: the hissing row (-3 trust) and its reaction line.
  await page.getByRole("button", { name: "碰尾巴" }).click();
  await expect(page.locator("[data-cc-stats]")).toContainText("信任7");
  await expect(page.locator("[data-cc-pet-reaction='text.cc.pet.tail.low']")).toBeVisible();
  await expect(page.locator("[data-cc-cat]")).toHaveAttribute("data-cc-expression", "hissing");

  // Keyboard reaches the same semantic path.
  await page.getByRole("button", { name: "摸头" }).focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("[data-cc-stats]")).toContainText("信任8");

  // The daily budget guards the fourth attempt.
  await page.getByRole("button", { name: "顺背" }).click();
  await expect(page.locator("[data-cc-stage]")).toHaveAttribute("data-cc-petting-left", "0");
  const stats = await page.locator("[data-cc-stats]").textContent();
  await page.getByRole("button", { name: "挠下巴" }).click();
  await expect(page.locator("[data-cc-stats]")).toHaveText(stats ?? "");
});

test("touch taps activate hit regions @responsive", async ({ page }, testInfo) => {
  test.skip(testInfo.project.use.hasTouch !== true, "touch-only case");
  await page.goto(catcafeTargetUrlV1());
  await playOpeningV1(page);
  await expect(page.locator("[data-stage-hit-region]")).toHaveCount(4);
  await page.getByRole("button", { name: "顺背" }).tap();
  await expect(page.locator("[data-cc-stats]")).toContainText("信任11");
  await expect(page.locator("[data-cc-stage]")).toHaveAttribute("data-cc-petting-left", "2");
});

test("the stage scales uniformly on small viewports and hit regions still work", async ({
  page,
}) => {
  // Play the opening at desktop size, then shrink to a phone-landscape
  // window (the genre's standard handheld posture): the 1280x720 logical
  // canvas letterboxes down live. Narrow-portrait HUD stacking is a Story
  // layout concern, not an engine scaling one.
  await page.goto(catcafeTargetUrlV1());
  await playOpeningV1(page);
  await page.setViewportSize({ width: 844, height: 390 });

  const stageRoot = page.locator("[data-semantic-stage]");
  await expect
    .poll(async () => Number(await stageRoot.getAttribute("data-stage-scale")))
    .toBeLessThan(0.6); // ~0.49 for a 624x351 stage box
  const scale = Number(await stageRoot.getAttribute("data-stage-scale"));
  expect(scale).toBeGreaterThan(0.4);
  // The scaled tail region still receives real pointer clicks.
  await page.getByRole("button", { name: "碰尾巴" }).click();
  await expect(page.locator("[data-cc-stats]")).toContainText("信任7");
  const box = await page.getByRole("button", { name: "摸头" }).boundingBox();
  expect(box).not.toBeNull();
  // Logical 80x45 zone shrinks with the canvas transform.
  expect((box?.width ?? 0) / 80).toBeCloseTo(scale, 1);
});

test("the DevDock tuning panel commits debug commands through the session", async ({ page }) => {
  await page.goto(catcafeTargetUrlV1("?capability=debug_tools&capability=cheats"));
  await playOpeningV1(page);

  await page.getByRole("button", { name: "打开右侧开发工具" }).click();
  const dock = page.getByRole("complementary", { name: "右侧开发工具" });
  await dock.getByRole("button", { name: "调参" }).click();
  const tuning = dock.locator("[data-cc-debug-tuning]");

  // Set trust to 77 through the debug channel: the same atomic commit
  // path as gameplay, so the HUD (still mounted under the dock) updates
  // from the authoritative state.
  await tuning.locator("[data-cc-debug-stat]").selectOption("cat.trust");
  await tuning.locator("[data-cc-debug-value]").fill("77");
  await tuning.locator("form").first().getByRole("button", { name: "执行调试命令" }).click();
  await expect(tuning.locator("form").first().getByText("committed")).toBeVisible();
  await expect(page.locator("[data-cc-stats]")).toContainText("信任77");

  // Force a regular encounter in the same dock session: its effect and
  // HUD line come from the same fact/effect path as a natural draw.
  await tuning.locator("[data-cc-debug-encounter]").selectOption("encounter.baker");
  await tuning.locator("form").nth(2).getByRole("button", { name: "执行调试命令" }).click();
  await expect(page.locator("[data-cc-encounter='text.cc.encounter.baker']")).toBeVisible();
  await expect(page.locator("[data-cc-stats]")).toContainText("金钱55");
});

test("the system menu is one modal at a time and saves honor the safepoint", async ({ page }) => {
  await page.goto(catcafeTargetUrlV1());

  // Title screen: Load game opens the system Save dialog even before play.
  await expect(page.locator("[data-title-load-game]")).toBeVisible();
  await page.getByRole("button", { name: "新游戏" }).click();

  // Mid-dialogue: the Save dialog paints above the narrative panel and the
  // panel is inert — the safepoint guard disables manual writes.
  await page.getByRole("button", { name: "保存", exact: true }).click();
  const saves = page.getByRole("dialog", { name: "保存" });
  await expect(saves).toBeVisible();
  await expect(page.locator("[data-save-guard='blocked']")).toContainText("对话进行中");
  await expect(saves.getByRole("button", { name: "手动保存" })).toBeDisabled();
  // The whole gameplay tree (narrative panel included) turns inert, so the
  // dialogue can neither cover the dialog nor swallow pointer input.
  await expect(page.getByTestId("stage-narrative")).toHaveAttribute("inert", "");
  await expect(page.locator("[data-system-dialog-host-content]")).toHaveAttribute("inert", "");

  // Settings cannot stack on top: the launcher sits under inert content
  // while the dialog is open (real pointers are blocked).
  await expect(async () => {
    await page
      .getByRole("button", { name: "设置", exact: true })
      .first()
      .click({ timeout: 500, trial: true });
  }).rejects.toThrow();

  // Escape closes the dialog; finishing the opening reaches a safepoint.
  await page.keyboard.press("Escape");
  await expect(saves).toBeHidden();
  for (let index = 0; index < 3; index += 1) {
    await page.locator("[data-cc-advance]").click();
  }
  await page.getByRole("button", { name: "就叫「小雨」" }).click();
  await page.locator("[data-cc-advance]").click();
  await page.locator("[data-cc-advance]").click();
  await expect(page.locator("[data-cc-narrative]")).toHaveCount(0);

  // Daily play is a safepoint: manual save commits and shows the slot's
  // timestamp in the list.
  await page.getByRole("button", { name: "保存", exact: true }).click();
  await expect(page.locator("[data-save-guard='blocked']")).toHaveCount(0);
  await saves.getByRole("button", { name: "手动保存" }).click();
  await expect(page.getByTestId("save-operation-result")).toContainText("已保存到手动存档");
  await expect(saves.locator("[data-slot-id='manual'] [data-slot-saved-at]")).toBeVisible();

  // Title screen → Load game → confirm: entering gameplay dismisses both
  // the dialog and the title screen (the anchored load origin).
  await page.reload();
  await page.locator("[data-title-load-game]").click();
  await expect(saves).toBeVisible();
  await saves.getByRole("button", { name: "载入手动存档" }).click();
  await page.getByRole("button", { name: "确认" }).click();
  await expect(saves).toBeHidden();
  await expect(page.locator("[data-title-screen]")).toHaveCount(0);
  await expect(page.locator("[data-cc-calendar='1.0.0']")).toBeVisible();
});

test("the ending settles once and Keep-the-shop-open enters the endless epilogue", async ({
  page,
}) => {
  await page.goto(catcafeTargetUrlV1("?capability=debug_tools&capability=cheats"));
  await playOpeningV1(page);

  // Fast-forward to week 7 Sunday morning through the tuning panel, then
  // walk the three slots to the settlement night.
  await page.getByRole("button", { name: "打开右侧开发工具" }).click();
  const dock = page.getByRole("complementary", { name: "右侧开发工具" });
  await dock.getByRole("button", { name: "调参" }).click();
  const tuning = dock.locator("[data-cc-debug-tuning]");
  await tuning.locator("[data-cc-debug-days]").fill("48");
  await tuning.locator("form").nth(1).getByRole("button", { name: "执行调试命令" }).click();
  await expect(tuning.locator("form").nth(1).getByText("committed")).toBeVisible();
  await page.getByRole("button", { name: "关闭右侧开发工具" }).click();
  for (let step = 0; step < 3; step += 1) {
    await page.locator("[data-cc-action-id='cc.advance_slot']").click();
  }

  // The ending scene appears with both doors: restart, or keep going.
  const ending = page.locator("[data-cc-ending]");
  await expect(ending).toBeVisible();
  await page.locator("[data-cc-ending-continue]").click();

  // The epilogue is authoritative state: the badge shows, week 8 begins,
  // and daily play is alive again.
  await expect(page.locator("[data-cc-epilogue]")).toBeVisible();
  await expect(page.locator("[data-cc-calendar='8.0.0']")).toBeVisible();
  await expect(page.locator("[data-cc-ending]")).toHaveCount(0);
  await expect(page.locator("[data-cc-activity='activity.clean']")).toBeEnabled();
});

test("right-click routes the VN back action: the album overlay closes", async ({ page }) => {
  await page.goto(catcafeTargetUrlV1());
  await playOpeningV1(page);
  await page.locator("[data-cc-album-open]").click();
  await expect(page.locator("[data-cc-album]")).toBeVisible();
  // Secondary button on the stage area: cancel closes the overlay and the
  // native context menu stays suppressed on the claimed surface.
  await page.mouse.click(640, 600, { button: "right" });
  await expect(page.locator("[data-cc-album]")).toHaveCount(0);
});

test("language switches live in Settings and persists across reload", async ({ page }) => {
  await page.goto(catcafeTargetUrlV1());
  await playOpeningV1(page);

  // Open the default Settings dialog and switch to English.
  await page.getByRole("button", { name: "设置" }).click();
  await page.locator("[data-cc-settings-locale]").selectOption("en");
  // In-game text switches immediately (the HUD action button).
  await expect(page.locator("[data-cc-album-open]")).toHaveText("Album");
  await page.getByRole("button", { name: "关闭" }).click();
  await expect(page.getByRole("button", { name: "Play with Drizzle" })).toBeVisible();

  // The preference is Host data: a reload keeps English, including chrome
  // and the title screen labels.
  await page.reload();
  await expect(page.getByRole("button", { name: "New game" })).toBeEnabled();
  // The narrative advance button is also labeled "Continue" in English,
  // so address the title screen's own control directly.
  await page.locator("[data-title-continue]").click();
  // The opening starts automatically after the front door; English text
  // reaches the in-game HUD as well.
  await expect(page.locator("[data-cc-album-open]")).toHaveText("Album");
  await expect(page.getByRole("button", { name: "Settings" })).toBeVisible();
});

test("the album overlay masks locked entries and shows unlocked meta progress", async ({
  page,
}) => {
  await page.goto(catcafeTargetUrlV1());
  await playOpeningV1(page);
  await page.locator("[data-cc-album-open]").click();
  await expect(
    page.locator("[data-cc-album-entry='album.growth.rescue'][data-cc-album-unlocked='true']"),
  ).toBeVisible();
  await expect(
    page.locator("[data-cc-album-entry='album.trophy.week3'][data-cc-album-unlocked='false']"),
  ).toBeVisible();
});
