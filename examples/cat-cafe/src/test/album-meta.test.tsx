// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// 语义级图鉴 meta 持久化测试。完整浏览器链（开场 → 图鉴解锁 → 刷新后仍在）
// 由浏览器 spec 验证；jsdom 挂载完整 web UI 会触发 Deno×jsdom×React 跨
// realm 事件派发崩溃。这里验证 Host 侧契约本身：meta 单调、跨会话存续。
import { expect, it } from "vitest";

import { createPlayerProfileStoreV1 } from "@sillymaker/base/runtime";
import { createMemoryHostRecordStoreV1 } from "@sillymaker/base/testkit";

import { catcafeAlbumV1 } from "../content.ts";

it("album meta progress is monotonic and survives a fresh profile store", async () => {
  const records = createMemoryHostRecordStoreV1();

  // 会话一：救助回忆解锁（营救是开场必然解锁项）。
  const first = await createPlayerProfileStoreV1({
    records,
    storyId: "story.example.cat-cafe",
    reportFailure: () => {},
  });
  const rescue = catcafeAlbumV1.rows().find((entry) => entry.id === "album.growth.rescue");
  expect(rescue).toBeDefined();
  await first.markMeta(rescue?.id ?? "album.growth.rescue");
  expect(first.current().meta["album.growth.rescue"]).toBeDefined();
  // 奖杯仍未解锁。
  expect(first.current().meta["album.trophy.week3"]).toBeUndefined();

  // meta 是单调的：重复标记不抖动、不回退。
  const stamped = first.current().meta["album.growth.rescue"];
  await first.markMeta("album.growth.rescue");
  expect(first.current().meta["album.growth.rescue"]).toEqual(stamped);

  // 会话二：同一 Host records、全新 store —— 解锁仍在。
  const second = await createPlayerProfileStoreV1({
    records,
    storyId: "story.example.cat-cafe",
    reportFailure: () => {},
  });
  expect(second.current().meta["album.growth.rescue"]).toBeDefined();
  expect(second.current().meta["album.trophy.week3"]).toBeUndefined();
});
