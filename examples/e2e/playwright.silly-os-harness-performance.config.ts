// SPDX-License-Identifier: MIT
import { defineConfig, devices } from "@playwright/test";

import {
  sillyOsNetworkBrokerTargetUrlV1,
  sillyOsNetworkBrokerTargetV1,
  sillyOsTargetUrlV1,
  sillyOsTargetV1,
  sillyOsWorkspaceSandboxTargetUrlV1,
  sillyOsWorkspaceSandboxTargetV1,
} from "./fixtures.ts";

/**
 * Raw-only SillyOS harness characterization. It intentionally owns only the
 * control, independent Sandbox, and keyless Broker servers and never runs in parallel.
 */
export default defineConfig({
  testDir: ".",
  testMatch: "silly-os-harness-performance.spec.ts",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: "line",
  timeout: 180_000,
  webServer: [
    {
      command:
        `deno run -A npm:vite --config examples/silly-os/vite.config.ts --host ${sillyOsTargetV1.host} --port ${
          String(sillyOsTargetV1.port)
        } --strictPort`,
      cwd: "../..",
      reuseExistingServer: true,
      timeout: 120_000,
      url: sillyOsTargetUrlV1(),
    },
    {
      command:
        `deno run -A npm:vite --config examples/silly-os/vite.workspace-sandbox.config.ts --host ${sillyOsWorkspaceSandboxTargetV1.host} --port ${
          String(sillyOsWorkspaceSandboxTargetV1.port)
        } --strictPort`,
      cwd: "../..",
      reuseExistingServer: true,
      timeout: 120_000,
      url: sillyOsWorkspaceSandboxTargetUrlV1("workspace-sandbox.html"),
    },
    {
      command:
        `deno run -A npm:vite --config examples/silly-os/vite.network-broker.config.ts --host ${sillyOsNetworkBrokerTargetV1.host} --port ${
          String(sillyOsNetworkBrokerTargetV1.port)
        } --strictPort`,
      cwd: "../..",
      reuseExistingServer: true,
      timeout: 120_000,
      url: sillyOsNetworkBrokerTargetUrlV1("network-broker.html"),
    },
  ],
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
  ],
});
