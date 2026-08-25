// SPDX-License-Identifier: MIT
import { expect, gotoLabV1, test } from "./fixtures.ts";
import { engineTargetUrlV1 } from "./fixtures.ts";

test.describe("Runtime Inspector facets", () => {
  test("standalone Inspector shows detached manifest summaries without loading them", async ({ page }) => {
    await page.goto(engineTargetUrlV1("__sillymaker/inspector/"));
    const inspector = page.locator('[data-inspector-root="true"]');
    await expect(inspector).toHaveAttribute("data-authoring-host-ready", "connected");
    const runtime = inspector.getByRole("region", { name: "Runtime Inspector" });
    await expect(runtime).toContainText("owner not connected");

    const drill = runtime.locator(
      '[data-runtime-inspector-row="narrative.e2e.drill"]',
    );
    await expect(drill).toContainText("unloaded");
    await drill.click();
    await expect(drill).toContainText("unloaded");
    await expect(runtime.locator('[data-runtime-inspector-detail="narrative.e2e.drill"]'))
      .toContainText("detached");
  });

  test("embedded Inspector follows committed current units without loading on selection", async ({ page }) => {
    await gotoLabV1(page);
    await page.getByRole("button", { name: "打开内嵌创作", exact: true }).click();
    const authoring = page.getByRole("region", { name: "内嵌创作" });
    const runtime = authoring.getByRole("region", { name: "Runtime Inspector" });
    const opening = runtime.locator(
      '[data-runtime-inspector-row="narrative.e2e.calibration"]',
    );
    const drill = runtime.locator(
      '[data-runtime-inspector-row="narrative.e2e.drill"]',
    );

    await expect(opening).toContainText("loaded");
    await expect(drill).toContainText("unloaded");
    await drill.click();
    await expect(drill).toContainText("unloaded");

    await authoring.getByRole("button", { name: "关闭内嵌创作", exact: true }).click();
    await page.getByRole("button", { name: "开始演习", exact: true }).click();
    await page.getByRole("button", { name: "打开内嵌创作", exact: true }).click();
    const currentDrill = page.getByRole("region", { name: "内嵌创作" })
      .getByRole("region", { name: "Runtime Inspector" })
      .locator('[data-runtime-inspector-row="narrative.e2e.drill"]');
    await expect(currentDrill).toContainText("loaded");
    await expect(currentDrill).toContainText("current");
  });

  test("Code Surface exposes one real node lifecycle and cooperation policy", async ({ page }) => {
    await gotoLabV1(page, "?code_surface_conformance=1");
    await page.getByRole("button", { name: "打开内嵌创作", exact: true }).click();
    const runtime = page.getByRole("region", { name: "内嵌创作" })
      .getByRole("region", { name: "Runtime Inspector" });
    const shell = runtime.locator(
      '[data-runtime-inspector-row="node.e2e.code-surface-shell"]',
    );
    await expect(shell).toContainText("mounted");
    await shell.click();

    const detail = runtime.locator(
      '[data-runtime-inspector-detail="node.e2e.code-surface-shell"]',
    );
    await expect(detail).toContainText("src/application/code-surfaces/conformance-shell.tsx");
    await expect(detail).toContainText("native text allowed");
    await expect(detail).toContainText("portal none");
  });
});
