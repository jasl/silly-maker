// SPDX-License-Identifier: MIT
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { Locator, Page } from "@playwright/test";

import { expect, gotoLabV1, test } from "./fixtures.ts";

const sceneFileV1 = fileURLToPath(
  new URL(
    "../../../../../e2e/src/scenes/procedure/procedure-studio-detached.scene.json",
    import.meta.url,
  ),
);

function alphaXV1(source: string): number {
  const document = JSON.parse(source) as {
    readonly entries: ReadonlyArray<{
      readonly tag: string;
      readonly placement?: { readonly x: number };
    }>;
  };
  const x = document.entries.find((entry) => entry.tag === "tag.e2e.alpha")?.placement?.x;
  if (x === undefined) throw new TypeError("Engine Lab procedure Scene must place alpha");
  return x;
}

async function openAgentAuthoringV1(page: Page): Promise<{
  readonly panel: Locator;
  readonly authoringHost: Locator;
  readonly agentHost: Locator;
}> {
  await page.locator('[data-embedded-authoring-activate="true"]').click();
  const panel = page.locator('[data-embedded-authoring-panel="true"]');
  const authoringHost = page.locator('[data-authoring-host-mode="embedded"]');
  const agentHost = page.locator("[data-experimental-agent-host]");
  await expect(panel).toBeVisible();
  await expect(authoringHost).toHaveAttribute("data-authoring-host-ready", "connected");
  await expect(agentHost).toHaveAttribute("data-agent-readiness", "unavailable");
  await expect(agentHost.locator("[data-agent-domain-ready]")).toHaveAttribute(
    "data-agent-domain-ready",
    "false",
  );
  return { panel, authoringHost, agentHost };
}

