// @vitest-environment jsdom
// SPDX-License-Identifier: MIT
import "@testing-library/jest-dom/vitest";
import { act, cleanup, render, screen, waitFor, within } from "@testing-library/react";
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
import { registerEmbeddedAuthoringLauncherInternalV1 } from "../internal/embedded-authoring-launcher.ts";
import { GameShell } from "../shell/game-shell.tsx";
import type {
  DevDockContributionPublicationPortV1,
  DevDockContributionPublicationV1,
} from "./dev-dock-contribution-publication.ts";
import { ReferenceDevDockV1 } from "./reference-dev-dock.tsx";
import type { DevDockContributionLoadHandleV1 } from "./reference-dev-dock.tsx";

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
  readonly contributionPublication?: DevDockContributionPublicationPortV1;
  readonly load?: () => Promise<DevDockContributionLoadHandleV1>;
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
          {...(props.contributionPublication === undefined
            ? {}
            : { contributionPublication: props.contributionPublication })}
          inputRouter={inputRouter}
          {...(props.control === undefined ? {} : { control: props.control })}
          {...(props.load === undefined ? {} : { load: props.load })}
        />
      }
    />
  );
}

function mutableContributionPublicationV1(
  initial: DevDockContributionPublicationV1,
  acknowledgeCommitted: (publication: DevDockContributionPublicationV1) => void,
): {
  readonly port: DevDockContributionPublicationPortV1;
  publish(publication: DevDockContributionPublicationV1): void;
} {
  let current = initial;
  const listeners = new Set<() => void>();
  return {
    port: {
      getCurrent: () => current,
      subscribe(listener) {
        listeners.add(listener);
        return () => listeners.delete(listener);
      },
      acknowledgeCommitted,
    },
    publish(publication) {
      current = publication;
      for (const listener of [...listeners]) listener();
    },
  };
}

