// SPDX-License-Identifier: MIT
import { expect, it } from "vitest";

import { createPlayerProfileStoreV1 } from "@sillymaker/base/runtime";
import { createMemoryHostRecordStoreV1 } from "@sillymaker/base/testkit";

import { osGameApplicationV1 } from "../application/composition.tsx";
import { createOsApplicationInstanceV1 } from "../application/core-application.ts";

it("omits Narrative from both the application declaration and root slots", async () => {
  const instance = await createOsApplicationInstanceV1();
  const playerProfile = await createPlayerProfileStoreV1({
    records: createMemoryHostRecordStoreV1(),
    storyId: "story.example.silly-os",
  });
  try {
    const ui = osGameApplicationV1.ui(
      { instance, playerProfile } as unknown as Parameters<typeof osGameApplicationV1.ui>[0],
    );
    expect(Object.hasOwn(ui, "narrative")).toBe(false);
    expect(Reflect.ownKeys(ui).includes("narrative")).toBe(false);
    expect(Object.hasOwn(ui.slots ?? {}, "narrative")).toBe(false);
  } finally {
    await instance.dispose();
  }
});
