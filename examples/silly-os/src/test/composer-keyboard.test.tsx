// @vitest-environment jsdom
// SPDX-License-Identifier: MIT

import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { getSillyOsCopyV1 } from "../content/copy.ts";
import { ChatPaneV1 } from "../ui/chat-pane.tsx";
import { isComposerCompositionKeyV1 } from "../ui/composer-keyboard.ts";

afterEach(cleanup);
beforeAll(() => {
  Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
    configurable: true,
    value: vi.fn(),
  });
});

const copyV1 = getSillyOsCopyV1("en");
const emptyTranscriptV1 = {
  entries: [],
  byteLength: 0,
  nextBeforeSequence: null,
  newerOmitted: false,
  phase: "ready" as const,
};

describe("composer keyboard contract", () => {
  it("recognizes current and legacy IME composition signals", () => {
    expect(isComposerCompositionKeyV1({ isComposing: true, keyCode: 13 })).toBe(true);
    expect(isComposerCompositionKeyV1({ isComposing: false, keyCode: 229 })).toBe(true);
    expect(isComposerCompositionKeyV1({ isComposing: false, keyCode: 13 })).toBe(false);
  });

  it("applies the same keyboard ownership to the Workspace composer", async () => {
    const onSend = vi.fn();
    render(
      <ChatPaneV1
        copy={copyV1}
        agentName="Agent"
        transcript={emptyTranscriptV1}
        onSend={onSend}
      />,
    );
    const composer = screen.getByRole("textbox", { name: copyV1.sendPlaceholder });
    fireEvent.change(composer, { target: { value: "  Refine the outline  " } });

    expect(fireEvent.keyDown(composer, { key: "Enter", shiftKey: true })).toBe(true);
    expect(fireEvent.keyDown(composer, { key: "Enter", isComposing: true })).toBe(true);
    expect(fireEvent.keyDown(composer, { key: "Enter", keyCode: 229, which: 229 })).toBe(true);
    expect(onSend).not.toHaveBeenCalled();

    expect(fireEvent.keyDown(composer, { key: "Enter", keyCode: 13, which: 13 })).toBe(false);
    expect(onSend).toHaveBeenCalledOnce();
    expect(onSend).toHaveBeenCalledWith("Refine the outline");
    await waitFor(() => expect(composer).toHaveValue(""));
  });
});
