// @vitest-environment jsdom
// SPDX-License-Identifier: MIT
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  InstanceLeaseBannerV1,
  type InstanceLeaseBannerPortV1,
  type InstanceLeaseBannerStateV1,
} from "./instance-lease-banner.tsx";

afterEach(cleanup);

function fakePortV1(
  role: InstanceLeaseBannerStateV1["role"],
  takeOver = vi.fn(async () => undefined),
): InstanceLeaseBannerPortV1 {
  const state = Object.freeze({ role });
  return Object.freeze({
    state: Object.freeze({
      getCurrent: () => state,
      subscribe: () => () => undefined,
    }),
    takeOver,
  });
}

describe("InstanceLeaseBannerV1", () => {
  it("renders nothing while this window owns the save lease", () => {
    render(<InstanceLeaseBannerV1 port={fakePortV1("owner")} portalTarget={document.body} />);
    expect(document.querySelector("[data-instance-lease-banner]")).toBeNull();
  });

  it("shows the seized banner with a manual takeover action", async () => {
    const takeOver = vi.fn(async () => undefined);
    render(
      <InstanceLeaseBannerV1 port={fakePortV1("lost", takeOver)} portalTarget={document.body} />,
    );
    expect(screen.getByText(/存档已被另一个游戏窗口接管/u)).toBeVisible();
    await userEvent.setup().click(screen.getByRole("button", { name: "接管" }));
    await waitFor(() => expect(takeOver).toHaveBeenCalledOnce());
  });

  it("labels the waiting and read-only roles", () => {
    const waiting = render(
      <InstanceLeaseBannerV1 port={fakePortV1("waiting")} portalTarget={document.body} />,
    );
    expect(screen.getByText(/等待另一个游戏窗口退出/u)).toBeVisible();
    waiting.unmount();
    render(
      <InstanceLeaseBannerV1 port={fakePortV1("read_only")} portalTarget={document.body} />,
    );
    expect(screen.getByText(/另一个游戏窗口正在写档/u)).toBeVisible();
  });
});
