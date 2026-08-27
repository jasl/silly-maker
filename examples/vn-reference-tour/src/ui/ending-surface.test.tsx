// SPDX-License-Identifier: MIT
// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";

import { VnReferenceTourEndingSurfaceV1 } from "./ending-surface.tsx";

const labelsV1 = {
  title: "旧声入档",
  kicker: "播送完毕",
  summary: "信号已经安全收束。",
  returnLabel: "返回标题",
  returningLabel: "正在返回…",
  returnFailure: "暂时无法返回标题，请重试。",
};

afterEach(cleanup);

it("focuses the single ending action and delegates return-to-title to the Host", async () => {
  const onReturnToTitle = vi.fn(async () => undefined);
  render(<VnReferenceTourEndingSurfaceV1 {...labelsV1} onReturnToTitle={onReturnToTitle} />);

  const button = screen.getByRole("button", { name: "返回标题" });
  expect(document.activeElement).toBe(button);
  fireEvent.click(button);
  await vi.waitFor(() => expect(onReturnToTitle).toHaveBeenCalledOnce());
});

it("keeps the ending actionable when Host return fails", async () => {
  const onReturnToTitle = vi.fn(async () => {
    throw new Error("restart failed");
  });
  render(<VnReferenceTourEndingSurfaceV1 {...labelsV1} onReturnToTitle={onReturnToTitle} />);

  fireEvent.click(screen.getByRole("button", { name: "返回标题" }));
  expect((await screen.findByRole("alert")).textContent).toBe(labelsV1.returnFailure);
  expect(screen.getByRole("button", { name: "返回标题" }).hasAttribute("disabled")).toBe(false);
});
