// SPDX-License-Identifier: MIT
import { defineConfig, devices } from "@playwright/test";

const quickJsSandboxTargetV1 = { host: "127.0.0.1", port: 41750 } as const;

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
      `deno run -A npm:vite --config examples/silly-os/vite.workspace-sandbox.config.ts --host ${quickJsSandboxTargetV1.host} --port ${
        String(quickJsSandboxTargetV1.port)
      } --strictPort`,
    cwd: "../..",
    reuseExistingServer: false,
    timeout: 120_000,
    url: `http://${quickJsSandboxTargetV1.host}:${
      String(quickJsSandboxTargetV1.port)
    }/workspace-sandbox.html`,
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
  ],
});
