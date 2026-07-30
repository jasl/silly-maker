// @vitest-environment jsdom
// SPDX-License-Identifier: MIT
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  installNativeBehaviorResetV1,
  nativeBehaviorAllowMenuAttributeV1,
  nativeBehaviorAllowTextAttributeV1,
} from "./native-behavior-reset.ts";

function fireContextMenuV1(target: Element): MouseEvent {
  const event = new MouseEvent("contextmenu", { bubbles: true, cancelable: true });
  target.dispatchEvent(event);
  return event;
}

afterEach(() => {
  document.body.innerHTML = "";
  document.body.removeAttribute("data-silly-native-reset");
  document.head.querySelectorAll("style[data-silly-native-reset-style]").forEach((node) => {
    node.remove();
  });
});

describe("installNativeBehaviorResetV1", () => {
  it("suppresses the context menu and runs the application hook", () => {
    const onContextMenu = vi.fn();
    const handle = installNativeBehaviorResetV1({ onContextMenu });
    const plain = document.createElement("div");
    document.body.append(plain);

    const event = fireContextMenuV1(plain);
    expect(event.defaultPrevented).toBe(true);
    expect(onContextMenu).toHaveBeenCalledTimes(1);
    handle.dispose();
  });

  it("keeps native menus on editable controls and opted-out subtrees", () => {
    const onContextMenu = vi.fn();
    const handle = installNativeBehaviorResetV1({ onContextMenu });
    const input = document.createElement("input");
    const optOut = document.createElement("div");
    optOut.setAttribute(nativeBehaviorAllowMenuAttributeV1, "true");
    const nested = document.createElement("span");
    optOut.append(nested);
    document.body.append(input, optOut);

    expect(fireContextMenuV1(input).defaultPrevented).toBe(false);
    expect(fireContextMenuV1(nested).defaultPrevented).toBe(false);
    expect(onContextMenu).not.toHaveBeenCalled();
    handle.dispose();
  });

  it("marks the body and injects the selection reset with text opt-outs", () => {
    const handle = installNativeBehaviorResetV1();
    expect(document.body.getAttribute("data-silly-native-reset")).toBe("true");
    const style = document.head.querySelector("style[data-silly-native-reset-style]");
    expect(style?.textContent).toContain("user-select: none");
    expect(style?.textContent).toContain(`[${nativeBehaviorAllowTextAttributeV1}]`);

    handle.dispose();
    expect(document.body.hasAttribute("data-silly-native-reset")).toBe(false);
    expect(document.head.querySelector("style[data-silly-native-reset-style]")).toBeNull();
  });

  it("honors disabled pieces and double dispose stays idempotent", () => {
    const handle = installNativeBehaviorResetV1({
      suppressContextMenu: false,
      suppressTextSelection: false,
    });
    const plain = document.createElement("div");
    document.body.append(plain);

    expect(fireContextMenuV1(plain).defaultPrevented).toBe(false);
    expect(document.body.hasAttribute("data-silly-native-reset")).toBe(false);
    handle.dispose();
    handle.dispose();
  });
});
