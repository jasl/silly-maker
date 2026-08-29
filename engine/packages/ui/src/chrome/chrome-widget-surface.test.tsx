// @vitest-environment jsdom
// SPDX-License-Identifier: MIT
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { parseChromeLayoutDocumentV1 } from "@sillymaker/base";

import { GameViewportV1 } from "../viewport/game-viewport.tsx";
import type { ChromeIntentWidgetStateV1 } from "./chrome-widget-surface.tsx";
import { ChromeWidgetSurfaceV1 } from "./chrome-widget-surface.tsx";

const layoutV1 = parseChromeLayoutDocumentV1({
  format: "sillymaker.chrome-layout",
  version: 1,
  layoutId: "layout.test.widgets",
  label: "Widget test",
  canvas: { width: 1024, height: 576 },
  boxes: {
    save: { x: 120, y: 480, width: 160, height: 48 },
    load: { x: 300, y: 480, width: 160, height: 48 },
    wait: { x: 120, y: 40, width: 360, height: 24 },
  },
  anchors: {},
  offsets: {},
  widgets: {
    save: {
      kind: "intent",
      box: "save",
      intentId: "player.save",
      labelTextId: "text.save",
    },
    load: {
      kind: "intent",
      box: "load",
      intentId: "player.load",
      labelTextId: "text.load",
    },
    wait: {
      kind: "hold_progress",
      box: "wait",
      labelTextId: "text.wait",
    },
  },
});

const textsV1: Readonly<Record<string, string>> = {
  "text.save": "保存",
  "text.load": "读取",
  "text.wait": "剩余时间",
  "text.locked": "当前不可用",
};

function resolveTextV1(textId: string): string {
  const text = textsV1[textId];
  if (text === undefined) throw new TypeError(`missing_text:${textId}`);
  return text;
}

function intentPortV1(
  states: Readonly<Record<string, ChromeIntentWidgetStateV1>>,
  onActivate: (intentId: string) => void,
) {
  return {
    stateOf: (intentId: string): ChromeIntentWidgetStateV1 =>
      states[intentId] ?? { status: "hidden" },
    onActivate,
  };
}

afterEach(cleanup);

describe("ChromeWidgetSurfaceV1", () => {
  it("hosts enabled, disabled, and hidden intent semantics without routing itself", async () => {
    const onActivate = vi.fn();
    render(
      <ChromeWidgetSurfaceV1
        layout={layoutV1}
        intents={intentPortV1(
          {
            "player.save": { status: "enabled" },
            "player.load": { status: "disabled", reasonTextIds: ["text.locked"] },
          },
          onActivate,
        )}
        resolveText={resolveTextV1}
      />,
    );

    const save = screen.getByRole("button", { name: "保存" });
    const load = screen.getByRole("button", { name: "读取" });
    expect(save).toHaveAttribute("data-chrome-intent", "player.save");
    expect(save.style.insetInlineStart).toBe("120px");
    expect(load).toBeDisabled();
    expect(load).toHaveAttribute("title", "当前不可用");
    await userEvent.setup().click(save);
    await userEvent.setup().click(load);
    expect(onActivate).toHaveBeenCalledTimes(1);
    expect(onActivate).toHaveBeenCalledWith("player.save");

    cleanup();
    render(
      <ChromeWidgetSurfaceV1
        layout={layoutV1}
        intents={intentPortV1({}, onActivate)}
        resolveText={resolveTextV1}
      />,
    );
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("projects only committed hold progress and resolves independent slots", () => {
    render(
      <ChromeWidgetSurfaceV1
        layout={layoutV1}
        intents={intentPortV1({}, () => undefined)}
        holdProgress={(widgetName) =>
          widgetName === "wait" ? { remainingMs: 1_500, totalMs: 6_000 } : null}
        resolveText={resolveTextV1}
      />,
    );
    const progress = screen.getByRole("progressbar", { name: "剩余时间" });
    expect(progress).toHaveAttribute("aria-valuenow", "4500");
    expect(progress).toHaveAttribute("aria-valuemax", "6000");
    expect(progress).toHaveAttribute("data-chrome-widget", "wait");
  });

  it("keeps hosted accessibility and gates while the product replaces pixels", async () => {
    const onActivate = vi.fn();
    render(
      <ChromeWidgetSurfaceV1
        layout={layoutV1}
        intents={intentPortV1(
          {
            "player.save": { status: "enabled" },
            "player.load": { status: "disabled" },
          },
          onActivate,
        )}
        holdProgress={{ remainingMs: 2_000, totalMs: 5_000 }}
        resolveText={resolveTextV1}
        renderIntent={(context) => <span>{context.status === "enabled" ? "▶" : "×"}</span>}
        renderHoldProgress={(context) => (
          <span>{String(context.totalMs - context.remainingMs)}ms</span>
        )}
      />,
    );
    const save = screen.getByRole("button", { name: "保存" });
    const load = screen.getByRole("button", { name: "读取" });
    expect(save).toHaveTextContent("▶");
    expect(load).toBeDisabled();
    const progress = screen.getByRole("progressbar", { name: "剩余时间" });
    expect(progress).toHaveAttribute("aria-valuenow", "3000");
    expect(progress).toHaveTextContent("3000ms");
    await userEvent.setup().click(save);
    await userEvent.setup().click(load);
    expect(onActivate).toHaveBeenCalledTimes(1);
  });

  it("reuses GameViewport scale and authored origin at a 4K@200% CSS viewport", () => {
    render(
      <GameViewportV1
        canvas={{ width: 1024, height: 576 }}
        fallbackSize={{ width: 1920, height: 1080 }}
      >
        <ChromeWidgetSurfaceV1
          layout={layoutV1}
          intents={intentPortV1({ "player.save": { status: "enabled" } }, () => undefined)}
          resolveText={resolveTextV1}
        />
      </GameViewportV1>,
    );
    const surface = document.querySelector<HTMLElement>("[data-chrome-widget-surface]");
    expect(surface).not.toBeNull();
    expect(surface).toHaveAttribute("data-chrome-widget-scale", "1.8750");
    expect(surface?.style.transform).toBe("scale(1.875)");
    expect(surface?.style.inlineSize).toBe("1024px");
    const origin = document.querySelector<HTMLElement>("[data-chrome-widget-coordinate-origin]");
    expect(origin?.style.inlineSize).toBe("1024px");
    expect(origin?.style.blockSize).toBe("576px");
  });

  it("rejects a layout from a different authored coordinate space", () => {
    expect(() =>
      render(
        <GameViewportV1
          canvas={{ width: 1600, height: 900 }}
          fallbackSize={{ width: 1600, height: 900 }}
        >
          <ChromeWidgetSurfaceV1
            layout={layoutV1}
            intents={intentPortV1({}, () => undefined)}
            resolveText={resolveTextV1}
          />
        </GameViewportV1>,
      )
    ).toThrow("ui.chrome_widget_canvas_mismatch");
  });
});
