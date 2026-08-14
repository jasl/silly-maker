// @vitest-environment jsdom
// SPDX-License-Identifier: MIT
import "@testing-library/jest-dom/vitest";
import { parseNonNegativeSafeInteger } from "@sillymaker/base";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { useEffect, useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  DevDockPortalCoordinatorV1,
  useDevDockPortalTargetV1,
} from "../debug/dev-dock-portal-coordinator.tsx";
import {
  inputHandledV1,
  parseInputActionIdV1,
  systemInputActionIdsV1,
} from "../input/contracts.ts";
import { createInputRouterV1 } from "../input/input-router.ts";
import {
  createLocalManagedSurfaceEpochAllocatorInternalV1,
  createManagedSurfaceCompositionRuntimeInternalV1,
  type ManagedSurfaceCompositionRuntimeInternalV1,
} from "../managed-surfaces/managed-surface-composition-runtime.ts";
import { GameStageV1 } from "../shell/game-stage.tsx";
import { systemDialogManagedContractInternalV1 } from "../system/system-dialog-managed-contract.ts";
import {
  createSystemDialogManagedSessionInternalV1,
  createSystemDialogRootCatalogSnapshotInternalV1,
} from "../system/system-dialog-managed-session.ts";
import type { OverlayRendererResolverV1, OverlayRendererResolutionV1 } from "./overlay-host.tsx";
import { OverlayHostV1 } from "./overlay-host.tsx";
import {
  createWorkspaceOverlaySessionConfigurationInternalV1,
  createWorkspaceOverlaySessionInternalV1 as createWorkspaceOverlaySessionWithRuntimeInternalV1,
  defineWorkspaceOverlayV1,
  type CreateWorkspaceOverlaySessionConfigurationInternalInputV1,
  type WorkspaceOverlaySessionInternalV1,
} from "./workspace-overlay-session.ts";

afterEach(cleanup);

type OverlayIdV1 =
  | "overlay.test.inventory"
  | "overlay.test.ingredient"
  | "overlay.test.supplier"
  | "overlay.test.unknown"
  | "overlay.test.locked";

const overlayDefinitionsV1 = Object.freeze([
  defineWorkspaceOverlayV1({ id: "overlay.test.inventory", contractRevision: 1 }),
  defineWorkspaceOverlayV1({ id: "overlay.test.ingredient", contractRevision: 1 }),
  defineWorkspaceOverlayV1({ id: "overlay.test.supplier", contractRevision: 1 }),
  defineWorkspaceOverlayV1({ id: "overlay.test.unknown", contractRevision: 1 }),
  defineWorkspaceOverlayV1({
    id: "overlay.test.locked",
    contractRevision: 1,
    dismissible: false,
  }),
]);

interface CreateWorkspaceOverlayTestSessionInputV1<TOverlayId extends string>
  extends CreateWorkspaceOverlaySessionConfigurationInternalInputV1<TOverlayId> {
  readonly inputRouter: ReturnType<typeof createInputRouterV1>;
  readonly epochAllocator: Parameters<
    typeof createManagedSurfaceCompositionRuntimeInternalV1
  >[0]["epochAllocator"];
}

const workspaceOverlayRuntimeOwnersV1 = new WeakMap<
  object,
  ManagedSurfaceCompositionRuntimeInternalV1
>();

function createWorkspaceOverlaySessionInternalV1<TOverlayId extends string>(
  input: CreateWorkspaceOverlayTestSessionInputV1<TOverlayId>,
): WorkspaceOverlaySessionInternalV1<TOverlayId> {
  const configuration = createWorkspaceOverlaySessionConfigurationInternalV1({
    definitions: input.definitions,
    ...(input.availablePorts === undefined ? {} : { availablePorts: input.availablePorts }),
    ...(input.reportFailure === undefined ? {} : { reportFailure: input.reportFailure }),
  });
  const runtimeOwner = createManagedSurfaceCompositionRuntimeInternalV1({
    inputRouter: input.inputRouter,
    epochAllocator: input.epochAllocator,
    recipe: configuration.recipeContribution,
  });
  const session = createWorkspaceOverlaySessionWithRuntimeInternalV1({
    runtime: runtimeOwner.getCurrent(),
    configuration,
  });
  workspaceOverlayRuntimeOwnersV1.set(session, runtimeOwner);
  return session;
}

function resolutionV1(accessibleName: string, content: OverlayRendererResolutionV1["content"]) {
  return Object.freeze({ accessibleName, content });
}

function createResolverV1(
  store: WorkspaceOverlaySessionInternalV1<OverlayIdV1>,
): OverlayRendererResolverV1<OverlayIdV1> {
  const resolver: OverlayRendererResolverV1<OverlayIdV1> = {
    resolve(id: OverlayIdV1) {
      switch (id) {
        case "overlay.test.inventory":
          return resolutionV1(
            "背包",
            <button
              type="button"
              onClick={() => store.pushDetail("overlay.test.ingredient")}
            >
              食材详情
            </button>,
          );
        case "overlay.test.locked":
          return resolutionV1(
            "锁定教程",
            <button
              type="button"
              onClick={() => store.pushDetail("overlay.test.ingredient")}
            >
              下一步
            </button>,
          );
        case "overlay.test.ingredient":
          return resolutionV1(
            "食材详情",
            <button
              type="button"
              onClick={() => store.pushDetail("overlay.test.supplier")}
            >
              供应商详情
            </button>,
          );
        case "overlay.test.supplier":
          return resolutionV1("供应商详情", <p>供应商内容</p>);
        case "overlay.test.unknown":
          return null;
      }
      return null;
    },
  };
  return Object.freeze(resolver);
}

function createOverlaySessionStoreV1(
  inputRouter = createInputRouterV1(),
): WorkspaceOverlaySessionInternalV1<OverlayIdV1> {
  const session = createWorkspaceOverlaySessionInternalV1({
    inputRouter,
    epochAllocator: createLocalManagedSurfaceEpochAllocatorInternalV1(),
    definitions: overlayDefinitionsV1,
  });
  session.attachRendererResolverInternalV1(createResolverV1(session));
  return session;
}

