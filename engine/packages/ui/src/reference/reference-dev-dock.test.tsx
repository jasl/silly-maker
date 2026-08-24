// @vitest-environment jsdom
// SPDX-License-Identifier: MIT
import "@testing-library/jest-dom/vitest";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { startTransition, Suspense, useLayoutEffect, useState } from "react";
import type { ReactElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { RuntimeCapabilityPortV1 } from "@sillymaker/base";
import { createRuntimeCapabilityPortV1 } from "@sillymaker/base/runtime";
import {
  createDevDockContributionSetV1,
  type DevDockContributionSetV1,
  type DevDockPanelV1,
} from "../debug/dev-dock.tsx";
import { createDevDockControlV1, type DevDockControlV1 } from "../debug/dev-dock-control.ts";
import { createInputRouterV1 } from "../input/input-router.ts";
import { GameShell } from "../shell/game-shell.tsx";
import {
  bindDevDockContributionLifecycleInternalV1,
  disposeDevDockContributionLifecycleInternalV1,
} from "../composer/dev-dock-contribution-acceptance.ts";
import { ReferenceDevDockV1 } from "./reference-dev-dock.tsx";

afterEach(cleanup);

const disabledCapabilityStateV1 = Object.freeze({
  debugTools: false,
  cheats: false,
  automationBridge: false,
});

function mutableCapabilitiesV1(): RuntimeCapabilityPortV1 {
  return createRuntimeCapabilityPortV1({
    initialState: disabledCapabilityStateV1,
    persist: async () => Object.freeze({ kind: "committed" as const }),
  });
}

function deferredValueV1<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return Object.freeze({ promise, resolve });
}

function panelV1(id: string): DevDockPanelV1 {
  return Object.freeze({
    id,
    title: id,
    side: "right" as const,
    authority: "read_only" as const,
    render: () => <p>{id}</p>,
  });
}

const emptyContributionsV1 = createDevDockContributionSetV1({ panels: [] });

interface ReferenceDevDockHarnessPropsV1 {
  readonly capabilities: RuntimeCapabilityPortV1;
  readonly control?: DevDockControlV1;
  readonly contributions?: DevDockContributionSetV1;
  readonly load?: () => Promise<DevDockContributionSetV1>;
}

function ReferenceDevDockHarnessV1(props: ReferenceDevDockHarnessPropsV1): ReactElement {
  const inputRouter = createInputRouterV1();
  return (
    <GameShell
      accessibleName="Reference dock fixture"
      layers={Object.freeze({
        background: null,
        character: null,
        sceneInteraction: null,
        hud: null,
        narrative: null,
        wholeCanvas: null,
        workspaceOverlay: null,
        system: null,
      })}
      inputRouter={inputRouter}
      auxiliarySurface={
        <ReferenceDevDockV1
          capabilities={props.capabilities}
          contributions={props.contributions ?? emptyContributionsV1}
          inputRouter={inputRouter}
          {...(props.control === undefined ? {} : { control: props.control })}
          {...(props.load === undefined ? {} : { load: props.load })}
        />
      }
    />
  );
}

