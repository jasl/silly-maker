// SPDX-License-Identifier: MIT
import { defineConfig, devices } from "@playwright/test";

const quickJsSandboxTargetV1 = { host: "127.0.0.1", port: 41750 } as const;
const lockedSandboxTargetV1 = { host: "127.0.0.1", port: 41751 } as const;

/**
 * Discardable Q0 only: this does not build or preview the production Sandbox.
 * A distinct port prevents an older, already-running product Sandbox dev server
 * from supplying stale CSP during the feasibility run.
 */
export default defineConfig({
  testDir: ".",
  testMatch: "silly-os-workspace-quickjs-feasibility.spec.ts",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: "line",
  timeout: 60_000,
  webServer: [
    {
      command:
        `deno run -A npm:vite --config examples/silly-os/vite.workspace-sandbox.config.ts --mode quickjs-q0 --host ${quickJsSandboxTargetV1.host} --port ${
          String(quickJsSandboxTargetV1.port)
        } --strictPort`,
      cwd: "../..",
      reuseExistingServer: false,
      timeout: 120_000,
      url: `http://${quickJsSandboxTargetV1.host}:${
        String(quickJsSandboxTargetV1.port)
      }/workspace-sandbox.html`,
    },
    {
      command:
        `deno run -A npm:vite --config examples/silly-os/vite.workspace-sandbox.config.ts --host ${lockedSandboxTargetV1.host} --port ${
          String(lockedSandboxTargetV1.port)
        } --strictPort`,
      cwd: "../..",
      reuseExistingServer: false,
      timeout: 120_000,
      url: `http://${lockedSandboxTargetV1.host}:${
        String(lockedSandboxTargetV1.port)
      }/workspace-sandbox.html`,
    },
  ],
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
  ],
});
