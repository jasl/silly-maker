// SPDX-License-Identifier: MIT
import type { Locator, Page } from "@playwright/test";

import { expect, sillyOsTargetUrlV1, test } from "./fixtures.ts";

const translationIntentV1 =
  "Translate this visual novel and keep every character's voice consistent.";

async function expectProgramStorageReadyV1(page: Page): Promise<void> {
  await expect(page.locator('[data-program-storage-state="ready"]')).toBeVisible();
}

async function openCreatorHomeV1(page: Page): Promise<void> {
  await page.goto(sillyOsTargetUrlV1("?locale=en"));
  await expectProgramStorageReadyV1(page);
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
  await expectProgramStorageReadyV1(page);
  await expect(workspace).toHaveAttribute("data-workspace-layout", /^(dual|single)-pane$/);
  await expect(page.getByText(translationIntentV1, { exact: true })).toBeVisible();
  await expect(page.getByText("Translation Workshop", { exact: true }).first()).toBeVisible();
  return workspace;
}

async function readProgramIdV1(workspace: Locator): Promise<string> {
  const programId = await workspace.getAttribute("data-program-id");
  if (programId === null) throw new Error("SillyOS workspace has no Program identity");
  return programId;
}

async function openRecentTranslationProgramV1(
  page: Page,
  expected: {
    readonly programId: string;
    readonly revision: number;
    readonly status: "Program accepted" | "Preview" | "Proposal rejected";
  },
): Promise<Locator> {
  const recentProgram = page.getByRole("button", {
    name: "Open program: Translation Workshop",
    exact: true,
  });
  await expect(recentProgram).toBeVisible();
  await expect(recentProgram).toHaveAttribute("data-program-id", expected.programId);
  await expect(recentProgram).toContainText(
    `v${String(expected.revision)} · ${expected.status}`,
  );
  await recentProgram.click();

  const workspace = page.getByRole("main", { name: "SillyOS program workspace" });
  await expect(workspace).toBeVisible();
  await expectProgramStorageReadyV1(page);
  await expect(workspace).toHaveAttribute("data-program-id", expected.programId);
  await expect(workspace).toHaveAttribute("data-program-revision", String(expected.revision));
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

test("Creator Home persists and reopens an exact accepted Program", async ({ page }) => {
  const workspace = await openTranslationWorkspaceV1(page);
  const programId = await readProgramIdV1(workspace);
  await expect(workspace).toHaveAttribute("data-program-revision", "1");

  await expect(page.getByRole("button", { name: "Accept program" })).toBeVisible();
  await page.getByRole("button", { name: "Accept program" }).click();
  await expectProgramStorageReadyV1(page);
  await expect(page.getByText("Program accepted", { exact: true }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Accept program" })).toHaveCount(0);

  await page.getByRole("tab", { name: "Source" }).click();
  await expect(page.getByLabel("Program preview source")).toContainText("defineProgram");

  await page.getByRole("tab", { name: "Capabilities" }).click();
  await expect(page.getByRole("heading", { name: "Capabilities" })).toBeVisible();
  await expect(page.getByText("Not connected", { exact: true })).toBeVisible();

  await page.getByRole("tab", { name: "Activity" }).click();
  await expect(page.getByRole("heading", { name: "Activity" })).toBeVisible();
  await expect(page.getByText("Accepted Program proposal v1", { exact: true })).toBeVisible();
  await expectNoPageOverflowV1(page);

  await page.getByRole("button", { name: "Creator home" }).click();
  await expect(page.locator('[data-silly-os-view="home"]')).toBeVisible();
  await expectProgramStorageReadyV1(page);
  await page.reload();
  await expectProgramStorageReadyV1(page);
  await expect(page.getByRole("heading", { name: "Recent programs", level: 2 })).toBeVisible();

  await openRecentTranslationProgramV1(page, {
    programId,
    revision: 1,
    status: "Program accepted",
  });
  await expect(page.locator('[data-proposal-status="accepted"]')).toBeVisible();
  await expect(page.getByText(translationIntentV1, { exact: true })).toBeVisible();
  await expect(page.getByText("Program accepted", { exact: true }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Accept program" })).toHaveCount(0);
  await page.getByRole("tab", { name: "Source" }).click();
  await expect(page.getByLabel("Program preview source")).toContainText("revision: 1");
  await page.getByRole("tab", { name: "Activity" }).click();
  await expect(page.getByText("Accepted Program proposal v1", { exact: true })).toBeVisible();
});

test("a follow-up creates a new exact Program revision for review", async ({ page }) => {
  await openTranslationWorkspaceV1(page);

  await page.getByRole("button", { name: "Reject proposal" }).click();
  await expect(page.getByText("Proposal rejected", { exact: true }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Reject proposal" })).toHaveCount(0);

  const followUp = "Use a warmer voice for the protagonist.";
  await page.getByRole("textbox", { name: "Ask for a change…" }).fill(followUp);
  await page.getByRole("button", { name: "Send" }).click();
  await expect(page.getByText(followUp, { exact: true })).toBeVisible();
  await expect(
    page.getByText(/I incorporated that follow-up into .* proposal v2/u),
  ).toBeVisible();
  await expect(page.locator('[data-proposal-status="pending"]')).toContainText("v2");
  await expect(page.getByRole("button", { name: "Accept program" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Reject proposal" })).toBeVisible();

  await page.getByRole("tab", { name: "Source" }).click();
  const source = page.getByLabel("Program preview source");
  await expect(source).toContainText("revision: 2");
  await expect(source).toContainText(followUp);

  await page.getByRole("tab", { name: "Activity" }).click();
  await expect(page.getByText("Rejected Program proposal v1", { exact: true })).toBeVisible();
  await expect(page.getByText("Added a creator follow-up", { exact: true })).toBeVisible();
  await expect(page.getByText("Created Program proposal v2", { exact: true })).toBeVisible();
});

test("two pages keep the durable winner when one submits a stale revision", async ({ page, context }) => {
  const firstWorkspace = await openTranslationWorkspaceV1(page);
  const programId = await readProgramIdV1(firstWorkspace);

  const stalePage = await context.newPage();
  await stalePage.goto(sillyOsTargetUrlV1("?locale=en"));
  await expectProgramStorageReadyV1(stalePage);
  const staleWorkspace = await openRecentTranslationProgramV1(stalePage, {
    programId,
    revision: 1,
    status: "Preview",
  });

  const winningFollowUp = "Preserve the winner selected by the first page.";
  await page.getByRole("textbox", { name: "Ask for a change…" }).fill(winningFollowUp);
  await page.getByRole("button", { name: "Send" }).click();
  await expectProgramStorageReadyV1(page);
  await expect(firstWorkspace).toHaveAttribute("data-program-revision", "2");

  const staleFollowUp = "This stale page must not replace the durable winner.";
  await stalePage.getByRole("textbox", { name: "Ask for a change…" }).fill(staleFollowUp);
  await stalePage.getByRole("button", { name: "Send" }).click();
  await expect(stalePage.locator('[data-program-storage-state="failed"]')).toBeVisible();
  await expect(
    stalePage.getByRole("alert").filter({
      hasText: "Another page updated this Program. The durable version has been reopened.",
    }),
  ).toBeVisible();
  await expect(staleWorkspace).toHaveAttribute("data-program-revision", "2");
  await expect(stalePage.getByText(winningFollowUp, { exact: true })).toBeVisible();
  await expect(
    stalePage.locator('[data-chat-role="user"]').getByText(staleFollowUp, { exact: true }),
  ).toHaveCount(0);
  await stalePage.close();
});

test("the query-gated Browser Pi Worker publishes one exact successor without retaining its test key", async ({ page }) => {
  const sentinel = "sillyos-browser-pi-sentinel-key";
  const observedNetwork: string[] = [];
  const observedConsole: string[] = [];
  page.on("request", (request) => {
    observedNetwork.push(
      `${request.url()}\n${request.postData() ?? ""}\n${JSON.stringify(request.headers())}`,
    );
  });
  page.on("console", (message) => observedConsole.push(message.text()));

  await page.goto(sillyOsTargetUrlV1("?locale=en&agent=pi-test"));
  await expectProgramStorageReadyV1(page);
  await expect(page.getByRole("heading", { name: "What would you like to make?", level: 1 }))
    .toBeVisible();
  await expect(page.getByText("Browser Pi wiring check", { exact: true })).toBeVisible();

  const creatorIntent = page.getByRole("textbox", { name: "What would you like to make?" });
  await creatorIntent.fill(translationIntentV1);
  await creatorIntent.press("Enter");
  await expect(page.locator('[data-silly-os-view="home"]')).toBeVisible();
  await expect(page.getByRole("main", { name: "SillyOS program workspace" })).toHaveCount(0);

  const keyInput = page.getByLabel("Synthetic test key (memory only)");
  await keyInput.fill(sentinel);
  await page.getByRole("button", { name: "Initialize Pi test" }).click();
  await expect(keyInput).toHaveValue("");
  await expect(page.getByText("Pi test ready", { exact: true })).toBeVisible();

  await creatorIntent.fill(translationIntentV1);
  await page.getByRole("button", { name: "Create program" }).click();
  const workspace = page.getByRole("main", { name: "SillyOS program workspace" });
  await expect(workspace).toBeVisible();
  await expectProgramStorageReadyV1(page);
  const programId = await readProgramIdV1(workspace);

  const followUp = "Make every review decision explicit.";
  await page.getByRole("textbox", { name: "Ask for a change…" }).fill(followUp);
  await page.getByRole("button", { name: "Send" }).click();
  await expect(page.getByText(followUp, { exact: true })).toBeVisible();
  await expect(
    page.locator('[data-chat-role="creator"]').getByText(
      "Deterministic test proposal ready.",
      { exact: true },
    ),
  ).toBeVisible();
  await expect(page.locator('[data-proposal-status="pending"]')).toContainText("v2");

  await page.getByRole("tab", { name: "Source" }).click();
  await expect(page.getByLabel("Program preview source")).toContainText("revision: 2");
  await expect(page.getByLabel("Program preview source")).toContainText(followUp);
  await page.getByRole("tab", { name: "Capabilities" }).click();
  await expect(page.getByText("Pi 0.84.3 test wiring", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Creator home" }).click();
  await expect(page.locator('[data-silly-os-view="home"]')).toBeVisible();
  await expectProgramStorageReadyV1(page);
  await page.reload();
  await expectProgramStorageReadyV1(page);
  await expect(page.getByRole("heading", { name: "Recent programs", level: 2 })).toBeVisible();

  const recentProgram = page.getByRole("button", {
    name: "Open program: Translation Workshop",
    exact: true,
  });
  await expect(recentProgram).toHaveAttribute("data-program-id", programId);
  await expect(recentProgram).toContainText("v2 · Preview");
  await expect(recentProgram).toBeDisabled();

  const reloadedKeyInput = page.getByLabel("Synthetic test key (memory only)");
  await reloadedKeyInput.fill(sentinel);
  await page.getByRole("button", { name: "Initialize Pi test" }).click();
  await expect(reloadedKeyInput).toHaveValue("");
  await expect(page.getByText("Pi test ready", { exact: true })).toBeVisible();

  await openRecentTranslationProgramV1(page, {
    programId,
    revision: 2,
    status: "Preview",
  });
  await expect(page.locator('[data-proposal-status="pending"]')).toContainText("v2");
  await expect(page.getByText(followUp, { exact: true })).toBeVisible();
  await expect(
    page.locator('[data-chat-role="creator"]').getByText(
      "Deterministic test proposal ready.",
      { exact: true },
    ),
  ).toBeVisible();
  await page.getByRole("tab", { name: "Source" }).click();
  await expect(page.getByLabel("Program preview source")).toContainText("revision: 2");
  await expect(page.getByLabel("Program preview source")).toContainText(followUp);

  const durableProjection = await page.evaluate(async () => {
    const storageValues = [
      ...Object.entries(localStorage),
      ...Object.entries(sessionStorage),
    ];
    const indexedDbValues: unknown[] = [];
    if (typeof indexedDB.databases === "function") {
      for (const database of await indexedDB.databases()) {
        const databaseName = database.name;
        if (databaseName === undefined) continue;
        const opened = await new Promise<IDBDatabase>((resolve, reject) => {
          const request = indexedDB.open(databaseName);
          request.addEventListener("error", () => reject(request.error));
          request.addEventListener("success", () => resolve(request.result));
        });
        try {
          const storeNames = [...opened.objectStoreNames];
          for (const storeName of storeNames) {
            const transaction = opened.transaction(storeName, "readonly");
            const values = await new Promise<unknown[]>((resolve, reject) => {
              const request = transaction.objectStore(storeName).getAll();
              request.addEventListener("error", () => reject(request.error));
              request.addEventListener("success", () => resolve(request.result));
            });
            indexedDbValues.push(...values);
          }
        } finally {
          opened.close();
        }
      }
    }
    const cacheValues: string[] = [];
    if ("caches" in globalThis) {
      for (const cacheName of await caches.keys()) {
        const cache = await caches.open(cacheName);
        for (const request of await cache.keys()) {
          cacheValues.push(request.url);
          const response = await cache.match(request);
          if (response !== undefined) cacheValues.push(await response.clone().text());
        }
      }
    }
    return JSON.stringify({
      url: location.href,
      document: document.documentElement.outerHTML,
      storageValues,
      indexedDbValues,
      cacheValues,
    });
  });
  expect(durableProjection).not.toContain(sentinel);
  expect(observedNetwork.join("\n")).not.toContain(sentinel);
  expect(observedConsole.join("\n")).not.toContain(sentinel);

  await page.getByRole("button", { name: "Forget test key" }).click();
  await expect(page.getByRole("button", { name: "Forget test key" })).toHaveCount(0);
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
