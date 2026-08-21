// SPDX-License-Identifier: MIT
import type { Page } from "@playwright/test";

import { expect, gotoLabV1, test } from "./fixtures.ts";

interface AutomationOperationV1<T> {
  readonly kind: "ok" | "capability_disabled";
  readonly value?: T;
}

interface LabPublicationV1 {
  readonly revision: number;
  readonly game: {
    readonly samplesCollected: number;
    readonly procedurePhase: string;
    readonly procedureSteps: number;
  };
  readonly actions: readonly {
    readonly actionId: string;
    readonly enabled: boolean;
  }[];
}

const automationKeyV1 = "__SILLYMAKER_AUTOMATION_V1__";

const forbiddenPlayerResultKeysV1 = Object.freeze([
  "attempt",
  "commandLog",
  "events",
  "fault",
  "rng",
  "snapshot",
  "state",
]);

async function observeV1(page: Page): Promise<LabPublicationV1> {
  const operation = await page.evaluate((key) => {
    const facade = Reflect.get(globalThis, key) as
      | { observe(): { kind: string; value?: unknown } }
      | undefined;
    return facade?.observe() ?? { kind: "capability_disabled" };
  }, automationKeyV1);
  expect(operation.kind).toBe("ok");
  return operation.value as LabPublicationV1;
}

async function dispatchV1(page: Page, actionId: string): Promise<AutomationOperationV1<unknown>> {
  const operation = await page.evaluate(
    async ({ key, invocation }) => {
      const facade = Reflect.get(globalThis, key) as {
        dispatch(value: unknown): Promise<{ kind: string; value?: unknown }>;
      } | undefined;
      return (await facade?.dispatch(invocation)) ?? { kind: "capability_disabled" };
    },
    { key: automationKeyV1, invocation: { kind: "invoke", actionId } },
  );
  return operation as AutomationOperationV1<unknown>;
}

test.describe("engine Browser Agent parity", () => {
  test("DOM state and automation publications stay in lockstep", async ({ page }) => {
    await gotoLabV1(page, "?capability=automation_bridge");
    await page.waitForFunction(
      (key) => Reflect.get(globalThis, key) !== undefined,
      automationKeyV1,
    );

    // Initial parity: the DOM HUD shows the published counters.
    const initial = await observeV1(page);
    await expect(page.locator("[data-lab-hud='true']")).toContainText(
      `样本${String(initial.game.samplesCollected)}`,
    );

    // Dispatch through the Agent bridge; the DOM converges on the new
    // publication and the projected result stays player-safe.
    const dispatched = await dispatchV1(page, "lab.collect_sample");
    expect(dispatched.kind).toBe("ok");
    const serialized = JSON.stringify(dispatched);
    for (const forbidden of forbiddenPlayerResultKeysV1) {
      expect(serialized, `agent results must not leak "${forbidden}"`).not.toContain(
        `"${forbidden}"`,
      );
    }

    const after = await observeV1(page);
    expect(after.revision).toBeGreaterThan(initial.revision);
    expect(after.game.samplesCollected).toBeGreaterThan(initial.game.samplesCollected);
    await expect(page.locator("[data-lab-hud='true']")).toContainText(
      `样本${String(after.game.samplesCollected)}`,
    );

    // Clicking the DOM converges the next automation observation.
    await page.getByRole("button", { name: "采集样本" }).click();
    await expect
      .poll(async () => (await observeV1(page)).game.samplesCollected)
      .toBeGreaterThan(after.game.samplesCollected);

    // Action catalogs match between the DOM and the publication.
    const publication = await observeV1(page);
    for (const action of publication.actions) {
      const button = page.locator(`[data-lab-action-id="${action.actionId}"]`);
      await expect(button).toHaveCount(1);
      if (action.enabled) await expect(button).toBeEnabled();
      else await expect(button).toBeDisabled();
    }
  });

  test("the automation facade stays capability-gated", async ({ page }) => {
    await gotoLabV1(page);
    const facade = await page.evaluate(
      (key) => Reflect.get(globalThis, key) !== undefined,
      automationKeyV1,
    );
    expect(facade, "no automation facade without the capability").toBe(false);
  });
});
