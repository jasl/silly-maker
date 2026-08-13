// SPDX-License-Identifier: MIT
// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { EngineStateTunerPanelV1 } from "./state-tuner-panel.tsx";
import { mergeEngineStateTunerPanelsV1 } from "./state-tuner-contributions.tsx";
import type { StateTunerPortV1 } from "./state-tuner.ts";
import { engineStateInspectorPanelIdV1, engineStateTunerPanelIdV1 } from "./state-tuner.ts";

afterEach(cleanup);

function portV1(
  state: unknown,
  patch: StateTunerPortV1["patch"] = vi.fn(async () =>
    Object.freeze({ kind: "committed" as const })
  ),
): StateTunerPortV1 {
  const listeners = new Set<() => void>();
  return {
    read: () => state,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    patch,
  };
}

describe("EngineStateTunerPanelV1", () => {
  it("writes an existing number leaf through the tuner port", async () => {
    const patch = vi.fn(async () => Object.freeze({ kind: "committed" as const }));
    render(
      <EngineStateTunerPanelV1
        port={portV1({ simulation: { cat: { trust: 10 } } }, patch)}
      />,
    );
    const row = document.querySelector("[data-engine-state-tuner-path='simulation.cat.trust']");
    expect(row).not.toBeNull();
    const input = screen.getByRole("spinbutton", { name: "simulation.cat.trust" });
    fireEvent.change(input, { target: { value: "77" } });
    fireEvent.click(screen.getByRole("button", { name: "写入" }));
    await waitFor(() => expect(patch).toHaveBeenCalledTimes(1));
    expect(patch).toHaveBeenCalledWith(["simulation", "cat", "trust"], 77);
    expect(screen.getByRole("status")).toHaveTextContent("已写入");
  });

  it("does not call patch when the draft is not an integer", async () => {
    const patch = vi.fn(async () => Object.freeze({ kind: "committed" as const }));
    render(
      <EngineStateTunerPanelV1
        port={portV1({ count: 1 }, patch)}
      />,
    );
    fireEvent.change(screen.getByRole("spinbutton", { name: "count" }), {
      target: { value: "1.5" },
    });
    fireEvent.click(screen.getByRole("button", { name: "写入" }));
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("需要整数"));
    expect(patch).not.toHaveBeenCalled();
  });
});

describe("mergeEngineStateTunerPanelsV1", () => {
  it("prepends the engine inspector and table and drops colliding story ids", () => {
    const port = portV1({ count: 1 });
    const merged = mergeEngineStateTunerPanelsV1(
      [
        {
          id: engineStateInspectorPanelIdV1,
          side: "right",
          title: "story inspector",
          authority: "read_only",
          render: () => null,
        },
        {
          id: "story.tuning",
          side: "right",
          title: "调参",
          authority: "cheat",
          render: () => null,
        },
      ],
      port,
    );
    expect(merged.map((panel) => panel.id)).toEqual([
      engineStateInspectorPanelIdV1,
      engineStateTunerPanelIdV1,
      "story.tuning",
    ]);
    expect(merged[0]?.title).toBe("状态查看");
    expect(merged[1]?.title).toBe("状态编辑");
  });
});
