// SPDX-License-Identifier: MIT
import { readFileSync, writeFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import type { Page } from "@playwright/test";

import { expect, gotoLabV1, test } from "./fixtures.ts";

const shellUiFileV1 = fileURLToPath(
  new URL("../../../../../e2e/src/application/shell-ui.tsx", import.meta.url),
);
const labHudMarkerV1 = '<div data-lab-hud="true">';
const labHudFastRefreshMarkerV1 =
  '<div data-lab-hud="true" data-lab-fast-refresh-probe="candidate">';

function replaceExactlyOnceV1(source: string, current: string, replacement: string): string {
  const first = source.indexOf(current);
  if (first === -1 || first !== source.lastIndexOf(current)) {
    throw new Error(`Expected exactly one source marker: ${current}`);
  }
  return source.replace(current, replacement);
}

/**
 * Install a same-slot pending backup from bytes the real Player just saved.
 * Recovery itself remains entirely UI-driven through the production Host.
 */
async function seedPendingBackupV1(
  page: Page,
  input: Readonly<{ databaseName: string; storyId: string; slotId: string }>,
): Promise<Uint8Array> {
  const expectedBackupBytes = await page.evaluate(async ({ databaseName, storyId, slotId }) => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(databaseName, 1);
      request.addEventListener("success", () => resolve(request.result));
      request.addEventListener(
        "error",
        () => reject(request.error ?? new Error("save recovery fixture could not open IndexedDB")),
      );
    });
    try {
      const sourceKey = `save-record.v1:${encodeURIComponent(storyId)}:${slotId}`;
      const backupKey = `save-migration-backup.v1:${encodeURIComponent(storyId)}:${slotId}`;
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
  }, input);
  return Uint8Array.from(expectedBackupBytes);
}

