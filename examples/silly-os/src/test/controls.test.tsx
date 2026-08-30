// @vitest-environment jsdom
// SPDX-License-Identifier: MIT

import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ArrowLeft } from "lucide-react";
import { createRef, useState } from "react";
import { afterEach, describe, expect, it } from "vitest";

import { ButtonV1, IconButtonV1 } from "../ui/design-system/button.tsx";
import { BadgeV1 } from "../ui/design-system/badge.tsx";
import { CheckboxV1 } from "../ui/design-system/checkbox.tsx";
import { FieldDescriptionV1, FieldLabelV1, FieldV1 } from "../ui/design-system/field.tsx";
import { InputV1 } from "../ui/design-system/input.tsx";
import { ProgressV1 } from "../ui/design-system/progress.tsx";
import { StatusContentV1, StatusTitleV1, StatusV1 } from "../ui/design-system/status.tsx";
import { TabsV1 } from "../ui/design-system/tabs.tsx";
import { TextareaV1 } from "../ui/design-system/textarea.tsx";

afterEach(cleanup);

describe("SillyOS design-system controls", () => {
  it("composes the engine button primitive with product variants", () => {
    const ref = createRef<HTMLButtonElement>();
    render(
      <ButtonV1 ref={ref} variant="primary">
        Create program
      </ButtonV1>,
    );

    const button = screen.getByRole("button", { name: "Create program" });
    expect(button).toHaveAttribute("type", "button");
    expect(button).toHaveClass("silly-button", "sos-button");
    expect(button).toHaveAttribute("data-variant", "primary");
    expect(button).toHaveAttribute("data-size", "base");
    expect(ref.current).toBe(button);
  });

  it("preserves an explicit submit type", () => {
    render(<ButtonV1 type="submit">Save</ButtonV1>);
    expect(screen.getByRole("button", { name: "Save" })).toHaveAttribute("type", "submit");
  });

  it("requires an accessible name for icon-only actions", () => {
    render(
      <IconButtonV1
        accessibleName="Back"
        icon={ArrowLeft}
        variant="ghost"
        size="sm"
      />,
    );

    const button = screen.getByRole("button", { name: "Back" });
    expect(button).toHaveClass("silly-icon-button", "sos-icon-button");
    expect(button).toHaveAttribute("data-variant", "ghost");
    expect(button).toHaveAttribute("data-size", "sm");
    expect(button.querySelector("span")).toHaveAttribute("aria-hidden", "true");
  });

  it("keeps field semantics native and explicit", () => {
    render(
      <FieldV1 data-invalid>
        <FieldLabelV1 htmlFor="test-field">API key</FieldLabelV1>
        <InputV1 id="test-field" aria-invalid="true" aria-describedby="test-help" />
        <FieldDescriptionV1 id="test-help">Stored in the Vault.</FieldDescriptionV1>
      </FieldV1>,
    );

    expect(screen.getByLabelText("API key")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByText("Stored in the Vault.")).toHaveAttribute("id", "test-help");
  });

  it("keeps textarea behavior native while forwarding product state and refs", () => {
    const ref = createRef<HTMLTextAreaElement>();
    render(
      <TextareaV1
        ref={ref}
        aria-invalid="true"
        defaultValue="Draft"
        maxLength={4_000}
      />,
    );

    const textarea = screen.getByRole("textbox");
    expect(textarea).toHaveClass("sos-textarea");
    expect(textarea).toHaveAttribute("data-slot", "textarea");
    expect(textarea).toHaveAttribute("aria-invalid", "true");
    expect(textarea).toHaveAttribute("maxlength", "4000");
    expect(ref.current).toBe(textarea);
  });

  it("keeps checkbox state native while fixing its semantic type", () => {
    const ref = createRef<HTMLInputElement>();

    function CheckboxHarnessV1() {
      const [checked, setChecked] = useState(false);
      return (
        <label>
          <CheckboxV1
            ref={ref}
            checked={checked}
            onChange={(event) => setChecked(event.currentTarget.checked)}
          />
          Allow network access
        </label>
      );
    }

    render(<CheckboxHarnessV1 />);
    const checkbox = screen.getByRole("checkbox", { name: "Allow network access" });
    expect(checkbox).toHaveAttribute("type", "checkbox");
    expect(checkbox).toHaveClass("sos-checkbox");
    expect(checkbox).toHaveAttribute("data-slot", "checkbox");
    expect(checkbox).not.toBeChecked();
    expect(ref.current).toBe(checkbox);

    fireEvent.click(checkbox);
    expect(checkbox).toBeChecked();

    render(<CheckboxV1 aria-label="Unavailable model" disabled />);
    expect(screen.getByRole("checkbox", { name: "Unavailable model" })).toBeDisabled();
  });

  it("composes the engine progress meter without duplicating its contract", () => {
    const ref = createRef<HTMLProgressElement>();
    render(
      <ProgressV1
        ref={ref}
        accessibleName="Workspace export"
        value={32}
        max={64}
        valueText="32 of 64 bytes"
      />,
    );

    const progress = screen.getByRole("progressbar", { name: "Workspace export" });
    expect(progress).toHaveClass("silly-progress-meter", "sos-progress");
    expect(progress).toHaveAttribute("data-slot", "progress");
    expect(progress).toHaveAttribute("aria-valuenow", "32");
    expect(progress).toHaveAttribute("aria-valuetext", "32 of 64 bytes");
    expect(ref.current).toBe(progress);
  });

  it("keeps status tone separate from live-region semantics", () => {
    render(
      <StatusV1 variant="danger" role="alert">
        <StatusContentV1>
          <StatusTitleV1>Connection failed</StatusTitleV1>
        </StatusContentV1>
      </StatusV1>,
    );

    expect(screen.getByRole("alert")).toHaveAttribute("data-variant", "danger");
  });

  it("keeps compact rejected state distinct from neutral metadata", () => {
    render(
      <>
        <BadgeV1 variant="warning">Preview</BadgeV1>
        <BadgeV1 variant="danger">Proposal rejected</BadgeV1>
      </>,
    );

    expect(screen.getByText("Preview")).toHaveAttribute("data-variant", "warning");
    expect(screen.getByText("Proposal rejected")).toHaveAttribute(
      "data-variant",
      "danger",
    );
  });

  it("uses one roving tab stop and wraps arrow-key navigation", async () => {
    function TabsHarnessV1() {
      const [value, setValue] = useState("view");
      return (
        <TabsV1
          tabs={[
            { value: "view", label: "View" },
            { value: "source", label: "Source" },
          ]}
          value={value}
          onValueChange={setValue}
          labels={{ tabList: "Program views" }}
        />
      );
    }

    render(<TabsHarnessV1 />);
    const view = screen.getByRole("tab", { name: "View" });
    const source = screen.getByRole("tab", { name: "Source" });
    expect(view).toHaveAttribute("tabindex", "0");
    expect(source).toHaveAttribute("tabindex", "-1");

    fireEvent.keyDown(view, { key: "ArrowLeft" });
    await waitFor(() => expect(source).toHaveAttribute("aria-selected", "true"));
    expect(source).toHaveAttribute("tabindex", "0");
    expect(view).toHaveAttribute("tabindex", "-1");
  });
});
