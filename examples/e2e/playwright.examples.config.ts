// SPDX-License-Identifier: MIT
import { defineConfig, devices } from "@playwright/test";

import {
  catcafeTargetUrlV1,
  catcafeTargetV1,
  sillyOsTargetUrlV1,
  sillyOsTargetV1,
} from "./fixtures.ts";

/** 示例浏览器套件：每个示例应用一个 dev server，桌面双内核验收。 */
export default defineConfig({
  testDir: ".",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: "line",
  webServer: [
    {
      command: `deno run -A npm:vite --mode example-cat-cafe --host ${catcafeTargetV1.host} --port ${String(catcafeTargetV1.port)} --strictPort`,
      cwd: "../..",
      reuseExistingServer: false,
      timeout: 120_000,
      url: catcafeTargetUrlV1(),
    },
    {
      command: `deno run -A npm:vite --mode example-silly-os --host ${sillyOsTargetV1.host} --port ${String(sillyOsTargetV1.port)} --strictPort`,
      cwd: "../..",
      reuseExistingServer: false,
      timeout: 120_000,
      url: sillyOsTargetUrlV1(),
    },
  ],
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
    {
      // 手机竖屏：SillyOS fluid 平铺与触控可用性的最小盯守。
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
