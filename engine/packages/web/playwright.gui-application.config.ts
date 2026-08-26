// SPDX-License-Identifier: MIT
import { defineConfig, devices } from "@playwright/test";

const targetV1 = { host: "127.0.0.1", port: 41742 } as const;

export default defineConfig({
  testDir: "./e2e/gui-application",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: "line",
  use: {
    baseURL: `http://${targetV1.host}:${String(targetV1.port)}/`,
    trace: "retain-on-failure",
  },
  webServer: {
    command:
      `deno run -A npm:vite --config engine/packages/tooling/test-fixtures/gui-only-application/vite.config.ts --host ${targetV1.host} --port ${
        String(targetV1.port)
      } --strictPort`,
    cwd: "../../..",
    reuseExistingServer: false,
    timeout: 120_000,
    url: `http://${targetV1.host}:${String(targetV1.port)}/`,
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
  ],
});
