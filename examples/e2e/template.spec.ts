// SPDX-License-Identifier: MIT
import { existsSync, readFileSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";

import type { Page } from "@playwright/test";

import { expect, templateTargetUrlV1, test } from "./fixtures.ts";

async function advanceSayV1(page: Page): Promise<void> {
  const dialogue = page.locator("[data-dialogue='say']");
  await expect(dialogue).toHaveAttribute("data-dialogue-reveal", "complete");
  await dialogue.locator("[data-dialogue-advance]").click();
}

test("Template uses the production Narrative renderer through completion", async ({ page }) => {
  await page.goto(templateTargetUrlV1());
  await page.getByRole("button", { name: "新游戏" }).click();
  await page.getByRole("button", { name: "开始故事" }).click();
  await advanceSayV1(page);
  await page.getByRole("button", { name: "去看看檐下的动静" }).click();
  await advanceSayV1(page);

  // The fetch beat (cue identity): Mei darts off-frame through an
  // explicit-cut hide while the narration plays…
  const mei = page.locator('[data-stage-key="layer.template.characters:tag.mei"]');
  await expect(mei).toHaveCount(0);
  await expect(page.locator("[data-semantic-stage]")).toHaveAttribute(
    "data-stage-settled",
    "true",
  );
  await advanceSayV1(page);

  // …and is instantly back on her shared enter edge (the explicit-cut
  // return, not the ceremonial entrance motion): present and settled.
  await expect(mei).toBeVisible();
  await expect(page.locator("[data-semantic-stage]")).toHaveAttribute(
    "data-stage-settled",
    "true",
  );
  await advanceSayV1(page);
  await expect(page.locator("[data-dialogue]")).toHaveCount(0);
  await expect(page.locator("[data-template-narrative='completed']")).toContainText(
    "本段落已结束",
  );
});

test("the mist ambient loop drifts, freezes with the presentation clock, and resumes", async ({ page }) => {
  await page.goto(templateTargetUrlV1("?capability=debug_tools"));
  await page.getByRole("button", { name: "新游戏" }).click();
  await page.getByRole("button", { name: "开始故事" }).click();

  // The opening stage block shows the mist band; its presence-bound loop
  // marks the entry and keeps the stage settled while drifting.
  const mist = page.locator('[data-stage-key="layer.template.background:tag.mist"]');
  await expect(mist).toHaveAttribute("data-stage-ambient", "true");
  await expect(page.locator("[data-semantic-stage]")).toHaveAttribute(
    "data-stage-settled",
    "true",
  );
  const transformOf = () => mist.evaluate((node) => (node as HTMLElement).style.transform);
  const before = await transformOf();
  await expect
    .poll(transformOf, { message: "the ambient loop should keep drifting" })
    .not.toBe(before);

  // Presentation freeze parks the loop mid-phase…
  await page.getByRole("button", { name: "调试" }).click();
  await page.getByRole("button", { name: "冻结画面" }).click();
  const frozen = await transformOf();
  await page.waitForTimeout(300);
  expect(await transformOf()).toBe(frozen);

  // …and resuming continues it (phase-continuous, so it keeps moving).
  await page.getByRole("button", { name: "恢复画面" }).click();
  await expect
    .poll(transformOf, { message: "the resumed loop should keep drifting" })
    .not.toBe(frozen);
});

test("the scene-first starter advertises Studio from the debug dock", async ({ page }) => {
  await page.goto(templateTargetUrlV1("?capability=debug_tools"));
  await page.getByRole("button", { name: "调试" }).click();
  const studio = page.getByRole("group", { name: "调试" }).getByRole("link", { name: "Studio" });
  await expect(studio).toHaveAttribute("href", "/__sillymaker/studio/");
  await expect(studio).toHaveAttribute("target", "_blank");
});

test("the starter Studio opens the opening scene with its cue-bound motion", async ({ page }) => {
  await page.goto(templateTargetUrlV1("__sillymaker/studio/"));

  // The navigator lists the scene by label and auto-opens the first one;
  // the canvas draws through the starter's real renderers.
  const sceneButton = page.getByRole("button", { name: "雨后的庭院" });
  await expect(sceneButton).toHaveAttribute("aria-pressed", "true");
  const canvas = page.locator("[data-studio-canvas]");
  await expect(canvas.locator('[data-stage-key="layer.template.characters:tag.mei"]'))
    .toBeVisible();

  // Mei's entrance cue carries its motion binding in the cue table.
  const meiRow = page.locator('[data-studio-cue="cue.template.opening.mei-enters"]');
  await expect(meiRow.getByRole("combobox")).toHaveValue("motion.template.mei-entrance");
});

test("the starter Studio renders the read-only narrative flow with source jump (S5)", async ({ page }) => {
  await page.goto(templateTargetUrlV1("__sillymaker/studio/"));

  // The Flow workspace lists the compiled interaction document.
  const flow = page.locator("[data-studio-flow]");
  await expect(flow).toBeVisible();
  await expect(flow.locator('[data-studio-flow-doc="doc.template.opening"]'))
    .toHaveAttribute("aria-pressed", "true");

  // Clicking a node reveals its source reference — the read-only
  // "go to source document" loop; labeled edges carry the choice names.
  await flow.locator('[data-studio-flow-node="node.template.greeting"]').click();
  await expect(flow.locator("[data-studio-flow-source]")).toHaveText(
    "interaction-doc:doc.template.opening#greeting",
  );
  await expect(flow.getByText("flag flag.template.cat_found", { exact: true })).toBeVisible();
});

test("the starter Studio gates reload behind a dirty-draft confirm (S0.3)", async ({ page }) => {
  await page.goto(templateTargetUrlV1("__sillymaker/studio/"));

  const sceneButton = page.getByRole("button", { name: "雨后的庭院" });
  await expect(sceneButton).toHaveAttribute("aria-pressed", "true");
  await page.getByLabel("条目").selectOption("tag.mei");
  const xInput = page.getByLabel("x", { exact: true });
  const initialX = await xInput.inputValue();
  await xInput.fill("700");

  // Reloading with a dirty draft asks first; cancel keeps the draft.
  await page.getByRole("button", { name: "重新加载" }).click();
  const confirm = page.locator("[data-studio-dirty-confirm]");
  await expect(confirm).toBeVisible();
  await page.getByRole("button", { name: "取消" }).click();
  await expect(confirm).toHaveCount(0);
  await expect(xInput).toHaveValue("700");

  // Discarding reloads the saved document; the draft never hit the disk.
  // Reopening resets the entry selection to the first entry — wait for that
  // reset (the reload landing) before reselecting Mei.
  await page.getByRole("button", { name: "重新加载" }).click();
  await page.getByRole("button", { name: "放弃修改" }).click();
  await expect(page.getByLabel("条目")).not.toHaveValue("tag.mei");
  await page.getByLabel("条目").selectOption("tag.mei");
  await expect(page.getByLabel("x", { exact: true })).toHaveValue(initialX);
});

test("the starter Studio constructs a scene from blank: content, cue, new motion, save (S4)", async ({ page }) => {
  // The chain creates real files under the starter's scene tree; remove
  // them afterwards so reruns (and the next browser project) start clean.
  // Nothing imports these files, so no dev server reloads over HMR.
  const patioDirectory = fileURLToPath(new URL("../../template/src/scenes/patio", import.meta.url));
  try {
    await page.goto(templateTargetUrlV1("__sillymaker/studio/"));
    await expect(page.getByRole("button", { name: "雨后的庭院" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    // A blank scene document, created over the dev port and auto-opened.
    await page.getByRole("button", { name: "新建场景" }).click();
    await page.getByLabel(/^场景名/u).fill("patio");
    await page.getByLabel("标题").fill("露台");
    await page.getByRole("button", { name: "创建" }).click();
    await expect(page.getByRole("button", { name: "露台" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(page.getByText("这个场景还没有条目。")).toBeVisible();

    // Construct from the Content browser: a background and the character.
    await page.locator('[data-studio-add-content="content.template.background.courtyard"]')
      .click();
    await page.locator('[data-studio-add-content="content.template.character.mei"]').click();
    await expect(page.getByLabel("条目")).toHaveValue("tag.template.character.mei");
    await expect(
      page.locator('[data-studio-select="tag.template.character.mei"]'),
    ).toBeVisible();

    // A show cue for the character, then a brand-new motion bound to it —
    // the created document is discovered by the index, never registered.
    await page.getByLabel("新 cue 目标").selectOption("tag.template.character.mei");
    await page.getByRole("button", { name: "新增 cue" }).click();
    const cueRow = page.locator('[data-studio-cue="cue.template.patio.mei"]');
    await expect(cueRow).toBeVisible();
    await page.locator('[data-studio-create-motion="cue.template.patio.mei"]').click();
    await expect(cueRow.getByRole("combobox")).toHaveValue("motion.template.mei");

    // Save the constructed scene; both documents now live on disk and no
    // barrel, catalog, binding list, composition, or config was edited.
    await page.getByRole("button", { name: "保存" }).click();
    await expect(page.getByRole("status")).toContainText("已保存");

    const sceneJson = JSON.parse(
      readFileSync(`${patioDirectory}/patio.scene.json`, "utf8"),
    ) as {
      sceneId: string;
      entries: readonly { tag: string }[];
      cues: readonly { cueId: string; motionId?: string }[];
    };
    expect(sceneJson.sceneId).toBe("scene.template.patio");
    expect(sceneJson.entries).toHaveLength(2);
    expect(sceneJson.cues[0]?.motionId).toBe("motion.template.mei");
    const motionJson = JSON.parse(
      readFileSync(`${patioDirectory}/motions/mei.motion.json`, "utf8"),
    ) as { motionId: string; authoring: { status: string } };
    expect(motionJson.motionId).toBe("motion.template.mei");
    expect(motionJson.authoring.status).toBe("generated");
  } finally {
    if (existsSync(patioDirectory)) rmSync(patioDirectory, { recursive: true, force: true });
  }
});
