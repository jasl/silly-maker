// SPDX-License-Identifier: MIT
import { defineConfig, devices } from "@playwright/test";

import {
  bookshopTargetUrlV1,
  bookshopTargetV1,
  sillyOsTargetUrlV1,
  sillyOsTargetV1,
  templateTargetUrlV1,
  templateTargetV1,
  vnReferenceTourTargetUrlV1,
  vnReferenceTourTargetV1,
} from "./fixtures.ts";

/** Examples browser suite: one dev server per example application; desktop dual-engine acceptance. */
export default defineConfig({
  testDir: ".",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: "line",
  webServer: [
    {
      command: `deno run -A npm:vite --mode template --host ${templateTargetV1.host} --port ${
        String(templateTargetV1.port)
      } --strictPort`,
      cwd: "../..",
      reuseExistingServer: false,
      timeout: 120_000,
      url: templateTargetUrlV1(),
    },
    {
      command:
        `deno run -A npm:vite --mode example-bookshop --host ${bookshopTargetV1.host} --port ${
          String(bookshopTargetV1.port)
        } --strictPort`,
      cwd: "../..",
      reuseExistingServer: false,
      timeout: 120_000,
      url: bookshopTargetUrlV1(),
    },
    {
      command:
        `deno run -A npm:vite --mode example-silly-os --host ${sillyOsTargetV1.host} --port ${
          String(sillyOsTargetV1.port)
        } --strictPort`,
      cwd: "../..",
      reuseExistingServer: false,
      timeout: 120_000,
      url: sillyOsTargetUrlV1(),
    },
    {
      command:
        `deno run -A npm:vite --mode example-vn-reference-tour --host ${vnReferenceTourTargetV1.host} --port ${
          String(vnReferenceTourTargetV1.port)
        } --strictPort`,
      cwd: "../..",
      reuseExistingServer: false,
      timeout: 120_000,
      url: vnReferenceTourTargetUrlV1(),
    },
  ],
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
    {
      name: "firefox-save",
      grep: /@save/,
      use: { ...devices["Desktop Firefox"] },
    },
    {
      // Mobile portrait: SillyOS switches the Creator workspace to one navigable pane.
      name: "mobile-portrait",
      grep: /@mobile/,
      use: {
        browserName: "chromium",
        viewport: { width: 390, height: 844 },
        hasTouch: true,
      },
    },
  ],
});
