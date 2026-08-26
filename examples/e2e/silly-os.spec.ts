// SPDX-License-Identifier: MIT
import type { Locator, Page } from "@playwright/test";

import { expect, sillyOsTargetUrlV1, test } from "./fixtures.ts";

const translationIntentV1 =
  "Translate this visual novel and keep every character's voice consistent.";

async function openCreatorHomeV1(page: Page): Promise<void> {
  await page.goto(sillyOsTargetUrlV1("?locale=en"));
  await expect(page.locator('[data-silly-os-view="home"]')).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "What would you like to make?", level: 1 }),
  ).toBeVisible();
}

async function openTranslationWorkspaceV1(page: Page): Promise<Locator> {
  await openCreatorHomeV1(page);
  await page.getByRole("textbox", { name: "What would you like to make?" }).fill(
    translationIntentV1,
  );
  await page.getByRole("button", { name: "Create program" }).click();

  const workspace = page.getByRole("main", { name: "SillyOS program workspace" });
  await expect(workspace).toBeVisible();
  await expect(workspace).toHaveAttribute("data-workspace-layout", /^(dual|single)-pane$/);
  await expect(page.getByText(translationIntentV1, { exact: true })).toBeVisible();
  await expect(page.getByText("Translation Workshop", { exact: true }).first()).toBeVisible();
  return workspace;
}

async function expectNoPageOverflowV1(page: Page): Promise<void> {
  const overflow = await page.evaluate<{ body: number; document: number }>(
    `({
      body: document.body.scrollWidth - document.body.clientWidth,
      document: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    })`,
  );
  expect(overflow.document).toBeLessThanOrEqual(1);
  expect(overflow.body).toBeLessThanOrEqual(1);
}

