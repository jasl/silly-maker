// @vitest-environment jsdom
// SPDX-License-Identifier: MIT
import "@testing-library/jest-dom/vitest";
import { act } from "react";
import { describe, expect, it } from "vitest";
import { mountGameApplicationV1 } from "./mount-game-application.tsx";
import type { MountedGameApplicationV1 } from "./mount-game-application.tsx";

describe("mountGameApplicationV1", () => {
  it("owns one React root lifecycle", () => {
    const container = document.createElement("div");
    container.className = "product-host";
    container.dataset.applicationId = "test-application";
    container.style.setProperty("--product-accent", "teal");
    let mounted: MountedGameApplicationV1 | undefined;
    act(() => {
      mounted = mountGameApplicationV1(container, <p>ready</p>);
    });
    expect(container).toHaveTextContent("ready");
    expect(container).toHaveClass("product-host");
    expect(container).toHaveAttribute("data-application-id", "test-application");
    expect(container.style.getPropertyValue("--product-accent")).toBe("teal");
    act(() => mounted?.unmount());
    expect(container).toBeEmptyDOMElement();
    expect(container).toHaveClass("product-host");
    expect(container).toHaveAttribute("data-application-id", "test-application");
    expect(container.style.getPropertyValue("--product-accent")).toBe("teal");
  });
});