function createSharedSystemOverlayFixtureV1() {
  const inputRouter = createInputRouterV1();
  const configuration = createWorkspaceOverlaySessionConfigurationInternalV1({
    definitions: overlayDefinitionsV1,
  });
  const runtimeOwner = createManagedSurfaceCompositionRuntimeInternalV1({
    inputRouter,
    epochAllocator: createLocalManagedSurfaceEpochAllocatorInternalV1(),
    recipe: Object.freeze({
      resolvedOwnerIds: Object.freeze([
        ...configuration.recipeContribution.resolvedOwnerIds,
        ...systemDialogManagedContractInternalV1.resolvedOwnerIds,
      ]),
      resolvedSlotDescriptors: Object.freeze([
        ...configuration.recipeContribution.resolvedSlotDescriptors,
        ...systemDialogManagedContractInternalV1.resolvedSlotDescriptors,
      ]),
    }),
  });
  const overlay = createWorkspaceOverlaySessionWithRuntimeInternalV1({
    runtime: runtimeOwner.getCurrent(),
    configuration,
  });
  const system = createSystemDialogManagedSessionInternalV1({
    runtime: runtimeOwner.getCurrent(),
  });
  system.attachHostInternalV1({
    hostIdentity: Object.freeze({ kind: "shared-system-test-host" }),
    portalContainer: Object.freeze({ kind: "shared-system-test-portal" }),
    catalog: createSystemDialogRootCatalogSnapshotInternalV1({
      entries: Object.freeze([
        Object.freeze({
          rootRequest: "settings" as const,
          rendererComponent: Object.freeze({ kind: "settings-renderer" }),
          accessibleName: "Settings",
          requiredPortIds: Object.freeze([]),
          contentConfig: Object.freeze({
            title: "Settings",
            closeLabel: "Close",
            emptyText: "Empty",
            sections: Object.freeze([]),
          }),
        }),
      ]),
      portBindings: Object.freeze([]),
    }),
  });
  return Object.freeze({
    inputRouter,
    overlay,
    system,
    dispose(): void {
      overlay.detachRuntimeInternalV1();
      system.detachRuntimeInternalV1();
      runtimeOwner.dispose();
      overlay.disposeInternalV1();
      system.disposeInternalV1();
    },
  });
}

async function openReadyV1(
  session: WorkspaceOverlaySessionInternalV1<OverlayIdV1>,
  id: OverlayIdV1,
): Promise<void> {
  expect(session.openPrimary(id)).toMatchObject({ kind: "preparing" });
  const candidate = session.getRenderSnapshotInternalV1().entries.find(
    (entry) => entry.readiness === "preparing",
  )!;
  await session.beginCandidatePreparationInternalV1(candidate.surfaceInstanceId);
}

async function pushReadyV1(
  session: WorkspaceOverlaySessionInternalV1<OverlayIdV1>,
  id: OverlayIdV1,
): Promise<void> {
  expect(session.pushDetail(id)).toMatchObject({ kind: "preparing" });
  const candidate = session.getRenderSnapshotInternalV1().entries.find(
    (entry) => entry.readiness === "preparing",
  )!;
  await session.beginCandidatePreparationInternalV1(candidate.surfaceInstanceId);
}

function rejectedPreparationV1() {
  let reject!: (error: unknown) => void;
  const promise = new Promise<void>((_resolve, rejectPromise) => {
    reject = rejectPromise;
  });
  return Object.freeze({ promise, reject });
}

function pendingPreparationV1() {
  let settle!: () => void;
  const promise = new Promise<void>((resolvePromise) => {
    settle = resolvePromise;
  });
  return Object.freeze({ promise, resolve: settle });
}

function OverlayHarnessV1() {
  const inputRouter = createInputRouterV1();
  const store = createOverlaySessionStoreV1(inputRouter);
  const rendererResolver = createResolverV1(store);
  return (
    <div>
      <button type="button" onClick={() => store.openPrimary("overlay.test.inventory")}>
        打开背包
      </button>
      <OverlayHostV1
        session={store}
        rendererResolver={rendererResolver}
        inputRouter={inputRouter}
        closeLabel="关闭"
      />
    </div>
  );
}

function DevDockPortalSelectionProbeV1() {
  const { surface, target } = useDevDockPortalTargetV1();
  return (
    <output
      data-testid="devdock-portal-selection"
      data-surface={surface}
      data-target-scope={target?.dataset.blockingFocusScope ?? "none"}
      data-target-overlay-depth={target?.dataset.overlayDepth ?? "none"}
    />
  );
}

