// SPDX-License-Identifier: MIT
import { defineConfig, devices } from "@playwright/test";

/**
 * The engine conformance suite against the prebuilt Engine Lab Artifact:
 * `pnpm test:e2e:engine:prebuilt` builds `dist/e2e` first, then this config
 * serves the exact bytes with `vite preview` on the same host/port the dev
 * suite uses, so every engine spec runs unchanged against the Artifact.
 */
export default defineConfig({
  testDir: "./e2e/engine",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: "line",
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
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
