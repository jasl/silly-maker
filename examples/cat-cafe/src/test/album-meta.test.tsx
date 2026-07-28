// SPDX-License-Identifier: MIT
// Semantic-level album meta persistence test. The full browser chain (opening →
// album unlock → still there after refresh) is covered by the browser spec; mounting
// the full web UI under jsdom crashes on Deno×jsdom×React cross-realm event dispatch. This verifies the Host-side contract itself: meta is monotonic and survives sessions.
import { expect, it } from "vitest";

import { createPlayerProfileStoreV1 } from "@sillymaker/base/runtime";
import { createMemoryHostRecordStoreV1 } from "@sillymaker/base/testkit";

import { catcafeAlbumV1 } from "../content.ts";

it("album meta progress is monotonic and survives a fresh profile store", async () => {
  const records = createMemoryHostRecordStoreV1();

  // Session one: the rescue memory unlocks (rescue is a guaranteed opening unlock).
  const first = await createPlayerProfileStoreV1({
    records,
    storyId: "story.example.cat-cafe",
    reportFailure: () => {},
  });
  const rescue = catcafeAlbumV1.rows().find((entry) => entry.id === "album.growth.rescue");
  expect(rescue).toBeDefined();
  await first.markMeta(rescue?.id ?? "album.growth.rescue");
  expect(first.current().meta["album.growth.rescue"]).toBeDefined();
  // The trophy is still locked.
  expect(first.current().meta["album.trophy.week3"]).toBeUndefined();

  // Meta is monotonic: repeated marking neither flaps nor regresses.
  const stamped = first.current().meta["album.growth.rescue"];
  await first.markMeta("album.growth.rescue");
  expect(first.current().meta["album.growth.rescue"]).toEqual(stamped);

  // Session two: same Host records, brand-new store — the unlock persists.
  const second = await createPlayerProfileStoreV1({
    records,
    storyId: "story.example.cat-cafe",
    reportFailure: () => {},
  });
  expect(second.current().meta["album.growth.rescue"]).toBeDefined();
  expect(second.current().meta["album.trophy.week3"]).toBeUndefined();
});
