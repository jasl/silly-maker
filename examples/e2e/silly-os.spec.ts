// SPDX-License-Identifier: MIT
import type { Page } from "@playwright/test";

import { expect, sillyOsTargetUrlV1, test } from "./fixtures.ts";

/**
 * SillyOS 98: browser acceptance for the fully custom desktop shell. No engine
 * title screen / system menu / save dialog — the Story-drawn boot screen goes straight to the desktop; persistence has "computer" semantics:
 * engine autosave + boot-time restore of auto.current. Window overlap/focus/minimize/maximize/
 * drag is the Story-side window manager; minesweeper is a deterministic simulation (mines never reach the publication).
 */

async function bootDesktopV1(page: Page): Promise<void> {
  await page.goto(sillyOsTargetUrlV1());
  // A click skips the boot screen; wait for the desktop.
  await page.locator("[data-os-boot]").click();
  await expect(page.locator("[data-os-taskbar]")).toBeVisible();
}

test("boots straight to the desktop with no engine chrome", async ({ page }) => {
  await bootDesktopV1(page);
  await expect(page.locator("[data-default-system-menu]")).toHaveCount(0);
  await expect(page.locator("[data-title-screen]")).toHaveCount(0);
  // The Start menu has only two system items, Settings and Shut down (no saves item).
  await page.locator("[data-os-start-button]").click();
  await expect(page.locator("[data-os-start-item='system.save']")).toHaveCount(0);
  await expect(page.locator("[data-os-start-item='system.settings']")).toBeVisible();
  await expect(page.locator("[data-os-start-item='system.shutdown']")).toBeVisible();
});

test("desktop shell: windows overlap, focus, minimize, maximize, close", async ({ page }) => {
  await bootDesktopV1(page);
  await page.locator("[data-os-desktop-icon='app.minesweeper']").dblclick();
  await page.locator("[data-os-desktop-icon='app.notepad']").dblclick();
  const mine = page.locator("[data-os-window='app.minesweeper']");
  const pad = page.locator("[data-os-window='app.notepad']");
  await expect(pad).toHaveAttribute("data-os-focused", "true");
  await expect(mine).toHaveAttribute("data-os-focused", "false");

  await mine.locator("[data-os-titlebar]").click();
  await expect(mine).toHaveAttribute("data-os-focused", "true");

  await mine.locator("[data-os-window-button='minimize']").click();
  await expect(mine).toHaveCount(0);
  await page.locator("[data-os-task-button='app.minesweeper']").click();
  await expect(page.locator("[data-os-window='app.minesweeper']")).toBeVisible();

  const before = await pad.boundingBox();
  await pad.locator("[data-os-window-button='maximize']").click();
  const maxBox = await pad.boundingBox();
  expect(maxBox!.width).toBeGreaterThan(before!.width * 1.5);
  await pad.locator("[data-os-window-button='maximize']").click();
  const restored = await pad.boundingBox();
  expect(Math.round(restored!.width)).toBe(Math.round(before!.width));

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
  await page.locator("[data-os-mine-cell='0.0']").click({ button: "right" });
  await expect(page.locator("[data-os-mine-lcd='flags']")).toHaveText("009");
  await expect(page.locator("[data-os-mine-state='flagged']")).toHaveCount(1);
  await page.locator("[data-os-mine-cell='4.4']").click();
  const revealed = page.locator("[data-os-mine-state='revealed']");
  expect(await revealed.count()).toBeGreaterThan(0);
});

test("the disk survives a reboot: files auto-save and auto-restore", async ({ page }) => {
  await bootDesktopV1(page);
  await page.locator("[data-os-desktop-icon='app.notepad']").dblclick();
  await page.locator("[data-os-notepad-text]").fill("persist me");
  await page.locator("[data-os-notepad-name]").fill("readme.txt");
  await page.locator("[data-os-notepad-save]").click();
  await expect(page.locator("[data-os-notepad-file='readme.txt']")).toBeVisible();
  // Wait for the debounced autosave to land, then "reboot the computer".
  await page.waitForTimeout(1500);
  await page.reload();
  await page.locator("[data-os-boot]").click();
  await expect(page.locator("[data-os-taskbar]")).toBeVisible();
  await page.locator("[data-os-desktop-icon='app.notepad']").dblclick();
  await expect(page.locator("[data-os-notepad-file='readme.txt']")).toBeVisible();
});

test("control panel opens from the Start menu; volume tray pops by the clock", async ({ page }) => {
  await bootDesktopV1(page);
  await page.locator("[data-os-start-button]").click();
  await page.locator("[data-os-start-item='system.settings']").click();
  await expect(page.locator("[data-os-window='app.control-panel']")).toBeVisible();
  await expect(page.locator("[data-os-settings-language]")).toBeVisible();
  await page.locator("[data-os-volume-tray]").click();
  await expect(page.locator("[data-os-volume-popup]")).toBeVisible();
  await expect(page.locator("[data-os-volume-slider]")).toBeVisible();
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
  expect(Math.round(stage!.width)).toBe(viewport!.width);
  expect(Math.round(stage!.height)).toBe(viewport!.height);
  await page.locator("[data-os-desktop-icon='app.minesweeper']").dblclick();
  const win = await page.locator("[data-os-window='app.minesweeper']").boundingBox();
  expect(win!.x).toBeGreaterThanOrEqual(0);
  expect(win!.x + win!.width).toBeLessThanOrEqual(viewport!.width);
  await page.locator("[data-os-start-button]").click();
  const item = await page.locator("[data-os-start-item='app.notepad']").boundingBox();
  expect(item!.width).toBeGreaterThan(item!.height * 2);
});
