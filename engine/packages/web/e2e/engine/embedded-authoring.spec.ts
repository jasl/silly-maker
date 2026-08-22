// SPDX-License-Identifier: MIT
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { Locator, Page } from "@playwright/test";

import { expect, gotoLabV1, test } from "./fixtures.ts";

const studioBindingFileV1 = fileURLToPath(
  new URL("../../../../../e2e/src/tooling/studio-binding.tsx", import.meta.url),
);
const presentationFileV1 = fileURLToPath(
  new URL("../../../../../e2e/src/presentation.ts", import.meta.url),
);
const compositionFileV1 = fileURLToPath(
  new URL("../../../../../e2e/src/application/composition.tsx", import.meta.url),
);
const heldAgentPromptV1 = "换代期间保持流";
const heldAgentDraftTextV1 = "正在保持换代期间的流式请求…";

interface DirtyAuthoringViewV1 {
  readonly panel: Locator;
  readonly xInput: Locator;
  readonly undo: Locator;
  readonly save: Locator;
  readonly sourceX: number;
  readonly editedX: number;
}

interface HeldAgentViewV1 {
  readonly host: Locator;
  readonly draft: Locator;
  readonly predecessorAction: Locator;
}

function requireSourceMutationV1(
  source: string,
  candidate: string,
  description: string,
): string {
  if (candidate === source) throw new Error(`Unable to prepare ${description}`);
  return candidate;
}

function restoreSourceV1(path: string, originalBytes: string): void {
  if (readFileSync(path, "utf8") !== originalBytes) writeFileSync(path, originalBytes);
}

async function openDirtyAuthoringV1(page: Page): Promise<DirtyAuthoringViewV1> {
  await page.getByRole("button", { name: "打开内嵌创作", exact: true }).click();
  const panel = page.getByRole("region", { name: "内嵌创作" });
  await expect(panel).toBeVisible();

  // One stable hook identifies the Scene entry selector; its accessible name
  // includes option text because the label wraps the select.
  const entry = panel.locator('[data-studio-entry-select="true"]');
  await expect(entry).toBeEnabled();
  await entry.selectOption("tag.e2e.alpha");
  const xInput = panel.getByLabel("x", { exact: true });
  await expect(xInput).toBeVisible();
  const sourceX = Number(await xInput.inputValue());
  if (!Number.isSafeInteger(sourceX)) throw new Error("Authoring x value is unavailable");
  const editedX = sourceX + 67;
  await xInput.fill(String(editedX));

  const undo = panel.locator('[data-studio-undo="true"]');
  const save = panel.locator('[data-studio-save="true"]');
  await expect(undo).toBeEnabled();
  await expect(save).toBeEnabled();
  return Object.freeze({ panel, xInput, undo, save, sourceX, editedX });
}

async function startHeldAgentV1(panel: Locator): Promise<HeldAgentViewV1> {
  const host = panel.getByRole("complementary", { name: "实验 Agent" });
  await expect(host).toBeVisible();
  await host.getByRole("button", { name: "重试 Agent 服务" }).click();
  const start = host.getByRole("button", { name: "启动 Agent 会话" });
  await expect(start).toBeVisible();
  await start.click();

  const submit = host.getByRole("button", { name: "生成 Artifact" });
  await submit.click();
  const predecessorAction = host.getByRole("button", { name: "应用场景草稿修改" });
  await expect(predecessorAction).toBeEnabled();
  await expect(submit).toBeEnabled();

  await host.getByLabel("请求").fill(heldAgentPromptV1);
  await submit.click();
  const draft = host.getByText(heldAgentDraftTextV1, { exact: true });
  await expect(draft).toBeVisible();
  return Object.freeze({ host, draft, predecessorAction });
}

