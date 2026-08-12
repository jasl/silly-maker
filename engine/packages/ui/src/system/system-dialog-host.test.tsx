// @vitest-environment jsdom
// SPDX-License-Identifier: MIT
import "@testing-library/jest-dom/vitest";
import { parseNonNegativeSafeInteger } from "@sillymaker/base";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useLayoutEffect, useState } from "react";
import type { ReactElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createInputRouterV1 } from "../input/input-router.ts";
import { createManagedSurfaceCompositionRuntimeInternalV1 } from "../managed-surfaces/managed-surface-composition-runtime.ts";
import { GameStageV1 } from "../shell/game-stage.tsx";
import { systemDialogManagedContractInternalV1 } from "./system-dialog-managed-contract.ts";
import {
  createSystemDialogManagedSessionInternalV1,
  createSystemDialogSessionFacadeInternalV1,
} from "./system-dialog-managed-session.ts";
import {
  resolveSystemDialogConfirmationCopyInternalV1,
  SystemDialogHostV1,
  type SystemDialogCustomSavesRenderIntentsV1,
  type SystemDialogCustomSavesV1,
  useSystemDialogControllerV1,
} from "./system-dialog-host.tsx";

afterEach(cleanup);

function fixtureV1() {
  const inputRouter = createInputRouterV1();
  const runtime = createManagedSurfaceCompositionRuntimeInternalV1({
    epochAllocator: Object.freeze({
      allocate: () => parseNonNegativeSafeInteger(71),
    }),
    inputRouter,
    recipe: Object.freeze({
      resolvedOwnerIds: systemDialogManagedContractInternalV1.resolvedOwnerIds,
      resolvedSlotDescriptors: systemDialogManagedContractInternalV1.resolvedSlotDescriptors,
    }),
  });
  const internal = createSystemDialogManagedSessionInternalV1({
    runtime: runtime.getCurrent(),
    reportFailure: (code, error) => {
      throw new Error(code, { cause: error });
    },
  });
  const session = createSystemDialogSessionFacadeInternalV1(internal);
  return Object.freeze({
    inputRouter,
    runtime,
    internal,
    session,
    dispose(): void {
      internal.disposeInternalV1();
      runtime.dispose();
    },
  });
}

async function drainMicrotaskV1(): Promise<void> {
  await act(async () => {
    await new Promise<void>((complete) => queueMicrotask(complete));
  });
}

function ControllerButtonsV1(props: { readonly results: unknown[] }): ReactElement {
  const controller = useSystemDialogControllerV1();
  return (
    <>
      <button type="button" onClick={() => props.results.push(controller.openSettings())}>
        Open settings
      </button>
      <button type="button" onClick={() => props.results.push(controller.openSaves())}>
        Open saves
      </button>
    </>
  );
}

function PublicHostHarnessV1(props: {
  readonly fixture: ReturnType<typeof fixtureV1>;
  readonly results: unknown[];
  readonly saves?: SystemDialogCustomSavesV1;
}): ReactElement {
  return (
    <GameStageV1
      accessibleName="Public System Host test stage"
      layers={{
        background: <button type="button">Gameplay</button>,
        character: null,
        sceneInteraction: null,
        hud: null,
        narrative: null,
        wholeCanvas: <button type="button">Whole canvas</button>,
        workspaceOverlay: null,
        system: (
          <SystemDialogHostV1
            session={props.fixture.session}
            inputRouter={props.fixture.inputRouter}
            settings={Object.freeze({
              title: "Settings",
              closeLabel: "Close settings",
              sections: Object.freeze([<label key="volume">Volume</label>]),
              emptyText: "No settings",
            })}
            {...(props.saves === undefined ? {} : { saves: props.saves })}
          >
            <ControllerButtonsV1 results={props.results} />
          </SystemDialogHostV1>
        ),
      }}
    />
  );
}

