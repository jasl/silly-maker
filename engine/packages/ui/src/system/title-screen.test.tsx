// SPDX-License-Identifier: MIT
// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { useLayoutEffect, useRef } from "react";
import type { ReactElement, ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createInputRouterV1 } from "../input/input-router.ts";
import {
  createLocalManagedSurfaceEpochAllocatorInternalV1,
  createManagedSurfaceCompositionRuntimeInternalV1,
} from "../managed-surfaces/managed-surface-composition-runtime.ts";
import { GameStageV1 } from "../shell/game-stage.tsx";
import { SystemDialogHostV1 } from "./system-dialog-host.tsx";
import type { SystemDialogHostPropsV1 } from "./system-dialog-host.tsx";
import { systemDialogManagedContractInternalV1 } from "./system-dialog-managed-contract.ts";
import {
  createSystemDialogManagedSessionInternalV1,
  createSystemDialogSessionFacadeInternalV1,
} from "./system-dialog-managed-session.ts";
import { TitleScreenV1 } from "./title-screen.tsx";

afterEach(cleanup);

const labelsV1 = Object.freeze({
  newGameLabel: "New game",
  continueLabel: "Continue",
  loadGameLabel: "Load game",
  settingsLabel: "Settings",
});

function createSystemDialogFixtureV1() {
  const inputRouter = createInputRouterV1();
  const runtimeOwner = createManagedSurfaceCompositionRuntimeInternalV1({
    inputRouter,
    epochAllocator: createLocalManagedSurfaceEpochAllocatorInternalV1(),
    recipe: Object.freeze({
      resolvedOwnerIds: systemDialogManagedContractInternalV1.resolvedOwnerIds,
      resolvedSlotDescriptors: systemDialogManagedContractInternalV1.resolvedSlotDescriptors,
    }),
  });
  const internal = createSystemDialogManagedSessionInternalV1({
    runtime: runtimeOwner.getCurrent(),
  });
  return Object.freeze({
    inputRouter,
    session: createSystemDialogSessionFacadeInternalV1(internal),
    dispose(): void {
      internal.disposeInternalV1();
      runtimeOwner.dispose();
    },
  });
}

function TitleSystemHarnessV1(props: {
  readonly node: ReactNode;
  readonly saves?: SystemDialogHostPropsV1["saves"];
}): ReactElement {
  const fixtureRef = useRef<ReturnType<typeof createSystemDialogFixtureV1> | null>(null);
  fixtureRef.current ??= createSystemDialogFixtureV1();
  const fixture = fixtureRef.current;
  useLayoutEffect(() => () => fixture.dispose(), [fixture]);
  return (
    <GameStageV1
      accessibleName="Title System test stage"
      layers={Object.freeze({
        background: null,
        character: null,
        sceneInteraction: null,
        hud: null,
        workspaceOverlay: null,
        narrative: null,
        system: (
          <SystemDialogHostV1
            session={fixture.session}
            inputRouter={fixture.inputRouter}
            {...(props.saves === undefined ? {} : { saves: props.saves })}
            settings={Object.freeze({
              title: "Settings",
              closeLabel: "Close",
              sections: Object.freeze([]),
              emptyText: "Empty",
            })}
          >
            {props.node}
          </SystemDialogHostV1>
        ),
      })}
    />
  );
}

function renderTitleV1(node: ReactNode, saves?: SystemDialogHostPropsV1["saves"]) {
  return render(<TitleSystemHarnessV1 node={node} {...(saves === undefined ? {} : { saves })} />);
}

describe("TitleScreenV1", () => {
  it("routes custom Load through the typed System saves surface and restores focus on close", async () => {
    const CustomSavesV1 = vi.fn(({ close }: { readonly close: () => void }) => (
      <button type="button" onClick={close}>
        Close custom saves
      </button>
    ));
    renderTitleV1(
      <TitleScreenV1
        title="Synthetic Story"
        labels={labelsV1}
        onNewGame={vi.fn()}
        middleAction={Object.freeze({ kind: "load" })}
      />,
      Object.freeze({
        kind: "custom",
        accessibleName: "Custom saves",
        component: CustomSavesV1,
      }),
    );

    expect(screen.queryByRole("button", { name: "Continue" })).toBeNull();
    const load = screen.getByRole("button", { name: "Load game" });
    expect(load).toBeEnabled();
    await userEvent.setup().click(load);
    expect(CustomSavesV1).toHaveBeenCalled();
    expect(await screen.findByRole("dialog", { name: "Custom saves" })).toHaveAttribute(
      "data-system-dialog-root",
      "saves",
    );

    await userEvent.setup().click(screen.getByRole("button", { name: "Close custom saves" }));
    expect(screen.queryByRole("dialog", { name: "Custom saves" })).toBeNull();
    await waitFor(() => expect(load).toHaveFocus());
  });

  it("keeps Continue disabled until its runnable autosave contract is true", () => {
    renderTitleV1(
      <TitleScreenV1
        title="Synthetic Story"
        labels={labelsV1}
        onNewGame={vi.fn()}
        middleAction={Object.freeze({
          kind: "continue",
          available: false,
          onActivate: vi.fn(),
        })}
      />,
    );

    expect(screen.getByRole("button", { name: "Continue" })).toBeDisabled();
  });
});