test.describe("Engine Lab experimental Agent and UiArtifact seam (AR4)", () => {
  test("@dev-source-io keeps the shell usable and routes only admitted intent to the in-memory Scene draft", async ({ page }) => {
    const sourceBytes = readFileSync(sceneFileV1, "utf8");
    const sourceX = alphaXV1(sourceBytes);
    let pageLoads = 0;
    page.on("load", () => {
      pageLoads += 1;
    });
    await gotoLabV1(page);
    pageLoads = 0;
    const gameHost = page.getByTestId("overlay-host");
    const gameEpoch = await gameHost.getAttribute("data-overlay-application-epoch");
    expect(gameEpoch).not.toBeNull();
    const { panel, authoringHost, agentHost } = await openAgentAuthoringV1(page);
    const authoringIdentity = await authoringHost.getAttribute("data-authoring-host");
    const agentIdentity = await agentHost.getAttribute("data-experimental-agent-host");
    expect(authoringIdentity).not.toBeNull();
    expect(agentIdentity).not.toBeNull();

    // The required Agent service is offline, but Authoring and recovery remain usable.
    const entry = authoringHost.locator('[data-studio-entry-select="true"]');
    await entry.selectOption("tag.e2e.alpha");
    const xInput = authoringHost
      .locator('[data-studio-entry-inspector="tag.e2e.alpha"]')
      .getByLabel("x", { exact: true });
    await expect(xInput).toHaveValue(String(sourceX));
    await agentHost.getByRole("button", { name: "重试 Agent 服务" }).click();
    await expect(agentHost).toHaveAttribute("data-agent-readiness", "ready");
    await agentHost.getByRole("button", { name: "启动 Agent 会话" }).click();
    const prompt = agentHost.getByLabel("请求");
    const submit = agentHost.getByRole("button", { name: "生成 Artifact" });
    await expect(prompt).toBeVisible();

    await submit.click();
    await expect(agentHost.locator('[data-agent-draft-status="streaming"]'))
      .toContainText("正在生成安全的 UiArtifact");
    const firstArtifact = agentHost.locator('[data-ui-artifact-revision="1"]');
    await expect(firstArtifact).toBeVisible();
    await firstArtifact.getByRole("button", { name: "应用场景草稿修改" }).click();
    await expect(xInput).toHaveValue("640");
    await expect(agentHost.locator("[data-agent-action-note]"))
      .toContainText("尚未保存");
    await expect(authoringHost.locator("[data-studio-save]")).toBeEnabled();
    expect(readFileSync(sceneFileV1, "utf8")).toBe(sourceBytes);
    await authoringHost.locator("[data-studio-undo]").click();
    await expect(xInput).toHaveValue(String(sourceX));

    // The Artifact binds the exact AR2 receipt at publication. A later human
    // edit makes the action stale instead of silently rebasing over the draft.
    await expect(submit).toBeEnabled();
    await prompt.fill("生成第二个有效 Artifact");
    await submit.click();
    const secondArtifact = agentHost.locator('[data-ui-artifact-revision="2"]');
    await expect(secondArtifact).toBeVisible();
    await xInput.fill(String(sourceX + 75));
    await secondArtifact.getByRole("button", { name: "应用场景草稿修改" }).click();
    await expect(agentHost.locator("[data-agent-action-note]"))
      .toContainText("scene_authoring.revision_stale");
    await expect(xInput).toHaveValue(String(sourceX + 75));
    expect(readFileSync(sceneFileV1, "utf8")).toBe(sourceBytes);
    await authoringHost.locator("[data-studio-undo]").click();
    await expect(xInput).toHaveValue(String(sourceX));

    // Unknown nodes/actions reject the whole successor and retain the exact
    // predecessor Artifact. No remote payload reaches Scene authority.
    await expect(submit).toBeEnabled();
    await prompt.fill("未知节点");
    await submit.click();
    await expect(agentHost.locator('[data-agent-diagnostic="artifact.node_unknown"]'))
      .toBeVisible();
    await expect(secondArtifact).toBeVisible();
    await expect(xInput).toHaveValue(String(sourceX));

    await expect(submit).toBeEnabled();
    await prompt.fill("未知动作");
    await submit.click();
    await expect(agentHost.locator('[data-agent-diagnostic="artifact.action_unknown"]'))
      .toBeVisible();
    await expect(secondArtifact).toBeVisible();
    await expect(xInput).toHaveValue(String(sourceX));

    // Cancel fences acceptance locally. The fake deliberately sends its
    // scheduled completion afterward; draft and predecessor remain exact.
    await expect(submit).toBeEnabled();
    await prompt.fill("取消晚到");
    await submit.click();
    const streamingDraft = agentHost.locator('[data-agent-draft-status="streaming"]');
    await expect(streamingDraft).toContainText("正在等待取消后的迟到结果");
    await agentHost.getByRole("button", { name: "取消本地接收" }).click();
    const cancelledDraft = agentHost.locator('[data-agent-draft-status="cancelled"]');
    await expect(cancelledDraft).toContainText("正在等待取消后的迟到结果");
    await page.waitForTimeout(350);
    await expect(cancelledDraft).toContainText("正在等待取消后的迟到结果");
    await expect(secondArtifact).toBeVisible();
    await expect(xInput).toHaveValue(String(sourceX));

    // Hiding/reopening the embedded shell retains both sibling owners and the
    // already admitted revision; it does not submit another run.
    await page.locator('[data-embedded-authoring-close="true"]').click();
    await expect(panel).toBeHidden();
    await page.locator('[data-embedded-authoring-open="true"]').click();
    await expect(panel).toBeVisible();
    await expect(authoringHost).toHaveAttribute("data-authoring-host", authoringIdentity!);
    await expect(agentHost).toHaveAttribute("data-experimental-agent-host", agentIdentity!);
    await expect(secondArtifact).toBeVisible();

    expect(pageLoads).toBe(0);
    await expect(gameHost).toHaveAttribute("data-overlay-application-epoch", gameEpoch!);
    expect(readFileSync(sceneFileV1, "utf8")).toBe(sourceBytes);
  });
});
