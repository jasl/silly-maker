// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// 语义级抚摸链路测试。完整浏览器 UI 链（标题屏 → 开场 → 命中区域点击 →
// 反应气泡 → 余量耗尽）由 hit-regions 浏览器 spec 验证；jsdom 下挂载完整
// web UI 会触发 Deno×jsdom×React 跨 realm 事件派发崩溃，故这里驱动语义
// 端口断言权威行为本身。
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

      // 反应流是 commit-only 瞬态效果：订阅并收集。
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
      // 反应必须来自内容表（权威侧查表，而不是 UI 猜测）。
      expect(catcafePettingV1.byId(reactions[0] ?? "")).not.toBeNull();

      await dispatchCommittedV1(instance, { kind: "pet", zone: "back" });
      await dispatchCommittedV1(instance, { kind: "pet", zone: "tail" });
      expect(gameViewV1(instance).cat.pettingLeft).toBe(0);

      // 余量耗尽后拒绝，权威状态不动。
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
