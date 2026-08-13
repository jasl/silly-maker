// SPDX-License-Identifier: MIT
import { readFile } from "node:fs/promises";

import type { Page } from "@playwright/test";

import { catcafeTargetUrlV1, expect, test } from "./fixtures.ts";

/**
 * Stage hit regions in a real browser, proven on the cat-cafe example:
 * content-resolved zones render as focusable buttons inside the stage,
 * pointer/touch/keyboard all reach the same semantic path, and gameplay
 * rules (trust bands, daily budget) stay authoritative.
 */

/** The boot splash fronts the title screen; click it away deterministically. */
async function dismissSplashV1(page: Page): Promise<void> {
  const splash = page.locator("[data-boot-splash]");
  const title = page.locator("[data-title-screen]");
  // Auto-dismiss may already have cleared the splash after a slow reload.
  await expect(splash.or(title)).toBeVisible();
  if (await splash.isVisible()) await splash.click();
  await expect(title).toBeVisible();
}

/** Wait until the title Continue control reflects autosave availability. */
async function expectContinueAvailabilityV1(page: Page, available: boolean): Promise<void> {
  const continueButton = page.locator("[data-title-continue]");
  await expect(continueButton).toHaveAttribute(
    "data-title-continue-available",
    available ? "true" : "false",
  );
  if (available) await expect(continueButton).toBeEnabled();
  else await expect(continueButton).toBeDisabled();
}

/** Wipe the example's IndexedDB so Continue/resume tests start from a blank disk. */
async function clearCatCafeRecordsV1(page: Page): Promise<void> {
  await page.goto(catcafeTargetUrlV1());
  await page.evaluate(async () => {
    const name = "sillymaker.example-cat-cafe";
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.deleteDatabase(name);
      request.addEventListener("success", () => resolve());
      request.addEventListener(
        "error",
        () => reject(request.error ?? new Error("indexedDB.deleteDatabase failed")),
      );
      request.addEventListener("blocked", () => resolve());
    });
  });
}

/** Seed a pending backup from this test's real same-slot Player save. */
async function seedCatCafePendingBackupV1(page: Page, slotId: string): Promise<Uint8Array> {
  const expectedBackupBytes = await page.evaluate(async (slot) => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("sillymaker.example-cat-cafe", 1);
      request.addEventListener("success", () => resolve(request.result));
      request.addEventListener(
        "error",
        () => reject(request.error ?? new Error("save recovery fixture could not open IndexedDB")),
      );
    });
    try {
      const storyId = encodeURIComponent("story.example.cat-cafe");
      const sourceKey = `save-record.v1:${storyId}:${slot}`;
      const backupKey = `save-migration-backup.v1:${storyId}:${slot}`;
      return await new Promise<number[]>((resolve, reject) => {
        const transaction = database.transaction("records", "readwrite");
        const store = transaction.objectStore("records");
        let expectedBytes: number[] | undefined;
        const sourceRequest = store.get(["save", sourceKey]);
        sourceRequest.addEventListener("success", () => {
          const source = sourceRequest.result as
            | { readonly bytes: ArrayBuffer }
            | undefined;
          if (source === undefined) {
            transaction.abort();
            reject(new Error("save recovery fixture source record is missing"));
            return;
          }
          const backupBytes = source.bytes.slice(0);
          expectedBytes = Array.from(new Uint8Array(backupBytes.slice(0)));
          store.put({
            namespace: "save",
            key: backupKey,
            revision: 1,
            bytes: backupBytes,
          });
        });
        transaction.addEventListener("complete", () => {
          if (expectedBytes === undefined) {
            reject(new Error("save recovery fixture source bytes are missing"));
            return;
          }
          resolve(expectedBytes);
        });
        transaction.addEventListener(
          "error",
          () => reject(transaction.error ?? new Error("save recovery fixture write failed")),
        );
        transaction.addEventListener(
          "abort",
          () => reject(transaction.error ?? new Error("save recovery fixture write aborted")),
        );
      });
    } finally {
      database.close();
    }
  }, slotId);
  return Uint8Array.from(expectedBackupBytes);
}

