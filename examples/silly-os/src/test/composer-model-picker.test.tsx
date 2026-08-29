// @vitest-environment jsdom
// SPDX-License-Identifier: MIT

import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { getSillyOsCopyV1 } from "../content/copy.ts";
import {
  ComposerModelPickerV1,
  type ComposerModelPickerPropsV1,
} from "../ui/composer-model-picker.tsx";

afterEach(cleanup);

const copyV1 = getSillyOsCopyV1("en");

function propsV1(
  overrides: Partial<ComposerModelPickerPropsV1> = {},
): ComposerModelPickerPropsV1 {
  return {
    copy: copyV1,
    surface: "home",
    status: "ready",
    selectedValue: "builtin:anthropic:claude-sonnet-5",
    options: [{
      value: "builtin:anthropic:claude-sonnet-5",
      modelName: "Claude Sonnet 5",
      providerName: "Anthropic",
    }],
    reasoningEffort: {
      status: "ready",
      selectedValue: "medium",
      options: ["off", "minimal", "low", "medium", "high"],
      onSelect: vi.fn(),
    },
    onSelect: vi.fn(),
    onOpenSettings: vi.fn(),
    ...overrides,
  };
}

describe("SillyOS shared composer reasoning effort", () => {
  it("renders on the Home surface and supports keyboard selection", () => {
    const onSelect = vi.fn();
    render(
      <ComposerModelPickerV1
        {...propsV1({ reasoningEffort: { ...propsV1().reasoningEffort, onSelect } })}
      />,
    );

    const trigger = screen.getByRole("combobox", { name: "Agent Creator reasoning effort" });
    expect(trigger.closest("[data-model-picker-surface]"))
      .toHaveAttribute("data-model-picker-surface", "home");

    fireEvent.keyDown(trigger, { key: "ArrowDown" });
    expect(screen.getByRole("listbox", { name: "Agent Creator reasoning effort" }))
      .toBeVisible();
    fireEvent.keyDown(trigger, { key: "End" });
    fireEvent.keyDown(trigger, { key: "Enter" });

    expect(onSelect).toHaveBeenCalledOnce();
    expect(onSelect).toHaveBeenCalledWith("high");
    expect(trigger).toHaveFocus();
  });

  it("keeps model recovery available while reasoning is failed or fixed to off", () => {
    const base = propsV1();
    const view = render(
      <ComposerModelPickerV1
        {...base}
        reasoningEffort={{ ...base.reasoningEffort, status: "failed" }}
      />,
    );

    expect(screen.getByRole("combobox", { name: "Agent Creator model" })).toBeEnabled();
    expect(screen.getByRole("combobox", { name: "Agent Creator reasoning effort" }))
      .toBeDisabled();

    view.rerender(
      <ComposerModelPickerV1
        {...base}
        reasoningEffort={{
          ...base.reasoningEffort,
          status: "ready",
          selectedValue: "off",
          options: ["off"],
        }}
      />,
    );
    expect(screen.getByRole("combobox", { name: "Agent Creator model" })).toBeEnabled();
    expect(screen.getByRole("combobox", { name: "Agent Creator reasoning effort" }))
      .toBeDisabled();
  });
});