describe("OverlayHostV1", () => {
  it("uses the fresh Coordinator instance as the React identity on primary replacement", async () => {
    type EditorOverlayIdV1 = "overlay.test.editor-a" | "overlay.test.editor-b";
    function EditorV1(props: { readonly id: EditorOverlayIdV1 }) {
      const [draft, setDraft] = useState("");
      return (
        <>
          <label>
            {props.id}
            <input
              aria-label={`draft:${props.id}`}
              value={draft}
              onChange={(event) => setDraft(event.currentTarget.value)}
            />
          </label>
          <button type="button">secondary:{props.id}</button>
        </>
      );
    }
    const inputRouter = createInputRouterV1();
    const session = createWorkspaceOverlaySessionInternalV1<EditorOverlayIdV1>({
      inputRouter,
      epochAllocator: createLocalManagedSurfaceEpochAllocatorInternalV1(),
      definitions: Object.freeze([
        defineWorkspaceOverlayV1({ id: "overlay.test.editor-a", contractRevision: 1 }),
        defineWorkspaceOverlayV1({ id: "overlay.test.editor-b", contractRevision: 1 }),
      ]),
    });
    const resolver = Object.freeze({
      resolve: (id: EditorOverlayIdV1) =>
        Object.freeze({ accessibleName: id, content: <EditorV1 id={id} /> }),
    });
    render(
      <>
        <button type="button" onClick={() => session.openPrimary("overlay.test.editor-a")}>
          open editor
        </button>
        <OverlayHostV1
          session={session}
          rendererResolver={resolver}
          inputRouter={inputRouter}
          closeLabel="close"
        />
      </>,
    );
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "open editor" }));
    const firstDialog = await screen.findByRole("dialog", { name: "overlay.test.editor-a" });
    const firstInstanceId = firstDialog.getAttribute("data-overlay-instance");
    const firstDraft = screen.getByRole("textbox", { name: "draft:overlay.test.editor-a" });
    await user.type(firstDraft, "dirty");
    const secondary = screen.getByRole("button", { name: "secondary:overlay.test.editor-a" });
    secondary.focus();

    act(() => {
      session.openPrimary("overlay.test.editor-b");
    });
    const secondDialog = await screen.findByRole("dialog", { name: "overlay.test.editor-b" });
    expect(secondDialog.getAttribute("data-overlay-instance")).not.toBe(firstInstanceId);
    expect(screen.getByRole("textbox", { name: "draft:overlay.test.editor-b" })).toHaveValue("");
    expect(screen.getByRole("textbox", { name: "draft:overlay.test.editor-b" })).toHaveFocus();
  });

  it("focuses the code-native initial fallback and restores the opener on failure", async () => {
    const preparation = rejectedPreparationV1();
    const inputRouter = createInputRouterV1();
    const session = createWorkspaceOverlaySessionInternalV1({
      inputRouter,
      epochAllocator: createLocalManagedSurfaceEpochAllocatorInternalV1(),
      definitions: Object.freeze([
        defineWorkspaceOverlayV1({ id: "overlay.test.initial-failure", contractRevision: 1 }),
      ]),
    });
    const resolver = Object.freeze({
      resolve: (id: string) =>
        Object.freeze({
          accessibleName: id,
          content: <p>candidate</p>,
          prepare: () => preparation.promise,
        }),
    });
    render(
      <>
        <button
          type="button"
          onClick={() => session.openPrimary("overlay.test.initial-failure")}
        >
          open delayed
        </button>
        <OverlayHostV1
          session={session}
          rendererResolver={resolver}
          inputRouter={inputRouter}
          closeLabel="close"
        />
      </>,
    );
    const user = userEvent.setup();
    const opener = screen.getByRole("button", { name: "open delayed" });

    await user.click(opener);
    const fallback = await waitFor(() => {
      const element = document.querySelector<HTMLElement>("[data-overlay-fallback]");
      expect(element).not.toBeNull();
      return element!;
    });
    expect(fallback).toHaveFocus();
    await user.tab();
    expect(fallback).toHaveFocus();
    await user.tab({ shift: true });
    expect(fallback).toHaveFocus();

    await act(async () => {
      preparation.reject(new Error("synthetic initial failure"));
      await Promise.resolve();
    });
    await waitFor(() => expect(document.querySelector("[data-overlay-fallback]")).toBeNull());
    expect(session.getSnapshot()).toEqual({ primaryId: null, detailIds: [] });
    expect(opener).toHaveFocus();
  });

  it("does not restore external focus when a higher System candidate occludes a live Overlay", async () => {
    const fixture = createSharedSystemOverlayFixtureV1();
    const rendered = render(
      <>
        <button
          type="button"
          onClick={() => fixture.overlay.openPrimary("overlay.test.inventory")}
        >
          open shared overlay
        </button>
        <OverlayHostV1
          session={fixture.overlay}
          rendererResolver={createResolverV1(fixture.overlay)}
          inputRouter={fixture.inputRouter}
          closeLabel="close"
        />
      </>,
    );
    const user = userEvent.setup();
    const opener = screen.getByRole("button", { name: "open shared overlay" });

    try {
      await user.click(opener);
      const overlayFocus = await screen.findByRole("button", { name: "食材详情" });
      expect(overlayFocus).toHaveFocus();

      act(() => {
        expect(fixture.system.openRootInternalV1("settings")).toMatchObject({
          kind: "preparing",
        });
      });

      await waitFor(() => expect(overlayFocus).toHaveFocus());
      expect(opener).not.toHaveFocus();
      expect(document.querySelector("[data-overlay-fallback]")).toBeNull();
    } finally {
      rendered.unmount();
      fixture.dispose();
    }
  });

  it("withdraws an Overlay fallback when a higher System fallback becomes the global fence", async () => {
    const fixture = createSharedSystemOverlayFixtureV1();
    const preparation = pendingPreparationV1();
    const resolver = Object.freeze({
      resolve: (id: OverlayIdV1) =>
        Object.freeze({
          accessibleName: id,
          content: <p>candidate</p>,
          prepare: () => preparation.promise,
        }),
    });
    const rendered = render(
      <>
        <button
          type="button"
          onClick={() => fixture.overlay.openPrimary("overlay.test.inventory")}
        >
          open pending shared overlay
        </button>
        <OverlayHostV1
          session={fixture.overlay}
          rendererResolver={resolver}
          inputRouter={fixture.inputRouter}
          closeLabel="close"
        />
      </>,
    );
    const user = userEvent.setup();
    const opener = screen.getByRole("button", { name: "open pending shared overlay" });

    try {
      await user.click(opener);
      const overlayFallback = await waitFor(() => {
        const element = document.querySelector<HTMLElement>("[data-overlay-fallback]");
        expect(element).not.toBeNull();
        return element!;
      });
      expect(overlayFallback).toHaveFocus();

      act(() => {
        expect(fixture.system.openRootInternalV1("settings")).toMatchObject({
          kind: "preparing",
        });
      });

      await waitFor(() => expect(document.querySelector("[data-overlay-fallback]")).toBeNull());
      expect(opener).not.toHaveFocus();
    } finally {
      rendered.unmount();
      fixture.dispose();
      preparation.resolve();
    }
  });

  it("restores the parent focus after a child fallback fails", async () => {
    type ChildOverlayIdV1 = "overlay.test.parent" | "overlay.test.child-failure";
    const preparation = rejectedPreparationV1();
    const inputRouter = createInputRouterV1();
    const session = createWorkspaceOverlaySessionInternalV1<ChildOverlayIdV1>({
      inputRouter,
      epochAllocator: createLocalManagedSurfaceEpochAllocatorInternalV1(),
      definitions: Object.freeze([
        defineWorkspaceOverlayV1({ id: "overlay.test.parent", contractRevision: 1 }),
        defineWorkspaceOverlayV1({ id: "overlay.test.child-failure", contractRevision: 1 }),
      ]),
    });
    const resolver = Object.freeze({
      resolve(id: ChildOverlayIdV1) {
        return id === "overlay.test.parent"
          ? Object.freeze({
            accessibleName: "parent",
            content: (
              <button
                type="button"
                onClick={() => session.pushDetail("overlay.test.child-failure")}
              >
                open child
              </button>
            ),
          })
          : Object.freeze({
            accessibleName: "child",
            content: <p>child candidate</p>,
            prepare: () => preparation.promise,
          });
      },
    });
    render(
      <>
        <button type="button" onClick={() => session.openPrimary("overlay.test.parent")}>
          open parent
        </button>
        <OverlayHostV1
          session={session}
          rendererResolver={resolver}
          inputRouter={inputRouter}
          closeLabel="close"
        />
      </>,
    );
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "open parent" }));
    const childOpener = await screen.findByRole("button", { name: "open child" });
    await user.click(childOpener);
    const fallback = await waitFor(() =>
      document.querySelector<HTMLElement>("[data-overlay-fallback]")!
    );
    expect(fallback).toHaveFocus();
    await user.tab();
    expect(fallback).toHaveFocus();
    await user.tab({ shift: true });
    expect(fallback).toHaveFocus();

    await act(async () => {
      preparation.reject(new Error("synthetic child failure"));
      await Promise.resolve();
    });
    await waitFor(() => expect(document.querySelector("[data-overlay-fallback]")).toBeNull());
    expect(screen.getByRole("dialog", { name: "parent" })).toBeVisible();
    expect(childOpener).toHaveFocus();
  });

  it("retains the exact active DOM and focus when replacement preparation fails", async () => {
    type ReplacementOverlayIdV1 = "overlay.test.retained" | "overlay.test.failed-replacement";
    const preparation = rejectedPreparationV1();
    const inputRouter = createInputRouterV1();
    const session = createWorkspaceOverlaySessionInternalV1<ReplacementOverlayIdV1>({
      inputRouter,
      epochAllocator: createLocalManagedSurfaceEpochAllocatorInternalV1(),
      definitions: Object.freeze([
        defineWorkspaceOverlayV1({ id: "overlay.test.retained", contractRevision: 1 }),
        defineWorkspaceOverlayV1({
          id: "overlay.test.failed-replacement",
          contractRevision: 1,
        }),
      ]),
    });
    const resolver = Object.freeze({
      resolve: (id: ReplacementOverlayIdV1) =>
        id === "overlay.test.retained"
          ? Object.freeze({
            accessibleName: "retained",
            content: (
              <>
                <input aria-label="retained draft" defaultValue="dirty" />
                <button type="button">retained secondary</button>
              </>
            ),
          })
          : Object.freeze({
            accessibleName: "failed replacement",
            content: <p>replacement candidate</p>,
            prepare: () => preparation.promise,
          }),
    });
    render(
      <>
        <button type="button" onClick={() => session.openPrimary("overlay.test.retained")}>
          open retained
        </button>
        <OverlayHostV1
          session={session}
          rendererResolver={resolver}
          inputRouter={inputRouter}
          closeLabel="close"
        />
      </>,
    );
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "open retained" }));
    const retainedDialog = await screen.findByRole("dialog", { name: "retained" });
    const retainedSecondary = screen.getByRole("button", { name: "retained secondary" });
    retainedSecondary.focus();

    act(() => {
      session.openPrimary("overlay.test.failed-replacement");
    });
    await waitFor(() => expect(document.querySelector("[data-overlay-preparing]")).not.toBeNull());
    expect(document.querySelector("[data-overlay-fallback]")).toBeNull();
    expect(screen.getByRole("dialog", { name: "retained" })).toBe(retainedDialog);
    expect(retainedSecondary).toHaveFocus();

    await act(async () => {
      preparation.reject(new Error("synthetic replacement failure"));
      await Promise.resolve();
    });
    await waitFor(() => expect(document.querySelector("[data-overlay-preparing]")).toBeNull());
    expect(screen.getByRole("dialog", { name: "retained" })).toBe(retainedDialog);
    expect(screen.getByRole("textbox", { name: "retained draft" })).toHaveValue("dirty");
    expect(retainedSecondary).toHaveFocus();
  });

  it("fails a candidate whose renderer throws before it can become active", async () => {
    function ThrowingCandidateV1(): React.ReactElement {
      throw new Error("synthetic candidate render failure");
    }
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const reportFailure = vi.fn();
    const inputRouter = createInputRouterV1();
    const session = createWorkspaceOverlaySessionInternalV1({
      inputRouter,
      epochAllocator: createLocalManagedSurfaceEpochAllocatorInternalV1(),
      definitions: Object.freeze([
        defineWorkspaceOverlayV1({ id: "overlay.test.render-failure", contractRevision: 1 }),
      ]),
      reportFailure,
    });
    const resolver = Object.freeze({
      resolve: (id: string) =>
        Object.freeze({
          accessibleName: id,
          content: <ThrowingCandidateV1 />,
        }),
    });
    render(
      <>
        <button type="button" onClick={() => session.openPrimary("overlay.test.render-failure")}>
          open failing renderer
        </button>
        <OverlayHostV1
          session={session}
          rendererResolver={resolver}
          inputRouter={inputRouter}
          closeLabel="close"
        />
      </>,
    );

    await userEvent.setup().click(screen.getByRole("button", { name: "open failing renderer" }));
    await waitFor(() => expect(session.getSnapshot()).toEqual({ primaryId: null, detailIds: [] }));
    expect(document.querySelector("[data-overlay-fallback]")).toBeNull();
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(consoleError).toHaveBeenCalled();
    expect(reportFailure).toHaveBeenCalledWith(
      "ui.workspace_overlay_active_render_failed",
      expect.objectContaining({ message: "synthetic candidate render failure" }),
    );
    consoleError.mockRestore();
  });

  it("does not mount ordinary Story content while its candidate is preparing", async () => {
    const preparation = pendingPreparationV1();
    const mounted = vi.fn();
    function EffectfulCandidateV1() {
      useEffect(() => {
        mounted();
      }, []);
      return <button type="button">candidate action</button>;
    }
    const inputRouter = createInputRouterV1();
    const session = createWorkspaceOverlaySessionInternalV1({
      inputRouter,
      epochAllocator: createLocalManagedSurfaceEpochAllocatorInternalV1(),
      definitions: Object.freeze([
        defineWorkspaceOverlayV1({ id: "overlay.test.effectful", contractRevision: 1 }),
      ]),
    });
    const resolver = Object.freeze({
      resolve: (id: string) =>
        Object.freeze({
          accessibleName: id,
          content: <EffectfulCandidateV1 />,
          prepare: () => preparation.promise,
        }),
    });
    render(
      <>
        <button type="button" onClick={() => session.openPrimary("overlay.test.effectful")}>
          open effectful
        </button>
        <OverlayHostV1
          session={session}
          rendererResolver={resolver}
          inputRouter={inputRouter}
          closeLabel="close"
        />
      </>,
    );

    await userEvent.setup().click(screen.getByRole("button", { name: "open effectful" }));
    await waitFor(() => expect(document.querySelector("[data-overlay-preparing]")).not.toBeNull());
    expect(mounted).not.toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: "candidate action" })).toBeNull();

    await act(async () => {
      preparation.resolve();
      await Promise.resolve();
    });
    expect(await screen.findByRole("button", { name: "candidate action" })).toBeVisible();
    expect(mounted).toHaveBeenCalledOnce();
  });

  it("cancels pending preparation when its Host unmounts", async () => {
    const preparation = pendingPreparationV1();
    const inputRouter = createInputRouterV1();
    const session = createWorkspaceOverlaySessionInternalV1({
      inputRouter,
      epochAllocator: createLocalManagedSurfaceEpochAllocatorInternalV1(),
      definitions: Object.freeze([
        defineWorkspaceOverlayV1({ id: "overlay.test.unmount", contractRevision: 1 }),
      ]),
    });
    const resolver = Object.freeze({
      resolve: (id: string) =>
        Object.freeze({
          accessibleName: id,
          content: <p>pending content</p>,
          prepare: () => preparation.promise,
        }),
    });
    const rendered = render(
      <OverlayHostV1
        session={session}
        rendererResolver={resolver}
        inputRouter={inputRouter}
        closeLabel="close"
      />,
    );
    act(() => {
      session.openPrimary("overlay.test.unmount");
    });
    await waitFor(() => expect(document.querySelector("[data-overlay-preparing]")).not.toBeNull());

    rendered.unmount();
    const afterUnmount = session.getManagedSnapshotInternalV1();
    expect(afterUnmount.orderedInstances).toEqual([]);
    expect(afterUnmount.inputOwner).toBeNull();
    expect(afterUnmount.focusOwner).toBeNull();
    preparation.resolve();
    await Promise.resolve();
    expect(session.getManagedSnapshotInternalV1()).toBe(afterUnmount);
  });

  it("applies the locked dismiss policy while the code-native fallback is active", async () => {
    const preparation = pendingPreparationV1();
    const inputRouter = createInputRouterV1();
    const session = createWorkspaceOverlaySessionInternalV1({
      inputRouter,
      epochAllocator: createLocalManagedSurfaceEpochAllocatorInternalV1(),
      definitions: Object.freeze([
        defineWorkspaceOverlayV1({
          id: "overlay.test.locked-delayed",
          contractRevision: 1,
          dismissible: false,
        }),
      ]),
    });
    const resolver = Object.freeze({
      resolve: (id: string) =>
        Object.freeze({
          accessibleName: "locked delayed",
          content: <p>{id}</p>,
          prepare: () => preparation.promise,
        }),
    });
    render(
      <OverlayHostV1
        session={session}
        rendererResolver={resolver}
        inputRouter={inputRouter}
        closeLabel="explicit close"
      />,
    );
    act(() => {
      session.openPrimary("overlay.test.locked-delayed");
    });
    const fallback = await waitFor(() =>
      document.querySelector<HTMLElement>("[data-overlay-fallback]")!
    );
    const candidateId = fallback.getAttribute("data-overlay-fallback");
    const user = userEvent.setup();

    await user.click(fallback.querySelector("[aria-hidden='true']") as HTMLElement);
    expect(document.querySelector("[data-overlay-fallback]")).toHaveAttribute(
      "data-overlay-fallback",
      candidateId,
    );
    expect(inputRouter.route({
      kind: "action",
      actionId: systemInputActionIdsV1.cancel,
    })).toEqual({ kind: "handled", context: "overlay" });
    expect(document.querySelector("[data-overlay-fallback]")).not.toBeNull();
    await user.keyboard("{Escape}");
    expect(document.querySelector("[data-overlay-fallback]")).not.toBeNull();

    await act(async () => {
      preparation.resolve();
      await Promise.resolve();
    });
    const dialog = await screen.findByRole("dialog", { name: "locked delayed" });
    await user.click(within(dialog).getByRole("button", { name: "explicit close" }));
    expect(screen.queryByRole("dialog", { name: "locked delayed" })).toBeNull();
  });

  it("keeps keyboard Tab traversal inside the active top Overlay", async () => {
    const store = createOverlaySessionStoreV1();
    const resolver: OverlayRendererResolverV1<OverlayIdV1> = Object.freeze({
      resolve: () =>
        resolutionV1(
          "focus fixture",
          <>
            <button type="button" tabIndex={-1}>excluded from tab order</button>
            <input type="hidden" aria-label="hidden input" />
            <button type="button" hidden>hidden control</button>
            <span style={{ display: "none" }}>
              <button type="button">css hidden control</button>
            </span>
            <span aria-hidden="true">
              <button type="button">aria hidden control</button>
            </span>
            <button type="button">visible action</button>
          </>,
        ),
    });
    render(
      <>
        <button type="button">external control</button>
        <OverlayHostV1
          session={store}
          rendererResolver={resolver}
          inputRouter={createInputRouterV1()}
          closeLabel="close"
        />
      </>,
    );
    act(() => {
      store.openPrimary("overlay.test.inventory");
    });
    const dialog = await screen.findByRole("dialog", { name: "focus fixture" });
    const user = userEvent.setup();
    const visibleAction = within(dialog).getByRole("button", { name: "visible action" });

    expect(visibleAction).toHaveFocus();

    for (let index = 0; index < 6; index += 1) {
      await user.tab();
      expect(dialog).toContainElement(document.activeElement as HTMLElement);
    }
    expect(within(dialog).getByRole("button", { name: "excluded from tab order" })).not
      .toHaveFocus();
    expect(screen.getByRole("button", { name: "external control" })).not.toHaveFocus();
  });

  it("never claims the DevDock target: overlays leave debug chrome on the base layer", async () => {
    const store = createOverlaySessionStoreV1();
    await openReadyV1(store, "overlay.test.inventory");
    await pushReadyV1(store, "overlay.test.ingredient");
    render(
      <DevDockPortalCoordinatorV1>
        <DevDockPortalSelectionProbeV1 />
        <OverlayHostV1
          session={store}
          rendererResolver={createResolverV1(store)}
          inputRouter={createInputRouterV1()}
          closeLabel="关闭"
        />
      </DevDockPortalCoordinatorV1>,
    );

    const primary = await screen.findByRole("dialog", { name: "背包" });
    const detail = screen.getByRole("dialog", { name: "食材详情" });
    expect(primary).not.toHaveAttribute("data-blocking-focus-scope");
    expect(detail).toHaveAttribute("data-blocking-focus-scope", "overlay");
    // Privileged debug chrome: an open overlay stack never adopts the dock.
    expect(screen.getByTestId("devdock-portal-selection")).toHaveAttribute(
      "data-surface",
      "base",
    );
    expect(screen.getByTestId("devdock-portal-selection")).toHaveAttribute(
      "data-target-overlay-depth",
      "none",
    );

    act(() => {
      store.closeTop();
    });
    act(() => {
      store.closeTop();
    });
    await waitFor(() =>
      expect(screen.getByTestId("devdock-portal-selection")).toHaveAttribute(
        "data-surface",
        "base",
      )
    );
  });

  it("renders the primary and ordered details inside its Stage-layer host", async () => {
    const store = createOverlaySessionStoreV1();
    await openReadyV1(store, "overlay.test.inventory");
    await pushReadyV1(store, "overlay.test.ingredient");
    await pushReadyV1(store, "overlay.test.supplier");

    render(
      <OverlayHostV1
        session={store}
        rendererResolver={createResolverV1(store)}
        inputRouter={createInputRouterV1()}
        closeLabel="关闭"
      />,
    );

    const dialogs = await screen.findAllByRole("dialog");
    expect(dialogs.map((dialog) => dialog.getAttribute("data-overlay-kind"))).toEqual([
      "primary",
      "detail",
      "detail",
    ]);
    expect(dialogs.map((dialog) => dialog.getAttribute("data-overlay-depth"))).toEqual([
      "0",
      "1",
      "2",
    ]);
    expect(screen.getByRole("dialog", { name: "背包" })).toBeVisible();
    expect(screen.getByRole("dialog", { name: "食材详情" })).toBeVisible();
    expect(screen.getByRole("dialog", { name: "供应商详情" })).toBeVisible();
    const host = screen.getByTestId("overlay-host");
    for (const dialog of dialogs) expect(host).toContainElement(dialog);
    const layers = dialogs.map((dialog) => dialog.closest("[data-overlay-layer]"));
    expect(layers[0]).toHaveAttribute("inert");
    expect(layers[1]).toHaveAttribute("inert");
    expect(layers[2]).not.toHaveAttribute("inert");
  });

  it("closes the top detail before the primary and returns focus to the exact opener", async () => {
    render(<OverlayHarnessV1 />);
    const user = userEvent.setup();
    const opener = screen.getByRole("button", { name: "打开背包" });

    await user.click(opener);
    const detailOpener = await screen.findByRole("button", { name: "食材详情" });
    await user.click(detailOpener);
    expect(screen.getByRole("dialog", { name: "食材详情" })).toBeVisible();

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog", { name: "食材详情" })).not.toBeInTheDocument();
    expect(screen.getByRole("dialog", { name: "背包" })).toBeVisible();
    expect(detailOpener).toHaveFocus();

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog", { name: "背包" })).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
  });

  it("restores a pointer opener even when the browser leaves focus on its panel", async () => {
    const store = createOverlaySessionStoreV1();
    render(
      <>
        <button type="button" onClick={() => store.openPrimary("overlay.test.inventory")}>
          open inventory
        </button>
        <OverlayHostV1
          session={store}
          rendererResolver={createResolverV1(store)}
          inputRouter={createInputRouterV1()}
          closeLabel="close"
        />
      </>,
    );
    const primaryOpener = screen.getByRole("button", { name: "open inventory" });
    primaryOpener.focus();
    fireEvent.click(primaryOpener);
    const detailOpener = await screen.findByRole("button", { name: "食材详情" });
    const panel = detailOpener.closest<HTMLElement>("[data-panel-content]")!;

    panel.focus();
    fireEvent.click(detailOpener);
    expect(await screen.findByRole("dialog", { name: "食材详情" })).toBeVisible();

    act(() => {
      store.closeTop();
    });
    expect(screen.queryByRole("dialog", { name: "食材详情" })).not.toBeInTheDocument();
    expect(detailOpener).toHaveFocus();
  });

  it("returns focus through every opener in a multi-detail stack", async () => {
    render(<OverlayHarnessV1 />);
    const user = userEvent.setup();
    const primaryOpener = screen.getByRole("button", { name: "打开背包" });

    await user.click(primaryOpener);
    const firstDetailOpener = await screen.findByRole("button", { name: "食材详情" });
    await user.click(firstDetailOpener);
    const secondDetailOpener = await screen.findByRole("button", { name: "供应商详情" });
    await user.click(secondDetailOpener);
    expect(screen.getByRole("dialog", { name: "供应商详情" })).toBeVisible();

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog", { name: "供应商详情" })).not.toBeInTheDocument();
    expect(secondDetailOpener).toHaveFocus();

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog", { name: "食材详情" })).not.toBeInTheDocument();
    expect(firstDetailOpener).toHaveFocus();

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog", { name: "背包" })).not.toBeInTheDocument();
    expect(primaryOpener).toHaveFocus();
  });

  it("exposes a visible native close control for the top entry on pointer and touch paths", async () => {
    render(<OverlayHarnessV1 />);
    const user = userEvent.setup();
    const primaryOpener = screen.getByRole("button", { name: "打开背包" });

    await user.click(primaryOpener);
    const detailOpener = await screen.findByRole("button", { name: "食材详情" });
    await user.click(detailOpener);

    const detail = screen.getByRole("dialog", { name: "食材详情" });
    const closeDetail = within(detail).getByRole("button", { name: "关闭" });
    expect(closeDetail).toBeInstanceOf(HTMLButtonElement);
    expect(closeDetail).toBeVisible();
    await user.pointer({ target: closeDetail, keys: "[TouchA]" });

    expect(screen.queryByRole("dialog", { name: "食材详情" })).not.toBeInTheDocument();
    expect(screen.getByRole("dialog", { name: "背包" })).toBeVisible();
    expect(detailOpener).toHaveFocus();

    await user.click(
      within(screen.getByRole("dialog", { name: "背包" })).getByRole("button", {
        name: "关闭",
      }),
    );
    expect(screen.queryByRole("dialog", { name: "背包" })).not.toBeInTheDocument();
    expect(primaryOpener).toHaveFocus();
  });

  it("returns focus to the external opener when an active host unmounts", async () => {
    const store = createOverlaySessionStoreV1();
    const inputRouter = createInputRouterV1();
    const rendererResolver = createResolverV1(store);
    render(
      <button
        type="button"
        onClick={() => store.openPrimary("overlay.test.inventory")}
      >
        打开背包
      </button>,
    );
    const rendered = render(
      <OverlayHostV1
        session={store}
        rendererResolver={rendererResolver}
        inputRouter={inputRouter}
        closeLabel="关闭"
      />,
    );
    const user = userEvent.setup();
    const externalOpener = screen.getByRole("button", { name: "打开背包" });

    await user.click(externalOpener);
    expect(await screen.findByRole("dialog", { name: "背包" })).toBeVisible();
    expect(screen.getByRole("button", { name: "食材详情" })).toHaveFocus();

    rendered.unmount();

    expect(screen.queryByRole("dialog", { name: "背包" })).not.toBeInTheDocument();
    expect(store.getSnapshot()).toEqual({ primaryId: null, detailIds: [] });
    expect(externalOpener).toHaveFocus();
  });

  it("suppresses predecessor focus restore and family close during terminal unmount", async () => {
    const store = createOverlaySessionStoreV1();
    const inputRouter = createInputRouterV1();
    const rendererResolver = createResolverV1(store);
    render(
      <button
        type="button"
        onClick={() => store.openPrimary("overlay.test.inventory")}
      >
        打开背包
      </button>,
    );
    const rendered = render(
      <OverlayHostV1
        session={store}
        rendererResolver={rendererResolver}
        inputRouter={inputRouter}
        closeLabel="关闭"
      />,
    );
    const user = userEvent.setup();
    const externalOpener = screen.getByRole("button", { name: "打开背包" });

    await user.click(externalOpener);
    expect(await screen.findByRole("dialog", { name: "背包" })).toBeVisible();
    expect(screen.getByRole("button", { name: "食材详情" })).toHaveFocus();

    store.sealTerminalDisposalInternalV1();
    rendered.unmount();

    expect(screen.queryByRole("dialog", { name: "背包" })).not.toBeInTheDocument();
    expect(store.getSnapshot()).toEqual({
      primaryId: "overlay.test.inventory",
      detailIds: [],
    });
    expect(externalOpener).not.toHaveFocus();
    store.disposeInternalV1();
  });

  it("returns focus to the external root opener when closeAll removes a nested stack", async () => {
    const store = createOverlaySessionStoreV1();
    render(
      <>
        <button
          type="button"
          onClick={() => store.openPrimary("overlay.test.inventory")}
        >
          打开背包
        </button>
        <OverlayHostV1
          session={store}
          rendererResolver={createResolverV1(store)}
          inputRouter={createInputRouterV1()}
          closeLabel="关闭"
        />
      </>,
    );
    const user = userEvent.setup();
    const externalOpener = screen.getByRole("button", { name: "打开背包" });

    await user.click(externalOpener);
    const detailOpener = await screen.findByRole("button", { name: "食材详情" });
    await user.click(detailOpener);
    expect(await screen.findByRole("dialog", { name: "食材详情" })).toBeVisible();

    act(() => store.closeAll());

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(externalOpener).toHaveFocus();
  });

  it("returns focus to the external root opener when closeAll cancels a child fallback", async () => {
    const preparation = pendingPreparationV1();
    const inputRouter = createInputRouterV1();
    const store = createWorkspaceOverlaySessionInternalV1<OverlayIdV1>({
      inputRouter,
      epochAllocator: createLocalManagedSurfaceEpochAllocatorInternalV1(),
      definitions: overlayDefinitionsV1,
    });
    const resolver = Object.freeze({
      resolve(id: OverlayIdV1) {
        if (id === "overlay.test.inventory") {
          return resolutionV1(
            "背包",
            <button
              type="button"
              onClick={() => store.pushDetail("overlay.test.ingredient")}
            >
              食材详情
            </button>,
          );
        }
        if (id === "overlay.test.ingredient") {
          return Object.freeze({
            accessibleName: "食材详情",
            content: <p>食材内容</p>,
            prepare: () => preparation.promise,
          });
        }
        return null;
      },
    });
    render(
      <>
        <button
          type="button"
          onClick={() => store.openPrimary("overlay.test.inventory")}
        >
          打开背包
        </button>
        <OverlayHostV1
          session={store}
          rendererResolver={resolver}
          inputRouter={inputRouter}
          closeLabel="关闭"
        />
      </>,
    );
    const user = userEvent.setup();
    const externalOpener = screen.getByRole("button", { name: "打开背包" });

    await user.click(externalOpener);
    await user.click(await screen.findByRole("button", { name: "食材详情" }));
    await waitFor(() => expect(document.querySelector("[data-overlay-fallback]")).not.toBeNull());

    act(() => store.closeAll());

    expect(document.querySelector("[data-overlay-fallback]")).toBeNull();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(externalOpener).toHaveFocus();
    preparation.resolve();
  });

  it("restores the surviving-parent opener when a nested renderer fault removes a subtree", async () => {
    let failIngredient = (): void => {
      throw new Error("ingredient renderer is not mounted");
    };
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const inputRouter = createInputRouterV1();
    const store = createWorkspaceOverlaySessionInternalV1<OverlayIdV1>({
      inputRouter,
      epochAllocator: createLocalManagedSurfaceEpochAllocatorInternalV1(),
      definitions: overlayDefinitionsV1,
    });
    function FaultableIngredientV1() {
      const [failed, setFailed] = useState(false);
      useEffect(() => {
        failIngredient = () => setFailed(true);
      }, []);
      if (failed) throw new Error("synthetic nested renderer failure");
      return (
        <button
          type="button"
          onClick={() => store.pushDetail("overlay.test.supplier")}
        >
          供应商详情
        </button>
      );
    }
    const resolver = Object.freeze({
      resolve(id: OverlayIdV1) {
        switch (id) {
          case "overlay.test.inventory":
            return resolutionV1(
              "背包",
              <button
                type="button"
                onClick={() => store.pushDetail("overlay.test.ingredient")}
              >
                食材详情
              </button>,
            );
          case "overlay.test.ingredient":
            return resolutionV1("食材详情", <FaultableIngredientV1 />);
          case "overlay.test.supplier":
            return resolutionV1("供应商详情", <button type="button">检查供应商</button>);
          default:
            return null;
        }
      },
    });
    render(
      <>
        <button
          type="button"
          onClick={() => store.openPrimary("overlay.test.inventory")}
        >
          打开背包
        </button>
        <OverlayHostV1
          session={store}
          rendererResolver={resolver}
          inputRouter={inputRouter}
          closeLabel="关闭"
        />
      </>,
    );
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "打开背包" }));
    const ingredientOpener = await screen.findByRole("button", { name: "食材详情" });
    await user.click(ingredientOpener);
    await user.click(await screen.findByRole("button", { name: "供应商详情" }));
    expect(await screen.findByRole("button", { name: "检查供应商" })).toHaveFocus();

    act(() => failIngredient());
    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "食材详情" })).not.toBeInTheDocument();
      expect(screen.queryByRole("dialog", { name: "供应商详情" })).not.toBeInTheDocument();
    });

    expect(screen.getByRole("dialog", { name: "背包" })).toBeVisible();
    expect(ingredientOpener).toHaveFocus();
    expect(consoleError).toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it("registers Overlay only while active and blocks lower viewport/action events", async () => {
    const store = createOverlaySessionStoreV1();
    const inputRouter = createInputRouterV1();
    const gameplay = vi.fn(() => inputHandledV1);
    inputRouter.register({ context: "gameplay", handle: gameplay });
    const rendered = render(
      <OverlayHostV1
        session={store}
        rendererResolver={createResolverV1(store)}
        inputRouter={inputRouter}
        closeLabel="关闭"
      />,
    );
    const unrelatedAction = Object.freeze({
      kind: "action" as const,
      actionId: parseInputActionIdV1("ui.test_action"),
    });

    expect(inputRouter.route(unrelatedAction)).toEqual({ kind: "handled", context: "gameplay" });
    gameplay.mockClear();
    act(() => {
      store.openPrimary("overlay.test.inventory");
    });
    const activeSnapshot = store.getSnapshot();

    const viewportEvent = Object.freeze({
      kind: "viewport_point" as const,
      phase: "activate" as const,
      point: Object.freeze({ x: 40, y: 50 }),
      pointerId: parseNonNegativeSafeInteger(1),
      pointerType: "mouse" as const,
    });
    expect(inputRouter.route(viewportEvent)).toEqual({ kind: "handled", context: "overlay" });
    expect(inputRouter.route(unrelatedAction)).toEqual({ kind: "handled", context: "overlay" });
    expect(gameplay).not.toHaveBeenCalled();
    expect(store.getSnapshot()).toBe(activeSnapshot);

    rendered.unmount();
    expect(inputRouter.route(unrelatedAction)).toEqual({ kind: "handled", context: "gameplay" });
  });

  it("marks lower Stage layers inert while preserving Overlay and System access", async () => {
    const store = createOverlaySessionStoreV1();
    const systemAction = vi.fn();
    const host = (
      <OverlayHostV1
        session={store}
        rendererResolver={createResolverV1(store)}
        inputRouter={createInputRouterV1()}
        closeLabel="关闭"
      />
    );
    render(
      <GameStageV1
        accessibleName="隔离测试舞台"
        layers={Object.freeze({
          background: <button type="button">背景操作</button>,
          character: null,
          sceneInteraction: <button type="button">场景操作</button>,
          hud: <button type="button">经营操作</button>,
          narrative: <button type="button">叙事操作</button>,
          wholeCanvas: <button type="button">全画布操作</button>,
          workspaceOverlay: host,
          system: (
            <button type="button" onClick={systemAction}>
              系统操作
            </button>
          ),
        })}
      />,
    );

    const overlayHost = screen.getByTestId("overlay-host");
    expect(overlayHost).toHaveStyle({ pointerEvents: "none" });
    act(() => {
      store.openPrimary("overlay.test.inventory");
    });
    expect(await screen.findByRole("dialog", { name: "背包" })).toBeVisible();
    expect(overlayHost).toHaveStyle({ pointerEvents: "auto" });
    expect(screen.getByTestId("stage-background")).toHaveAttribute("inert");
    expect(screen.getByTestId("stage-character")).toHaveAttribute("inert");
    expect(screen.getByTestId("stage-scene-interaction")).toHaveAttribute("inert");
    expect(screen.getByTestId("stage-hud")).toHaveAttribute("inert");
    expect(screen.getByTestId("stage-narrative")).toHaveAttribute("inert");
    expect(screen.getByTestId("stage-whole-canvas")).toHaveAttribute("inert");
    expect(screen.getByTestId("stage-workspace-overlay")).not.toHaveAttribute("inert");
    expect(screen.getByTestId("stage-system")).not.toHaveAttribute("inert");
    await userEvent.setup().click(screen.getByRole("button", { name: "系统操作" }));
    expect(systemAction).toHaveBeenCalledOnce();
    expect(screen.getByRole("dialog", { name: "背包" })).toBeVisible();

    act(() => store.closeAll());
    expect(overlayHost).toHaveStyle({ pointerEvents: "none" });
    expect(screen.getByTestId("stage-background")).not.toHaveAttribute("inert");
    expect(screen.getByTestId("stage-narrative")).not.toHaveAttribute("inert");
    expect(screen.getByTestId("stage-whole-canvas")).not.toHaveAttribute("inert");
  });

  it("handles ui.cancel one entry at a time but never closes on focus_loss", async () => {
    const inputRouter = createInputRouterV1();
    const store = createOverlaySessionStoreV1(inputRouter);
    const gameplay = vi.fn(() => inputHandledV1);
    inputRouter.register({ context: "gameplay", handle: gameplay });
    render(
      <OverlayHostV1
        session={store}
        rendererResolver={createResolverV1(store)}
        inputRouter={inputRouter}
        closeLabel="关闭"
      />,
    );
    act(() => {
      store.openPrimary("overlay.test.inventory");
    });
    await screen.findByRole("dialog", { name: "背包" });
    act(() => {
      store.pushDetail("overlay.test.ingredient");
    });
    await screen.findByRole("dialog", { name: "食材详情" });

    const beforeFocusLoss = store.getSnapshot();
    expect(inputRouter.route(Object.freeze({ kind: "focus_loss" as const }))).toEqual({
      kind: "handled",
      context: "gameplay",
    });
    expect(store.getSnapshot()).toBe(beforeFocusLoss);
    gameplay.mockClear();
    expect(
      inputRouter.route(
        Object.freeze({
          kind: "pointer_cancel" as const,
          pointerId: parseNonNegativeSafeInteger(1),
        }),
      ),
    ).toEqual({ kind: "handled", context: "gameplay" });
    expect(gameplay).toHaveBeenCalledOnce();
    expect(store.getSnapshot()).toBe(beforeFocusLoss);

    act(() => {
      expect(
        inputRouter.route(
          Object.freeze({ kind: "action" as const, actionId: systemInputActionIdsV1.cancel }),
        ),
      ).toEqual({ kind: "handled", context: "overlay" });
    });
    expect(store.getSnapshot()).toEqual({
      primaryId: "overlay.test.inventory",
      detailIds: [],
    });
    act(() => {
      inputRouter.route(
        Object.freeze({ kind: "action" as const, actionId: systemInputActionIdsV1.cancel }),
      );
    });
    expect(store.getSnapshot()).toEqual({ primaryId: null, detailIds: [] });
  });

  it("resolves only IDs from the one observed stack snapshot", async () => {
    const store = createOverlaySessionStoreV1();
    await openReadyV1(store, "overlay.test.inventory");
    await pushReadyV1(store, "overlay.test.ingredient");
    const baseResolver = createResolverV1(store);
    const resolveRenderer = vi.fn(baseResolver.resolve);
    const rendererResolver = Object.freeze({ resolve: resolveRenderer });
    render(
      <OverlayHostV1
        session={store}
        rendererResolver={rendererResolver}
        inputRouter={createInputRouterV1()}
        closeLabel="关闭"
      />,
    );

    expect(resolveRenderer.mock.calls.map(([id]) => id)).toEqual([
      "overlay.test.inventory",
      "overlay.test.ingredient",
    ]);
    resolveRenderer.mockClear();
    act(() => {
      store.openPrimary("overlay.test.supplier");
    });
    await screen.findByRole("dialog", { name: "供应商详情" });
    expect(resolveRenderer.mock.calls.map(([id]) => id)).toContain("overlay.test.supplier");
  });

  it("rejects a missing renderer before publishing topology", () => {
    const store = createOverlaySessionStoreV1();
    const before = store.getManagedSnapshotInternalV1();

    expect(store.openPrimary("overlay.test.unknown")).toEqual({
      kind: "rejected",
      code: "overlay.renderer_missing",
    });
    expect(store.getManagedSnapshotInternalV1()).toBe(before);
  });

  it("does not steal focus when opening without an HTMLElement focus target", async () => {
    const store = createOverlaySessionStoreV1();
    const inputRouter = createInputRouterV1();
    render(
      <OverlayHostV1
        session={store}
        rendererResolver={createResolverV1(store)}
        inputRouter={inputRouter}
        closeLabel="关闭"
      />,
    );

    expect(document.activeElement).toBe(document.body);
    act(() => {
      store.openPrimary("overlay.test.inventory");
    });
    expect(await screen.findByRole("dialog", { name: "背包" })).toBeVisible();
    act(() => store.closeAll());
    expect(document.activeElement).toBe(document.body);
  });

  it("bounds scrollable Overlay content to the actual Stage height", async () => {
    const css = await readFile(resolve(import.meta.dirname, "overlay-host.module.css"), "utf8");

    expect(css).toMatch(
      /\.overlay-host__content\s*\{[^}]*max-block-size:\s*calc\(100% - 2 \* var\(--silly-space-3\)\);/su,
    );
    expect(css).not.toMatch(/\.overlay-host__content\s*\{[^}]*max-block-size:\s*calc\(100dvh/su);
  });

  it("keeps every cancel path consistent for a non-dismissible Overlay", async () => {
    const store = createOverlaySessionStoreV1();
    const inputRouter = createInputRouterV1();
    const gameplay = vi.fn(() => inputHandledV1);
    inputRouter.register({ context: "gameplay", handle: gameplay });
    render(
      <DevDockPortalCoordinatorV1>
        <OverlayHostV1
          session={store}
          rendererResolver={createResolverV1(store)}
          inputRouter={inputRouter}
          closeLabel="关闭"
        />
      </DevDockPortalCoordinatorV1>,
    );
    act(() => {
      store.openPrimary("overlay.test.locked");
    });
    await screen.findByRole("dialog", { name: "锁定教程" });
    act(() => {
      store.pushDetail("overlay.test.ingredient");
    });
    const user = userEvent.setup();
    await screen.findByRole("dialog", { name: "食材详情" });

    // Two backdrops exist; only the top layer's is clickable (the lower
    // layer is inert). Clicking it closes the detail, not the primary.
    const topBackdrop = document.querySelector("[data-overlay-backdrop='1']");
    expect(topBackdrop).not.toBeNull();
    await user.click(topBackdrop as HTMLElement);
    // Only the top closed: the detail is gone, the primary window remains.
    expect(store.getSnapshot()).toEqual({
      primaryId: "overlay.test.locked",
      detailIds: [],
    });
    await waitFor(() => expect(document.querySelector("[data-overlay-kind='detail']")).toBeNull());
    const lockedSnapshot = store.getSnapshot();
    const lockedDialog = screen.getByRole("dialog", { name: "锁定教程" });

    // The primary is locked (dismissible: false): its backdrop ignores
    // clicks and the window stays.
    const primaryBackdrop = document.querySelector("[data-overlay-backdrop='0']");
    await user.click(primaryBackdrop as HTMLElement);
    expect(store.getSnapshot()).toBe(lockedSnapshot);
    expect(screen.getByRole("dialog", { name: "锁定教程" })).toBe(lockedDialog);

    // The cancel action (right-click / Escape) is consumed without closing
    // the locked window — and never falls through to anything beneath.
    const routed = inputRouter.route({
      kind: "action",
      actionId: systemInputActionIdsV1.cancel,
    });
    expect(routed).toEqual({ kind: "handled", context: "overlay" });
    expect(gameplay).not.toHaveBeenCalled();
    expect(store.getSnapshot()).toBe(lockedSnapshot);

    // Radix receives a native Escape independently from InputRouter. It must
    // apply the same dismiss policy instead of closing the locked window.
    await user.keyboard("{Escape}");
    expect(store.getSnapshot()).toBe(lockedSnapshot);
    expect(screen.getByRole("dialog", { name: "锁定教程" })).toBe(lockedDialog);

    // A locked window still has its declared business exit.
    await user.click(screen.getByRole("button", { name: "关闭" }));
    expect(store.getSnapshot()).toEqual({ primaryId: null, detailIds: [] });
  });
});
