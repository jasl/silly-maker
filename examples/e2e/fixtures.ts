// SPDX-License-Identifier: MIT
// 示例套件的浏览器夹具：每个示例一个 dev server 目标；诊断策略与引擎
// 套件一致（页面错误/控制台错误即失败，证据附卷）。
import { expect, test as base } from "@playwright/test";

const hostV1 = "127.0.0.1";

/** 雨巷猫舍：舞台命中区域、对话播放、存档安全点、回退。 */
export const catcafeTargetV1 = Object.freeze({ host: hostV1, port: 41737 });

export function catcafeTargetUrlV1(query = ""): string {
  return `http://${catcafeTargetV1.host}:${String(catcafeTargetV1.port)}/${query}`;
}

/** SillyOS 98：全定制桌面 shell（窗口/任务栏/应用；持久化对玩家不透明）。 */
export const sillyOsTargetV1 = Object.freeze({ host: hostV1, port: 41739 });

export function sillyOsTargetUrlV1(query = ""): string {
  return `http://${sillyOsTargetV1.host}:${String(sillyOsTargetV1.port)}/${query}`;
}

interface PageDiagnosticsV1 {
  readonly pageErrors: readonly string[];
  readonly consoleErrors: readonly string[];
}

export const test = base.extend<{ pageDiagnostics: PageDiagnosticsV1 }>({
  pageDiagnostics: [
    async ({ page }, use, testInfo) => {
      const pageErrors: string[] = [];
      const consoleErrors: string[] = [];
      page.on("pageerror", (error) => {
        pageErrors.push(error.message);
      });
      page.on("console", (message) => {
        if (message.type() === "error") consoleErrors.push(message.text());
      });

      await use(Object.freeze({ pageErrors, consoleErrors }));

      if (pageErrors.length > 0 || consoleErrors.length > 0) {
        await testInfo.attach("page-diagnostics", {
          body: JSON.stringify({ pageErrors, consoleErrors }, null, 2),
          contentType: "application/json",
        });
      }
      expect(pageErrors, "the page must not raise uncaught errors").toEqual([]);
      expect(consoleErrors, "the page must not log console errors").toEqual([]);
    },
    { auto: true },
  ],
});

export { expect } from "@playwright/test";
