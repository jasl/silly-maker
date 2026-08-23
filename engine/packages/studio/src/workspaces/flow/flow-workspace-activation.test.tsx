// @vitest-environment jsdom
// SPDX-License-Identifier: MIT
import "@testing-library/jest-dom/vitest";
import { useEffect } from "react";
import type { ReactElement } from "react";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { NarrativeFlowGraphV1 } from "../../core/binding.ts";
import {
  createFlowWorkspaceActivationOwnerInternalV1,
  flowWorkspaceActivationFailureCodeInternalV1,
  ProgressiveFlowWorkspaceHostInternalV1,
  useDisposeFlowWorkspaceActivationOnUnmountInternalV1,
} from "./flow-workspace-activation.tsx";
import type {
  FlowWorkspaceMountedExtensionInternalV1,
  FlowWorkspaceRenderInputInternalV1,
} from "./flow-workspace-activation.tsx";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const flowV1: NarrativeFlowGraphV1 = Object.freeze({
  nodes: Object.freeze([]),
  edges: Object.freeze([]),
});

function mountedWorkspaceV1(
  label: string,
  dispose: () => Promise<void> = () => Promise.resolve(),
): FlowWorkspaceMountedExtensionInternalV1 {
  return Object.freeze({
    consumer: Object.freeze({
      render(input: FlowWorkspaceRenderInputInternalV1) {
        return (
          <section data-testid={`flow-${label}`}>
            {label}:{String(input.flow.nodes.length)}
          </section>
        );
      },
    }),
    dispose,
  });
}

