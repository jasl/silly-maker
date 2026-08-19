// SPDX-License-Identifier: MIT
import { readFile } from "node:fs/promises";

import type { Page } from "@playwright/test";

import { expect, gotoLabV1, test } from "./fixtures.ts";

/**
 * The Engine Conformance route, mode-parity edition. The same narrative
 * route (two passes of the calibration script through the basic branch)
 * plays under normal presentation, reduced motion, skip mode, and pure
 * Browser-Agent dispatch — then every run exports its Save through the
 * player-facing overlay and the authoritative simulation states must be
 * byte-for-byte identical. Presentation modes may change pacing and
 * animation; they must never change authoritative State.
 *
 * The Engine Lab intentionally ships no media bytes: the background image
 * asset and every audio slot resolve to code-native or silence fallbacks,
 * so a green run here is also the missing-image/missing-audio degrade
 * proof — the stage still settles and the route still completes.
 */

const automationKeyV1 = "__SILLYMAKER_AUTOMATION_V1__";

async function advanceSayV1(page: Page): Promise<void> {
  await expect(page.locator("[data-lab-say-reveal='complete']")).toBeAttached();
  await page.getByRole("button", { name: "继续" }).click();
}

const coldBetaLineV1 = "样本读数稳定，可以开始校准。";
const warmBetaLineV1 = "又见面了，这次一定更顺利。";

/**
 * One scripted pass: intro say, the relationship-conditioned beta say
 * (cold on the first run, warm once rapport is earned), choice, barrier,
 * pause, dial, done say.
 */
async function playNarrativePassV1(page: Page, betaLine = coldBetaLineV1): Promise<void> {
  await page.getByRole("button", { name: "开始校准" }).click();
  await expect(page.locator("[data-lab-interaction='say']")).toBeVisible();
  await advanceSayV1(page);
  await expect(page.getByText(betaLine)).toBeVisible();
  await advanceSayV1(page);
  await page.getByRole("button", { name: "直接校准" }).click();
  // The acknowledged crossfade confirms the barrier and the pause
  // auto-resumes; the test observes the next boundary, never sleeps.
  await expect(page.locator("[data-lab-interaction='custom']")).toBeVisible({ timeout: 10_000 });
  await page.locator("[data-lab-dial-value='2']").click();
  await expect(page.locator("[data-lab-interaction='say']")).toBeVisible();
  await advanceSayV1(page);
  await expect(page.locator("[data-lab-narrative='calibrated']")).toBeVisible();
}

/** Exports the current Save through the player overlay and parses it. */
async function exportSimulationStateV1(page: Page): Promise<unknown> {
  await page.getByRole("button", { name: "保存", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "保存" });
  const downloadPromise = page.waitForEvent("download");
  await dialog.getByRole("button", { name: "导出当前进度" }).click();
  const download = await downloadPromise;
  const bytes = await readFile(await download.path());
  await dialog.getByRole("button", { name: "关闭", exact: true }).click();
  const envelope = JSON.parse(bytes.toString("utf8")) as {
    snapshot: { state: { simulation: unknown } };
  };
  expect(envelope.snapshot.state.simulation).toBeDefined();
  return envelope.snapshot.state.simulation;
}

