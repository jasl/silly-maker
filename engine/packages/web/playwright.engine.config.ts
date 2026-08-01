// SPDX-License-Identifier: MIT
import { defineConfig, devices } from "@playwright/test";

import { engineTargetUrlV1, engineTargetV1 } from "./e2e/engine/fixtures.ts";

/**
 * The engine browser suite runs against the Engine Lab conformance Story:
 * no Tavern text, IDs, or imports. Declared projects each execute real
 * cases: desktop pointer (chromium/webkit), touch, and a 16:10 tablet.
 */
export default defineConfig({
  testDir: "./e2e/engine",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: "line",
  use: {
    baseURL: engineTargetUrlV1(),
    trace: "retain-on-failure",
  },
  webServer: [
    {
      command: `deno run -A npm:vite --mode e2e --host ${engineTargetV1.host} --port ${
        String(engineTargetV1.port)
      } --strictPort`,
      cwd: "../../..",
      reuseExistingServer: false,
      timeout: 120_000,
      url: engineTargetUrlV1(),
    },
  ],
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
    {
      name: "chromium-touch",
      grep: /@responsive|@smoke/,
      testIgnore: /authoritative-determinism\.spec\.ts/u,
      use: {
        browserName: "chromium",
        viewport: { width: 1024, height: 768 },
        hasTouch: true,
        isMobile: false,
      },
    },
    {
      name: "tablet-landscape",
      grep: /@responsive/,
      testIgnore: /authoritative-determinism\.spec\.ts/u,
      use: {
        browserName: "chromium",
        viewport: { width: 1280, height: 800 },
        hasTouch: true,
        isMobile: false,
      },
    },
  ],
});
