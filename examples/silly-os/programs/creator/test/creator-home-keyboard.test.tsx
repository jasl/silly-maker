// @vitest-environment jsdom
// SPDX-License-Identifier: MIT

import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { getSillyOsCopyV1 } from "../../../src/content/copy.ts";
import { CreatorHomeV1 } from "../ui/creator-home.tsx";
import { getCreatorProgramCopyV1 } from "../ui/creator-program-copy.ts";

afterEach(cleanup);

const copyV1 = getCreatorProgramCopyV1(getSillyOsCopyV1("en"));

describe("Creator Home composer keyboard contract", () => {
  it("submits with Enter but leaves Shift+Enter and IME keys to the textarea", () => {
    const onCreate = vi.fn();
    render(
      <CreatorHomeV1
        copy={copyV1}
        onCreate={onCreate}
        onLocaleChange={vi.fn()}
        theme="system"
        onThemeChange={vi.fn()}
      />,
    );
    const composer = screen.getByRole("textbox", { name: copyV1.programAgentTitle });
    fireEvent.change(composer, { target: { value: "  Build a writing room  " } });

    expect(fireEvent.keyDown(composer, { key: "Enter", shiftKey: true })).toBe(true);
    expect(fireEvent.keyDown(composer, { key: "Enter", isComposing: true })).toBe(true);
    expect(fireEvent.keyDown(composer, { key: "Enter", keyCode: 229, which: 229 })).toBe(true);
    expect(onCreate).not.toHaveBeenCalled();

    expect(fireEvent.keyDown(composer, { key: "Enter", keyCode: 13, which: 13 })).toBe(false);
    expect(onCreate).toHaveBeenCalledOnce();
    expect(onCreate).toHaveBeenCalledWith("Build a writing room");
  });
});