test("Creator Home creates and accepts a reviewable Program", async ({ page }) => {
  await openTranslationWorkspaceV1(page);

  await expect(page.getByRole("button", { name: "Accept program" })).toBeVisible();
  await page.getByRole("button", { name: "Accept program" }).click();
  await expect(page.getByText("Program accepted", { exact: true }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Accept program" })).toHaveCount(0);

  await page.getByRole("tab", { name: "Source" }).click();
  await expect(page.getByLabel("Program preview source")).toContainText("defineProgram");

  await page.getByRole("tab", { name: "Capabilities" }).click();
  await expect(page.getByRole("heading", { name: "Capabilities" })).toBeVisible();
  await expect(page.getByText("Not connected", { exact: true })).toBeVisible();

  await page.getByRole("tab", { name: "Activity" }).click();
  await expect(page.getByRole("heading", { name: "Activity" })).toBeVisible();
  await expect(page.getByText("Accepted the Program proposal", { exact: true })).toBeVisible();
  await expectNoPageOverflowV1(page);
});

test("proposal rejection and follow-up stay visible in the current session", async ({ page }) => {
  await openTranslationWorkspaceV1(page);

  await page.getByRole("button", { name: "Reject proposal" }).click();
  await expect(page.getByText("Proposal rejected", { exact: true }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Reject proposal" })).toHaveCount(0);

  const followUp = "Use a warmer voice for the protagonist.";
  await page.getByRole("textbox", { name: "Ask for a change…" }).fill(followUp);
  await page.getByRole("button", { name: "Send" }).click();
  await expect(page.getByText(followUp, { exact: true })).toBeVisible();
  await expect(
    page.getByText(/I recorded that follow-up in the .* session/u),
  ).toBeVisible();

  await page.getByRole("tab", { name: "Activity" }).click();
  await expect(page.getByText("Rejected the Program proposal", { exact: true })).toBeVisible();
  await expect(page.getByText("Added a creator follow-up", { exact: true })).toBeVisible();
});

test("desktop workspace keeps its minimum geometry and keyboard-resizable split", async ({ page }) => {
  const workspace = await openTranslationWorkspaceV1(page);
  await expect(workspace).toHaveAttribute("data-workspace-layout", "dual-pane");

  const topbar = page.locator(".program-workspace__topbar");
  const chat = page.locator('[data-workspace-pane="chat"]');
  const workpiece = page.locator('[data-workspace-pane="workpiece"]');
  const separator = page.getByRole("separator", {
    name: "Resize conversation and workpiece panes",
  });
  const topbarBox = await topbar.boundingBox();
  const chatBox = await chat.boundingBox();
  const workpieceBox = await workpiece.boundingBox();

  expect(Math.round(topbarBox?.height ?? 0)).toBe(56);
  expect(chatBox?.width ?? 0).toBeGreaterThanOrEqual(280);
  expect(workpieceBox?.width ?? 0).toBeGreaterThanOrEqual(400);

  const initialWidth = Number(await separator.getAttribute("aria-valuenow"));
  await separator.focus();
  await separator.press("ArrowRight");
  await expect(separator).toHaveAttribute("aria-valuenow", String(initialWidth + 8));
  await separator.press("Shift+ArrowRight");
  await expect(separator).toHaveAttribute("aria-valuenow", String(initialWidth + 40));
  await separator.press("Home");
  await expect(separator).toHaveAttribute("aria-valuenow", "280");

  const resizedWorkpiece = await workpiece.boundingBox();
  expect(resizedWorkpiece?.width ?? 0).toBeGreaterThanOrEqual(400);
  await expect(page.getByRole("textbox", { name: "Ask for a change…" })).toBeVisible();
  await expectNoPageOverflowV1(page);
});

test("workspace switches cleanly at the desktop and mobile boundary", async ({ page }) => {
  await page.setViewportSize({ width: 768, height: 700 });
  const workspace = await openTranslationWorkspaceV1(page);
  await expect(workspace).toHaveAttribute("data-workspace-layout", "dual-pane");
  await expect(page.locator('[data-workspace-pane="chat"]')).toBeVisible();
  await expect(page.locator('[data-workspace-pane="workpiece"]')).toBeVisible();
  await expectNoPageOverflowV1(page);

  await page.setViewportSize({ width: 767, height: 700 });
  await expect(workspace).toHaveAttribute("data-workspace-layout", "single-pane");
  await expect(page.getByRole("navigation", { name: "Workspace views" })).toBeVisible();
  await expect(page.locator('[data-workspace-pane="chat"]')).toBeVisible();
  await expect(page.locator('[data-workspace-pane="workpiece"]')).toBeHidden();
  await expectNoPageOverflowV1(page);
});

test("full-screen workpiece exits with Escape and restores focus", async ({ page }) => {
  await openTranslationWorkspaceV1(page);
  const enterFullscreen = page.getByRole("button", { name: "Open full screen" });
  await enterFullscreen.focus();
  await enterFullscreen.press("Enter");

  const workpiece = page.locator('[data-workspace-pane="workpiece"]');
  const viewport = page.viewportSize();
  const fullscreenBox = await workpiece.boundingBox();
  await expect(page.getByRole("button", { name: "Exit full screen" })).toBeVisible();
  expect(fullscreenBox?.x ?? Number.POSITIVE_INFINITY).toBeLessThanOrEqual(1);
  expect(fullscreenBox?.y ?? Number.POSITIVE_INFINITY).toBeLessThanOrEqual(1);
  expect(Math.abs((fullscreenBox?.width ?? 0) - (viewport?.width ?? 0))).toBeLessThanOrEqual(1);
  expect(Math.abs((fullscreenBox?.height ?? 0) - (viewport?.height ?? 0))).toBeLessThanOrEqual(1);

  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Open full screen" })).toBeFocused();
  await expectNoPageOverflowV1(page);
});

test("@mobile portrait uses one navigable pane without page overflow", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const workspace = await openTranslationWorkspaceV1(page);
  await expect(workspace).toHaveAttribute("data-workspace-layout", "single-pane");

  const navigation = page.getByRole("navigation", { name: "Workspace views" });
  const chat = page.locator('[data-workspace-pane="chat"]');
  const workpiece = page.locator('[data-workspace-pane="workpiece"]');
  await expect(chat).toBeVisible();
  await expect(workpiece).toBeHidden();
  await expectNoPageOverflowV1(page);

  await navigation.getByRole("button", { name: "View" }).click();
  await expect(chat).toBeHidden();
  await expect(workpiece).toBeVisible();
  await expect(workpiece).toHaveAttribute("data-workpiece-tab", "view");
  await expectNoPageOverflowV1(page);

  await navigation.getByRole("button", { name: "Activity" }).click();
  await expect(workpiece).toHaveAttribute("data-workpiece-tab", "activity");
  await expect(page.getByRole("heading", { name: "Activity" })).toBeVisible();
  await expectNoPageOverflowV1(page);

  await navigation.getByRole("button", { name: "Chat" }).click();
  await expect(chat).toBeVisible();
  await expect(workpiece).toBeHidden();
  await expect(page.getByRole("textbox", { name: "Ask for a change…" })).toBeVisible();
  await expectNoPageOverflowV1(page);
});