describe("progressive Flow workspace activation", () => {
  it("keeps the loader cold, single-flights one open, and reuses the ready consumer", async () => {
    let resolveLoad!: (mounted: FlowWorkspaceMountedExtensionInternalV1) => void;
    const load = vi.fn(() =>
      new Promise<FlowWorkspaceMountedExtensionInternalV1>((resolve) => {
        resolveLoad = resolve;
      })
    );
    const owner = createFlowWorkspaceActivationOwnerInternalV1({ load });
    let observerOpen: unknown = null;
    const unsubscribe = owner.subscribe(() => {
      if (owner.getState().kind === "loading" && observerOpen === null) {
        observerOpen = owner.open();
      }
    });
    render(
      <ProgressiveFlowWorkspaceHostInternalV1
        activation={owner}
        flow={flowV1}
        publicationRole="visible"
      />,
    );

    expect(screen.getByText("选择 Narrative 流程后开始加载。")).toBeVisible();
    expect(load).not.toHaveBeenCalled();

    const first = owner.open();
    const sameOpen = owner.open();
    expect(sameOpen).toBe(first);
    expect(observerOpen).toBe(first);
    await waitFor(() => expect(load).toHaveBeenCalledTimes(1));
    expect(screen.getByRole("status")).toHaveTextContent("正在加载 Narrative 流程");

    const mounted = mountedWorkspaceV1("ready");
    resolveLoad(mounted);
    await expect(first).resolves.toBe(mounted.consumer);
    await waitFor(() => expect(screen.getByTestId("flow-ready")).toBeVisible());

    await expect(owner.open()).resolves.toBe(mounted.consumer);
    expect(load).toHaveBeenCalledTimes(1);
    unsubscribe();
    await owner.dispose();
  });

  it("shows one bounded failure code, preserves resident siblings, and retries explicitly", async () => {
    const privateFailure = new Error("private module path and stack");
    const failures: unknown[] = [];
    let attempt = 0;
    const load = vi.fn(() => {
      attempt += 1;
      return attempt === 1
        ? Promise.reject(privateFailure)
        : Promise.resolve(mountedWorkspaceV1("recovered"));
    });
    const owner = createFlowWorkspaceActivationOwnerInternalV1({
      load,
      reportFailure: (error) => failures.push(error),
    });
    const user = userEvent.setup();
    render(
      <>
        <div data-testid="resident-scene">Scene remains mounted</div>
        <ProgressiveFlowWorkspaceHostInternalV1
          activation={owner}
          flow={flowV1}
          publicationRole="visible"
        />
      </>,
    );

    void owner.open().catch(() => undefined);
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(flowWorkspaceActivationFailureCodeInternalV1);
    expect(alert).not.toHaveTextContent(privateFailure.message);
    expect(screen.getByTestId("resident-scene")).toBeVisible();
    expect(failures).toEqual([privateFailure]);

    await user.click(screen.getByRole("button", { name: "重试 Narrative 流程" }));
    await waitFor(() => expect(screen.getByTestId("flow-recovered")).toBeVisible());
    expect(load).toHaveBeenCalledTimes(2);
    expect(screen.getByTestId("resident-scene")).toBeVisible();
    await owner.dispose();
  });

  it("keeps the probe failure surface read-only", async () => {
    const load = vi.fn(() => Promise.reject(new Error("unavailable")));
    const owner = createFlowWorkspaceActivationOwnerInternalV1({ load });
    await expect(owner.open()).rejects.toThrow("unavailable");

    render(
      <ProgressiveFlowWorkspaceHostInternalV1
        activation={owner}
        flow={flowV1}
        publicationRole="probe"
      />,
    );

    expect(screen.getByRole("alert")).toBeVisible();
    expect(screen.queryByRole("button", { name: "重试 Narrative 流程" })).toBeNull();
    expect(load).toHaveBeenCalledTimes(1);
    await owner.dispose();
  });

  it("fences a late load and disposes its lifecycle exactly once", async () => {
    let resolveLoad!: (mounted: FlowWorkspaceMountedExtensionInternalV1) => void;
    const lifecycleDispose = vi.fn(() => Promise.resolve());
    const owner = createFlowWorkspaceActivationOwnerInternalV1({
      load: () =>
        new Promise<FlowWorkspaceMountedExtensionInternalV1>((resolve) => {
          resolveLoad = resolve;
        }),
    });
    const activation = owner.open();
    void activation.catch(() => undefined);
    await Promise.resolve();

    const disposal = owner.dispose();
    expect(owner.dispose()).toBe(disposal);
    expect(owner.getState().kind).toBe("disposed");
    resolveLoad(mountedWorkspaceV1("late", lifecycleDispose));

    await disposal;
    await expect(activation).rejects.toThrow("stale");
    expect(lifecycleDispose).toHaveBeenCalledTimes(1);
    await owner.dispose();
    expect(lifecycleDispose).toHaveBeenCalledTimes(1);
  });

  it("rejects activation when a ready observer synchronously disposes the owner", async () => {
    const lifecycleDispose = vi.fn(() => Promise.resolve());
    const owner = createFlowWorkspaceActivationOwnerInternalV1({
      load: () => Promise.resolve(mountedWorkspaceV1("ready", lifecycleDispose)),
    });
    owner.subscribe(() => {
      if (owner.getState().kind === "ready") void owner.dispose();
    });

    await expect(owner.open()).rejects.toThrow("stale during ready publication");
    expect(owner.getState().kind).toBe("disposed");
    await owner.dispose();
    expect(lifecycleDispose).toHaveBeenCalledTimes(1);
  });

  it("retires standalone lifecycle only after descendant consumers unmount", async () => {
    const events: string[] = [];
    const owner = createFlowWorkspaceActivationOwnerInternalV1({
      load: () =>
        Promise.resolve(mountedWorkspaceV1("owned", () => {
          events.push("lifecycle:dispose");
          return Promise.resolve();
        })),
    });
    await owner.open();
    const view = render(<OwnedActivationProbeV1 activation={owner} events={events} />);

    view.unmount();
    await waitFor(() => {
      expect(events).toEqual(["consumer:unmount", "lifecycle:dispose"]);
    });
  });
});

function OwnedActivationProbeV1(props: {
  readonly activation: Parameters<
    typeof useDisposeFlowWorkspaceActivationOnUnmountInternalV1
  >[0];
  readonly events: string[];
}): ReactElement {
  useDisposeFlowWorkspaceActivationOnUnmountInternalV1(props.activation);
  return <FlowConsumerUnmountProbeV1 events={props.events} />;
}

function FlowConsumerUnmountProbeV1(props: { readonly events: string[] }): ReactElement {
  useEffect(() => {
    return () => {
      props.events.push("consumer:unmount");
    };
  }, [props.events]);
  return <div>Flow consumer</div>;
}
