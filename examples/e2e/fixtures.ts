// SPDX-License-Identifier: MIT
// Browser fixtures for the examples suite: one dev-server target per example;
// diagnostics policy matches the engine suite (a page or console error fails the test, evidence attached).
import { expect, test as base } from "@playwright/test";

const hostV1 = "127.0.0.1";

/** Starter Template: the copyable Story skeleton and its production Narrative declaration. */
export const templateTargetV1 = Object.freeze({ host: hostV1, port: 41733 });

export function templateTargetUrlV1(query = ""): string {
  return `http://${templateTargetV1.host}:${String(templateTargetV1.port)}/${query}`;
}

/** Bookshop: scripted Choice availability changing within one Narrative occurrence. */
export const bookshopTargetV1 = Object.freeze({ host: hostV1, port: 41735 });

export function bookshopTargetUrlV1(query = ""): string {
  return `http://${bookshopTargetV1.host}:${String(bookshopTargetV1.port)}/${query}`;
}

/** Cat cafe: stage hit regions, dialogue playback, save safepoints, rollback. */
export const catcafeTargetV1 = Object.freeze({ host: hostV1, port: 41737 });

export function catcafeTargetUrlV1(query = ""): string {
  return `http://${catcafeTargetV1.host}:${String(catcafeTargetV1.port)}/${query}`;
}

/** SillyOS 98: fully custom desktop shell (windows/taskbar/apps; persistence opaque to the player). */
export const sillyOsTargetV1 = Object.freeze({ host: hostV1, port: 41739 });

export function sillyOsTargetUrlV1(query = ""): string {
  return `http://${sillyOsTargetV1.host}:${String(sillyOsTargetV1.port)}/${query}`;
}

interface PageDiagnosticsV1 {
  readonly pageErrors: readonly string[];
  readonly consoleErrors: readonly string[];
}

export const test = base.extend<{ pageDiagnostics: PageDiagnosticsV1 }>({
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

      await use(Object.freeze({ pageErrors, consoleErrors }));

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
});

export { expect } from "@playwright/test";