test.describe("engine conformance route parity", () => {
  test("normal, reduced-motion, skip, and Browser-Agent runs end in the identical authoritative state", async ({ browser }) => {
    test.setTimeout(120_000);
    const simulations: Record<string, unknown> = {};

    // Run 1 — normal presentation: typewriter reveals naturally, then one
    // activation advances each say; both passes clicked through the DOM.
    {
      const context = await browser.newContext();
      const page = await context.newPage();
      await gotoLabV1(page);
      await playNarrativePassV1(page);
      await playNarrativePassV1(page, warmBetaLineV1);
      simulations.normal = await exportSimulationStateV1(page);
      await context.close();
    }

    // Run 2 — reduced motion: reveals settle instantly, transitions settle
    // without animation, and the same boundaries resolve.
    {
      const context = await browser.newContext({ reducedMotion: "reduce" });
      const page = await context.newPage();
      await gotoLabV1(page);
      await playNarrativePassV1(page);
      await playNarrativePassV1(page, warmBetaLineV1);
      simulations.reduced = await exportSimulationStateV1(page);
      await context.close();
    }

    // Run 3 — skip mode: the first pass marks every line seen in the Host
    // profile; the second pass enables skip, which burns through both SEEN
    // says with zero clicks and stops at the choice, exactly like the
    // deterministic jsdom playback tests.
    {
      const context = await browser.newContext();
      const page = await context.newPage();
      await gotoLabV1(page);
      await playNarrativePassV1(page);

      await page.getByRole("button", { name: "开始校准" }).click();
      await expect(page.locator("[data-lab-interaction='say']")).toBeVisible();
      await page.locator("body").click();
      await page.keyboard.press("KeyS");
      await expect(page.getByRole("button", { name: "跳过模式" })).toHaveAttribute(
        "aria-pressed",
        "true",
      );
      // Skip burns the SEEN intro with zero clicks, then stops dead at the
      // relationship branch's warm line — unread lines always stop
      // skip_read — and drops back to normal.
      await expect(page.getByText(warmBetaLineV1)).toBeVisible({ timeout: 10_000 });
      await expect(page.getByRole("button", { name: "跳过模式" })).toHaveAttribute(
        "aria-pressed",
        "false",
      );
      await advanceSayV1(page);
      await expect(page.locator("[data-lab-interaction='choice']")).toBeVisible();
      await page.getByRole("button", { name: "直接校准" }).click();
      await expect(page.locator("[data-lab-interaction='custom']")).toBeVisible({
        timeout: 10_000,
      });
      await page.locator("[data-lab-dial-value='2']").click();
      await expect(page.locator("[data-lab-interaction='say']")).toBeVisible();
      await advanceSayV1(page);
      await expect(page.locator("[data-lab-narrative='calibrated']")).toBeVisible();

      simulations.skip = await exportSimulationStateV1(page);
      await context.close();
    }

    // Run 4 — Browser Agent: the exact same route resolved entirely through
    // the capability-gated automation bridge, no DOM interaction at all.
    {
      const context = await browser.newContext();
      const page = await context.newPage();
      await gotoLabV1(page, "?capability=automation_bridge");
      await page.waitForFunction(
        (key) => Reflect.get(globalThis, key) !== undefined,
        automationKeyV1,
      );
      for (let pass = 0; pass < 2; pass += 1) {
        const completed = await page.evaluate(
          async ({ key }) => {
            interface BridgePendingV1 {
              kind: string;
              occurrenceId: string;
              expectedTransitionId?: string;
              remainingMs?: number;
            }
            interface BridgeV1 {
              observe(): {
                kind: string;
                value?: {
                  revision: number;
                  narrative: { phase: string; pending: BridgePendingV1 | null };
                };
              };
              dispatch(invocation: unknown): Promise<{ kind: string }>;
              waitForIdle(afterRevision?: number): Promise<{ kind: string }>;
            }
            const bridge = Reflect.get(globalThis, key) as BridgeV1;
            const observe = () => {
              const operation = bridge.observe();
              if (operation.kind !== "ok" || operation.value === undefined) {
                throw new Error("bridge unavailable");
              }
              return operation.value;
            };
            const dispatch = async (invocation: unknown) => {
              const before = observe().revision;
              const result = await bridge.dispatch(invocation);
              if (result.kind !== "ok") throw new Error("bridge dispatch refused");
              await bridge.waitForIdle(before);
            };
            await dispatch({ kind: "invoke", actionId: "lab.begin_calibration" });
            for (let step = 0; step < 16; step += 1) {
              const narrative = observe().narrative;
              const pending = narrative.pending;
              if (pending === null) break;
              const resolve = (resolution: unknown) => ({
                kind: "resolve",
                expectedOccurrenceId: pending.occurrenceId,
                resolution,
              });
              if (pending.kind === "say") await dispatch(resolve({ kind: "advance" }));
              else if (pending.kind === "choice") {
                await dispatch(resolve({ kind: "choose", choiceId: "choice.e2e.cal.basic" }));
              } else if (pending.kind === "presentation_barrier") {
                await dispatch(
                  resolve({
                    kind: "barrier_completed",
                    transitionId: pending.expectedTransitionId,
                  }),
                );
              } else if (pending.kind === "hold") {
                await dispatch(resolve({ kind: "hold_tick", elapsedMs: pending.remainingMs }));
              } else await dispatch(resolve({ kind: "custom", payload: { value: 2 } }));
            }
            return observe().narrative.phase;
          },
          { key: automationKeyV1 },
        );
        expect(completed).toBe("completed");
      }
      simulations.agent = await exportSimulationStateV1(page);
      await context.close();
    }

    // Presentation modes and input channels never change authoritative
    // State: all four exported simulations are identical.
    expect(simulations.reduced).toEqual(simulations.normal);
    expect(simulations.skip).toEqual(simulations.normal);
    expect(simulations.agent).toEqual(simulations.normal);
  });

  test("@smoke the completed narrative returns to a fully usable SLG surface", async ({ page }) => {
    await gotoLabV1(page);
    await playNarrativePassV1(page);

    // The stage settled with its code-native fallbacks (no media bytes
    // exist for the background asset or any audio slot).
    await expect(page.locator("[data-semantic-stage]")).toHaveAttribute(
      "data-stage-settled",
      "true",
    );

    // The ordinary SLG HUD is alive after the narrative: collecting samples
    // and running the whole procedure work with the same buttons as before.
    // (Two collects guarantee enough samples for both experiment steps
    // regardless of the 1–2 random yield.)
    await page.getByRole("button", { name: "采集样本" }).click();
    await expect(page.getByText(/样本[1-9]/u)).toBeVisible();
    await page.getByRole("button", { name: "采集样本" }).click();
    await expect(page.getByText(/样本[2-9]/u)).toBeVisible();
    await page.getByRole("button", { name: "开始流程" }).click();
    await page.getByRole("button", { name: "进行实验" }).click();
    await page.getByRole("button", { name: "进行实验" }).click();
    await expect(page.getByText("全部流程已完成。")).toBeVisible();
  });
});
