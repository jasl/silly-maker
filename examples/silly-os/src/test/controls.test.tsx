// @vitest-environment jsdom
// SPDX-License-Identifier: MIT

import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { afterEach, describe, expect, it } from "vitest";

import { SillyButtonV1 } from "../ui/controls.tsx";

afterEach(cleanup);

describe("SillyOS controls", () => {
  it("composes the engine button primitive with product variants", () => {
    const ref = createRef<HTMLButtonElement>();
    render(
      <SillyButtonV1 ref={ref} variant="primary">
        Create program
      </SillyButtonV1>,
    );

    const button = screen.getByRole("button", { name: "Create program" });
    expect(button).toHaveAttribute("type", "button");
    expect(button).toHaveClass("silly-button", "silly-os-button", "silly-os-button--primary");
    expect(ref.current).toBe(button);
  });

  it("preserves an explicit submit type", () => {
    render(<SillyButtonV1 type="submit">Save</SillyButtonV1>);
    expect(screen.getByRole("button", { name: "Save" })).toHaveAttribute("type", "submit");
  });
});
