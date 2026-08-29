// @vitest-environment jsdom
// SPDX-License-Identifier: MIT
import { cleanup, render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { parseChromeLayoutDocumentV1 } from "@sillymaker/base";

import type { AssetUrlRegistryV1 } from "../assets/use-asset-url.ts";
import type { ChromeIntentWidgetStateV1 } from "./chrome-widget-surface.tsx";
import { ChromeWidgetSurfaceV1 } from "./chrome-widget-surface.tsx";

const layoutV1 = parseChromeLayoutDocumentV1({
  format: "sillymaker.chrome-layout",
  version: 1,
  layoutId: "layout.test.widgets",
  label: "widget 测试布局",
  canvas: { width: 1024, height: 576 },
  boxes: {
    "route.inside": { x: 120, y: 400, width: 160, height: 48 },
    "route.outside": { x: 320, y: 400, width: 160, height: 48 },
    "window.bar": { x: 120, y: 40, width: 360, height: 24 },
  },
  anchors: {},
  offsets: {},
  widgets: {
    "route.inside": {
      kind: "intent",
      box: "route.inside",
      intentId: "app.route.inside",
      labelTextId: "text.route.inside",
      assetId: "asset.route.inside",
    },
    "route.outside": {
      kind: "intent",
      box: "route.outside",
      intentId: "app.route.outside",
      labelTextId: "text.route.outside",
    },
    "window.bar": {
      kind: "hold_progress",
      box: "window.bar",
      labelTextId: "text.window.bar",
    },
  },
});

const textsV1: Readonly<Record<string, string>> = Object.freeze({
  "text.route.inside": "中に出す",
  "text.route.outside": "外に出す",
  "text.window.bar": "残り時間",
  "text.reason.locked": "锁定中",
});

function resolveTextV1(textId: string): string {
  const resolved = textsV1[textId];
  if (resolved === undefined) throw new TypeError(`text_missing:${textId}`);
  return resolved;
}

function intentPortV1(
  states: Readonly<Record<string, ChromeIntentWidgetStateV1>>,
  onActivate: (intentId: string) => void,
) {
  return Object.freeze({
    stateOf: (intentId: string): ChromeIntentWidgetStateV1 =>
      states[intentId] ?? Object.freeze({ status: "hidden" as const }),
    onActivate,
  });
}

afterEach(() => {
  cleanup();
});

describe("ChromeWidgetSurfaceV1", () => {
  it("renders enabled intent widgets at their boxes and reports activation once", async () => {
    const activations: string[] = [];
    render(
      <ChromeWidgetSurfaceV1
        layout={layoutV1}
        intents={intentPortV1(
          {
            "app.route.inside": { status: "enabled" },
            "app.route.outside": { status: "enabled" },
          },
          (intentId) => activations.push(intentId),
        )}
        resolveText={resolveTextV1}
      />,
    );
    const inside = screen.getByRole("button", { name: "中に出す" });
    expect(inside.dataset.chromeWidget).toBe("route.inside");
    expect(inside.dataset.chromeIntent).toBe("app.route.inside");
    expect(inside.style.insetInlineStart).toBe("120px");
    expect(inside.style.insetBlockStart).toBe("400px");
    expect(inside.style.inlineSize).toBe("160px");
    expect(inside.style.blockSize).toBe("48px");
    await userEvent.setup().click(inside);
    expect(activations).toEqual(["app.route.inside"]);
  });

  it("disables with resolved reasons and hides hidden intents", async () => {
    const onActivate = vi.fn();
    render(
      <ChromeWidgetSurfaceV1
        layout={layoutV1}
        intents={intentPortV1(
          {
            "app.route.inside": {
              status: "disabled",
              reasonTextIds: ["text.reason.locked"],
            },
          },
          onActivate,
        )}
        resolveText={resolveTextV1}
      />,
    );
    const inside = screen.getByRole("button", { name: "中に出す" });
    expect((inside as HTMLButtonElement).disabled).toBe(true);
    expect(inside.title).toBe("锁定中");
    expect(screen.queryByRole("button", { name: "外に出す" })).toBeNull();
    await userEvent.setup().click(inside);
    expect(onActivate).not.toHaveBeenCalled();
  });

  it("renders an icon through the assets port and the label without one", () => {
    const registry = Object.freeze({
      resolve: (assetId: never) => ({
        delivery: (assetId as string) === "asset.route.inside" ? "runtime_image" : "missing",
        url: "blob:route-inside",
      }),
      observe: () => Object.freeze({ revision: 1 }),
      subscribe: () => () => {},
    }) as AssetUrlRegistryV1;
    render(
      <ChromeWidgetSurfaceV1
        layout={layoutV1}
        intents={intentPortV1(
          {
            "app.route.inside": { status: "enabled" },
            "app.route.outside": { status: "enabled" },
          },
          () => {},
        )}
        resolveText={resolveTextV1}
        assets={registry}
      />,
    );
    const inside = screen.getByRole("button", { name: "中に出す" });
    const icon = inside.querySelector("img");
    expect(icon?.getAttribute("src")).toBe("blob:route-inside");
    const outside = screen.getByRole("button", { name: "外に出す" });
    expect(outside.querySelector("img")).toBeNull();
    expect(outside.textContent).toBe("外に出す");
  });

  it("renders hold progress from the committed view and hides it without one", () => {
    const { rerender } = render(
      <ChromeWidgetSurfaceV1
        layout={layoutV1}
        intents={intentPortV1({}, () => {})}
        holdProgress={{ remainingMs: 1_500, totalMs: 6_000 }}
        resolveText={resolveTextV1}
      />,
    );
    const meter = screen.getByRole("progressbar", { name: "残り時間" });
    expect(meter.getAttribute("aria-valuenow")).toBe("4500");
    expect(meter.getAttribute("aria-valuemax")).toBe("6000");
    expect(meter.dataset.chromeWidget).toBe("window.bar");
    rerender(
      <ChromeWidgetSurfaceV1
        layout={layoutV1}
        intents={intentPortV1({}, () => {})}
        holdProgress={null}
        resolveText={resolveTextV1}
      />,
    );
    expect(screen.queryByRole("progressbar")).toBeNull();
  });

  it("renders nothing for a document without widgets", () => {
    const { container } = render(
      <ChromeWidgetSurfaceV1
        layout={parseChromeLayoutDocumentV1({
          format: "sillymaker.chrome-layout",
          version: 1,
          layoutId: "layout.test.plain",
          label: "无 widget",
          canvas: { width: 1024, height: 576 },
          boxes: {},
          anchors: {},
          offsets: {},
        })}
        intents={intentPortV1({}, () => {})}
        resolveText={resolveTextV1}
      />,
    );
    expect(container.childElementCount).toBe(0);
  });

  it("keeps hosted semantics under Story-owned intent pixels", async () => {
    const activations: string[] = [];
    render(
      <ChromeWidgetSurfaceV1
        layout={layoutV1}
        intents={intentPortV1(
          {
            "app.route.inside": { status: "enabled" },
            "app.route.outside": {
              status: "disabled",
              reasonTextIds: ["text.reason.locked"],
            },
          },
          (intentId) => activations.push(intentId),
        )}
        resolveText={resolveTextV1}
        renderIntent={(context) => (
          <span data-story-pixels={context.widgetName}>
            {context.status === "disabled"
              ? `×${context.label}（${context.reasonTexts.join("/")}）`
              : `▶${context.label}`}
          </span>
        )}
      />,
    );
    // The host still owns the button element, its accessible name, and the
    // disabled gate; the Story only painted the interior.
    const inside = screen.getByRole("button", { name: "中に出す" });
    expect(inside.querySelector("[data-story-pixels='route.inside']")?.textContent).toBe(
      "▶中に出す",
    );
    expect(inside.style.insetInlineStart).toBe("120px");
    const outside = screen.getByRole("button", { name: "外に出す" });
    expect((outside as HTMLButtonElement).disabled).toBe(true);
    expect(outside.querySelector("[data-story-pixels='route.outside']")?.textContent).toBe(
      "×外に出す（锁定中）",
    );
    await userEvent.setup().click(inside);
    await userEvent.setup().click(outside);
    expect(activations).toEqual(["app.route.inside"]);
  });

  it("resolves hold views per widget and hosts Story progress pixels", () => {
    const multiSlotLayout = parseChromeLayoutDocumentV1({
      format: "sillymaker.chrome-layout",
      version: 1,
      layoutId: "layout.test.multi-slot",
      label: "多槽位进度",
      canvas: { width: 1024, height: 576 },
      boxes: {
        "slot.left": { x: 20, y: 220, width: 220, height: 20 },
        "slot.right": { x: 790, y: 230, width: 220, height: 20 },
      },
      anchors: {},
      offsets: {},
      widgets: {
        "slot.left": { kind: "hold_progress", box: "slot.left", labelTextId: "text.window.bar" },
        "slot.right": { kind: "hold_progress", box: "slot.right", labelTextId: "text.window.bar" },
      },
    });
    render(
      <ChromeWidgetSurfaceV1
        layout={multiSlotLayout}
        intents={intentPortV1({}, () => {})}
        holdProgress={(widgetName) =>
          widgetName === "slot.right" ? { remainingMs: 2_500, totalMs: 5_000 } : null}
        resolveText={resolveTextV1}
        renderHoldProgress={(context) => {
          const cells = 5;
          const filled = Math.floor((context.totalMs - context.remainingMs) / 1_000);
          return `${"■".repeat(filled)}${"□".repeat(cells - filled)}`;
        }}
      />,
    );
    // Only the resolved slot renders; the host keeps the progressbar role
    // with committed values while the Story paints the cell text.
    const bars = screen.getAllByRole("progressbar");
    expect(bars).toHaveLength(1);
    const bar = bars[0] as HTMLElement;
    expect(bar.dataset.chromeWidget).toBe("slot.right");
    expect(bar.getAttribute("aria-valuenow")).toBe("2500");
    expect(bar.getAttribute("aria-valuemax")).toBe("5000");
    expect(bar.style.insetInlineStart).toBe("790px");
    expect(bar.textContent).toBe("■■□□□");
  });

  it("hides a hold widget whose Story pixels return null", () => {
    render(
      <ChromeWidgetSurfaceV1
        layout={layoutV1}
        intents={intentPortV1({}, () => {})}
        holdProgress={{ remainingMs: 1_000, totalMs: 4_000 }}
        resolveText={resolveTextV1}
        renderHoldProgress={() => null}
      />,
    );
    expect(screen.queryByRole("progressbar")).toBeNull();
  });
});
