// SPDX-License-Identifier: MIT
import type { Page } from "@playwright/test";

import { expect, test as base } from "../../../../../scripts/testing/playwright-test.ts";

export const engineTargetV1 = {
  applicationId: "e2e",
  host: "127.0.0.1",
  port: 41733,
};

export function engineTargetUrlV1(query = ""): string {
  return `http://${engineTargetV1.host}:${String(engineTargetV1.port)}/${query}`;
}

export const labApplicationNameV1 = "引擎实验室";

interface PageDiagnosticsV1 {
  readonly pageErrors: readonly string[];
  readonly consoleErrors: readonly string[];
}

/**
 * Engine suite diagnostic policy: every test records page errors and console
 * errors; an unexpected page error or console error fails the test with the
 * collected evidence attached (traces stay retained on failure).
 */
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

      await use({ pageErrors, consoleErrors });

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

export { expect };

export async function gotoLabV1(page: Page, query = ""): Promise<void> {
  await page.goto(engineTargetUrlV1(query));
  await expect(page.getByRole("application", { name: labApplicationNameV1 })).toHaveAttribute(
    "data-application-id",
    engineTargetV1.applicationId,
  );
}
