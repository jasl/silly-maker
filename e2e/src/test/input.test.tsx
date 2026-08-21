// @vitest-environment jsdom
// SPDX-License-Identifier: MIT
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createPlayerProfileStoreV1 } from "@sillymaker/base/runtime";
import {
  createFixedBootstrapEntropyV1,
  createMemoryHostRecordStoreV1,
} from "@sillymaker/base/testkit";
import { createFakeAudioHostV1 } from "@sillymaker/ui";
import { createWebHostV1, startWebGameApplicationV1 } from "@sillymaker/web";

import type { LabApplicationInstanceV1 } from "../application/core-definition.ts";
import { createLabGameUiDefinitionV1, labGameApplicationV1 } from "../application/composition.tsx";

afterEach(() => {
  cleanup();
  document.body.innerHTML = "";
  vi.restoreAllMocks();
});

async function startInputLabV1() {
  globalThis.window.history.replaceState({}, "", "/");
  const records = createMemoryHostRecordStoreV1();
  const profile = await createPlayerProfileStoreV1({
    records,
    storyId: "story.e2e.engine-lab",
  });
  await profile.updatePreferences({ textRevealCharsPerSecond: 0 });

  let instance: LabApplicationInstanceV1 | null = null;
  const application = Object.freeze({
    ...labGameApplicationV1,
    ui(input: Parameters<typeof labGameApplicationV1.ui>[0]) {
      instance = input.instance;
      return createLabGameUiDefinitionV1({
        instance: input.instance,
        createAudioHost: createFakeAudioHostV1,
      });
    },
  });
  const root = document.createElement("div");
  document.body.append(root);
  const started = await startWebGameApplicationV1(application, {
    rootElement: root,
    host: createWebHostV1({
      records,
    }),
    gameBootstrapEntropy: createFixedBootstrapEntropyV1({ seeds: [20260812], uuids: [] }),
    capabilitySearch: "",
    registerPageLifecycle: false,
  });
  await waitFor(() => {
    expect(screen.getByRole("application", { name: "引擎实验室" })).toBeInTheDocument();
  });
  if (instance === null) throw new TypeError("e2e.input_host_capture_missing");
  return Object.freeze({ started, instance: instance as LabApplicationInstanceV1 });
}

function pressV1(code: string): void {
  fireEvent.keyDown(document.body, { code });
}

