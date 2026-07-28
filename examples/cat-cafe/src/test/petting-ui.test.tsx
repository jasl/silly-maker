// SPDX-License-Identifier: MIT
// Semantic-level petting-chain test. The full browser UI chain (title → opening →
// hit-region click → reaction bubble → allowance exhausted) is covered by the
// hit-regions browser spec; mounting the full web UI under jsdom crashes on
// Deno×jsdom×React cross-realm event dispatch, so this drives the semantic port and asserts the authoritative behavior itself.
import { describe, expect, it } from "vitest";

import type { CatcafeApplicationInstanceV1 } from "../application/core-application.ts";
import { createCatcafeApplicationInstanceV1 } from "../application/core-application.ts";
import { catcafePettingV1 } from "../content.ts";

async function dispatchCommittedV1(
  instance: CatcafeApplicationInstanceV1,
  invocation: unknown,
): Promise<void> {
  const result = await instance.semantic.dispatch(invocation as never);
  expect(result).toMatchObject({ kind: "committed" });
}

function advanceV1(occurrence: number) {
  return {
    kind: "resolve",
    expectedOccurrenceId: `interaction-occurrence.${String(occurrence)}`,
    resolution: { kind: "advance" },
  };
}

async function playOpeningV1(instance: CatcafeApplicationInstanceV1): Promise<void> {
  await dispatchCommittedV1(instance, { kind: "invoke", actionId: "cc.begin_story" });
  await dispatchCommittedV1(instance, advanceV1(1));
  await dispatchCommittedV1(instance, advanceV1(2));
  await dispatchCommittedV1(instance, advanceV1(3));
  await dispatchCommittedV1(instance, {
    kind: "resolve",
    expectedOccurrenceId: "interaction-occurrence.4",
    resolution: { kind: "choose", choiceId: "choice.catcafe.name-xiaoyu" },
  });
  await dispatchCommittedV1(instance, advanceV1(5));
  await dispatchCommittedV1(instance, advanceV1(6));
}

function gameViewV1(instance: CatcafeApplicationInstanceV1) {
  return instance.semantic.observe().game;
}

describe("catcafe petting (semantic chain)", () => {
  it("pet commits authoritative effects and burns the daily allowance", async () => {
    const instance = await createCatcafeApplicationInstanceV1();
    try {
      await playOpeningV1(instance);
      const before = gameViewV1(instance);
      expect(before.cat.pettingLeft).toBe(3);

      // The reaction stream is commit-only transient effects: subscribe and collect.
      const reactions: string[] = [];
      const unsubscribe = instance.subscribeTransientEffects((effect) => {
        if (effect.effectId !== "effect.catcafe.reaction") return;
        const reactionId = (effect.payload as { readonly reactionId?: string }).reactionId;
        if (reactionId !== undefined) reactions.push(reactionId);
      });

      await dispatchCommittedV1(instance, { kind: "pet", zone: "head" });
      const afterOne = gameViewV1(instance);
      expect(afterOne.cat.pettingLeft).toBe(2);
      expect(afterOne.cat.trust).not.toBe(before.cat.trust);
      expect(reactions).toHaveLength(1);
      // Reactions must come from the content table (authoritative lookup, not UI guesses).
      expect(catcafePettingV1.byId(reactions[0] ?? "")).not.toBeNull();

      await dispatchCommittedV1(instance, { kind: "pet", zone: "back" });
      await dispatchCommittedV1(instance, { kind: "pet", zone: "tail" });
      expect(gameViewV1(instance).cat.pettingLeft).toBe(0);

      // After the allowance runs out: rejected, authoritative state unchanged.
      const rejected = await instance.semantic.dispatch({ kind: "pet", zone: "head" } as never);
      expect(rejected.kind).not.toBe("committed");
      expect(gameViewV1(instance).cat.pettingLeft).toBe(0);
      unsubscribe();
    } finally {
      await instance.dispose();
    }
  });

  it("petting is fenced before the opening completes", async () => {
    const instance = await createCatcafeApplicationInstanceV1();
    try {
      const rejected = await instance.semantic.dispatch({ kind: "pet", zone: "head" } as never);
      expect(rejected.kind).not.toBe("committed");
    } finally {
      await instance.dispose();
    }
  });
});
