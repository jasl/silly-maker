// @vitest-environment jsdom
// SPDX-License-Identifier: MIT
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";

import { createPlayerProfileStoreV1 } from "@sillymaker/base/runtime";
import { createMemoryHostRecordStoreV1 } from "@sillymaker/base/testkit";
import {
  DefaultGameRootV1,
  createFakeAudioHostV1,
  createGameUiCompositionV1,
} from "@sillymaker/ui";

import { createLabApplicationInstanceV1 } from "../application/core-application.js";
import {
  createLabUiSlotsV1,
  labGamepadMapV1,
  labKeyboardMapV1,
  labRootLabelsV1,
  labUiProjectorV1,
  labViewportCanvasV1,
} from "../application/web-application.js";

afterEach(cleanup);

async function composeInputLabV1() {
  const instance = await createLabApplicationInstanceV1();
  const playerProfile = await createPlayerProfileStoreV1({
    records: createMemoryHostRecordStoreV1(),
    storyId: "story.e2e.engine-lab",
  });
  await playerProfile.updatePreferences({ textRevealCharsPerSecond: 0 });
  const composition = createGameUiCompositionV1({
    semantic: instance.semantic,
    projector: labUiProjectorV1,
    anchor: Object.freeze({
      current: () => instance.presentationAnchor(),
      subscribe: (listener: () => void) => instance.subscribePresentationAnchor(() => listener()),
    }),
    overlayIds: ["overlay.lab.journal"],
  });
  render(
    <DefaultGameRootV1
      composition={composition}
      semantic={instance.semantic}
      accessibleName="引擎实验室"
      applicationId="e2e"
      viewport={{ canvas: labViewportCanvasV1, fallbackSize: { width: 1600, height: 1000 } }}
      labels={labRootLabelsV1}
      slots={createLabUiSlotsV1({
        instance,
        createAudioHost: createFakeAudioHostV1,
        playerProfile,
      })}
      inputMaps={{ keyboard: labKeyboardMapV1, gamepad: labGamepadMapV1 }}
    />,
  );
  const dispose = async () => {
    cleanup();
    composition.dispose();
    await instance.dispose();
  };
  return { instance, composition, dispose };
}

function pressV1(code: string): void {
  document.body.dispatchEvent(
    new KeyboardEvent("keydown", { code, bubbles: true, cancelable: true }),
  );
}

describe("Engine Lab input actions", () => {
  it("keyboard forms the same semantic intent as clicking, with no CommandLog noise", async () => {
    const { instance, dispose } = await composeInputLabV1();
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "开始校准" }));
    await waitFor(() => {
      expect(document.querySelector("[data-lab-interaction='say']")).toBeInTheDocument();
    });
    const commandsBefore = instance.admin.commandLog().length;
    const revisionBefore = instance.semantic.observe().revision;

    // Enter advances the say — the exact same resolution a click dispatches.
    pressV1("Enter");
    await waitFor(() => {
      expect(
        document.querySelector("[data-lab-interaction='say']")?.getAttribute("data-lab-occurrence"),
      ).toBe("interaction-occurrence.2");
    });
    await waitFor(() => {
      expect(document.querySelector("[data-lab-say-reveal]")).toHaveAttribute(
        "data-lab-say-reveal",
        "complete",
      );
    });
    pressV1("Enter");
    await waitFor(() => {
      expect(document.querySelector("[data-lab-interaction='choice']")).toBeInTheDocument();
    });

    // Exactly TWO gameplay commands entered the log: the two semantic
    // resolves. No physical key event ever becomes a log entry.
    const log = instance.admin.commandLog();
    expect(log.length).toBe(commandsBefore + 2);
    expect(instance.semantic.observe().revision).toBe(revisionBefore + 2);

    // Choices are not advanced by the stage shortcut: the VN layer returns
    // unhandled for actions its pending interaction does not support.
    const choiceRevision = instance.semantic.observe().revision;
    pressV1("Enter");
    pressV1("Space");
    expect(instance.semantic.observe().revision).toBe(choiceRevision);
    expect(instance.admin.commandLog().length).toBe(commandsBefore + 2);

    await dispose();
  });

  it("player controls stay presentation-only and never change the gameplay revision", async () => {
    const { instance, dispose } = await composeInputLabV1();
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "开始校准" }));
    await waitFor(() => {
      expect(document.querySelector("[data-lab-interaction='say']")).toBeInTheDocument();
    });
    const revision = instance.semantic.observe().revision;
    const commands = instance.admin.commandLog().length;

    // Toggle auto, history, and hide UI from the keyboard: pure
    // presentation, zero gameplay traffic.
    pressV1("KeyA");
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "自动" })).toHaveAttribute("aria-pressed", "true");
    });
    pressV1("KeyA");
    pressV1("KeyH");
    await waitFor(() => {
      expect(document.querySelector("[data-lab-player='history-panel']")).toBeInTheDocument();
    });
    pressV1("KeyU");
    await waitFor(() => {
      expect(document.querySelector("[data-lab-interaction='say']")).not.toBeInTheDocument();
    });
    pressV1("KeyU");
    await waitFor(() => {
      expect(document.querySelector("[data-lab-interaction='say']")).toBeInTheDocument();
    });

    expect(instance.semantic.observe().revision).toBe(revision);
    expect(instance.admin.commandLog().length).toBe(commands);
    await dispose();
  });

  it("keys focused on dialogs or form controls never trigger stage commands", async () => {
    const { instance, dispose } = await composeInputLabV1();
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "开始校准" }));
    await waitFor(() => {
      expect(document.querySelector("[data-lab-interaction='say']")).toBeInTheDocument();
    });
    const revision = instance.semantic.observe().revision;

    // Focus a button (the system menu): Enter belongs to the control, not
    // the stage shortcut map.
    const settings = screen.getByRole("button", { name: "设置" });
    settings.focus();
    settings.dispatchEvent(
      new KeyboardEvent("keydown", { code: "Enter", bubbles: true, cancelable: true }),
    );
    expect(instance.semantic.observe().revision).toBe(revision);
    expect(document.querySelector("[data-lab-interaction='say']")).toBeInTheDocument();

    await dispose();
  });
});