describe("Engine Lab production input actions", () => {
  it("routes pointer and keyboard through the same Host admission with exact command traffic", async () => {
    const lab = await startInputLabV1();
    try {
      const user = userEvent.setup();
      await user.click(screen.getByRole("button", { name: "开始校准" }));
      await waitFor(() => {
        expect(document.querySelector("[data-lab-interaction='say']")).toHaveAttribute(
          "data-lab-occurrence",
          "interaction-occurrence.1",
        );
      });
      const commandsBefore = lab.instance.admin.commandLog().length;
      const revisionBefore = lab.instance.semantic.observe().revision;

      await user.click(screen.getByRole("button", { name: "继续" }));
      await waitFor(() => {
        expect(document.querySelector("[data-lab-interaction='say']")).toHaveAttribute(
          "data-lab-occurrence",
          "interaction-occurrence.2",
        );
      });
      await waitFor(() => {
        expect(document.querySelector("[data-semantic-stage]")).toHaveAttribute(
          "data-stage-settled",
          "true",
        );
      });
      pressV1("Enter");
      await waitFor(() => {
        expect(document.querySelector("[data-lab-interaction='choice']")).toBeInTheDocument();
      });

      expect(lab.instance.admin.commandLog()).toHaveLength(commandsBefore + 2);
      expect(lab.instance.semantic.observe().revision).toBe(revisionBefore + 2);

      const choiceRevision = lab.instance.semantic.observe().revision;
      pressV1("Enter");
      pressV1("Space");
      expect(lab.instance.semantic.observe().revision).toBe(choiceRevision);
      expect(lab.instance.admin.commandLog()).toHaveLength(commandsBefore + 2);
    } finally {
      await lab.started.dispose();
    }
  });

  it("keeps Auto and History keyboard actions presentation-only", async () => {
    const lab = await startInputLabV1();
    try {
      const user = userEvent.setup();
      await user.click(screen.getByRole("button", { name: "开始校准" }));
      await user.click(await screen.findByRole("button", { name: "继续" }));
      await waitFor(() => {
        expect(document.querySelector("[data-lab-interaction='say']")).toHaveAttribute(
          "data-lab-occurrence",
          "interaction-occurrence.2",
        );
      });
      await waitFor(() => {
        expect(document.querySelector("[data-semantic-stage]")).toHaveAttribute(
          "data-stage-settled",
          "true",
        );
      });
      await waitFor(() => {
        expect(document.querySelector("[data-lab-say-reveal]")).toHaveAttribute(
          "data-lab-say-reveal",
          "complete",
        );
      });
      const revision = lab.instance.semantic.observe().revision;
      const commands = lab.instance.admin.commandLog().length;

      pressV1("KeyH");
      await waitFor(() => {
        expect(document.querySelector("[data-lab-player='history-panel']")).toBeInTheDocument();
      });
      pressV1("KeyH");
      await waitFor(() => {
        expect(document.querySelector("[data-lab-player='history-panel']")).toBeNull();
        const dialogueShell = document.querySelector(
          '[data-narrative-surface-render-shell="dialogue"]',
        );
        expect(dialogueShell).not.toHaveAttribute("inert");
        expect(dialogueShell).not.toHaveAttribute("aria-hidden");
      });
      pressV1("KeyA");
      await waitFor(() => {
        expect(screen.getByRole("button", { name: "自动" })).toHaveAttribute(
          "aria-pressed",
          "true",
        );
      });
      pressV1("KeyA");

      expect(lab.instance.semantic.observe().revision).toBe(revision);
      expect(lab.instance.admin.commandLog()).toHaveLength(commands);
    } finally {
      await lab.started.dispose();
    }
  });

  it("routes a gamepad rising edge once and ignores the held poll", async () => {
    let connected = false;
    const buttons = Array.from({ length: 4 }, () => ({ pressed: false }));
    const gamepad = Object.freeze({
      index: 0,
      get connected() {
        return connected;
      },
      buttons,
    });
    const getGamepads = vi.fn(() => connected ? [gamepad] : []);
    const previous = Reflect.getOwnPropertyDescriptor(globalThis.navigator, "getGamepads");
    if (
      !Reflect.defineProperty(globalThis.navigator, "getGamepads", {
        configurable: true,
        value: getGamepads,
      })
    ) {
      throw new TypeError("e2e.input_gamepad_fixture_invalid");
    }

    const lab = await startInputLabV1();
    try {
      await userEvent.setup().click(screen.getByRole("button", { name: "开始校准" }));
      await waitFor(() => {
        expect(document.querySelector("[data-lab-interaction='say']")).toHaveAttribute(
          "data-lab-occurrence",
          "interaction-occurrence.1",
        );
      });
      connected = true;
      globalThis.window.dispatchEvent(new Event("gamepadconnected"));
      await waitFor(() => expect(getGamepads).toHaveBeenCalled());

      const commandsBefore = lab.instance.admin.commandLog().length;
      buttons[0]!.pressed = true;
      await waitFor(() => {
        expect(document.querySelector("[data-lab-interaction='say']")).toHaveAttribute(
          "data-lab-occurrence",
          "interaction-occurrence.2",
        );
      });
      expect(lab.instance.admin.commandLog()).toHaveLength(commandsBefore + 1);

      const pollsAtResolution = getGamepads.mock.calls.length;
      await waitFor(() => {
        expect(getGamepads.mock.calls.length).toBeGreaterThan(pollsAtResolution + 1);
      });
      expect(lab.instance.admin.commandLog()).toHaveLength(commandsBefore + 1);
    } finally {
      await lab.started.dispose();
      if (previous === undefined) {
        Reflect.deleteProperty(globalThis.navigator, "getGamepads");
      } else {
        Reflect.defineProperty(globalThis.navigator, "getGamepads", previous);
      }
    }
  });

  it("does not route stage shortcuts from a focused control", async () => {
    const lab = await startInputLabV1();
    try {
      await userEvent.setup().click(screen.getByRole("button", { name: "开始校准" }));
      await waitFor(() => {
        expect(document.querySelector("[data-lab-interaction='say']")).toBeInTheDocument();
      });
      const revision = lab.instance.semantic.observe().revision;

      const settings = screen.getByRole("button", { name: "设置" });
      settings.focus();
      settings.dispatchEvent(
        new KeyboardEvent("keydown", { code: "Enter", bubbles: true, cancelable: true }),
      );
      expect(lab.instance.semantic.observe().revision).toBe(revision);
      expect(document.querySelector("[data-lab-interaction='say']")).toBeInTheDocument();
    } finally {
      await lab.started.dispose();
    }
  });
});
