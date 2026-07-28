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

async function playOpeningV1(user: ReturnType<typeof userEvent.setup>): Promise<void> {
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

it("pets the cat through stage hit regions: reaction, trust, budget", async () => {
  const root = document.createElement("div");
  document.body.append(root);
  const started = await startWebGameApplicationV1(catcafeWebApplicationV1, {
    rootElement: root,
    host: createWebHostV1({
      records: createMemoryHostRecordStoreV1(),
      seeds: [20260728],
      uuids: ["7c1d3e58-2b96-4f41-9d05-8a37c60f21b4"],
    }),
    capabilitySearch: "",
    registerPageLifecycle: false,
  });
  const user = userEvent.setup();
  try {
    // Pass the title screen first: the game front door renders before HUD.
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "新游戏" })).toBeEnabled();
    });
    await user.click(screen.getByRole("button", { name: "新游戏" }));
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "开始故事" })).toBeEnabled();
    });
    await playOpeningV1(user);

    // The cat entry exposes four keyboard-reachable zones.
    await waitFor(() => {
      expect(document.querySelectorAll("[data-stage-hit-region]")).toHaveLength(4);
    });
    const statsBefore = document.querySelector("[data-cc-stats]")?.textContent ?? "";
    expect(statsBefore).toContain("信任10");

    // Low trust + tail = hiss (-3), reaction text from the petting table.
    await user.click(screen.getByRole("button", { name: "碰尾巴" }));
    await waitFor(() => {
      expect(document.querySelector("[data-cc-stats]")?.textContent).toContain("信任7");
    });
    expect(document.querySelector("[data-cc-pet-reaction='text.cc.pet.tail.low']")).not.toBeNull();

    // The daily budget counts down and the guard blocks the fourth pet.
    await user.click(screen.getByRole("button", { name: "摸头" }));
    await user.click(screen.getByRole("button", { name: "顺背" }));
    await waitFor(() => {
      expect(document.querySelector("[data-cc-stage]")?.getAttribute("data-cc-petting-left")).toBe(
        "0",
      );
    });
    const digestStats = document.querySelector("[data-cc-stats]")?.textContent ?? "";
    await user.click(screen.getByRole("button", { name: "挠下巴" }));
    expect(document.querySelector("[data-cc-stats]")?.textContent).toBe(digestStats);
  } finally {
    await started.dispose();
  }
});
