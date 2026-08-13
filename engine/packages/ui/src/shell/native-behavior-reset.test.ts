// @vitest-environment jsdom
// SPDX-License-Identifier: MIT
import { afterEach, describe, expect, it, vi } from "vitest";

import { parseInputActionIdV1 } from "../input/contracts.ts";
import {
  installPointerButtonAdapterV1,
  pointerInteractiveSelectorV1,
} from "../input/pointer-button-adapter.ts";
import {
  installNativeBehaviorResetV1,
  nativeBehaviorAllowMenuAttributeV1,
  nativeBehaviorAllowTextAttributeV1,
} from "./native-behavior-reset.ts";
import type {
  NativeBehaviorResetConfigV1,
  NativeBehaviorResetHandleV1,
} from "./native-behavior-reset.ts";

function fireContextMenuV1(target: Element): MouseEvent {
  const event = new MouseEvent("contextmenu", { bubbles: true, cancelable: true });
  target.dispatchEvent(event);
  return event;
}

const installedHandlesV1: NativeBehaviorResetHandleV1[] = [];
const installedPointerAdaptersV1: Array<() => void> = [];

function installForTestV1(
  config: NativeBehaviorResetConfigV1 = {},
  documentRef: Document = document,
): NativeBehaviorResetHandleV1 {
  const handle = installNativeBehaviorResetV1(config, documentRef);
  installedHandlesV1.push(handle);
  return handle;
}

afterEach(() => {
  for (const dispose of installedPointerAdaptersV1.splice(0)) dispose();
  for (const handle of installedHandlesV1.splice(0)) handle.dispose();
  document.body.innerHTML = "";
  document.body.removeAttribute("data-silly-native-reset");
  document.head.querySelectorAll("style[data-silly-native-reset-style]").forEach((node) => {
    node.remove();
  });
});

describe("installNativeBehaviorResetV1", () => {
  it("suppresses an unclaimed context menu without becoming a semantic action owner", () => {
    const handle = installForTestV1();
    const plain = document.createElement("div");
    document.body.append(plain);

    const event = fireContextMenuV1(plain);
    expect(event.defaultPrevented).toBe(true);
    handle.dispose();
  });

  it("runs after the document InputRouter claimant regardless of installation order", () => {
    const claimantSawPrevented = vi.fn();
    const handle = installForTestV1();
    const claimant = (event: Event): void => {
      claimantSawPrevented(event.defaultPrevented);
      event.preventDefault();
    };
    document.addEventListener("contextmenu", claimant);
    const plain = document.createElement("div");
    document.body.append(plain);

    expect(fireContextMenuV1(plain).defaultPrevented).toBe(true);
    expect(claimantSawPrevented).toHaveBeenCalledWith(false);
    document.removeEventListener("contextmenu", claimant);
    handle.dispose();
  });

  it("composes with pointer routing while preserving interactive and native-menu ownership", () => {
    const routed: string[] = [];
    installForTestV1();
    installedPointerAdaptersV1.push(
      installPointerButtonAdapterV1({
        router: {
          route(input) {
            if (input.kind === "action") routed.push(input.actionId);
            return { kind: "handled", context: "system" };
          },
        },
        map: { secondary: parseInputActionIdV1("ui.cancel") },
      }),
    );

    const button = document.createElement("button");
    const buttonChild = document.createElement("span");
    button.append(buttonChild);
    const nativeMenu = document.createElement("div");
    nativeMenu.setAttribute(nativeBehaviorAllowMenuAttributeV1, "true");
    const nativeMenuChild = document.createElement("span");
    nativeMenu.append(nativeMenuChild);
    document.body.append(button, nativeMenu);

    expect(fireContextMenuV1(document.body).defaultPrevented).toBe(true);
    expect(routed).toEqual(["ui.cancel"]);

    expect(fireContextMenuV1(buttonChild).defaultPrevented).toBe(false);
    expect(routed).toEqual(["ui.cancel"]);

    button.setAttribute("data-secondary-action", "player.inspect");
    expect(fireContextMenuV1(buttonChild).defaultPrevented).toBe(true);
    expect(routed).toEqual(["ui.cancel", "player.inspect"]);

    expect(fireContextMenuV1(nativeMenuChild).defaultPrevented).toBe(false);
    expect(routed).toEqual(["ui.cancel", "player.inspect"]);
  });

  it("keeps native menus on editable controls and opted-out subtrees", () => {
    const handle = installForTestV1();
    const input = document.createElement("input");
    const optOut = document.createElement("div");
    optOut.setAttribute(nativeBehaviorAllowMenuAttributeV1, "true");
    const nested = document.createElement("span");
    optOut.append(nested);
    document.body.append(input, optOut);

    expect(fireContextMenuV1(input).defaultPrevented).toBe(false);
    expect(fireContextMenuV1(nested).defaultPrevented).toBe(false);
    handle.dispose();
  });

  it("marks the body and restores selection and WebKit callouts on native subtrees", () => {
    const handle = installForTestV1();
    expect(document.body.getAttribute("data-silly-native-reset")).toBe("true");
    const style = document.head.querySelector("style[data-silly-native-reset-style]");
    expect(style?.textContent).toContain("user-select: none");
    expect(style?.textContent).toContain("user-select: text !important");
    expect(style?.textContent).toContain(`[${nativeBehaviorAllowTextAttributeV1}]`);
    expect(style?.textContent).toContain(`[${nativeBehaviorAllowMenuAttributeV1}]`);
    expect(style?.textContent).toContain(`:is(${pointerInteractiveSelectorV1})`);
    expect(style?.textContent).toContain("-webkit-touch-callout: default");

    handle.dispose();
    expect(document.body.hasAttribute("data-silly-native-reset")).toBe(false);
    expect(document.head.querySelector("style[data-silly-native-reset-style]")).toBeNull();
  });

  it("honors disabled pieces and double dispose stays idempotent", () => {
    const handle = installForTestV1({
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

  it("keeps the shared body marker until the last selection reset is disposed", () => {
    const first = installForTestV1();
    const successor = installForTestV1();
    expect(document.body.hasAttribute("data-silly-native-reset")).toBe(true);
    expect(document.head.querySelectorAll("style[data-silly-native-reset-style]")).toHaveLength(2);

    first.dispose();
    expect(document.body.hasAttribute("data-silly-native-reset")).toBe(true);
    expect(document.head.querySelectorAll("style[data-silly-native-reset-style]")).toHaveLength(1);

    successor.dispose();
    expect(document.body.hasAttribute("data-silly-native-reset")).toBe(false);
    expect(document.head.querySelectorAll("style[data-silly-native-reset-style]")).toHaveLength(0);
  });

  it("recognizes editable and opted-out targets from another Window realm", () => {
    const frame = document.createElement("iframe");
    document.body.append(frame);
    const frameWindow = frame.contentWindow;
    const frameDocument = frame.contentDocument;
    if (frameWindow === null || frameDocument === null) throw new TypeError("missing iframe realm");
    const handle = installForTestV1({}, frameDocument);
    const input = frameDocument.createElement("input");
    frameDocument.body.append(input);

    const FrameMouseEvent = (frameWindow as unknown as { readonly MouseEvent: typeof MouseEvent })
      .MouseEvent;
    const event = new FrameMouseEvent("contextmenu", {
      bubbles: true,
      cancelable: true,
    });
    input.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(false);
    handle.dispose();
  });
});
