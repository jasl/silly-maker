// SPDX-License-Identifier: MIT
import { expect, it } from "vitest";

import { createPlayerProfileStoreV1 } from "@sillymaker/base/runtime";
import { createMemoryHostRecordStoreV1 } from "@sillymaker/base/testkit";

import { osGameApplicationV1 } from "../application/composition.tsx";
import { createOsApplicationInstanceV1 } from "../application/core-application.ts";

it("omits Narrative, Title, and Whole Canvas from the application and root slots", async () => {
  const instance = await createOsApplicationInstanceV1();
  const playerProfile = await createPlayerProfileStoreV1({
    records: createMemoryHostRecordStoreV1(),
    storyId: "story.example.silly-os",
  });
  try {
    const ui = osGameApplicationV1.ui(
      { instance, playerProfile } as unknown as Parameters<typeof osGameApplicationV1.ui>[0],
    );
    for (const key of ["narrative", "titleScreen", "wholeCanvas"] as const) {
      expect(Object.hasOwn(ui, key)).toBe(false);
      expect(Object.hasOwn(ui.slots ?? {}, key)).toBe(false);
    }
  } finally {
    await instance.dispose();
  }
});
