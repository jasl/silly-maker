// SPDX-License-Identifier: MIT
import { readFileSync, writeFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
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
const procedureAuthoringSceneFileV1 = fileURLToPath(
  new URL(
    "../../../../../e2e/src/scenes/procedure/procedure.authoring-scene.json",
    import.meta.url,
  ),
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

interface AuthoritativeSaveAxesV1 {
  readonly state: Readonly<Record<string, unknown>>;
  readonly rng: Readonly<Record<string, unknown>>;
  readonly commandSequence: number;
  readonly integrity: Readonly<Record<string, unknown>>;
  readonly stateDigest: string;
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

function requireRecordV1(value: unknown, description: string): Readonly<Record<string, unknown>> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`${description} is unavailable`);
  }
  return value as Readonly<Record<string, unknown>>;
}

async function exportAuthoritativeSaveAxesV1(page: Page): Promise<AuthoritativeSaveAxesV1> {
  await page.getByTestId("stage-system").getByRole("button", { name: "保存", exact: true })
    .click();
  const dialog = page.getByRole("dialog", { name: "保存" });
  const downloadPromise = page.waitForEvent("download");
  await dialog.getByRole("button", { name: "导出当前进度", exact: true }).click();
  const download = await downloadPromise;
  const bytes = await readFile(await download.path());
  await dialog.getByRole("button", { name: "关闭", exact: true }).click();

  const envelope = requireRecordV1(JSON.parse(bytes.toString("utf8")), "exported Save");
  const snapshot = requireRecordV1(envelope.snapshot, "exported Save Snapshot");
  const state = requireRecordV1(snapshot.state, "exported Save State");
  const rng = requireRecordV1(snapshot.rng, "exported Save RNG");
  const integrity = requireRecordV1(snapshot.integrity, "exported Save integrity");
  const commandSequence = snapshot.commandSequence;
  const stateDigest = envelope.stateDigest;
  if (
    typeof commandSequence !== "number" ||
    !Number.isSafeInteger(commandSequence) ||
    commandSequence < 0 ||
    typeof stateDigest !== "string"
  ) {
    throw new TypeError("exported Save authoritative identity is unavailable");
  }
  return Object.freeze({ state, rng, commandSequence, integrity, stateDigest });
}

function pendingOccurrenceFromSaveV1(save: AuthoritativeSaveAxesV1): string {
  const simulation = requireRecordV1(save.state.simulation, "exported simulation State");
  const narrative = requireRecordV1(simulation.narrative, "exported narrative State");
  const pending = requireRecordV1(narrative.pending, "exported pending interaction");
  if (typeof pending.occurrenceId !== "string") {
    throw new TypeError("exported pending occurrence is unavailable");
  }
  return pending.occurrenceId;
}

function rngDrawCountFromSaveV1(save: AuthoritativeSaveAxesV1): number {
  const rawDrawCount = save.rng.rawDrawCount;
  if (typeof rawDrawCount !== "number" || !Number.isSafeInteger(rawDrawCount)) {
    throw new TypeError("exported RNG draw count is unavailable");
  }
  return rawDrawCount;
}

function authoritativeContinuityAxesV1(save: AuthoritativeSaveAxesV1) {
  const simulation = requireRecordV1(save.state.simulation, "exported simulation State");
  const { stage: _stage, ...simulationWithoutStage } = simulation;
  return Object.freeze({
    state: Object.freeze({ ...save.state, simulation: Object.freeze(simulationWithoutStage) }),
    rng: save.rng,
  });
}

function reorderProcedureSceneSourceV1(source: string): string {
  const document = JSON.parse(source) as {
    layers: Array<{
      layerId: string;
      roots: Array<{ objectId: string; children?: Array<{ objectId: string }> }>;
    }>;
  };
  const characters = document.layers.find(({ layerId }) => layerId === "layer.e2e.characters");
  const group = characters?.roots.find(({ objectId }) => objectId === "tag.e2e.researchers");
  const children = group?.children;
  const alpha = children?.find(({ objectId }) => objectId === "tag.e2e.alpha");
  const beta = children?.find(({ objectId }) => objectId === "tag.e2e.beta");
  const byLayerId = new Map(document.layers.map((layer) => [layer.layerId, layer]));
  const background = byLayerId.get("layer.e2e.background");
  const props = byLayerId.get("layer.e2e.props");
  if (
    group === undefined || alpha === undefined || beta === undefined ||
    background === undefined || props === undefined || characters === undefined
  ) {
    throw new TypeError("Engine Lab procedure authoring scene is unavailable");
  }
  group.children = [beta, alpha];
  document.layers = [background, props, characters];
  return `${JSON.stringify(document, null, 2)}\n`;
}