describe("ReferenceDevDockV1 progressive host", () => {
  it("commits dynamic contributions, closes removed windows before acknowledgment, and does not reopen them", async () => {
    const capabilities = mutableCapabilitiesV1();
    const control = createDevDockControlV1();
    const hiddenDuplicate: DevDockContributionPublicationV1 = {
      contributions: createDevDockContributionSetV1({ panels: [panelV1("static.panel")] }),
    };
    const first: DevDockContributionPublicationV1 = {
      contributions: createDevDockContributionSetV1({ panels: [panelV1("dynamic.first")] }),
    };
    const acknowledgments: Array<{
      readonly publication: DevDockContributionPublicationV1;
      readonly openPanelIds: readonly string[];
      readonly registeredPanelIds: readonly string[];
    }> = [];
    const publication = mutableContributionPublicationV1(hiddenDuplicate, (committed) => {
      acknowledgments.push({
        publication: committed,
        openPanelIds: [...control.openPanelIds.getCurrent()],
        registeredPanelIds: control.panels.getCurrent().map(({ id }) => id),
      });
    });
    render(
      <ReferenceDevDockHarnessV1
        capabilities={capabilities}
        control={control}
        contributions={createDevDockContributionSetV1({ panels: [panelV1("static.panel")] })}
        contributionPublication={publication.port}
      />,
    );

    // A publication is neither merged nor acknowledged until the real
    // DevDock consumer exists. A hidden duplicate cannot break authoring-only
    // development UI.
    expect(control.panels.getCurrent()).toEqual([]);
    expect(acknowledgments).toEqual([]);
    act(() => publication.publish(first));
    expect(acknowledgments).toEqual([]);
    await act(async () => await capabilities.setEnabled("debug_tools", true));

    await waitFor(() => {
      expect(control.panels.getCurrent().map(({ id }) => id)).toEqual([
        "static.panel",
        "dynamic.first",
      ]);
      expect(acknowledgments).toHaveLength(1);
    });
    expect(acknowledgments[0]?.publication).toBe(first);

    act(() => control.open("dynamic.first"));
    expect(await screen.findByRole("dialog", { name: "dynamic.first" })).toBeVisible();
    expect(acknowledgments).toHaveLength(1);

    const second: DevDockContributionPublicationV1 = {
      contributions: createDevDockContributionSetV1({ panels: [panelV1("dynamic.second")] }),
    };
    act(() => publication.publish(second));
    await waitFor(() => expect(acknowledgments).toHaveLength(2));
    expect(acknowledgments[1]).toEqual({
      publication: second,
      openPanelIds: [],
      registeredPanelIds: ["static.panel", "dynamic.second"],
    });
    expect(screen.queryByRole("dialog", { name: "dynamic.first" })).not.toBeInTheDocument();

    const third: DevDockContributionPublicationV1 = {
      contributions: createDevDockContributionSetV1({ panels: [panelV1("dynamic.first")] }),
    };
    act(() => publication.publish(third));
    await waitFor(() => expect(acknowledgments).toHaveLength(3));
    expect(acknowledgments[2]?.publication).toBe(third);
    expect(control.openPanelIds.getCurrent()).toEqual([]);
    expect(screen.queryByRole("dialog", { name: "dynamic.first" })).not.toBeInTheDocument();
  });

  it("renders one capability-shaped development panel across authoring and debug combinations", async () => {
    const authoringOnlyCapabilities = mutableCapabilitiesV1();
    const activateAuthoringOnly = vi.fn();
    const unregisterAuthoringOnly = registerEmbeddedAuthoringLauncherInternalV1(
      document,
      activateAuthoringOnly,
    );
    const authoringOnly = render(
      <ReferenceDevDockHarnessV1 capabilities={authoringOnlyCapabilities} />,
    );
    const authoringOnlyPanel = screen.getByRole("group", { name: "开发工具" });
    expect(authoringOnlyPanel).toHaveAttribute("data-devdock-chip", "true");
    expect(
      within(authoringOnlyPanel).getByRole("button", {
        name: "打开内嵌制作",
      }),
    ).toBeVisible();
    expect(within(authoringOnlyPanel).queryByRole("button", { name: "调试" })).toBeNull();
    await userEvent.setup().click(
      within(authoringOnlyPanel).getByRole("button", { name: "打开内嵌制作" }),
    );
    expect(activateAuthoringOnly).toHaveBeenCalledOnce();
    authoringOnly.unmount();
    unregisterAuthoringOnly();

    const debugOnlyCapabilities = mutableCapabilitiesV1();
    await act(async () => await debugOnlyCapabilities.setEnabled("debug_tools", true));
    const debugOnly = render(
      <ReferenceDevDockHarnessV1 capabilities={debugOnlyCapabilities} />,
    );
    const debugOnlyPanel = screen.getByRole("group", { name: "开发工具" });
    expect(within(debugOnlyPanel).getByRole("button", { name: "调试" })).toBeVisible();
    expect(
      within(debugOnlyPanel).queryByRole("button", {
        name: "打开内嵌制作",
      }),
    ).toBeNull();
    debugOnly.unmount();

    const bothCapabilities = mutableCapabilitiesV1();
    await act(async () => await bothCapabilities.setEnabled("debug_tools", true));
    const unregisterBoth = registerEmbeddedAuthoringLauncherInternalV1(
      document,
      vi.fn(),
    );
    const both = render(<ReferenceDevDockHarnessV1 capabilities={bothCapabilities} />);
    const combinedPanel = screen.getByRole("group", { name: "开发工具" });
    expect(
      within(combinedPanel).getByRole("button", {
        name: "打开内嵌制作",
      }),
    ).toBeVisible();
    expect(within(combinedPanel).getByRole("button", { name: "调试" })).toBeVisible();
    expect(document.querySelectorAll("[data-development-tool-panel]")).toHaveLength(1);
    both.unmount();
    unregisterBoth();

    const neither = render(
      <ReferenceDevDockHarnessV1 capabilities={mutableCapabilitiesV1()} />,
    );
    expect(document.querySelector("[data-development-tool-panel]")).toBeNull();
    neither.unmount();
  });

  it("keeps authoring available while a runtime debug revocation removes debug UI", async () => {
    const capabilities = mutableCapabilitiesV1();
    await act(async () => await capabilities.setEnabled("debug_tools", true));
    const control = createDevDockControlV1();
    const unregister = registerEmbeddedAuthoringLauncherInternalV1(document, vi.fn());
    render(
      <ReferenceDevDockHarnessV1 capabilities={capabilities} control={control} />,
    );
    control.open("panel.pending");
    expect(screen.getByRole("button", { name: "调试" })).toBeVisible();

    await act(async () => await capabilities.setEnabled("debug_tools", false));
    await waitFor(() => {
      expect(screen.queryByRole("button", { name: "调试" })).toBeNull();
      expect(screen.getByRole("button", { name: "打开内嵌制作" })).toBeVisible();
      expect(control.openPanelIds.getCurrent()).toEqual([]);
    });
    await act(async () => await capabilities.setEnabled("debug_tools", true));
    expect(screen.getByRole("button", { name: "调试" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
    unregister();
  });

  it("loads on first launcher expansion, single-flights, caches, and disposes on revoke", async () => {
    const capabilities = mutableCapabilitiesV1();
    const control = createDevDockControlV1();
    const loaded = deferredValueV1<DevDockContributionLoadHandleV1>();
    const dispose = vi.fn(async () => undefined);
    const acknowledgeCommitted = vi.fn();
    const lazy: DevDockContributionLoadHandleV1 = {
      contributions: createDevDockContributionSetV1({ panels: [panelV1("lazy.panel")] }),
      acknowledgeCommitted,
      dispose,
    };
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
    const user = userEvent.setup();
    const launcher = screen.getByRole("button", { name: "调试" });
    expect(launcher).toHaveAttribute("aria-expanded", "false");
    expect(load).not.toHaveBeenCalled();

    await user.click(launcher);
    await waitFor(() => expect(load).toHaveBeenCalledOnce());
    await user.click(launcher);
    await user.click(launcher);
    expect(load).toHaveBeenCalledOnce();

    await act(async () => loaded.resolve(lazy));
    await waitFor(() => {
      expect(control.panels.getCurrent().map(({ id }) => id)).toEqual([
        "static.panel",
        "lazy.panel",
      ]);
    });
    expect(acknowledgeCommitted).toHaveBeenCalledOnce();
    await user.click(launcher);
    await user.click(launcher);
    expect(load).toHaveBeenCalledOnce();

    await act(async () => await capabilities.setEnabled("debug_tools", false));
    await waitFor(() => expect(dispose).toHaveBeenCalledOnce());
    expect(control.panels.getCurrent()).toEqual([]);
  });

  it("keeps the static surface live while a failed load offers an explicit retry", async () => {
    const capabilities = mutableCapabilitiesV1();
    const control = createDevDockControlV1();
    const retried = deferredValueV1<DevDockContributionLoadHandleV1>();
    const load = vi.fn<() => Promise<DevDockContributionLoadHandleV1>>()
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
    await userEvent.setup().click(screen.getByRole("button", { name: "调试" }));
    const failure = await screen.findByRole("alert");
    expect(failure).toHaveAttribute("data-silly-tool-surface", "true");
    expect(failure).toHaveTextContent("ui.devdock_contribution_load_failed");
    expect(failure).not.toHaveTextContent("private loader detail");
    expect(control.panels.getCurrent().map(({ id }) => id)).toEqual(["static.panel"]);

    await userEvent.setup().click(screen.getByRole("button", { name: "重试工具加载" }));
    expect(load).toHaveBeenCalledTimes(2);
    await act(async () =>
      retried.resolve(
        {
          contributions: createDevDockContributionSetV1({
            panels: [panelV1("retried.panel")],
          }),
        },
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

  it("disposes a rejected load handle without acknowledging or publishing it", async () => {
    const capabilities = mutableCapabilitiesV1();
    const control = createDevDockControlV1();
    const acknowledgeCommitted = vi.fn();
    const dispose = vi.fn(async () => undefined);
    const load = vi.fn(async (): Promise<DevDockContributionLoadHandleV1> => ({
      contributions: {
        panels: [panelV1("static.panel")],
      },
      acknowledgeCommitted,
      dispose,
    }));
    render(
      <ReferenceDevDockHarnessV1
        capabilities={capabilities}
        control={control}
        contributions={createDevDockContributionSetV1({ panels: [panelV1("static.panel")] })}
        load={load}
      />,
    );

    await act(async () => await capabilities.setEnabled("debug_tools", true));
    await userEvent.setup().click(screen.getByRole("button", { name: "调试" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "ui.devdock_contribution_load_failed",
    );
    await waitFor(() => expect(dispose).toHaveBeenCalledOnce());
    expect(acknowledgeCommitted).not.toHaveBeenCalled();
    expect(control.panels.getCurrent().map(({ id }) => id)).toEqual(["static.panel"]);
  });

  it("contains a synchronous disposal failure and can release the next selected handle", async () => {
    const capabilities = mutableCapabilitiesV1();
    const control = createDevDockControlV1();
    const disposeFirst = vi.fn(() => {
      throw new Error("private disposer detail");
    });
    const disposeSecond = vi.fn();
    const load = vi.fn<() => Promise<DevDockContributionLoadHandleV1>>()
      .mockResolvedValueOnce({
        contributions: createDevDockContributionSetV1({ panels: [panelV1("first.panel")] }),
        dispose: disposeFirst,
      })
      .mockResolvedValueOnce({
        contributions: createDevDockContributionSetV1({ panels: [panelV1("second.panel")] }),
        dispose: disposeSecond,
      });
    render(
      <ReferenceDevDockHarnessV1
        capabilities={capabilities}
        control={control}
        load={load}
      />,
    );

    await act(async () => await capabilities.setEnabled("debug_tools", true));
    await userEvent.setup().click(screen.getByRole("button", { name: "调试" }));
    await waitFor(() => expect(control.panels.getCurrent()[0]?.id).toBe("first.panel"));
    await act(async () => await capabilities.setEnabled("debug_tools", false));
    await waitFor(() => expect(disposeFirst).toHaveBeenCalledOnce());

    await act(async () => await capabilities.setEnabled("debug_tools", true));
    await userEvent.setup().click(screen.getByRole("button", { name: "调试" }));
    await waitFor(() => expect(control.panels.getCurrent()[0]?.id).toBe("second.panel"));
    await act(async () => await capabilities.setEnabled("debug_tools", false));
    await waitFor(() => expect(disposeSecond).toHaveBeenCalledOnce());
    expect(load).toHaveBeenCalledTimes(2);
  });

  it("fences and disposes an in-flight result when the declared source changes", async () => {
    const capabilities = mutableCapabilitiesV1();
    const control = createDevDockControlV1();
    const first = deferredValueV1<DevDockContributionLoadHandleV1>();
    const second = deferredValueV1<DevDockContributionLoadHandleV1>();
    const disposeFirst = vi.fn(async () => undefined);
    const firstResult: DevDockContributionLoadHandleV1 = {
      contributions: createDevDockContributionSetV1({ panels: [panelV1("first.panel")] }),
      dispose: disposeFirst,
    };
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
    await userEvent.setup().click(screen.getByRole("button", { name: "调试" }));
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
        {
          contributions: createDevDockContributionSetV1({
            panels: [panelV1("second.panel")],
          }),
        },
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
      const loaded = deferredValueV1<DevDockContributionLoadHandleV1>();
      const dispose = vi.fn(async () => undefined);
      const late: DevDockContributionLoadHandleV1 = {
        contributions: createDevDockContributionSetV1({ panels: [panelV1("late.panel")] }),
        dispose,
      };
      const control = createDevDockControlV1();
      const load = vi.fn(() => loaded.promise);
      const mounted = render(
        <ReferenceDevDockHarnessV1
          capabilities={capabilities}
          control={control}
          load={load}
        />,
      );
      await act(async () => await capabilities.setEnabled("debug_tools", true));
      act(() => control.open("late.panel"));
      await waitFor(() => expect(load).toHaveBeenCalledOnce());

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
    const loaded = deferredValueV1<DevDockContributionLoadHandleV1>();
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
    expect(load).not.toHaveBeenCalled();
    act(() => control.open("committed.panel"));
    await waitFor(() => expect(load).toHaveBeenCalledOnce());
    act(() => attemptAbandonedRender?.());
    await act(async () =>
      loaded.resolve(
        {
          contributions: createDevDockContributionSetV1({
            panels: [panelV1("committed.panel")],
          }),
        },
      )
    );
    await waitFor(() => {
      expect(control.panels.getCurrent().map(({ id }) => id)).toEqual(["committed.panel"]);
    });
  });
});
