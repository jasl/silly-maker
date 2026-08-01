// SPDX-License-Identifier: MIT
import { defineConfig, devices } from "@playwright/test";

import { engineTargetUrlV1, engineTargetV1 } from "./e2e/engine/fixtures.ts";

/** Dedicated DET4 matrix; ordinary Engine/UI suites intentionally exclude Firefox. */
export default defineConfig({
  testDir: "./e2e/determinism",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  repeatEach: 2,
  reporter: "line",
  use: {
    baseURL: engineTargetUrlV1(),
    trace: "retain-on-failure",
  },
  webServer: {
    command: `deno run -A npm:vite --mode e2e --host ${engineTargetV1.host} --port ${
      String(engineTargetV1.port)
    } --strictPort`,
    cwd: "../../..",
    reuseExistingServer: false,
    timeout: 120_000,
    url: engineTargetUrlV1(),
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
  ],
});
