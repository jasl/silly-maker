// @vitest-environment jsdom
// SPDX-License-Identifier: MIT
import "@testing-library/jest-dom/vitest";
import { createPlayerProfileStoreV1 } from "@sillymaker/base/runtime";
import { createMemoryHostRecordStoreV1 } from "@sillymaker/base/testkit";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { afterEach, expect, it } from "vitest";

import { MuteToggleV1 } from "./mute-toggle.tsx";

afterEach(cleanup);

it("flips the persisted muted preference from an icon button", async () => {
  const playerProfile = await createPlayerProfileStoreV1({
    records: createMemoryHostRecordStoreV1(),
    storyId: "story.test.mute-toggle",
  });
  render(<MuteToggleV1 playerProfile={playerProfile} label="静音" />);
  const button = screen.getByRole("button", { name: "静音" });
  expect(button).toHaveAttribute("data-mute-toggle", "unmuted");
  expect(button).toHaveAttribute("aria-pressed", "false");
  await userEvent.setup().click(button);
  await waitFor(() => expect(playerProfile.current().preferences.muted).toBe(true));
  expect(button).toHaveAttribute("data-mute-toggle", "muted");
  expect(button).toHaveAttribute("aria-pressed", "true");
});
