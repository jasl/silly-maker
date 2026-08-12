// SPDX-License-Identifier: MIT
import { tmpdir } from "node:os";
import { join } from "node:path";
import process from "node:process";

import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e/performance",
  outputDir: process.env.SILLYMAKER_PERFORMANCE_OUTPUT_DIR ??
    join(tmpdir(), "sillymaker-player-performance"),
  fullyParallel: false,
  workers: 1,
  retries: 0,
  repeatEach: 3,
  reporter: "line",
  timeout: 120_000,
  use: {
    trace: "retain-on-failure",
  },
  webServer: {
    command: "deno run -A npm:vite preview --mode e2e --host 127.0.0.1 --port 41733 --strictPort",
    cwd: "../../..",
    url: "http://127.0.0.1:41733/",
    reuseExistingServer: false,
    timeout: 120_000,
  },
  projects: [{ name: "chromium-trend", use: { ...devices["Desktop Chrome"] } }],
});
