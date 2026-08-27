// SPDX-License-Identifier: MIT
import type { Page } from "@playwright/test";

import { expect, templateTargetUrlV1, test } from "./fixtures.ts";

const automationKeyV1 = "__SILLYMAKER_AUTOMATION_V1__";

async function advanceSayV1(page: Page): Promise<void> {
  const dialogue = page.locator("[data-dialogue='say']");
  await expect(dialogue).toHaveAttribute("data-dialogue-reveal", "complete");
  await page.locator("[data-dialogue-advance]").click({ position: { x: 8, y: 8 } });
}

test("Template uses the production Narrative renderer through completion", async ({ page }) => {
  const openingPackRuntimePath = "assets/content/opening.zh-CN.text-pack.json";
  const endingPackRuntimePath = "assets/content/ending.zh-CN.text-pack.json";
  const requestedPackRuntimePaths = new Set<string>();
  page.on("request", (request) => {
    const pathname = new URL(request.url()).pathname;
    for (const runtimePath of [openingPackRuntimePath, endingPackRuntimePath]) {
      if (pathname.endsWith(`/${runtimePath}`)) requestedPackRuntimePaths.add(runtimePath);
    }
  });

  await page.goto(templateTargetUrlV1());
  await page.getByRole("button", { name: "新游戏" }).click();
  await page.getByRole("button", { name: "开始故事" }).click();
  await expect(page.locator("[data-dialogue='say']")).toContainText(
    "雨停了。院子里的青石板还亮着水光。",
  );
  expect(requestedPackRuntimePaths).toContain(openingPackRuntimePath);
  expect(requestedPackRuntimePaths).not.toContain(endingPackRuntimePath);
  await advanceSayV1(page);
  const lookChoice = page.getByRole("button", { name: "去看看檐下的动静" });
  await expect(lookChoice).toBeVisible();
  expect(requestedPackRuntimePaths).not.toContain(endingPackRuntimePath);
  await lookChoice.click();
  await expect.poll(() => requestedPackRuntimePaths.has(endingPackRuntimePath)).toBe(true);
  const catLine = page.locator("[data-dialogue='say']");
  await expect(catLine).toHaveAttribute("data-dialogue-reveal", "complete");
  await expect(catLine).toContainText(
    "看，檐角下躲着一只小猫，毛都淋湿了。",
  );
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

test("Template automation dispatch prepares the selected content pack", async ({ page }) => {
  const endingPackRuntimePath = "assets/content/ending.zh-CN.text-pack.json";
  let endingPackRequested = false;
  page.on("request", (request) => {
    if (new URL(request.url()).pathname.endsWith(`/${endingPackRuntimePath}`)) {
      endingPackRequested = true;
    }
  });

  await page.goto(templateTargetUrlV1("?capability=automation_bridge"));
  await page.getByRole("button", { name: "新游戏" }).click();
  await page.getByRole("button", { name: "开始故事" }).click();
  await advanceSayV1(page);
  const choice = page.locator("[data-dialogue='choice']");
  const occurrenceId = await choice.getAttribute("data-dialogue-occurrence");
  if (occurrenceId === null) throw new TypeError("Template choice occurrence missing");
  expect(endingPackRequested).toBe(false);

  const result = await page.evaluate(async (input) => {
    const automation = Reflect.get(globalThis, input.key) as
      | Readonly<{ dispatch(invocation: unknown): Promise<unknown> }>
      | undefined;
    if (automation === undefined) throw new TypeError("automation bridge unavailable");
    return await automation.dispatch({
      kind: "resolve",
      expectedOccurrenceId: input.occurrenceId,
      resolution: { kind: "choose", choiceId: "choice.template.look" },
    });
  }, { key: automationKeyV1, occurrenceId });

  expect(result).toMatchObject({ kind: "ok", value: { kind: "committed" } });
  expect(endingPackRequested).toBe(true);
  const catLine = page.locator("[data-dialogue='say']");
  await expect(catLine).toHaveAttribute("data-dialogue-reveal", "complete");
  await expect(catLine).toContainText(
    "看，檐角下躲着一只小猫，毛都淋湿了。",
  );
});

test("the mist ambient loop drifts, freezes with the presentation clock, and resumes", async ({ page }) => {
  await page.goto(templateTargetUrlV1("reference.html?capability=debug_tools"));
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

test("the scene-first starter advertises Inspector from the debug dock", async ({ page }) => {
  await page.goto(templateTargetUrlV1("reference.html?capability=debug_tools"));
  await page.getByRole("button", { name: "调试" }).click();
  const inspector = page.getByRole("group", { name: "调试" }).getByRole("link", {
    name: "Inspector",
  });
  await expect(inspector).toHaveAttribute("href", "/__sillymaker/inspector/");
  await expect(inspector).toHaveAttribute("target", "_blank");
});