test.describe("engine default shell", () => {
  test("@smoke boots the default UI and plays through the Story HUD", async ({
    page,
  }, testInfo) => {
    await gotoLabV1(page);

    // The managed viewport hosts the seven-layer stage.
    const viewport = page.getByTestId("game-viewport");
    await expect(viewport).toBeVisible();
    await expect(page.getByTestId("stage-background")).toBeAttached();
    await expect(page.getByTestId("stage-system")).toBeAttached();
    await expect(page.getByRole("group", { name: "引擎实验室" })).toBeAttached();

    // Play one action through the Story HUD contribution.
    const collect = page.getByRole("button", { name: "采集样本" });
    await expect(collect).toBeEnabled();
    if (testInfo.project.name === "chromium-touch") await collect.tap();
    else await collect.click();
    await expect(page.getByText(/样本[1-9]/u)).toBeVisible();

    // The designed Save surface opens as a real dialog and closes.
    await page.getByRole("button", { name: "保存", exact: true }).click();
    const save = page.getByRole("dialog", { name: "保存" });
    await expect(save).toBeVisible();
    // One save button per numbered manual slot (engine default count).
    await expect(save.getByRole("button", { name: "手动保存" })).toHaveCount(8);
    await expect(save.getByRole("button", { name: "手动保存" }).first()).toBeVisible();
    await save.getByRole("button", { name: "关闭", exact: true }).click();
    await expect(save).toBeHidden();

    // The Story journal overlay contribution opens through the system menu.
    await page.getByRole("button", { name: "实验日志" }).click();
    const journal = page.getByRole("dialog", { name: "实验日志" });
    await expect(journal).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(journal).toBeHidden();

    // The explicit business exit remains available independently of Escape.
    await page.getByRole("button", { name: "实验日志" }).click();
    await expect(journal).toBeVisible();
    await journal.getByRole("button", { name: "关闭", exact: true }).click();
    await expect(journal).toBeHidden();
  });

  test("@dev-source-io keeps the component-only shell on Fast Refresh", async ({ page }) => {
    const originalBytes = readFileSync(shellUiFileV1, "utf8");
    const candidateBytes = replaceExactlyOnceV1(
      originalBytes,
      labHudMarkerV1,
      labHudFastRefreshMarkerV1,
    );
    let pageLoads = 0;
    let candidateVisible = false;
    try {
      await gotoLabV1(page);
      await page.getByRole("button", { name: "采集样本" }).click();
      const hud = page.locator('[data-lab-hud="true"]');
      const hudSummary = hud.locator("p").first();
      await expect(hudSummary).toContainText(/样本[1-9]/u);
      const expectedHudSummary = await hudSummary.textContent();
      if (expectedHudSummary === null) throw new Error("Engine Lab HUD summary is unavailable");
      await page.getByRole("button", { name: "实验日志" }).click();
      const journal = page.getByRole("dialog", { name: "实验日志" });
      await expect(journal).toBeVisible();
      const expectedJournal = await journal.locator('[data-lab-journal="true"]').textContent();
      if (expectedJournal === null) throw new Error("Engine Lab journal content is unavailable");
      page.on("load", () => {
        pageLoads += 1;
      });

      writeFileSync(shellUiFileV1, candidateBytes);
      await expect(hud).toHaveAttribute("data-lab-fast-refresh-probe", "candidate");
      candidateVisible = true;
      expect(pageLoads).toBe(0);
      await expect(hudSummary).toHaveText(expectedHudSummary);
      await expect(journal).toBeVisible();
      await expect(journal.locator('[data-lab-journal="true"]')).toHaveText(expectedJournal);

      writeFileSync(shellUiFileV1, originalBytes);
      await expect(hud).not.toHaveAttribute("data-lab-fast-refresh-probe", "candidate");
      candidateVisible = false;
      expect(pageLoads).toBe(0);
      await expect(hudSummary).toHaveText(expectedHudSummary);
      await expect(journal).toBeVisible();
      await expect(journal.locator('[data-lab-journal="true"]')).toHaveText(expectedJournal);
    } finally {
      if (readFileSync(shellUiFileV1, "utf8") !== originalBytes) {
        writeFileSync(shellUiFileV1, originalBytes);
      }
      if (candidateVisible && !page.isClosed()) {
        await expect(page.locator('[data-lab-hud="true"]')).not.toHaveAttribute(
          "data-lab-fast-refresh-probe",
          "candidate",
        );
      }
    }
    expect(readFileSync(shellUiFileV1, "utf8")).toBe(originalBytes);
  });

  test("@smoke keeps focus-driven activation working", async ({ page }) => {
    await gotoLabV1(page);
    const collect = page.getByRole("button", { name: "采集样本" });
    await collect.focus();
    await expect(collect).toBeFocused();
    const focusVisible = await collect.evaluate((element) => {
      const style = getComputedStyle(element);
      return (
        (style.outlineStyle !== "none" && Number.parseFloat(style.outlineWidth) > 0) ||
        style.boxShadow !== "none"
      );
    });
    expect(focusVisible, "focused controls must have a visible indicator").toBe(true);
    await page.keyboard.press("Enter");
    await expect(page.getByText(/样本[1-9]/u)).toBeVisible();
  });

  test("persists a manual save across a reload", async ({ page }) => {
    await gotoLabV1(page);
    await page.getByRole("button", { name: "采集样本" }).click();
    const hud = page.locator("[data-lab-hud='true']");
    const before = await hud.textContent();

    await page.getByRole("button", { name: "保存", exact: true }).click();
    const save = page.getByRole("dialog", { name: "保存" });
    await save.getByRole("button", { name: "手动保存" }).first().click();
    await expect(save.getByText("已保存到手动存档 1")).toBeVisible();
    await save.getByRole("button", { name: "关闭", exact: true }).click();

    await page.reload();
    await gotoLabV1(page);
    await page.getByRole("button", { name: "保存", exact: true }).click();
    const reopened = page.getByRole("dialog", { name: "保存" });
    await reopened.getByRole("button", { name: "载入手动存档 1" }).click();
    const confirmation = page.getByRole("dialog", { name: "载入手动存档 1" });
    await confirmation.getByRole("button", { name: "确认" }).click();
    // Convention: a successful load closes the dialog and enters gameplay.
    await expect(reopened).toBeHidden();
    await expect(hud).toHaveText(before ?? "");
  });

  test("@save inspects one slot explicitly and keeps backup export/discard recoverable", async ({
    page,
  }, testInfo) => {
    await page.clock.setFixedTime(new Date("2026-08-12T12:34:56.000Z"));
    await gotoLabV1(page);
    await page.getByRole("button", { name: "保存", exact: true }).click();
    const saves = page.getByRole("dialog", { name: "保存" });
    const quick = saves.locator("[data-slot-id='quick']");
    const manualOne = saves.locator("[data-slot-id='manual.1']");
    const quickRecovery = quick.locator("[data-save-recovery='quick']");

    await quick.getByRole("button", { name: "快速保存" }).click();
    await expect(page.getByTestId("save-operation-result")).toContainText("已保存到快速存档");

    // Recovery reads are explicit and slot-local: opening Saves never scans every slot.
    await expect(quickRecovery.locator("[data-save-inspection]")).toHaveCount(0);
    await expect(manualOne.locator("[data-save-inspection]")).toHaveCount(0);
    await quickRecovery.getByRole("button", { name: "检查兼容性与备份" }).click();
    await expect(quickRecovery.locator("[data-save-inspection='direct']")).toHaveText(
      "可直接载入",
    );
    await expect(manualOne.locator("[data-save-inspection]")).toHaveCount(0);

    const expectedBackupBytes = await seedPendingBackupV1(page, {
      databaseName: "sillymaker.e2e",
      storyId: "story.e2e.engine-lab",
      slotId: "quick",
    });
    await quickRecovery.getByRole("button", { name: "检查兼容性与备份" }).click();
    await expect(quickRecovery.locator("[data-save-backup='available']")).toHaveText(
      "升级前备份可用",
    );

    // Export is non-destructive and remains retryable while the backup is pending.
    const exportBackup = quickRecovery.getByRole("button", { name: "导出升级前备份" });
    const exportPaths = [
      testInfo.outputPath("engine-backup-export-1.json"),
      testInfo.outputPath("engine-backup-export-2.json"),
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

    // Destructive recovery uses the managed exact-parent confirmation. Cancelling retains
    // the Save root and a later retry can complete without opening a second authority.
    const discardBackup = quickRecovery.getByRole("button", { name: "丢弃升级前备份" });
    await discardBackup.click();
    const confirmation = page.getByRole("dialog", { name: "丢弃快速存档备份" });
    await expect(confirmation).toBeVisible();
    await confirmation.getByRole("button", { name: "取消" }).click();
    await expect(confirmation).toBeHidden();
    await expect(saves).toBeVisible();
    await expect(discardBackup).toBeFocused();

    await discardBackup.click();
    await page
      .getByRole("dialog", { name: "丢弃快速存档备份" })
      .getByRole("button", { name: "确认" })
      .click();
    await expect(page.getByTestId("save-operation-result")).toHaveText("升级前备份已丢弃");
    await expect(saves).toBeVisible();
    await expect
      .poll(() => saves.evaluate((element) => element.contains(document.activeElement)))
      .toBe(true);
    await quickRecovery.getByRole("button", { name: "检查兼容性与备份" }).click();
    await expect(quickRecovery.locator("[data-save-backup]")).toHaveCount(0);
    await expect(quickRecovery.getByRole("button", { name: "恢复升级前备份" })).toHaveCount(0);
  });
});
