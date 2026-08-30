// SPDX-License-Identifier: MIT
import { defineConfig, devices } from "@playwright/test";

import { sillyOsQuickJsSandboxTargetUrlV1, sillyOsQuickJsSandboxTargetV1 } from "./fixtures.ts";

/** Fixed product QuickJS runtime and Sandbox-origin boundary qualification. */
export default defineConfig({
  testDir: ".",
  testMatch: "silly-os-workspace-quickjs.spec.ts",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: "line",
  timeout: 60_000,
  webServer: {
    command:
      `deno run -A npm:vite --config examples/silly-os/vite.workspace-sandbox.config.ts --host ${sillyOsQuickJsSandboxTargetV1.host} --port ${
        String(sillyOsQuickJsSandboxTargetV1.port)
      } --strictPort`,
    cwd: "../..",
    reuseExistingServer: false,
    timeout: 120_000,
    url: sillyOsQuickJsSandboxTargetUrlV1("workspace-sandbox.html"),
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
  ],
});
