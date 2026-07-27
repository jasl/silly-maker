// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { afterEach, expect, it } from "vitest";

import { createMemoryHostRecordStoreV1 } from "@sillymaker/base/testkit";
import { createWebHostV1, startWebGameApplicationV1 } from "@sillymaker/web";

import { catcafeWebApplicationV1 } from "../application/web-application.tsx";

afterEach(() => {
  document.body.innerHTML = "";
});

function startV1(records: ReturnType<typeof createMemoryHostRecordStoreV1>, uuid: string) {
  const root = document.createElement("div");
  document.body.append(root);
  return startWebGameApplicationV1(catcafeWebApplicationV1, {
    rootElement: root,
    host: createWebHostV1({ records, seeds: [20260728], uuids: [uuid] }),
    capabilitySearch: "",
    registerPageLifecycle: false,
  });
}

async function playOpeningV1(user: ReturnType<typeof userEvent.setup>): Promise<void> {
  await waitFor(() => {
    expect(screen.getByRole("button", { name: "开始故事" })).toBeEnabled();
  });
  await user.click(screen.getByRole("button", { name: "开始故事" }));
  for (let index = 0; index < 3; index += 1) {
    await waitFor(() => {
      expect(document.querySelector("[data-cc-advance]")).not.toBeNull();
    });
    await user.click(screen.getByRole("button", { name: "继续" }));
  }
  await waitFor(() => {
    expect(document.querySelector("[data-cc-narrative='choice']")).not.toBeNull();
  });
  await user.click(screen.getByRole("button", { name: "就叫「小雨」" }));
  for (let index = 0; index < 2; index += 1) {
    await waitFor(() => {
      expect(document.querySelector("[data-cc-advance]")).not.toBeNull();
    });
    await user.click(screen.getByRole("button", { name: "继续" }));
  }
  await waitFor(() => {
    expect(document.querySelector("[data-cc-narrative]")).toBeNull();
  });
}

it("unlocks album meta progress and keeps it across a fresh session", async () => {
  const records = createMemoryHostRecordStoreV1();
  const user = userEvent.setup();

  // Session one: finish the opening; the rescue memory unlocks.
  const first = await startV1(records, "7c1d3e58-2b96-4f41-9d05-8a37c60f21b4");
  try {
    await playOpeningV1(user);
    await user.click(screen.getByRole("button", { name: "成长相册" }));
    await waitFor(() => {
      expect(
        document.querySelector(
          "[data-cc-album-entry='album.growth.rescue'][data-cc-album-unlocked='true']",
        ),
      ).not.toBeNull();
    });
    // Trophies remain locked and masked.
    expect(
      document.querySelector(
        "[data-cc-album-entry='album.trophy.week3'][data-cc-album-unlocked='false']",
      ),
    ).not.toBeNull();
    expect(screen.getAllByText("？？？").length).toBeGreaterThan(0);
  } finally {
    await first.dispose();
    document.body.innerHTML = "";
  }

  // Session two: same Host records, brand-new save — the unlock persists.
  const second = await startV1(records, "8d2e4f69-3ca7-4052-ae16-9b48d71f32c5");
  try {
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "开始故事" })).toBeEnabled();
    });
    await user.click(screen.getByRole("button", { name: "成长相册" }));
    await waitFor(() => {
      expect(
        document.querySelector(
          "[data-cc-album-entry='album.growth.rescue'][data-cc-album-unlocked='true']",
        ),
      ).not.toBeNull();
    });
  } finally {
    await second.dispose();
  }
});
