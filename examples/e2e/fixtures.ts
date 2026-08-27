// SPDX-License-Identifier: MIT
// Browser fixtures for the examples suite: one dev-server target per example;
// diagnostics policy matches the engine suite (a page or console error fails the test, evidence attached).
import type { Page } from "@playwright/test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test as base } from "../../scripts/testing/playwright-test.ts";

const hostV1 = "127.0.0.1";

/** Starter Template: the copyable Story skeleton and its production Narrative declaration. */
export const templateTargetV1 = { host: hostV1, port: 41733 };

export function templateTargetUrlV1(query = ""): string {
  return `http://${templateTargetV1.host}:${String(templateTargetV1.port)}/${query}`;
}

/** SillyOS: GUI-only Creator product preview and Program workspace. */
export const sillyOsTargetV1 = { host: hostV1, port: 41739 };

export function sillyOsTargetUrlV1(query = ""): string {
  return `http://${sillyOsTargetV1.host}:${String(sillyOsTargetV1.port)}/${query}`;
}

/** One Last Sound Check: current product-owned Player, Stage, and audio path. */
export const vnLastSoundCheckTargetV1 = { host: hostV1, port: 41741 };

export function vnLastSoundCheckTargetUrlV1(query = ""): string {
  return `http://${vnLastSoundCheckTargetV1.host}:${
    String(vnLastSoundCheckTargetV1.port)
  }/${query}`;
}

/** One Last Sound Check: prebuilt production surface with explicit declarative Mods. */
export const vnLastSoundCheckModsTargetV1 = { host: hostV1, port: 41742 };

export function vnLastSoundCheckModsTargetUrlV1(query = ""): string {
  return `http://${vnLastSoundCheckModsTargetV1.host}:${
    String(vnLastSoundCheckModsTargetV1.port)
  }/${query}`;
}

interface PageDiagnosticsV1 {
  readonly pageErrors: readonly string[];
  readonly consoleErrors: readonly string[];
  /** Removes one exact, deliberately exercised uncaught page error. */
  consumeExpectedPageError(message: string): void;
  /** Removes one exact, deliberately exercised console error; every other error still fails. */
  consumeExpectedConsoleError(message: string): void;
}

interface DurableProgramPageFixturesV1 {
  /**
   * Playwright WebKit's ordinary isolated context has ephemeral/private storage and rejects OPFS.
   * Persistent-workspace acceptance therefore uses a fresh durable profile, deleted after use.
   */
  readonly durableProgramPage: Page;
}

export const test = base.extend<
  { pageDiagnostics: PageDiagnosticsV1 } & DurableProgramPageFixturesV1
>({
  pageDiagnostics: [
    async ({ page }, use, testInfo) => {
      const pageErrors: string[] = [];
      const consoleErrors: string[] = [];
      page.on("pageerror", (error) => {
        pageErrors.push(error.message);
      });
      page.on("console", (message) => {
        if (message.type() === "error") consoleErrors.push(message.text());
      });

      await use({
        pageErrors,
        consoleErrors,
        consumeExpectedPageError(message: string): void {
          const matchingIndexes = pageErrors.flatMap((candidate, index) =>
            candidate === message ? [index] : []
          );
          if (matchingIndexes.length !== 1 || matchingIndexes[0] === undefined) {
            throw new Error(
              `expected one exact page error to consume, found ${String(matchingIndexes.length)}`,
            );
          }
          pageErrors.splice(matchingIndexes[0], 1);
        },
        consumeExpectedConsoleError(message: string): void {
          const matchingIndexes = consoleErrors.flatMap((candidate, index) =>
            candidate === message ? [index] : []
          );
          if (matchingIndexes.length !== 1 || matchingIndexes[0] === undefined) {
            throw new Error(
              `expected one exact console error to consume, found ${
                String(matchingIndexes.length)
              }`,
            );
          }
          consoleErrors.splice(matchingIndexes[0], 1);
        },
      });

      if (pageErrors.length > 0 || consoleErrors.length > 0) {
        await testInfo.attach("page-diagnostics", {
          body: JSON.stringify({ pageErrors, consoleErrors }, null, 2),
          contentType: "application/json",
        });
      }
      expect(pageErrors, "the page must not raise uncaught errors").toEqual([]);
      expect(consoleErrors, "the page must not log console errors").toEqual([]);
    },
    { auto: true },
  ],
  durableProgramPage: async ({ browserName, page, playwright }, use, testInfo) => {
    if (browserName !== "webkit") {
      await use(page);
      return;
    }

    const profileDirectory = await mkdtemp(join(tmpdir(), "sillyos-webkit-profile-"));
    const context = await playwright.webkit.launchPersistentContext(profileDirectory, {
      headless: true,
      viewport: { width: 1280, height: 720 },
    });
    const durablePage = context.pages()[0] ?? await context.newPage();
    const pageErrors: string[] = [];
    const consoleErrors: string[] = [];
    durablePage.on("pageerror", (error) => pageErrors.push(error.message));
    durablePage.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });

    try {
      await use(durablePage);
    } finally {
      await context.close();
      await rm(profileDirectory, { recursive: true, force: true });
    }
    if (pageErrors.length > 0 || consoleErrors.length > 0) {
      await testInfo.attach("durable-page-diagnostics", {
        body: JSON.stringify({ pageErrors, consoleErrors }, null, 2),
        contentType: "application/json",
      });
    }
    expect(pageErrors, "the durable page must not raise uncaught errors").toEqual([]);
    expect(consoleErrors, "the durable page must not log console errors").toEqual([]);
  },
});

export { expect };