async function advanceRevealedSayV1(page: Page): Promise<void> {
  // The typewriter turns the first click into reveal-all; waiting for the
  // completed reveal keeps one click = one advance.
  await expect(page.locator("[data-dialogue]")).toHaveAttribute("data-dialogue-reveal", "complete");
  await page.locator("[data-dialogue-advance]").click();
}

async function playOpeningV1(page: Page): Promise<void> {
  // The boot splash fronts the title screen; New
  // game then starts the opening scene automatically.
  await dismissSplashV1(page);
  await page.getByRole("button", { name: "新游戏" }).click();
  for (let index = 0; index < 3; index += 1) {
    await advanceRevealedSayV1(page);
  }
  await page.getByRole("button", { name: "就叫「小雨」" }).click();
  await advanceRevealedSayV1(page);
  await advanceRevealedSayV1(page);
  await expect(page.locator("[data-dialogue]")).toHaveCount(0);
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
  await expect(page.locator("[data-cc-pet-burst='text.cc.pet.tail.low'] p")).toBeVisible();
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

test("the stage scales uniformly on small viewports and hit regions still work", async ({ page }) => {
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

test("the DevDock advertises Studio as a same-origin shortcut", async ({ page }) => {
  await page.goto(catcafeTargetUrlV1("?capability=debug_tools"));
  await dismissSplashV1(page);
  await page.getByRole("button", { name: "调试" }).click();
  const studio = page.getByRole("group", { name: "调试" }).getByRole("link", { name: "Studio" });
  await expect(studio).toHaveAttribute("href", "/__sillymaker/studio/");
  await expect(studio).toHaveAttribute("target", "_blank");
});

test("debug dock inputs accept keyboard while the title screen owns focus", async ({ page }) => {
  await page.goto(catcafeTargetUrlV1("?capability=debug_tools&capability=cheats"));
  await dismissSplashV1(page);
  await expect(page.locator("[data-title-screen]")).toBeVisible();

  await page.getByRole("button", { name: "调试" }).click();
  await page.getByRole("group", { name: "调试" })
    .getByRole("button", { name: "作弊" })
    .click();
  const cheats = page.getByRole("dialog", { name: "作弊" });
  const value = cheats.locator("[data-cc-debug-value]");
  await value.click();
  await value.press("ControlOrMeta+A");
  await value.pressSequentially("77");
  await expect(value).toHaveValue("77");

  await cheats.getByRole("button", { name: "关闭", exact: true }).click();
  await expect(cheats).toHaveCount(0);

  await page.getByRole("group", { name: "调试" })
    .getByRole("button", { name: "状态编辑" })
    .click();
  const tuner = page.getByRole("dialog", { name: "状态编辑" });
  const filter = tuner.getByRole("searchbox", { name: "过滤状态路径" });
  await filter.click();
  await filter.pressSequentially("calendar.day");
  await expect(filter).toHaveValue("calendar.day");
});

test("the DevDock tuning panel commits debug commands through the session", async ({ page }) => {
  await page.goto(catcafeTargetUrlV1("?capability=debug_tools&capability=cheats"));
  await playOpeningV1(page);

  await page.getByRole("button", { name: "调试" }).click();
  await page.getByRole("group", { name: "调试" })
    .getByRole("button", { name: "作弊" })
    .click();
  const dock = page.getByRole("dialog", { name: "作弊" });
  const tuning = dock.locator("[data-cc-debug-tuning]");

  // Set trust to 77 through the debug channel: the same atomic commit
  // path as gameplay, so the HUD (still mounted under the dock) updates
  // from the authoritative state.
  await tuning.locator("[data-cc-debug-stat]").selectOption("cat.trust");
  const value = tuning.locator("[data-cc-debug-value]");
  await value.click();
  await value.clear();
  await value.pressSequentially("77");
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

test("the engine state table patches authoritative leaves through the debug channel", async ({ page }) => {
  await page.goto(catcafeTargetUrlV1("?capability=debug_tools&capability=cheats"));
  await playOpeningV1(page);

  await page.getByRole("button", { name: "调试" }).click();
  await page.getByRole("group", { name: "调试" })
    .getByRole("button", { name: "状态编辑" })
    .click();
  const dock = page.getByRole("dialog", { name: "状态编辑" });
  const row = dock.locator("[data-engine-state-tuner-path='simulation.cat.trust']");
  const trust = row.getByRole("spinbutton", { name: "simulation.cat.trust" });
  await trust.click();
  await trust.clear();
  await trust.pressSequentially("77");
  await row.getByRole("button", { name: "写入" }).click();
  await expect(dock.getByRole("status")).toHaveText("已写入");
  await expect(page.locator("[data-cc-stats]")).toContainText("信任77");
});

test("the detached Narrative preview covers representative routes without changing live play", async ({ page }) => {
  await page.goto(catcafeTargetUrlV1("?capability=debug_tools"));
  await playOpeningV1(page);

  const liveStage = page.locator("[data-cc-stage]");
  const calendarBefore = await page.locator("[data-cc-calendar]").getAttribute("data-cc-calendar");
  const statsBefore = await page.locator("[data-cc-stats-text]").textContent();
  const liveCatBefore = await liveStage.locator("[data-cc-cat]").getAttribute("data-cc-cat");

  await page.getByRole("button", { name: "调试" }).click();
  await page.getByRole("group", { name: "调试" })
    .getByRole("button", { name: "剧情预览" })
    .click();
  const dock = page.getByRole("dialog", { name: "剧情预览" });
  const preview = dock.locator("[data-cc-narrative-preview]");
  const selector = preview.locator("[data-cc-narrative-preview-select]");

  await selector.selectOption("node.catcafe.opening");
  await expect(preview).toHaveAttribute("data-cc-narrative-preview", "node.catcafe.opening");
  await expect(preview.locator("[data-cc-cat]")).toHaveCount(0);
  await expect(preview.locator("[data-cc-surface='shopfront']")).toBeVisible();

  await selector.selectOption("node.catcafe.unnamed@later");
  await expect(preview).toHaveAttribute(
    "data-cc-narrative-preview",
    "node.catcafe.unnamed@later",
  );
  await expect(preview.getByText("名字先欠着。她不在意，已经把你的围裙当成了床。")).toBeVisible();
  await expect(preview.locator("[data-cc-cat='kitten']")).toBeVisible();

  await dock.getByRole("button", { name: "关闭", exact: true }).click();
  await expect(dock).toHaveCount(0);
  await expect(page.locator("[data-cc-calendar]")).toHaveAttribute(
    "data-cc-calendar",
    calendarBefore ?? "",
  );
  await expect(page.locator("[data-cc-stats-text]")).toHaveText(statsBefore ?? "");
  await expect(liveStage.locator("[data-cc-cat]")).toHaveAttribute(
    "data-cc-cat",
    liveCatBefore ?? "",
  );
});

test("Settings and Load game open above the title screen and stay interactive", async ({ page }) => {
  await page.goto(catcafeTargetUrlV1());
  await dismissSplashV1(page);

  // Settings from the front door: the dialog must paint above the title
  // screen (regression: it used to open underneath, looking frozen) and
  // its controls must be really clickable, not just present.
  await page.locator("[data-title-settings]").click();
  const settings = page.getByRole("dialog", { name: "设置" });
  await expect(settings).toBeVisible();
  await settings.getByRole("button", { name: "关闭", exact: true }).click();
  await expect(settings).toBeHidden();

  // Load game: same story for the save dialog.
  await page.locator("[data-title-load-game]").click();
  const saves = page.getByRole("dialog", { name: "保存" });
  await expect(saves).toBeVisible();
  await saves.getByRole("button", { name: "关闭", exact: true }).click();
  await expect(saves).toBeHidden();

  // The title screen is alive again after both round-trips.
  await expect(page.getByRole("button", { name: "新游戏" })).toBeEnabled();

  // On a large window the stage scales up proportionally to fill it.
  await page.setViewportSize({ width: 2400, height: 1400 });
  await expect
    .poll(async () =>
      Number(await page.locator("[data-stage-scale]").getAttribute("data-stage-scale"))
    )
    .toBeGreaterThan(1.5);
});

test("backdrop clicks and right-clicks always dismiss the topmost window", async ({ page }) => {
  await page.goto(catcafeTargetUrlV1());
  await playOpeningV1(page);

  // Album (workspace overlay) under the Save dialog (system layer): the
  // system backdrop click closes only the Save dialog; the album stays.
  await page.locator("[data-cc-album-open]").click();
  await expect(page.locator("[data-cc-album]")).toBeVisible();
  await page.getByRole("button", { name: "保存", exact: true }).click();
  const saves = page.getByRole("dialog", { name: "保存" });
  await expect(saves).toBeVisible();
  await page.locator("[data-system-dialog-backdrop='saves']").click({ position: { x: 8, y: 8 } });
  await expect(saves).toBeHidden();
  await expect(page.locator("[data-cc-album]")).toBeVisible();

  // A nested confirmation stacks above the Save dialog: its backdrop click
  // cancels the confirmation only, the Save dialog stays.
  await page.getByRole("button", { name: "保存", exact: true }).click();
  await saves.getByRole("button", { name: "手动保存" }).first().click();
  await expect(page.getByTestId("save-operation-result")).toContainText("已保存到手动存档 1");
  await saves.getByRole("button", { name: "载入手动存档 1" }).click();
  const confirm = page.getByRole("dialog", { name: "载入手动存档 1" });
  await expect(confirm).toBeVisible();
  await page
    .locator("[data-system-dialog-backdrop='action_confirmation']")
    .click({ position: { x: 8, y: 8 } });
  await expect(confirm).toBeHidden();
  await expect(saves).toBeVisible();

  // Right-click is the configurable VN back action: it closes the Save
  // dialog, then the album — always the topmost surface.
  await page.mouse.click(640, 620, { button: "right" });
  await expect(saves).toBeHidden();
  await expect(page.locator("[data-cc-album]")).toBeVisible();
  await page.mouse.click(640, 620, { button: "right" });
  await expect(page.locator("[data-cc-album]")).toHaveCount(0);
});

test("the HUD rollback steps one committed action back without rerolling", async ({ page }) => {
  await page.goto(catcafeTargetUrlV1());
  await playOpeningV1(page);

  // Pet once: trust moves and a checkpoint records.
  const stats = page.locator("[data-cc-stats]");
  await expect(stats).toContainText("信任10");
  await page.getByRole("button", { name: "顺背" }).click();
  await expect(stats).toContainText("信任11");
  const statsAfter = await stats.textContent();
  const rollback = page.locator("[data-cc-rollback]");
  await expect(rollback).toBeEnabled();

  // Roll back: authoritative state returns; the retry reproduces the same
  // outcome (RNG rides inside the snapshot).
  await rollback.click();
  await expect(stats).toContainText("信任10");
  await page.getByRole("button", { name: "顺背" }).click();
  await expect(stats).toHaveText(statsAfter ?? "");
});

test("auto mode advances revealed lines and the history panel replays the backlog", async ({ page }) => {
  await page.goto(catcafeTargetUrlV1());
  await dismissSplashV1(page);
  await page.getByRole("button", { name: "新游戏" }).click();

  // Auto: with no further input the say advances by itself once revealed
  // (auto pauses at the name choice, which playback never decides).
  const firstOccurrence = await page
    .locator("[data-dialogue]")
    .getAttribute("data-dialogue-occurrence");
  await page.locator("[data-dialogue-playback='auto']").click();
  await expect(page.locator("[data-dialogue-playback='auto']")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect
    .poll(async () => page.locator("[data-dialogue]").getAttribute("data-dialogue-occurrence"), {
      timeout: 15_000,
    })
    .not.toBe(firstOccurrence);
  await expect(page.locator("[data-dialogue='choice']")).toBeVisible({ timeout: 20_000 });

  // The history panel renders the authoritative backlog of what auto read.
  await page.getByRole("button", { name: "就叫「小雨」" }).click();
  await expect(page.locator("[data-dialogue]")).toHaveAttribute("data-dialogue-reveal", "complete");
  await page.locator("[data-dialogue-history-open]").click();
  const history = page.locator("[data-dialogue-history]");
  await expect(history).toBeVisible();
  expect(await history.locator("[data-dialogue-history-entry]").count()).toBeGreaterThanOrEqual(3);
  await history.locator("[data-panel-close]").click();
  await expect(history).toHaveCount(0);
});

test("audio follows play: shop BGM and rain load on start, petting fires a one-shot", async ({ page }) => {
  const fetched = new Set<string>();
  page.on("request", (request) => {
    const name = request.url().split("/").pop() ?? "";
    if (name.endsWith(".mp3")) fetched.add(name);
  });
  await page.goto(catcafeTargetUrlV1());
  await playOpeningV1(page);

  // The continuous intent (shop BGM + resident rain) loads with gameplay.
  await expect.poll(() => fetched.has("cc-bgm-shop.mp3")).toBe(true);
  await expect.poll(() => fetched.has("cc-ambient-rain.mp3")).toBe(true);

  // A petting reaction plays its one-shot through the effect stream.
  await page.getByRole("button", { name: "挠下巴" }).click();
  await expect
    .poll(() => fetched.has("cc-sfx-purr.mp3") || fetched.has("cc-sfx-hiss.mp3"))
    .toBe(true);
});

test("the system menu is one modal at a time and saves honor the safepoint", async ({ page }) => {
  await page.goto(catcafeTargetUrlV1());

  // Title screen: Load game opens the system Save dialog even before play.
  await dismissSplashV1(page);
  await expect(page.locator("[data-title-load-game]")).toBeVisible();
  await page.getByRole("button", { name: "新游戏" }).click();

  // Mid-dialogue: the Save dialog paints above the narrative panel and the
  // panel is inert — the safepoint guard disables manual writes.
  await page.getByRole("button", { name: "保存", exact: true }).click();
  const saves = page.getByRole("dialog", { name: "保存" });
  await expect(saves).toBeVisible();
  await expect(page.locator("[data-save-guard='blocked']")).toContainText("对话进行中");
  for (const button of await saves.getByRole("button", { name: "手动保存" }).all()) {
    await expect(button).toBeDisabled();
  }
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
    await advanceRevealedSayV1(page);
  }
  await page.getByRole("button", { name: "就叫「小雨」" }).click();
  await advanceRevealedSayV1(page);
  await advanceRevealedSayV1(page);
  await expect(page.locator("[data-dialogue]")).toHaveCount(0);

  // Daily play is a safepoint: manual save commits and shows the slot's
  // timestamp in the list.
  await page.getByRole("button", { name: "保存", exact: true }).click();
  await expect(page.locator("[data-save-guard='blocked']")).toHaveCount(0);
  await saves.getByRole("button", { name: "手动保存" }).first().click();
  await expect(page.getByTestId("save-operation-result")).toContainText("已保存到手动存档 1");
  await expect(saves.locator("[data-slot-id='manual.1'] [data-slot-saved-at]")).toBeVisible();

  // Title screen → Load game → confirm: entering gameplay dismisses both
  // the dialog and the title screen (the anchored load origin).
  await page.reload();
  await dismissSplashV1(page);
  await page.locator("[data-title-load-game]").click();
  await expect(saves).toBeVisible();
  await saves.getByRole("button", { name: "载入手动存档 1" }).click();
  await page.getByRole("button", { name: "确认" }).click();
  await expect(saves).toBeHidden();
  await expect(page.locator("[data-title-screen]")).toHaveCount(0);
  await expect(page.locator("[data-cc-calendar='1.0.0']")).toBeVisible();
});

test(
  "@save exposes localized inspection and restores a pending backup through managed confirmation",
  async ({
    page,
  }, testInfo) => {
    await page.clock.setFixedTime(new Date("2026-08-12T12:34:56.000Z"));
    await page.goto(catcafeTargetUrlV1());
    await playOpeningV1(page);
    await page.getByRole("button", { name: "保存", exact: true }).click();
    const saves = page.getByRole("dialog", { name: "保存" });
    const quick = saves.locator("[data-slot-id='quick']");
    const quickRecovery = quick.locator("[data-save-recovery='quick']");

    await quick.getByRole("button", { name: "快速保存" }).click();
    await expect(page.getByTestId("save-operation-result")).toContainText("已保存到快速存档");
    await expect(quickRecovery.locator("[data-save-inspection]")).toHaveCount(0);
    await quickRecovery.getByRole("button", { name: "检查兼容性与备份" }).click();
    await expect(quickRecovery.locator("[data-save-inspection='direct']")).toHaveText(
      "可直接载入",
    );

    const expectedBackupBytes = await seedCatCafePendingBackupV1(page, "quick");
    await quickRecovery.getByRole("button", { name: "检查兼容性与备份" }).click();
    await expect(quickRecovery.locator("[data-save-backup='available']")).toHaveText(
      "升级前备份可用",
    );

    const exportBackup = quickRecovery.getByRole("button", { name: "导出升级前备份" });
    const exportPaths = [
      testInfo.outputPath("cat-cafe-backup-export-1.json"),
      testInfo.outputPath("cat-cafe-backup-export-2.json"),
    ] as const;
    expect(exportPaths[0]).not.toBe(exportPaths[1]);
    const suggestedFilenames: string[] = [];
    for (const exportPath of exportPaths) {
      const [download] = await Promise.all([page.waitForEvent("download"), exportBackup.click()]);
      suggestedFilenames.push(download.suggestedFilename());
      await download.saveAs(exportPath);
      await expect(page.getByTestId("save-operation-result")).toHaveText("升级前备份已导出");
    }
    expect(suggestedFilenames).toHaveLength(2);
    expect(suggestedFilenames[0]).toBe(suggestedFilenames[1]);
    expect(suggestedFilenames[0]).toMatch(/\.json$/u);
    for (const exportPath of exportPaths) {
      expect(Array.from(await readFile(exportPath))).toEqual(Array.from(expectedBackupBytes));
    }
    await quickRecovery.getByRole("button", { name: "检查兼容性与备份" }).click();
    await expect(quickRecovery.locator("[data-save-backup='available']")).toHaveText(
      "升级前备份可用",
    );

    await quickRecovery.getByRole("button", { name: "恢复升级前备份" }).click();
    const confirmation = page.getByRole("dialog", { name: "恢复快速存档备份" });
    await expect(confirmation).toContainText("快速存档将被升级前备份替换。");
    await confirmation.getByRole("button", { name: "确认" }).click();
    await expect(page.getByTestId("save-operation-result")).toHaveText(
      "升级前备份已恢复；请载入该存档槽以继续",
    );
    await expect(saves).toBeVisible();
    await expect
      .poll(() => saves.evaluate((element) => element.contains(document.activeElement)))
      .toBe(true);

    await quickRecovery.getByRole("button", { name: "检查兼容性与备份" }).click();
    await expect(quickRecovery.locator("[data-save-inspection='direct']")).toHaveText(
      "可直接载入",
    );
    await expect(quickRecovery.locator("[data-save-backup]")).toHaveCount(0);
  },
);

async function reachCatCafeEndingV1(page: Page): Promise<void> {
  await page.goto(catcafeTargetUrlV1("?capability=debug_tools&capability=cheats"));
  await playOpeningV1(page);

  // Fast-forward to week 7 Sunday morning through the tuning panel, then
  // walk the three slots to the settlement night.
  await page.getByRole("button", { name: "调试" }).click();
  await page.getByRole("group", { name: "调试" })
    .getByRole("button", { name: "作弊" })
    .click();
  const dock = page.getByRole("dialog", { name: "作弊" });
  const tuning = dock.locator("[data-cc-debug-tuning]");
  await tuning.locator("[data-cc-debug-days]").fill("48");
  await tuning.locator("form").nth(1).getByRole("button", { name: "执行调试命令" }).click();
  await expect(tuning.locator("form").nth(1).getByText("committed")).toBeVisible();
  await dock.getByRole("button", { name: "关闭", exact: true }).click();
  await expect(dock).toHaveCount(0);
  await page.keyboard.press("Escape");
  for (let step = 0; step < 3; step += 1) {
    await page.locator("[data-cc-action-id='cc.advance_slot']").click();
  }
  await expect(page.locator("[data-cc-ending]")).toBeVisible();
}

test("the ending settles once and Keep-the-shop-open enters the endless epilogue", async ({ page }) => {
  await reachCatCafeEndingV1(page);

  // The package-owned WholeCanvas surface is the only ending writer. The HUD
  // remains mounted as lower-plane gameplay, but its Stage layer is inert.
  const ending = page.locator("[data-cc-ending]");
  await expect(ending).toBeVisible();
  await expect(
    page.locator("[data-whole-canvas-surface='primary'][data-whole-canvas-phase='current']"),
  ).toContainText("七周之后");
  await expect(page.locator("[data-cc-hud]")).toHaveCount(1);
  await expect(page.locator("[data-stage-layer='hud']")).toHaveAttribute("inert", "");
  await page.locator("[data-cc-ending-continue]").click();

  // The epilogue is authoritative state: the badge shows, week 8 begins,
  // and daily play is alive again.
  await expect(page.locator("[data-cc-epilogue]")).toBeVisible();
  await expect(page.locator("[data-cc-calendar='8.0.0']")).toBeVisible();
  await expect(page.locator("[data-cc-ending]")).toHaveCount(0);
  await expect(page.locator("[data-whole-canvas-surface]")).toHaveCount(0);
  await expect(page.locator("[data-stage-layer='hud']")).not.toHaveAttribute("inert");
  await expect(page.locator("[data-cc-activity='activity.clean']")).toBeEnabled();
});

test("the ending Restart owner action resets to fresh gameplay without returning to Title", async ({ page }) => {
  await reachCatCafeEndingV1(page);

  await page.locator("[data-cc-ending-restart]").click();

  await expect(page.locator("[data-cc-ending]")).toHaveCount(0);
  await expect(page.locator("[data-whole-canvas-surface]")).toHaveCount(0);
  await expect(page.locator("[data-title-screen]")).toHaveCount(0);
  await expect(page.locator("[data-cc-calendar='1.0.0']")).toBeVisible();
  await expect(page.locator("[data-dialogue]")).toBeVisible();
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
  await dismissSplashV1(page);
  await expect(page.getByRole("button", { name: "New game" })).toBeEnabled();
  // Autosave from the earlier session makes Continue available.
  await expectContinueAvailabilityV1(page, true);
  // The narrative advance button is also labeled "Continue" in English,
  // so address the title screen's own control directly.
  await page.locator("[data-title-continue]").click();
  // The opening starts automatically after the front door; English text
  // reaches the in-game HUD as well.
  await expect(page.locator("[data-cc-album-open]")).toHaveText("Album");
  await expect(page.getByRole("button", { name: "Settings" })).toBeVisible();
});

test("the album overlay masks locked entries and shows unlocked meta progress", async ({ page }) => {
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

test("Continue stays unavailable until an autosave exists", async ({ page }) => {
  await clearCatCafeRecordsV1(page);
  await page.reload();
  await dismissSplashV1(page);
  await expectContinueAvailabilityV1(page, false);
});

test("a page refresh resumes the autosaved session behind the title screen", async ({ page }) => {
  // Opening typewriter + reload naturally exceeds the default 30s budget.
  test.slow();
  await clearCatCafeRecordsV1(page);
  await page.reload();
  await playOpeningV1(page);
  // Mutate state and wait for the debounced autosave to land.
  await page.locator("[data-cc-activity='activity.play']").click();
  await expect
    .poll(async () => page.locator("[data-cc-stats-text]").textContent())
    .toContain("信任13");
  await page.waitForTimeout(1500);
  // Reload = new page session; resumeFromAutosave makes Continue truthful.
  await page.reload();
  await dismissSplashV1(page);
  await expectContinueAvailabilityV1(page, true);
  await page.locator("[data-title-continue]").click();
  await expect(page.locator("[data-cc-stats-text]")).toContainText("信任13");
  await expect(page.locator("[data-cc-stats-text]")).toContainText("技艺1");
});
