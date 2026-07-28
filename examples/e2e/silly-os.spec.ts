// SPDX-License-Identifier: MIT
import type { Page } from "@playwright/test";

import { expect, sillyOsTargetUrlV1, test } from "./fixtures.ts";

/**
 * SillyOS 98：全定制桌面 shell 的浏览器验收。窗口重叠/焦点/最小化/
 * 最大化/拖拽是 Story 侧窗口管理器；扫雷是确定性模拟（雷区不上发布
 * 面）；记事本文件与壁纸随存档持久；开始菜单承载引擎系统对话框入口
 * （hideSystemMenu 生效，无浮动系统菜单）。
 */

async function bootDesktopV1(page: Page): Promise<void> {
  await page.goto(sillyOsTargetUrlV1());
  // 片头（AI 声明）挡在标题屏前，点击确定性跳过。
  await page.locator("[data-boot-splash]").click();
  await page.getByRole("button", { name: /Start SillyOS 98|启动 SillyOS 98/ }).click();
  await expect(page.locator("[data-os-taskbar]")).toBeVisible();
}

test("desktop shell: windows overlap, focus, minimize, maximize, close", async ({ page }) => {
  await bootDesktopV1(page);
  // 无浮动系统菜单（开始菜单承载入口）。
  await expect(page.locator("[data-default-system-menu]")).toHaveCount(0);

  await page.locator("[data-os-desktop-icon='app.minesweeper']").dblclick();
  await page.locator("[data-os-desktop-icon='app.notepad']").dblclick();
  const mine = page.locator("[data-os-window='app.minesweeper']");
  const pad = page.locator("[data-os-window='app.notepad']");
  await expect(pad).toHaveAttribute("data-os-focused", "true");
  await expect(mine).toHaveAttribute("data-os-focused", "false");

  // 点击后台窗口标题栏 → 前置。
  await mine.locator("[data-os-titlebar]").click();
  await expect(mine).toHaveAttribute("data-os-focused", "true");

  // 最小化 → 从桌面消失、任务栏可还原。
  await mine.locator("[data-os-window-button='minimize']").click();
  await expect(mine).toHaveCount(0);
  await page.locator("[data-os-task-button='app.minesweeper']").click();
  await expect(page.locator("[data-os-window='app.minesweeper']")).toBeVisible();

  // 最大化铺满桌面区，还原回原矩形。
  const before = await pad.boundingBox();
  await pad.locator("[data-os-window-button='maximize']").click();
  const maxBox = await pad.boundingBox();
  expect(maxBox!.width).toBeGreaterThan(before!.width * 1.5);
  await pad.locator("[data-os-window-button='maximize']").click();
  const restored = await pad.boundingBox();
  expect(Math.round(restored!.width)).toBe(Math.round(before!.width));

  // 关闭移除窗口与任务栏按钮。
  await pad.locator("[data-os-window-button='close']").click();
  await expect(page.locator("[data-os-window='app.notepad']")).toHaveCount(0);
  await expect(page.locator("[data-os-task-button='app.notepad']")).toHaveCount(0);
});

test("minesweeper plays: reveal floods, flags count down, mines stay hidden", async ({ page }) => {
  await bootDesktopV1(page);
  await page.locator("[data-os-desktop-icon='app.minesweeper']").dblclick();
  await expect(page.locator("[data-os-mine-board]")).toHaveAttribute(
    "data-os-mine-board",
    "playing",
  );
  await page.locator("[data-os-mine-cell='4.4']").click();
  // 首点安全：至少翻开一格且盘面仍在进行。
  const revealed = page.locator("[data-os-mine-state='revealed']");
  expect(await revealed.count()).toBeGreaterThan(0);
  await page.locator("[data-os-mine-cell='0.0']").click({ button: "right" });
  await expect(page.locator("[data-os-mine-lcd='flags']")).toHaveText("009");
  await expect(page.locator("[data-os-mine-state='flagged']")).toHaveCount(1);
});

test("notepad files persist through save and load; board rolls back", async ({ page }) => {
  await bootDesktopV1(page);
  await page.locator("[data-os-desktop-icon='app.notepad']").dblclick();
  await page.locator("[data-os-notepad-text]").fill("persist me");
  await page.locator("[data-os-notepad-name]").fill("readme.txt");
  await page.locator("[data-os-notepad-save]").click();
  await expect(page.locator("[data-os-notepad-file='readme.txt']")).toBeVisible();

  // 开始菜单 → 手动存档。
  await page.locator("[data-os-start-button]").click();
  await page.locator("[data-os-start-item='system.save']").click();
  await expect(page.locator("[data-system-surface='saves']")).toBeVisible();
  await page
    .getByRole("button", { name: /^(Manual save|手动保存)$/ })
    .first()
    .click();
  await page.keyboard.press("Escape");

  // 玩扫雷改变状态。
  await page.locator("[data-os-desktop-icon='app.minesweeper']").dblclick();
  await page.locator("[data-os-mine-cell='4.4']").click();
  await expect(page.locator("[data-os-mine-board]")).toHaveCount(1);

  // 读档：盘面回滚、文件仍在。
  await page.locator("[data-os-start-button]").click();
  await page.locator("[data-os-start-item='system.save']").click();
  await page
    .getByRole("button", { name: /Load Manual save|载入手动存档/ })
    .first()
    .click();
  await page.getByRole("button", { name: /Confirm|确认/ }).click();
  await expect(page.locator("[data-os-mine-board]")).toHaveCount(0);
  // 记事本窗口是 UI 瞬态（读档后仍开着）——直接断言其文件列表已还原。
  await expect(page.locator("[data-os-notepad-file='readme.txt']").first()).toBeVisible();
});

test("start menu shutdown shows the classic screen and returns", async ({ page }) => {
  await bootDesktopV1(page);
  await page.locator("[data-os-start-button]").click();
  await page.locator("[data-os-start-item='system.shutdown']").click();
  await expect(page.locator("[data-os-shutdown]")).toBeVisible();
  await page.locator("[data-os-shutdown-back]").click();
  await expect(page.locator("[data-os-taskbar]")).toBeVisible();
});

test("@mobile portrait phones get a fluid full-viewport desktop", async ({ page }) => {
  await bootDesktopV1(page);
  const stage = await page.locator('[data-stage-layer="hud"]').boundingBox();
  const viewport = page.viewportSize();
  // fluid：无黑边，桌面平铺整个浏览器区域。
  expect(Math.round(stage!.width)).toBe(viewport!.width);
  expect(Math.round(stage!.height)).toBe(viewport!.height);
  // 开窗完整落在屏内。
  await page.locator("[data-os-desktop-icon='app.minesweeper']").dblclick();
  const win = await page.locator("[data-os-window='app.minesweeper']").boundingBox();
  expect(win!.x).toBeGreaterThanOrEqual(0);
  expect(win!.x + win!.width).toBeLessThanOrEqual(viewport!.width);
  // 开始菜单结构完好：菜单项横排（宽度远大于高度）。
  await page.locator("[data-os-start-button]").click();
  const item = await page.locator("[data-os-start-item='app.notepad']").boundingBox();
  expect(item!.width).toBeGreaterThan(item!.height * 2);
});
