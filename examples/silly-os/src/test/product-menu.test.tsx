// @vitest-environment jsdom
// SPDX-License-Identifier: MIT

import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { getSillyOsCopyV1 } from "../content/copy.ts";
import { SillyOsOverlayHostV1 } from "../ui/design-system/overlay-host.tsx";
import { ProductMenuV1 } from "../ui/product-menu.tsx";

afterEach(cleanup);

const copyV1 = getSillyOsCopyV1("en");

function renderMenuV1(input: {
  readonly surface?: "home" | "workspace" | "settings";
  readonly theme?: "system" | "light" | "dark";
  readonly onThemeChange?: (value: "system" | "light" | "dark") => void;
  readonly onLocaleChange?: (value: "en" | "zh-CN") => void;
  readonly onOpenSettings?: () => void;
} = {}) {
  return render(
    <SillyOsOverlayHostV1>
      <ProductMenuV1
        copy={copyV1}
        surface={input.surface ?? "home"}
        theme={input.theme ?? "system"}
        onThemeChange={input.onThemeChange ?? vi.fn()}
        onLocaleChange={input.onLocaleChange ?? vi.fn()}
        {...(input.onOpenSettings === undefined ? {} : { onOpenSettings: input.onOpenSettings })}
      />
    </SillyOsOverlayHostV1>,
  );
}

function openMenuV1(): HTMLElement {
  const trigger = screen.getByRole("button", { name: copyV1.productMenu });
  fireEvent.keyDown(trigger, { key: "ArrowDown" });
  return screen.getByRole("menu", { name: copyV1.productMenu });
}

describe("SillyOS product menu", () => {
  it("selects theme and locale through keyboard-operable submenus", () => {
    const onThemeChange = vi.fn();
    const onLocaleChange = vi.fn();
    renderMenuV1({ onThemeChange, onLocaleChange });

    openMenuV1();
    const themeItem = screen.getByRole("menuitem", { name: copyV1.settingsTheme });
    themeItem.focus();
    fireEvent.keyDown(themeItem, { key: "ArrowRight" });
    fireEvent.click(screen.getByRole("menuitemradio", { name: copyV1.themeDark }));
    expect(onThemeChange).toHaveBeenCalledWith("dark");

    openMenuV1();
    const languageItem = screen.getByRole("menuitem", { name: copyV1.settingsLanguage });
    languageItem.focus();
    fireEvent.keyDown(languageItem, { key: "ArrowRight" });
    fireEvent.click(screen.getByRole("menuitemradio", { name: "简体中文" }));
    expect(onLocaleChange).toHaveBeenCalledWith("zh-CN");
  });

  it("opens Settings from Home and marks the Settings destination current", async () => {
    const onOpenSettings = vi.fn();
    const view = renderMenuV1({ onOpenSettings });

    openMenuV1();
    fireEvent.click(screen.getByRole("menuitem", { name: copyV1.settings }));
    await waitFor(() => expect(onOpenSettings).toHaveBeenCalledOnce());

    view.rerender(
      <SillyOsOverlayHostV1>
        <ProductMenuV1
          copy={copyV1}
          surface="settings"
          theme="system"
          onThemeChange={vi.fn()}
          onLocaleChange={vi.fn()}
          onOpenSettings={onOpenSettings}
        />
      </SillyOsOverlayHostV1>,
    );
    openMenuV1();
    const current = screen.getByRole("menuitem", { name: copyV1.settings });
    expect(current).toHaveAttribute("aria-current", "page");
    expect(current).toHaveAttribute("data-disabled");
  });
});