describe("ReferenceDevDockV1 progressive host", () => {
  it("waits for debug_tools, single-flights, merges static panels, and disposes on revoke", async () => {
    const capabilities = mutableCapabilitiesV1();
    const control = createDevDockControlV1();
    const loaded = deferredValueV1<DevDockContributionSetV1>();
    const dispose = vi.fn(async () => undefined);
    const lazy = bindDevDockContributionLifecycleInternalV1(
      createDevDockContributionSetV1({ panels: [panelV1("lazy.panel")] }),
      dispose,
    );
    const load = vi.fn(() => loaded.promise);
    render(
      <ReferenceDevDockHarnessV1
        capabilities={capabilities}
        control={control}
        contributions={createDevDockContributionSetV1({ panels: [panelV1("static.panel")] })}
        load={load}
      />,
    );

    await act(async () => await Promise.resolve());
    expect(load).not.toHaveBeenCalled();
    await act(async () => await capabilities.setEnabled("debug_tools", true));
    await waitFor(() => expect(load).toHaveBeenCalledOnce());
    await act(async () => await capabilities.setEnabled("debug_tools", true));
    expect(load).toHaveBeenCalledOnce();

    await act(async () => loaded.resolve(lazy));
    await waitFor(() => {
      expect(control.panels.getCurrent().map(({ id }) => id)).toEqual([
        "static.panel",
        "lazy.panel",
      ]);
    });

    await act(async () => await capabilities.setEnabled("debug_tools", false));
    await waitFor(() => expect(dispose).toHaveBeenCalledOnce());
    expect(control.panels.getCurrent()).toEqual([]);
    await disposeDevDockContributionLifecycleInternalV1(lazy);
    expect(dispose).toHaveBeenCalledOnce();
  });

  it("keeps the static surface live while a failed load offers an explicit retry", async () => {
    const capabilities = mutableCapabilitiesV1();
    const control = createDevDockControlV1();
    const retried = deferredValueV1<DevDockContributionSetV1>();
    const load = vi.fn<() => Promise<DevDockContributionSetV1>>()
      .mockRejectedValueOnce(new Error("private loader detail"))
      .mockImplementationOnce(() => retried.promise);
    render(
      <ReferenceDevDockHarnessV1
        capabilities={capabilities}
        control={control}
        contributions={createDevDockContributionSetV1({ panels: [panelV1("static.panel")] })}
        load={load}
      />,
    );

    await act(async () => await capabilities.setEnabled("debug_tools", true));
    const failure = await screen.findByRole("alert");
    expect(failure).toHaveTextContent("ui.devdock_contribution_load_failed");
    expect(failure).not.toHaveTextContent("private loader detail");
    expect(control.panels.getCurrent().map(({ id }) => id)).toEqual(["static.panel"]);

    await userEvent.setup().click(screen.getByRole("button", { name: "重试工具加载" }));
    expect(load).toHaveBeenCalledTimes(2);
    await act(async () =>
      retried.resolve(
        createDevDockContributionSetV1({ panels: [panelV1("retried.panel")] }),
      )
    );
    await waitFor(() => {
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
      expect(control.panels.getCurrent().map(({ id }) => id)).toEqual([
        "static.panel",
        "retried.panel",
      ]);
    });
  });

  it("fences and disposes an in-flight result when the declared source changes", async () => {
    const capabilities = mutableCapabilitiesV1();
    const control = createDevDockControlV1();
    const first = deferredValueV1<DevDockContributionSetV1>();
    const second = deferredValueV1<DevDockContributionSetV1>();
    const disposeFirst = vi.fn(async () => undefined);
    const firstResult = bindDevDockContributionLifecycleInternalV1(
      createDevDockContributionSetV1({ panels: [panelV1("first.panel")] }),
      disposeFirst,
    );
    const firstLoad = vi.fn(() => first.promise);
    const secondLoad = vi.fn(() => second.promise);
    const mounted = render(
      <ReferenceDevDockHarnessV1
        capabilities={capabilities}
        control={control}
        load={firstLoad}
      />,
    );
    await act(async () => await capabilities.setEnabled("debug_tools", true));
    await waitFor(() => expect(firstLoad).toHaveBeenCalledOnce());

    mounted.rerender(
      <ReferenceDevDockHarnessV1
        capabilities={capabilities}
        control={control}
        load={secondLoad}
      />,
    );
    await waitFor(() => expect(secondLoad).toHaveBeenCalledOnce());
    await act(async () => first.resolve(firstResult));
    await waitFor(() => expect(disposeFirst).toHaveBeenCalledOnce());
    expect(control.panels.getCurrent().some(({ id }) => id === "first.panel")).toBe(false);

    await act(async () =>
      second.resolve(
        createDevDockContributionSetV1({ panels: [panelV1("second.panel")] }),
      )
    );
    await waitFor(() => {
      expect(control.panels.getCurrent().map(({ id }) => id)).toEqual(["second.panel"]);
    });
  });

  it.each(["revoke", "unmount"] as const)(
    "disposes a late result after %s without publishing it",
    async (boundary) => {
      const capabilities = mutableCapabilitiesV1();
      const loaded = deferredValueV1<DevDockContributionSetV1>();
      const dispose = vi.fn(async () => undefined);
      const late = bindDevDockContributionLifecycleInternalV1(
        createDevDockContributionSetV1({ panels: [panelV1("late.panel")] }),
        dispose,
      );
      const mounted = render(
        <ReferenceDevDockHarnessV1 capabilities={capabilities} load={() => loaded.promise} />,
      );
      await act(async () => await capabilities.setEnabled("debug_tools", true));

      if (boundary === "revoke") {
        await act(async () => await capabilities.setEnabled("debug_tools", false));
      } else {
        mounted.unmount();
      }
      await act(async () => loaded.resolve(late));

      await waitFor(() => expect(dispose).toHaveBeenCalledOnce());
      expect(screen.queryByText("late.panel")).not.toBeInTheDocument();
    },
  );

  it("keeps loader currentness on the committed capability during an abandoned render", async () => {
    const committed = mutableCapabilitiesV1();
    await committed.setEnabled("debug_tools", true);
    const abandoned = mutableCapabilitiesV1();
    const control = createDevDockControlV1();
    const loaded = deferredValueV1<DevDockContributionSetV1>();
    const load = vi.fn(() => loaded.promise);
    const neverSettles = new Promise<never>(() => undefined);
    let attemptAbandonedRender: (() => void) | null = null;

    function SuspendedCandidateV1(props: { readonly active: boolean }): null {
      if (props.active) throw neverSettles;
      return null;
    }
    function CurrentnessHarnessV1(): ReactElement {
      const [capabilities, setCapabilities] = useState(committed);
      useLayoutEffect(() => {
        attemptAbandonedRender = () => startTransition(() => setCapabilities(abandoned));
        return () => {
          attemptAbandonedRender = null;
        };
      }, []);
      return (
        <Suspense fallback={null}>
          <ReferenceDevDockHarnessV1
            capabilities={capabilities}
            control={control}
            load={load}
          />
          <SuspendedCandidateV1 active={capabilities === abandoned} />
        </Suspense>
      );
    }

    render(<CurrentnessHarnessV1 />);
    await waitFor(() => expect(load).toHaveBeenCalledOnce());
    act(() => attemptAbandonedRender?.());
    await act(async () =>
      loaded.resolve(
        createDevDockContributionSetV1({ panels: [panelV1("committed.panel")] }),
      )
    );
    await waitFor(() => {
      expect(control.panels.getCurrent().map(({ id }) => id)).toEqual(["committed.panel"]);
    });
  });
});
