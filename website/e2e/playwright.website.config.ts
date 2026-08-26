// SPDX-License-Identifier: MIT
import { defineConfig, devices } from "@playwright/test";

const websiteTargetV1 = { host: "127.0.0.1", port: 41741 } as const;

export default defineConfig({
  testDir: ".",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: "line",
  webServer: {
    command: `deno task docs:preview --host ${websiteTargetV1.host} --port ${
      String(websiteTargetV1.port)
    } --strictPort`,
    cwd: "../..",
    reuseExistingServer: false,
    timeout: 120_000,
    url: `http://${websiteTargetV1.host}:${String(websiteTargetV1.port)}/`,
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
  ],
});
