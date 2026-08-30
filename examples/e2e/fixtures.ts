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

/** SillyOS: independent-origin Workspace Execution Sandbox qualification target. */
export const sillyOsWorkspaceSandboxTargetV1 = { host: hostV1, port: 41740 };

export function sillyOsWorkspaceSandboxTargetUrlV1(query = ""): string {
  return `http://${sillyOsWorkspaceSandboxTargetV1.host}:${
    String(sillyOsWorkspaceSandboxTargetV1.port)
  }/${query}`;
}

/** SillyOS: isolated fixed-QuickJS Sandbox qualification target. */
export const sillyOsQuickJsSandboxTargetV1 = { host: hostV1, port: 41750 };

export function sillyOsQuickJsSandboxTargetUrlV1(query = ""): string {
  return `http://${sillyOsQuickJsSandboxTargetV1.host}:${
    String(sillyOsQuickJsSandboxTargetV1.port)
  }/${query}`;
}

/** SillyOS: independent-origin keyless Browser Network Broker target. */
export const sillyOsNetworkBrokerTargetV1 = { host: hostV1, port: 41741 };

export function sillyOsNetworkBrokerTargetUrlV1(query = ""): string {
  return `http://${sillyOsNetworkBrokerTargetV1.host}:${
    String(sillyOsNetworkBrokerTargetV1.port)
  }/${query}`;
}

/** One Last Sound Check: current product-owned Player, Stage, and audio path. */
export const vnLastSoundCheckTargetV1 = { host: hostV1, port: 41742 };

export function vnLastSoundCheckTargetUrlV1(query = ""): string {
  return `http://${vnLastSoundCheckTargetV1.host}:${
    String(vnLastSoundCheckTargetV1.port)
  }/${query}`;
}

/** One Last Sound Check: prebuilt production surface with explicit declarative Mods. */
export const vnLastSoundCheckModsTargetV1 = { host: hostV1, port: 41743 };

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
   * Persistent-workspace acceptance uses a fresh durable profile in every supported engine,
   * deleted after use. Every page in that context shares one diagnostics owner.
   */
  readonly durableProgramPage: Page;
}

const durableProgramConsoleErrorsV1 = new WeakMap<Page, string[]>();

/** Consumes only an exact console error deliberately produced by test tooling. */
export function consumeExpectedDurableProgramConsoleErrorsV1(
  page: Page,
  message: string,
): number {
  const errorsV1 = durableProgramConsoleErrorsV1.get(page);
  if (errorsV1 === undefined) {
    throw new Error("durable Program page diagnostics are unavailable");
  }
  const matchingIndexesV1 = errorsV1.flatMap((candidateV1, indexV1) =>
    candidateV1 === message ? [indexV1] : []
  );
  for (const indexV1 of matchingIndexesV1.toReversed()) errorsV1.splice(indexV1, 1);
  return matchingIndexesV1.length;
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
  durableProgramPage: async ({ browserName, hasTouch, playwright, viewport }, use, testInfo) => {
    if (browserName !== "chromium" && browserName !== "webkit") {
      throw new Error(`unsupported durable Program browser: ${browserName}`);
    }
    const browserType = browserName === "chromium" ? playwright.chromium : playwright.webkit;
    const profileDirectory = await mkdtemp(
      join(tmpdir(), `sillyos-${browserName}-profile-`),
    );
    const pageErrors: string[] = [];
    const consoleErrors: string[] = [];

    try {
      const context = await browserType.launchPersistentContext(profileDirectory, {
        headless: true,
        hasTouch,
        viewport: viewport ?? { width: 1280, height: 720 },
      });
      const observedPages = new Set<Page>();
      const observePage = (observedPage: Page): void => {
        if (observedPages.has(observedPage)) return;
        observedPages.add(observedPage);
        observedPage.on("pageerror", (error) => pageErrors.push(error.message));
        observedPage.on("console", (message) => {
          if (message.type() === "error") consoleErrors.push(message.text());
        });
      };
      context.on("page", observePage);
      for (const existingPage of context.pages()) observePage(existingPage);
      const durablePage = context.pages()[0] ?? await context.newPage();
      observePage(durablePage);
      durableProgramConsoleErrorsV1.set(durablePage, consoleErrors);

      try {
        await use(durablePage);
      } finally {
        durableProgramConsoleErrorsV1.delete(durablePage);
        await context.close();
      }
    } finally {
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