describe("SystemDialogHostV1", () => {
  it("maps every closed confirmation invocation from the captured Save labels", () => {
    const labels = {
      slotNames: {
        "auto.current": "Current autosave",
        "auto.previous": "Previous autosave",
        quick: "Quick save",
        manualSlot: (index: number) => `Manual save ${index}`,
      },
      confirmation: {
        loadTitle: (slotName: string) => `load title:${slotName}`,
        loadDescription: (slotName: string) => `load description:${slotName}`,
        clearTitle: (slotName: string) => `clear title:${slotName}`,
        clearDescription: (slotName: string) => `clear description:${slotName}`,
        importTitle: "import title",
        importDescription: "import description",
      },
      recovery: {
        confirmation: {
          reanchorTitle: (slotName: string) => `reanchor title:${slotName}`,
          reanchorDescription: (slotName: string) => `reanchor description:${slotName}`,
          restoreTitle: (slotName: string) => `restore title:${slotName}`,
          restoreDescription: (slotName: string) => `restore description:${slotName}`,
          discardTitle: (slotName: string) => `discard title:${slotName}`,
          discardDescription: (slotName: string) => `discard description:${slotName}`,
        },
      },
    } satisfies Parameters<typeof resolveSystemDialogConfirmationCopyInternalV1>[0];

    expect(resolveSystemDialogConfirmationCopyInternalV1(labels, { kind: "import" })).toEqual({
      title: "import title",
      description: "import description",
    });
    expect(resolveSystemDialogConfirmationCopyInternalV1(labels, {
      kind: "load",
      slotId: "auto.current",
    })).toEqual({
      title: "load title:Current autosave",
      description: "load description:Current autosave",
    });
    expect(resolveSystemDialogConfirmationCopyInternalV1(labels, {
      kind: "clear",
      slotId: "manual.2",
    })).toEqual({
      title: "clear title:Manual save 2",
      description: "clear description:Manual save 2",
    });
    expect(resolveSystemDialogConfirmationCopyInternalV1(labels, {
      kind: "reanchor",
      slotId: "quick",
    })).toEqual({
      title: "reanchor title:Quick save",
      description: "reanchor description:Quick save",
    });
    expect(resolveSystemDialogConfirmationCopyInternalV1(labels, {
      kind: "restore",
      slotId: "auto.previous",
    })).toEqual({
      title: "restore title:Previous autosave",
      description: "restore description:Previous autosave",
    });
    expect(resolveSystemDialogConfirmationCopyInternalV1(labels, {
      kind: "discard",
      slotId: "manual.1",
    })).toEqual({
      title: "discard title:Manual save 1",
      description: "discard description:Manual save 1",
    });

    const legacyLabels = Object.freeze({
      slotNames: labels.slotNames,
      confirmation: labels.confirmation,
    });
    expect(resolveSystemDialogConfirmationCopyInternalV1(legacyLabels, {
      kind: "load",
      slotId: "quick",
    })).toEqual({
      title: "load title:Quick save",
      description: "load description:Quick save",
    });
    expect(() =>
      resolveSystemDialogConfirmationCopyInternalV1(legacyLabels, {
        kind: "reanchor",
        slotId: "quick",
      })
    ).toThrowError("ui.system_dialog_recovery_confirmation_missing");
  });

  it("requires the composition session and returns exact structured controller results", async () => {
    const fixture = fixtureV1();
    const results: unknown[] = [];
    const rendered = render(<PublicHostHarnessV1 fixture={fixture} results={results} />);
    await waitFor(() =>
      expect(screen.getByTestId("system-dialog-managed-host")).toBeInTheDocument()
    );
    const opener = screen.getByRole("button", { name: "Open settings" });
    const sameLayerContent = document.querySelector<HTMLElement>(
      '[data-system-dialog-host-content="true"]',
    )!;
    opener.focus();

    fireEvent.click(opener);

    expect(results).toEqual([{
      kind: "preparing",
      code: "system_dialog.preparation_started",
    }]);
    expect(fixture.session.getSnapshot()).toEqual({ active: null });
    expect(sameLayerContent).toHaveAttribute("inert");
    expect(sameLayerContent).toHaveAttribute("aria-hidden", "true");
    expect(screen.getByTestId("system-dialog-fallback")).toHaveFocus();
    expect(screen.getByTestId("stage-whole-canvas")).toHaveAttribute("inert");

    await drainMicrotaskV1();

    expect(fixture.session.getSnapshot()).toEqual({ active: "settings" });
    expect(screen.getByRole("dialog", { name: "Settings" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Settings" })).toBeVisible();
    expect(screen.getByText("Volume")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Close settings" }));
    expect(fixture.session.getSnapshot()).toEqual({ active: null });
    expect(sameLayerContent).not.toHaveAttribute("inert");
    expect(sameLayerContent).not.toHaveAttribute("aria-hidden");
    expect(screen.getByTestId("stage-whole-canvas")).not.toHaveAttribute("inert");
    await waitFor(() => expect(opener).toHaveFocus());

    rendered.unmount();
    fixture.dispose();
  });

  it("rejects an unconfigured Saves root before topology or same-layer mutation", async () => {
    const fixture = fixtureV1();
    const results: unknown[] = [];
    const rendered = render(<PublicHostHarnessV1 fixture={fixture} results={results} />);
    await waitFor(() =>
      expect(screen.getByTestId("system-dialog-managed-host")).toBeInTheDocument()
    );
    const before = fixture.internal.getManagedSnapshotInternalV1();

    fireEvent.click(screen.getByRole("button", { name: "Open saves" }));

    expect(results).toEqual([{
      kind: "rejected",
      code: "system_dialog.renderer_missing",
    }]);
    expect(fixture.internal.getManagedSnapshotInternalV1()).toBe(before);
    expect(fixture.session.getSnapshot()).toEqual({ active: null });
    expect(document.querySelector('[data-system-dialog-host-content="true"]')).not.toHaveAttribute(
      "inert",
    );

    rendered.unmount();
    fixture.dispose();
  });

  it("mounts a custom Saves component by identity and preserves it through ready cutover", async () => {
    const fixture = fixtureV1();
    const results: unknown[] = [];
    const renderedCount = vi.fn();
    const mounted = vi.fn();
    const unmounted = vi.fn();
    const receivedProps: SystemDialogCustomSavesRenderIntentsV1[] = [];
    function HookedCustomSavesV1(
      props: SystemDialogCustomSavesRenderIntentsV1,
    ): ReactElement {
      renderedCount();
      receivedProps.push(props);
      const [initial] = useState("hook state");
      useLayoutEffect(() => {
        mounted();
        return unmounted;
      }, []);
      return (
        <div>
          <input data-testid="custom-saves-input" defaultValue={initial} />
          <button type="button" onClick={props.close}>Close custom saves</button>
        </div>
      );
    }
    const saves = Object.freeze({
      kind: "custom" as const,
      accessibleName: "Custom saves",
      component: HookedCustomSavesV1,
    }) satisfies SystemDialogCustomSavesV1;
    const rendered = render(
      <PublicHostHarnessV1 fixture={fixture} results={results} saves={saves} />,
    );
    await waitFor(() =>
      expect(screen.getByTestId("system-dialog-managed-host")).toBeInTheDocument()
    );

    fireEvent.click(screen.getByRole("button", { name: "Open saves" }));
    const preparingInput = screen.getByTestId("custom-saves-input") as HTMLInputElement;
    preparingInput.value = "preserved through ready";
    expect(renderedCount).toHaveBeenCalledOnce();
    expect(mounted).toHaveBeenCalledOnce();
    expect(receivedProps).toHaveLength(1);
    expect(Object.keys(receivedProps[0]!)).toEqual(["close"]);

    await drainMicrotaskV1();

    expect(fixture.session.getSnapshot()).toEqual({ active: "saves" });
    expect(screen.getByRole("dialog", { name: "Custom saves" })).toBeVisible();
    expect(screen.getByTestId("custom-saves-input")).toBe(preparingInput);
    expect(preparingInput.value).toBe("preserved through ready");
    expect(renderedCount).toHaveBeenCalledOnce();
    expect(mounted).toHaveBeenCalledOnce();
    expect(unmounted).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Close custom saves" }));
    expect(fixture.session.getSnapshot()).toEqual({ active: null });
    expect(unmounted).toHaveBeenCalledOnce();

    rendered.unmount();
    fixture.dispose();
  });
});
