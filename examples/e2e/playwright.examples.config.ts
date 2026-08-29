// SPDX-License-Identifier: MIT
import { defineConfig, devices } from "@playwright/test";

import {
  sillyOsTargetUrlV1,
  sillyOsTargetV1,
  sillyOsNetworkBrokerTargetUrlV1,
  sillyOsNetworkBrokerTargetV1,
  sillyOsWorkspaceSandboxTargetUrlV1,
  sillyOsWorkspaceSandboxTargetV1,
  templateTargetUrlV1,
  templateTargetV1,
  vnLastSoundCheckTargetUrlV1,
  vnLastSoundCheckTargetV1,
  vnLastSoundCheckModsTargetUrlV1,
  vnLastSoundCheckModsTargetV1,
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
      // SillyOS owns Pi Worker aliases and fixed dependency prebundling, so its
      // browser evidence must run through the application-local Vite config.
      command:
        `deno run -A npm:vite --config examples/silly-os/vite.config.ts --host ${sillyOsTargetV1.host} --port ${
          String(sillyOsTargetV1.port)
        } --strictPort`,
      cwd: "../..",
      reuseExistingServer: false,
      timeout: 120_000,
      url: sillyOsTargetUrlV1(),
    },
    {
      command:
        `deno run -A npm:vite --config examples/silly-os/vite.workspace-sandbox.config.ts --host ${sillyOsWorkspaceSandboxTargetV1.host} --port ${
          String(sillyOsWorkspaceSandboxTargetV1.port)
        } --strictPort`,
      cwd: "../..",
      reuseExistingServer: false,
      timeout: 120_000,
      url: sillyOsWorkspaceSandboxTargetUrlV1("workspace-sandbox.html"),
    },
    {
      command:
        `deno run -A npm:vite --config examples/silly-os/vite.network-broker.config.ts --host ${sillyOsNetworkBrokerTargetV1.host} --port ${
          String(sillyOsNetworkBrokerTargetV1.port)
        } --strictPort`,
      cwd: "../..",
      reuseExistingServer: false,
      timeout: 120_000,
      url: sillyOsNetworkBrokerTargetUrlV1("network-broker.html"),
    },
    {
      command:
        `deno run -A npm:vite --mode example-vn-last-sound-check --host ${vnLastSoundCheckTargetV1.host} --port ${
          String(vnLastSoundCheckTargetV1.port)
        } --strictPort`,
      cwd: "../..",
      reuseExistingServer: false,
      timeout: 120_000,
      url: vnLastSoundCheckTargetUrlV1(),
    },
    {
      command:
        `deno task build:web:mods && deno run -A npm:vite preview --config vite.mods.config.ts --host ${vnLastSoundCheckModsTargetV1.host} --port ${
          String(vnLastSoundCheckModsTargetV1.port)
        } --strictPort`,
      cwd: "../vn-last-sound-check",
      reuseExistingServer: false,
      timeout: 120_000,
      url: vnLastSoundCheckModsTargetUrlV1(),
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