async function observedStageLayerOrderV1(page: Page): Promise<readonly string[]> {
  return await page.locator(
    '[data-lab-stage="true"] [data-stage-camera="true"] > [data-stage-layer]',
  ).evaluateAll((layers) => layers.map((layer) => layer.getAttribute("data-stage-layer") ?? ""));
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
  test("@dev-source-io reconciles authoring-scene order through one Player R2 command", async ({ page }) => {
    test.setTimeout(60_000);
    const originalBytes = readFileSync(procedureAuthoringSceneFileV1, "utf8");
    const candidateBytes = reorderProcedureSceneSourceV1(originalBytes);
    let pageLoads = 0;

    try {
      await gotoLabV1(page);
      await page.getByRole("button", { name: "采集样本" }).click();
      await page.getByRole("button", { name: "开始流程" }).click();

      const stage = page.locator('[data-lab-stage="true"] [data-semantic-stage="true"]');
      const alpha = stage.locator(
        '[data-stage-key="layer.e2e.characters:tag.e2e.alpha"]',
      );
      const beta = stage.locator(
        '[data-stage-key="layer.e2e.characters:tag.e2e.beta"]',
      );
      await expect(stage).toHaveAttribute("data-stage-settled", "true");
      await expect(alpha).toHaveCSS("z-index", "0");
      await expect(beta).toHaveCSS("z-index", "1");
      expect(await observedStageLayerOrderV1(page)).toEqual([
        "layer.e2e.background",
        "layer.e2e.characters",
        "layer.e2e.props",
      ]);

      const predecessorSave = await exportAuthoritativeSaveAxesV1(page);
      const gameHost = page.getByTestId("overlay-host");
      const predecessorEpoch = Number(
        await gameHost.getAttribute("data-overlay-application-epoch"),
      );
      expect(Number.isSafeInteger(predecessorEpoch)).toBe(true);
      page.on("load", () => {
        pageLoads += 1;
      });

      writeFileSync(procedureAuthoringSceneFileV1, candidateBytes);
      await expect(gameHost).toHaveAttribute(
        "data-overlay-application-epoch",
        String(predecessorEpoch + 1),
      );
      await expect(alpha).toHaveCSS("z-index", "1");
      await expect(beta).toHaveCSS("z-index", "0");
      await expect.poll(() => observedStageLayerOrderV1(page)).toEqual([
        "layer.e2e.background",
        "layer.e2e.props",
        "layer.e2e.characters",
      ]);

      const forwardSave = await exportAuthoritativeSaveAxesV1(page);
      expect(authoritativeContinuityAxesV1(forwardSave)).toEqual(
        authoritativeContinuityAxesV1(predecessorSave),
      );
      expect(forwardSave.commandSequence).toBe(predecessorSave.commandSequence + 1);
      await expect(gameHost).toHaveAttribute(
        "data-overlay-application-epoch",
        String(predecessorEpoch + 1),
      );
      expect(pageLoads).toBe(0);

      writeFileSync(procedureAuthoringSceneFileV1, originalBytes);
      await expect(gameHost).toHaveAttribute(
        "data-overlay-application-epoch",
        String(predecessorEpoch + 2),
      );
      await expect(alpha).toHaveCSS("z-index", "0");
      await expect(beta).toHaveCSS("z-index", "1");
      await expect.poll(() => observedStageLayerOrderV1(page)).toEqual([
        "layer.e2e.background",
        "layer.e2e.characters",
        "layer.e2e.props",
      ]);
      const reverseSave = await exportAuthoritativeSaveAxesV1(page);
      expect(authoritativeContinuityAxesV1(reverseSave)).toEqual(
        authoritativeContinuityAxesV1(forwardSave),
      );
      expect(reverseSave.commandSequence).toBe(forwardSave.commandSequence + 1);
      expect(pageLoads).toBe(0);
    } finally {
      restoreSourceV1(procedureAuthoringSceneFileV1, originalBytes);
    }
    expect(readFileSync(procedureAuthoringSceneFileV1, "utf8")).toBe(originalBytes);
  });

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
    test.setTimeout(60_000);
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
      // The ordinary collect action consumes one real transactional RNG draw;
      // calibration then leaves a real authoritative interaction pending.
      await page.getByRole("button", { name: "采集样本" }).click();
      await page.getByRole("button", { name: "开始校准" }).click();
      const pending = page.locator("[data-lab-interaction='say']");
      await expect(pending).toBeVisible();
      const predecessorOccurrence = await pending.getAttribute("data-lab-occurrence");
      expect(predecessorOccurrence).not.toBeNull();
      const predecessorSave = await exportAuthoritativeSaveAxesV1(page);
      expect(rngDrawCountFromSaveV1(predecessorSave)).toBeGreaterThan(0);
      expect(pendingOccurrenceFromSaveV1(predecessorSave)).toBe(predecessorOccurrence);

      const forwardAuthoring = await openDirtyAuthoringV1(page);
      const gameHost = page.getByTestId("overlay-host");
      const predecessorEpochText = await gameHost.getAttribute(
        "data-overlay-application-epoch",
      );
      expect(predecessorEpochText).not.toBeNull();
      const predecessorEpoch = Number(predecessorEpochText);
      expect(Number.isSafeInteger(predecessorEpoch)).toBe(true);
      expect(predecessorEpoch).toBeGreaterThanOrEqual(1);
      const forwardEpoch = predecessorEpoch + 1;
      page.on("load", () => {
        pageLoads += 1;
      });

      writeFileSync(presentationFileV1, candidateBytes);
      await expect(forwardAuthoring.panel.locator('[aria-label="研究员甲 R2"]').first())
        .toBeVisible();
      await expect(gameHost).toHaveAttribute(
        "data-overlay-application-epoch",
        String(forwardEpoch),
      );
      await expect(pending).toHaveAttribute("data-lab-occurrence", predecessorOccurrence!);
      await expect(forwardAuthoring.xInput).toHaveValue(String(forwardAuthoring.editedX));
      await expect(forwardAuthoring.undo).toBeEnabled();
      await expect(forwardAuthoring.save).toBeEnabled();
      await finishAuthoringV1(forwardAuthoring);
      const forwardSave = await exportAuthoritativeSaveAxesV1(page);
      expect(forwardSave).toEqual(predecessorSave);
      await expect(gameHost).toHaveAttribute(
        "data-overlay-application-epoch",
        String(forwardEpoch),
      );

      // A legal command must continue from the adopted Session, not merely
      // leave a visually preserved but inert projection behind.
      await expect(page.locator("[data-lab-say-reveal='complete']")).toBeAttached();
      await page.getByRole("button", { name: "继续" }).click();
      await expect(page.getByText("样本读数稳定，可以开始校准。")).toBeVisible();
      const reverseBaselineOccurrence = await pending.getAttribute("data-lab-occurrence");
      expect(reverseBaselineOccurrence).not.toBe(predecessorOccurrence);
      const reverseBaselineSave = await exportAuthoritativeSaveAxesV1(page);
      expect(reverseBaselineSave.commandSequence).toBeGreaterThan(forwardSave.commandSequence);
      const reverseAuthoring = await openDirtyAuthoringV1(page);

      const reverseEpoch = forwardEpoch + 1;
      writeFileSync(presentationFileV1, originalBytes);
      await expect(reverseAuthoring.panel.locator('[aria-label="研究员甲 R2"]')).toHaveCount(0);
      await expect(reverseAuthoring.panel.locator('[aria-label="研究员甲"]').first())
        .toBeVisible();
      await expect(gameHost).toHaveAttribute(
        "data-overlay-application-epoch",
        String(reverseEpoch),
      );
      await expect(pending).toHaveAttribute(
        "data-lab-occurrence",
        reverseBaselineOccurrence!,
      );
      await expect(reverseAuthoring.xInput).toHaveValue(String(reverseAuthoring.editedX));
      await expect(reverseAuthoring.undo).toBeEnabled();
      await expect(reverseAuthoring.save).toBeEnabled();
      await finishAuthoringV1(reverseAuthoring);
      const reverseSave = await exportAuthoritativeSaveAxesV1(page);
      expect(reverseSave).toEqual(reverseBaselineSave);
      await expect(gameHost).toHaveAttribute(
        "data-overlay-application-epoch",
        String(reverseEpoch),
      );

      await expect(page.locator("[data-lab-say-reveal='complete']")).toBeAttached();
      await page.getByRole("button", { name: "继续" }).click();
      await expect(page.locator("[data-lab-interaction='choice']")).toBeVisible();
      expect(pageLoads).toBe(0);
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
