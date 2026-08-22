// SPDX-License-Identifier: MIT
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { Locator, Page } from "@playwright/test";

import { expect, gotoLabV1, test } from "./fixtures.ts";

const conformanceQueryV1 = "?overlay_conformance=1";
const sceneFileV1 = fileURLToPath(
  new URL("../../../../../e2e/src/scenes/procedure/procedure.scene.json", import.meta.url),
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
  return Object.freeze({ panel, authoringHost, agentHost });
}

async function requiredAttributeV1(locator: Locator, name: string): Promise<string> {
  const value = await locator.getAttribute(name);
  expect(value).not.toBeNull();
  expect(value).not.toBe("");
  return value!;
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

  test("@dev-source-io preserves an in-flight Agent session across a real Game/Session successor", async ({ page }) => {
    const sourceBytes = readFileSync(sceneFileV1, "utf8");
    const sourceX = alphaXV1(sourceBytes);
    let pageLoads = 0;
    page.on("load", () => {
      pageLoads += 1;
    });
    await gotoLabV1(page, conformanceQueryV1);
    pageLoads = 0;

    const gameHost = page.getByTestId("overlay-host");
    const predecessorGameEpoch = await requiredAttributeV1(
      gameHost,
      "data-overlay-application-epoch",
    );
    const { panel, authoringHost, agentHost } = await openAgentAuthoringV1(page);
    const authoringIdentity = await requiredAttributeV1(authoringHost, "data-authoring-host");
    const agentIdentity = await requiredAttributeV1(agentHost, "data-experimental-agent-host");
    await authoringHost.evaluate((element) => {
      element.setAttribute("data-ar5-authoring-host", "predecessor");
    });
    await agentHost.evaluate((element) => {
      element.setAttribute("data-ar5-agent-host", "predecessor");
    });

    const entry = authoringHost.locator('[data-studio-entry-select="true"]');
    await entry.selectOption("tag.e2e.alpha");
    const xInput = authoringHost
      .locator('[data-studio-entry-inspector="tag.e2e.alpha"]')
      .getByLabel("x", { exact: true });
    await expect(xInput).toHaveValue(String(sourceX));
    await xInput.evaluate((element) => {
      element.setAttribute("data-ar5-scene-input", "predecessor");
    });

    await agentHost.getByRole("button", { name: "重试 Agent 服务" }).click();
    await expect(agentHost).toHaveAttribute("data-agent-readiness", "ready");
    await agentHost.getByRole("button", { name: "启动 Agent 会话" }).click();
    const prompt = agentHost.getByLabel("请求");
    const submit = agentHost.getByRole("button", { name: "生成 Artifact" });

    // Finish one Artifact first. The next run intentionally emits only one
    // chunk and remains in flight until this test explicitly cancels it.
    await submit.click();
    const predecessorArtifact = agentHost.locator('[data-ui-artifact-revision="1"]');
    await expect(predecessorArtifact).toBeVisible();
    await predecessorArtifact.evaluate((element) => {
      element.setAttribute("data-ar5-artifact", "predecessor");
    });
    await expect(submit).toBeEnabled();
    await prompt.fill("换代期间保持流");
    await submit.click();
    const heldDraft = agentHost.locator('[data-agent-draft-status="streaming"]');
    await expect(heldDraft).toContainText("正在保持换代期间的流式请求…");
    await heldDraft.evaluate((element) => {
      element.setAttribute("data-ar5-held-stream", "predecessor");
    });

    const sessionId = await requiredAttributeV1(agentHost, "data-agent-session-id");
    const runId = await requiredAttributeV1(agentHost, "data-agent-run-id");
    const runGeneration = await requiredAttributeV1(agentHost, "data-agent-run-generation");
    const connectionGeneration = await requiredAttributeV1(
      agentHost,
      "data-agent-rpc-connection-generation",
    );

    // This is the Engine Lab's real Game/Session restart callback. The Authoring
    // and Agent siblings live outside the Game root and must not participate in
    // its cancellation, connection, or reconstruction lifecycle.
    await page.getByRole("button", { name: "重置观测会话" }).evaluate((button) => {
      (button as HTMLButtonElement).click();
    });
    await expect(gameHost).not.toHaveAttribute(
      "data-overlay-application-epoch",
      predecessorGameEpoch,
    );

    expect(pageLoads).toBe(0);
    await expect(page.locator('[data-ar5-authoring-host="predecessor"]')).toHaveCount(1);
    await expect(page.locator('[data-ar5-agent-host="predecessor"]')).toHaveCount(1);
    await expect(page.locator('[data-ar5-scene-input="predecessor"]')).toHaveCount(1);
    await expect(page.locator('[data-ar5-artifact="predecessor"]')).toHaveCount(1);
    await expect(page.locator('[data-ar5-held-stream="predecessor"]')).toHaveCount(1);
    await expect(authoringHost).toHaveAttribute("data-authoring-host", authoringIdentity);
    await expect(agentHost).toHaveAttribute("data-experimental-agent-host", agentIdentity);
    await expect(agentHost).toHaveAttribute("data-agent-session-id", sessionId);
    await expect(agentHost).toHaveAttribute("data-agent-run-id", runId);
    await expect(agentHost).toHaveAttribute("data-agent-run-generation", runGeneration);
    await expect(agentHost).toHaveAttribute(
      "data-agent-rpc-connection-generation",
      connectionGeneration,
    );
    await expect(heldDraft).toHaveAttribute("data-agent-draft-status", "streaming");
    await expect(heldDraft).toContainText("正在保持换代期间的流式请求…");
    await expect(predecessorArtifact).toBeVisible();

    // The retained Artifact is still paired with the current Scene receipt, so
    // it may apply once after the unrelated Game successor. A subsequent human
    // edit makes that same receipt stale; the late intent is rejected instead
    // of rebasing onto newer authoring authority.
    const applyArtifact = predecessorArtifact.getByRole("button", {
      name: "应用场景草稿修改",
    });
    await applyArtifact.click();
    await expect(xInput).toHaveValue("640");
    await expect(agentHost.locator("[data-agent-action-note]")).toContainText("尚未保存");
    const humanEditedX = sourceX + 91;
    await xInput.fill(String(humanEditedX));
    await applyArtifact.click();
    await expect(agentHost.locator("[data-agent-action-note]"))
      .toContainText("scene_authoring.revision_stale");
    await expect(xInput).toHaveValue(String(humanEditedX));
    expect(readFileSync(sceneFileV1, "utf8")).toBe(sourceBytes);

    const undo = authoringHost.locator('[data-studio-undo="true"]');
    await undo.click();
    await expect(xInput).toHaveValue("640");
    await undo.click();
    await expect(xInput).toHaveValue(String(sourceX));
    await expect(authoringHost.locator('[data-studio-save="true"]')).toBeDisabled();

    await agentHost.getByRole("button", { name: "取消本地接收" }).click();
    const cancelledDraft = agentHost.locator('[data-agent-draft-status="cancelled"]');
    await expect(cancelledDraft).toContainText("正在保持换代期间的流式请求…");
    await expect(agentHost).toHaveAttribute("data-agent-session-id", sessionId);
    await expect(agentHost).toHaveAttribute("data-agent-run-id", runId);
    await expect(agentHost).toHaveAttribute(
      "data-agent-rpc-connection-generation",
      connectionGeneration,
    );
    await expect(predecessorArtifact).toBeVisible();

    await page.locator('[data-embedded-authoring-close="true"]').click();
    await expect(panel).toBeHidden();
    expect(readFileSync(sceneFileV1, "utf8")).toBe(sourceBytes);
  });
});