async function expectAuthoringAndAgentUsableV1(
  authoring: DirtyAuthoringViewV1,
  agent: HeldAgentViewV1,
): Promise<void> {
  await expect(authoring.panel).toBeVisible();
  await expect(authoring.xInput).toHaveValue(String(authoring.editedX));
  await expect(authoring.undo).toBeEnabled();
  await expect(authoring.save).toBeEnabled();
  await expect(agent.draft).toBeVisible();
  await expect(agent.predecessorAction).toBeEnabled();
}

async function finishAuthoringV1(
  authoring: DirtyAuthoringViewV1,
  agent?: HeldAgentViewV1,
): Promise<void> {
  await authoring.undo.click();
  await expect(authoring.xInput).toHaveValue(String(authoring.sourceX));
  await expect(authoring.save).toBeDisabled();
  if (agent !== undefined) {
    await agent.host.getByRole("button", { name: "取消本地接收" }).click();
  }
  await authoring.panel.getByRole("button", { name: "关闭内嵌创作", exact: true }).click();
  await expect(authoring.panel).toBeHidden();
}

function consumeExpectedConsoleFailureV1(
  diagnostics: { readonly consoleErrors: readonly string[] },
  fragment: string,
): void {
  const errors = diagnostics.consoleErrors as string[];
  const index = errors.findIndex((message) => message.includes(fragment));
  if (index === -1) throw new Error(`Expected browser failure containing: ${fragment}`);
  errors.splice(index, 1);
}

