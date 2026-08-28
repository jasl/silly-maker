// SPDX-License-Identifier: MIT
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { expect, test } from "./fixtures.ts";
import { engineTargetUrlV1 } from "./fixtures.ts";

const inspectorSceneFileV1 = fileURLToPath(
  new URL(
    "../../../../../e2e/src/scenes/inspector/inspector-conformance.authoring-scene.json",
    import.meta.url,
  ),
);

test.describe("Inspector replacement surface", () => {
  test("@dev-source-io searches, inspects facets, previews ghosts, scrubs, and saves through CAS", async ({ page }) => {
    const originalBytes = readFileSync(inspectorSceneFileV1, "utf8");
    try {
      await page.goto(engineTargetUrlV1("__sillymaker/inspector/"));
      const inspector = page.locator('[data-inspector-root="true"]');
      await expect(inspector).toHaveAttribute("data-authoring-host-ready", "connected");

      await inspector.getByLabel("搜索当前应用的 Scene").fill("Inspector conformance");
      await inspector.getByRole("button", { name: /Inspector conformance/ }).click();
      const inspectorSurface = inspector.locator('[data-inspector-ready="true"]');
      await expect(inspectorSurface).toBeVisible();
      await expect(inspector.getByLabel("预览缩放")).toHaveValue("fit");
      const preview = inspector.locator('[data-inspector-preview="true"]');
      await expect(preview).toHaveAttribute("data-inspector-preview-zoom", "fit");
      await expect.poll(async () =>
        Number(await preview.getAttribute("data-inspector-preview-effective-zoom"))
      ).toBeGreaterThan(0);
      const sharedBaseline = await inspectorSurface.evaluate((root) => {
        const documentStyle = getComputedStyle(document.documentElement);
        const rootStyle = getComputedStyle(root);
        const button = root.querySelector("button");
        if (button === null) throw new TypeError("Inspector control missing");
        const buttonStyle = getComputedStyle(button);
        return {
          controlMinimum: documentStyle.getPropertyValue("--silly-control-min-size").trim(),
          compactControlMinimum: documentStyle.getPropertyValue(
            "--silly-control-min-size-compact",
          ).trim(),
          documentColor: documentStyle.color,
          rootColor: rootStyle.color,
          documentFontSize: Number.parseFloat(documentStyle.fontSize),
          rootFontSize: Number.parseFloat(rootStyle.fontSize),
          buttonBackground: buttonStyle.backgroundColor,
          buttonMinimum: Number.parseFloat(buttonStyle.minHeight),
        };
      });
      expect(sharedBaseline.controlMinimum).not.toBe("");
      expect(sharedBaseline.compactControlMinimum).not.toBe("");
      expect(sharedBaseline.rootColor).toBe(sharedBaseline.documentColor);
      expect(sharedBaseline.rootFontSize).toBeLessThan(sharedBaseline.documentFontSize);
      expect(sharedBaseline.rootFontSize).toBeGreaterThanOrEqual(13);
      expect(sharedBaseline.buttonBackground).not.toBe("rgba(0, 0, 0, 0)");
      expect(sharedBaseline.buttonMinimum).toBeGreaterThanOrEqual(
        sharedBaseline.rootFontSize * 2,
      );

      const objectSearch = inspector.getByLabel("搜索当前场景对象");
      await objectSearch.fill("样本箱");
      await inspector.locator('[data-inspector-object="tag.e2e.inspector-crate"]').click();
      const objectPanel = inspector.locator(
        '[data-inspector-object-panel="tag.e2e.inspector-crate"]',
      );
      await expect(objectPanel).toContainText("zone.crate.collect");
      await expect(objectPanel).toContainText("intent.e2e.collect-crate");
      await expect(objectPanel.locator("[data-inspector-source-pointer]")).toHaveText(
        "/layers/2/roots/0",
      );
      await expect(
        inspector.locator('[data-inspector-hit-region="zone.crate.collect"]'),
      ).toHaveAttribute("data-inspector-hit-region-status", "resolved");

      const revisionBeforeEdit = await inspector.locator("[data-authoring-draft-revision]")
        .getAttribute("data-authoring-draft-revision");
      const save = inspector.getByRole("button", { name: "保存", exact: true });
      await expect(save).toBeDisabled();

      await objectSearch.fill("场外透明");
      await inspector.locator('[data-inspector-object="tag.e2e.inspector-ghost"]').click();
      await expect(
        inspector.locator('[data-inspector-object-overlay="tag.e2e.inspector-ghost"]'),
      ).toHaveAttribute("data-inspector-ghost", "true");
      const scrub = inspector.getByLabel("只读 scrub");
      await scrub.selectOption({
        label: "Motion · motion.e2e.char-enter · tag.e2e.inspector-ghost",
      });
      await inspector.getByLabel("Scrub 时间").fill("150");
      await expect(inspector.locator("[data-authoring-draft-revision]")).toHaveAttribute(
        "data-authoring-draft-revision",
        revisionBeforeEdit ?? "0",
      );
      await expect(save).toBeDisabled();

      const ambientPhase = inspector.getByLabel("ambient phase (ms)");
      await expect(ambientPhase).toHaveValue("0");
      await ambientPhase.fill("350");
      await ambientPhase.blur();
      await expect(save).toBeEnabled();
      await inspector.getByRole("button", { name: "撤销", exact: true }).click();
      await expect(ambientPhase).toHaveValue("0");
      await inspector.getByRole("button", { name: "重做", exact: true }).click();
      await expect(ambientPhase).toHaveValue("350");

      await objectSearch.fill("样本箱");
      await inspector.locator('[data-inspector-object="tag.e2e.inspector-crate"]').click();
      const xInput = objectPanel.getByLabel("X", { exact: true });
      await expect(xInput).toHaveValue("660");
      await xInput.fill("701");
      await xInput.blur();
      await expect(xInput).toHaveValue("701");
      await expect(save).toBeEnabled();

      await inspector.getByLabel("搜索当前应用的 Scene").fill("储藏室实验流程");
      await inspector.locator('[data-inspector-scene="scene.e2e.procedure"]').click();
      await expect(inspector.getByRole("dialog", { name: "切换 Scene" })).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(inspector.getByRole("dialog", { name: "切换 Scene" })).toHaveCount(0);
      await expect(save).toBeEnabled();

      await inspector.getByRole("button", { name: "撤销", exact: true }).click();
      await expect(xInput).toHaveValue("660");
      await inspector.getByRole("button", { name: "重做", exact: true }).click();
      await expect(xInput).toHaveValue("701");
      await save.click();
      await expect(save).toBeDisabled();
      await expect.poll(() => readFileSync(inspectorSceneFileV1, "utf8")).not.toBe(originalBytes);
    } finally {
      if (readFileSync(inspectorSceneFileV1, "utf8") !== originalBytes) {
        writeFileSync(inspectorSceneFileV1, originalBytes);
      }
    }
    expect(readFileSync(inspectorSceneFileV1, "utf8")).toBe(originalBytes);
  });
});
