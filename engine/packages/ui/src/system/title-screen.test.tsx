// SPDX-License-Identifier: MIT
// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { TitleScreenV1 } from "./title-screen.tsx";

afterEach(cleanup);

const labelsV1 = Object.freeze({
  newGameLabel: "New game",
  continueLabel: "Continue",
  loadGameLabel: "Load game",
  settingsLabel: "Settings",
});

describe("TitleScreenV1", () => {
  it("renders passive Load and Settings controls bound to the current frame", async () => {
    const firstLoad = vi.fn();
    const firstSettings = vi.fn();
    const currentLoad = vi.fn();
    const currentSettings = vi.fn();
    const view = render(
      <TitleScreenV1
        title="Synthetic Story"
        labels={labelsV1}
        onNewGame={vi.fn()}
        middleAction={Object.freeze({
          kind: "load",
          available: true,
          onActivate: firstLoad,
        })}
        onLoadGame={vi.fn()}
        onSettings={firstSettings}
      />,
    );

    view.rerender(
      <TitleScreenV1
        title="Synthetic Story"
        labels={labelsV1}
        onNewGame={vi.fn()}
        middleAction={Object.freeze({
          kind: "load",
          available: true,
          onActivate: currentLoad,
        })}
        onLoadGame={vi.fn()}
        onSettings={currentSettings}
      />,
    );

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Load game" }));
    await user.click(screen.getByRole("button", { name: "Settings" }));

    expect(firstLoad).not.toHaveBeenCalled();
    expect(firstSettings).not.toHaveBeenCalled();
    expect(currentLoad).toHaveBeenCalledOnce();
    expect(currentSettings).toHaveBeenCalledOnce();
  });

  it("routes New, Continue, and the separate Load entry only through frame callbacks", async () => {
    const onNewGame = vi.fn();
    const onContinue = vi.fn();
    const onLoadGame = vi.fn();
    const onSettings = vi.fn();
    render(
      <TitleScreenV1
        title="Synthetic Story"
        labels={labelsV1}
        onNewGame={onNewGame}
        middleAction={Object.freeze({
          kind: "continue",
          available: true,
          onActivate: onContinue,
        })}
        showLoadGame
        onLoadGame={onLoadGame}
        onSettings={onSettings}
      />,
    );

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "New game" }));
    await user.click(screen.getByRole("button", { name: "Continue" }));
    await user.click(screen.getByRole("button", { name: "Load game" }));
    await user.click(screen.getByRole("button", { name: "Settings" }));

    expect(onNewGame).toHaveBeenCalledOnce();
    expect(onContinue).toHaveBeenCalledOnce();
    expect(onLoadGame).toHaveBeenCalledOnce();
    expect(onSettings).toHaveBeenCalledOnce();
  });

  it("keeps Continue disabled until its runnable autosave contract is true", async () => {
    const onContinue = vi.fn();
    render(
      <TitleScreenV1
        title="Synthetic Story"
        labels={labelsV1}
        onNewGame={vi.fn()}
        middleAction={Object.freeze({
          kind: "continue",
          available: false,
          onActivate: onContinue,
        })}
        onLoadGame={vi.fn()}
        onSettings={vi.fn()}
      />,
    );

    const continueButton = screen.getByRole("button", { name: "Continue" });
    expect(continueButton).toBeDisabled();
    await userEvent.setup().click(continueButton);
    expect(onContinue).not.toHaveBeenCalled();
  });

  it("fills the canvas opaquely so Title is its own scene", () => {
    render(
      <TitleScreenV1
        title="Synthetic Story"
        labels={labelsV1}
        onNewGame={vi.fn()}
        middleAction={Object.freeze({
          kind: "continue",
          available: false,
          onActivate: vi.fn(),
        })}
        onLoadGame={vi.fn()}
        onSettings={vi.fn()}
      />,
    );

    expect(screen.getByRole("dialog", { name: "Synthetic Story" })).toHaveStyle(
      {
        backgroundColor: "var(--silly-color-canvas)",
      },
    );
  });

  it("exposes a menu hook so Stories can restyle command placement", () => {
    render(
      <TitleScreenV1
        title="Synthetic Story"
        labels={labelsV1}
        backgroundUrl="assets/title.png"
        onNewGame={vi.fn()}
        middleAction={Object.freeze({
          kind: "continue",
          available: false,
          onActivate: vi.fn(),
        })}
        onLoadGame={vi.fn()}
        onSettings={vi.fn()}
      />,
    );

    const screenRoot = screen.getByRole("dialog", { name: "Synthetic Story" });
    expect(screenRoot).toHaveAttribute("data-title-has-art", "true");
    expect(screenRoot.querySelector("[data-title-menu]")).not.toBeNull();
  });

  it("keeps the Load middle action disabled until any runnable save exists", async () => {
    const onLoad = vi.fn();
    render(
      <TitleScreenV1
        title="Synthetic Story"
        labels={labelsV1}
        onNewGame={vi.fn()}
        middleAction={Object.freeze({
          kind: "load",
          available: false,
          onActivate: onLoad,
        })}
        onLoadGame={vi.fn()}
        onSettings={vi.fn()}
      />,
    );

    const loadButton = screen.getByRole("button", { name: "Load game" });
    expect(loadButton).toBeDisabled();
    expect(loadButton).toHaveAttribute(
      "data-title-load-game-available",
      "false",
    );
    expect(screen.queryByRole("button", { name: "Continue" })).toBeNull();
    await userEvent.setup().click(loadButton);
    expect(onLoad).not.toHaveBeenCalled();
  });
});