test.describe("Engine Lab Browser module updates", () => {
  test("@dev-source-io rejects an incompatible Authoring R1 candidate and accepts a compatible retry", async ({ page, pageDiagnostics }) => {
    const originalBytes = readFileSync(studioBindingFileV1, "utf8");
    const rejectedBytes = requireSourceMutationV1(
      originalBytes,
      originalBytes.replace(
        /(\n\s+configurationId:\s*)"[^"\n]+"/u,
        `$1${JSON.stringify("engine-lab.agent.fake.rejected")}`,
      ),
      "incompatible Agent companion candidate",
    );
    const retryBytes = requireSourceMutationV1(
      originalBytes,
      originalBytes.replace(
        /(contentId:\s*"content\.e2e\.char\.alpha",\s*\n\s*label:\s*)"[^"\n]+"/u,
        `$1${JSON.stringify("研究员甲 retry")}`,
      ),
      "compatible Authoring candidate",
    );
    let pageLoads = 0;

    try {
      await gotoLabV1(page);
      const authoring = await openDirtyAuthoringV1(page);
      // Engine Lab is the explicit positive Agent selection. The build receipt
      // owns the corresponding no-Agent Authoring graph assertion.
      const agent = await startHeldAgentV1(authoring.panel);
      page.on("load", () => {
        pageLoads += 1;
      });

      const failureFragment = "cannot replace its embedded companion owner or contract";
      const expectedFailure = page.waitForEvent("console", {
        predicate: (message) =>
          message.type() === "error" && message.text().includes(failureFragment),
      });
      writeFileSync(studioBindingFileV1, rejectedBytes);
      await expectedFailure;
      consumeExpectedConsoleFailureV1(pageDiagnostics, failureFragment);

      await expect(authoring.panel.getByText("研究员甲", { exact: true }).first()).toBeVisible();
      await expectAuthoringAndAgentUsableV1(authoring, agent);

      writeFileSync(studioBindingFileV1, retryBytes);
      await expect(authoring.panel.getByText("研究员甲 retry", { exact: true }).first())
        .toBeVisible();
      await expectAuthoringAndAgentUsableV1(authoring, agent);

      writeFileSync(studioBindingFileV1, originalBytes);
      await expect(authoring.panel.getByText("研究员甲 retry", { exact: true })).toHaveCount(0);
      await expect(authoring.panel.getByText("研究员甲", { exact: true }).first()).toBeVisible();
      await expectAuthoringAndAgentUsableV1(authoring, agent);
      expect(pageLoads).toBe(0);

      await finishAuthoringV1(authoring, agent);
    } finally {
      restoreSourceV1(studioBindingFileV1, originalBytes);
    }
    expect(readFileSync(studioBindingFileV1, "utf8")).toBe(originalBytes);
  });

  test("@dev-source-io publishes a shared presentation change as Player R2 plus Authoring R1", async ({ page }) => {
    const originalBytes = readFileSync(presentationFileV1, "utf8");
    const candidateBytes = requireSourceMutationV1(
      originalBytes,
      originalBytes.replace(
        /(case labStageContentIdsV1\.characterAlpha:[\s\S]*?\n\s*accessibleName:\s*)"[^"\n]+"/u,
        `$1${JSON.stringify("研究员甲 R2")}`,
      ),
      "shared presentation candidate",
    );
    let pageLoads = 0;

    try {
      await gotoLabV1(page);
      const authoring = await openDirtyAuthoringV1(page);
      const gameHost = page.getByTestId("overlay-host");
      const predecessorEpoch = await gameHost.getAttribute("data-overlay-application-epoch");
      expect(predecessorEpoch).not.toBeNull();
      page.on("load", () => {
        pageLoads += 1;
      });

      writeFileSync(presentationFileV1, candidateBytes);
      await expect(authoring.panel.locator('[aria-label="研究员甲 R2"]').first()).toBeVisible();
      await expect(gameHost).not.toHaveAttribute(
        "data-overlay-application-epoch",
        predecessorEpoch!,
      );
      await expect(authoring.xInput).toHaveValue(String(authoring.editedX));
      await expect(authoring.undo).toBeEnabled();

      const candidateEpoch = await gameHost.getAttribute("data-overlay-application-epoch");
      expect(candidateEpoch).not.toBeNull();
      writeFileSync(presentationFileV1, originalBytes);
      await expect(authoring.panel.locator('[aria-label="研究员甲 R2"]')).toHaveCount(0);
      await expect(authoring.panel.locator('[aria-label="研究员甲"]').first()).toBeVisible();
      await expect(gameHost).not.toHaveAttribute(
        "data-overlay-application-epoch",
        candidateEpoch!,
      );
      await expect(authoring.xInput).toHaveValue(String(authoring.editedX));
      await expect(authoring.undo).toBeEnabled();
      expect(pageLoads).toBe(0);

      await finishAuthoringV1(authoring);
    } finally {
      restoreSourceV1(presentationFileV1, originalBytes);
    }
    expect(readFileSync(presentationFileV1, "utf8")).toBe(originalBytes);
  });

  test("@dev-source-io falls back to an R3 page reload for an Application identity change", async ({ page }) => {
    const originalBytes = readFileSync(compositionFileV1, "utf8");
    const candidateBytes = requireSourceMutationV1(
      originalBytes,
      originalBytes.replace(
        /(export const labGameApplicationV1[\s\S]*?\n\s*accessibleName:\s*)"[^"\n]+"/u,
        `$1${JSON.stringify("引擎实验室 R3")}`,
      ),
      "Application R3 candidate",
    );

    try {
      await gotoLabV1(page);
      const candidateLoad = page.waitForEvent("load");
      writeFileSync(compositionFileV1, candidateBytes);
      await candidateLoad;
      await expect(page.getByRole("application", { name: "引擎实验室 R3" })).toBeVisible();
      await expect(page.getByRole("button", { name: "采集样本" })).toBeEnabled();

      const restoreLoad = page.waitForEvent("load");
      writeFileSync(compositionFileV1, originalBytes);
      await restoreLoad;
      await expect(page.getByRole("application", { name: "引擎实验室" })).toBeVisible();
      await expect(page.getByRole("button", { name: "采集样本" })).toBeEnabled();
    } finally {
      restoreSourceV1(compositionFileV1, originalBytes);
    }
    expect(readFileSync(compositionFileV1, "utf8")).toBe(originalBytes);
  });
});
