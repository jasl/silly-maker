// SPDX-License-Identifier: MIT
// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import type { CoreRollbackPortV1 } from "@sillymaker/base/runtime";
import { createInputRouterV1, playerInputActionIdsV1 } from "@sillymaker/ui";

import { VnReferenceTourEndingSurfaceV1 } from "./ending-surface.tsx";

const labelsV1 = {
  title: "旧声入档",
  kicker: "播送完毕",
  summary: "信号已经安全收束。",
  backLabel: "回退",
  returnLabel: "返回标题",
  returningLabel: "正在返回…",
  returnFailure: "暂时无法返回标题，请重试。",
};

function createHistoryV1(steps = 1) {
  const listeners = new Set<() => void>();
  const toPrevious = vi.fn(async () => ({
    kind: "rolled_back" as const,
    commandSequence: 1 as never,
  }));
  const rollback: CoreRollbackPortV1 = {
    available: () => ({ steps: steps as never, forwardSteps: 0 as never }),
    toPrevious,
    toNext: async () => ({ kind: "rejected", code: "rollforward_unavailable" }),
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
  return { input: createInputRouterV1(), rollback, toPrevious };
}

afterEach(cleanup);

it("leaves global VN input unblocked and delegates return-to-title to the Host", async () => {
  const onReturnToTitle = vi.fn(async () => undefined);
  const history = createHistoryV1();
  render(
    <VnReferenceTourEndingSurfaceV1
      {...labelsV1}
      {...history}
      onReturnToTitle={onReturnToTitle}
    />,
  );

  const button = screen.getByRole("button", { name: "返回标题" });
  expect(document.activeElement).not.toBe(button);
  fireEvent.click(button);
  await vi.waitFor(() => expect(onReturnToTitle).toHaveBeenCalledOnce());
});

it("keeps the ending actionable when Host return fails", async () => {
  const onReturnToTitle = vi.fn(async () => {
    throw new Error("restart failed");
  });
  render(
    <VnReferenceTourEndingSurfaceV1
      {...labelsV1}
      {...createHistoryV1()}
      onReturnToTitle={onReturnToTitle}
    />,
  );

  fireEvent.click(screen.getByRole("button", { name: "返回标题" }));
  expect((await screen.findByRole("alert")).textContent).toBe(labelsV1.returnFailure);
  expect(screen.getByRole("button", { name: "返回标题" }).hasAttribute("disabled")).toBe(false);
});

it("returns from the ending through the same Back action used by the default VN player", () => {
  const history = createHistoryV1();
  render(
    <VnReferenceTourEndingSurfaceV1
      {...labelsV1}
      {...history}
      onReturnToTitle={async () => undefined}
    />,
  );

  fireEvent.click(screen.getByRole("button", { name: "回退" }));
  expect(history.toPrevious).toHaveBeenCalledOnce();

  expect(history.input.route({
    kind: "action",
    actionId: playerInputActionIdsV1.rollback,
  })).toEqual({ kind: "handled", context: "narrative" });
  expect(history.toPrevious).toHaveBeenCalledTimes(2);
});
