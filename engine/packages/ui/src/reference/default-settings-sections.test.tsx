// @vitest-environment jsdom
// SPDX-License-Identifier: MIT
import "@testing-library/jest-dom/vitest";
import type { RuntimeCapabilityPortV1 } from "@sillymaker/base";
import { createPlayerProfileStoreV1 } from "@sillymaker/base/runtime";
import { createMemoryHostRecordStoreV1 } from "@sillymaker/base/testkit";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";

import { DefaultSettingsSectionsV1 } from "./default-settings-sections.tsx";

afterEach(cleanup);

const disabledCapabilityStateV1 = Object.freeze({
  debugTools: false,
  cheats: false,
  automationBridge: false,
});

const disabledCapabilitiesV1 = Object.freeze({
  state: Object.freeze({
    getCurrent: () => disabledCapabilityStateV1,
    subscribe: () => () => undefined,
  }),
  setEnabled: async () =>
    Object.freeze({
      kind: "unchanged" as const,
      state: disabledCapabilityStateV1,
    }),
}) satisfies RuntimeCapabilityPortV1;

describe("DefaultSettingsSectionsV1", () => {
  it("updates the player cutscene-skip preference through the shared profile", async () => {
    const playerProfile = await createPlayerProfileStoreV1({
      records: createMemoryHostRecordStoreV1(),
      storyId: "story.test.settings",
    });

    render(
      <DefaultSettingsSectionsV1
        playerProfile={playerProfile}
        capabilities={disabledCapabilitiesV1}
        labels={Object.freeze({
          bgmVolumeLabel: "Music",
          voiceVolumeLabel: "Voice",
          sfxVolumeLabel: "Effects",
          mutedLabel: "Mute",
          skipCutscenesLabel: "Skip timed scenes",
          textSpeedLabel: "Text speed",
          autoWaitLabel: "Auto wait",
          fullscreenLabel: "Fullscreen",
          developerToolsLabel: "Developer tools",
        })}
      />,
    );

    const toggle = screen.getByRole("checkbox", { name: "Skip timed scenes" });
    expect(toggle).not.toBeChecked();

    await userEvent.setup().click(toggle);

    await waitFor(() => expect(toggle).toBeChecked());
    expect(playerProfile.current().preferences.skipCutscenes).toBe(true);
  });

  it("does not expose an inert cutscene preference until the Story opts in", async () => {
    const playerProfile = await createPlayerProfileStoreV1({
      records: createMemoryHostRecordStoreV1(),
      storyId: "story.test.settings-without-cutscenes",
    });

    render(
      <DefaultSettingsSectionsV1
        playerProfile={playerProfile}
        capabilities={disabledCapabilitiesV1}
        labels={Object.freeze({
          bgmVolumeLabel: "Music",
          voiceVolumeLabel: "Voice",
          sfxVolumeLabel: "Effects",
          mutedLabel: "Mute",
          textSpeedLabel: "Text speed",
          autoWaitLabel: "Auto wait",
          fullscreenLabel: "Fullscreen",
          developerToolsLabel: "Developer tools",
        })}
      />,
    );

    expect(document.querySelector('[data-default-settings-skip-cutscenes="true"]')).toBeNull();
  });

  it("drops the developer-tools switch when the Story ships its own tooling", async () => {
    const playerProfile = await createPlayerProfileStoreV1({
      records: createMemoryHostRecordStoreV1(),
      storyId: "story.test.settings-without-devtools",
    });

    render(
      <DefaultSettingsSectionsV1
        playerProfile={playerProfile}
        capabilities={disabledCapabilitiesV1}
        showDeveloperTools={false}
        labels={Object.freeze({
          bgmVolumeLabel: "Music",
          voiceVolumeLabel: "Voice",
          sfxVolumeLabel: "Effects",
          mutedLabel: "Mute",
          textSpeedLabel: "Text speed",
          autoWaitLabel: "Auto wait",
          fullscreenLabel: "Fullscreen",
          developerToolsLabel: "Developer tools",
        })}
      />,
    );

    expect(document.querySelector('[data-default-settings-devtools="true"]')).toBeNull();
    expect(screen.queryByRole("checkbox", { name: "Developer tools" })).toBeNull();
    // The rest of the baseline sections stay.
    expect(screen.getByRole("button", { name: "Fullscreen" })).toBeVisible();
  });

  it("updates the shared locale preference when the product supplies locale choices", async () => {
    const playerProfile = await createPlayerProfileStoreV1({
      records: createMemoryHostRecordStoreV1(),
      storyId: "story.test.settings-locale",
    });

    render(
      <DefaultSettingsSectionsV1
        playerProfile={playerProfile}
        capabilities={disabledCapabilitiesV1}
        labels={Object.freeze({
          bgmVolumeLabel: "Music",
          voiceVolumeLabel: "Voice",
          sfxVolumeLabel: "Effects",
          mutedLabel: "Mute",
          textSpeedLabel: "Text speed",
          autoWaitLabel: "Auto wait",
          fullscreenLabel: "Fullscreen",
          developerToolsLabel: "Developer tools",
        })}
        locale={{
          label: "Language",
          options: [
            { locale: null, label: "Default" },
            { locale: "en", label: "English" },
          ],
        }}
      />,
    );

    await userEvent.setup().selectOptions(
      screen.getByRole("combobox", { name: "Language" }),
      "en",
    );

    await waitFor(() => expect(playerProfile.current().preferences.locale).toBe("en"));
  });
});
