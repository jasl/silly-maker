// SPDX-License-Identifier: MIT
// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { parseNonNegativeSafeInteger } from "@sillymaker/base";
import type { RuntimeCapabilityPortV1, SessionAnchorResultV1 } from "@sillymaker/base";
import { createPlayerProfileStoreV1 } from "@sillymaker/base/runtime";
import type { PlayerProfileStoreV1 } from "@sillymaker/base/runtime";
import { createMemoryHostRecordStoreV1 } from "@sillymaker/base/testkit";

import { createInputRouterV1 } from "../input/input-router.ts";
import {
  createLocalWorkspaceOverlayEpochAllocatorInternalV1,
  createWorkspaceOverlayPublicSessionInternalV1,
  createWorkspaceOverlaySessionInternalV1,
  defineWorkspaceOverlayV1,
} from "../overlays/workspace-overlay-session.ts";
import { createSystemDialogSessionStoreV1 } from "../system/system-dialog-session-store.ts";
import type { DefaultGameRootSlotContextV1 } from "./default-game-root.tsx";
import type { DefaultGameRootLabelsV1 } from "./default-game-root.tsx";
import { DefaultGameRootV1 } from "./default-game-root.tsx";

afterEach(cleanup);

const anchoredV1 = Object.freeze({
  kind: "anchored" as const,
  commandSequence: parseNonNegativeSafeInteger(0),
}) satisfies SessionAnchorResultV1;

const disabledCapabilityStateV1 = Object.freeze({
  debugTools: false,
  cheats: false,
  automationBridge: false,
});
const disabledCapabilitiesV1 = Object.freeze({
  state: Object.freeze({
    getCurrent: () => disabledCapabilityStateV1,
    subscribe: () => () => undefined,
  }),
  setEnabled: async () =>
    Object.freeze({ kind: "unchanged" as const, state: disabledCapabilityStateV1 }),
}) satisfies RuntimeCapabilityPortV1;

type LifecycleOverlayIdV1 = "lifecycle.primary" | "lifecycle.detail";

const lifecycleOverlayDefinitionsV1 = Object.freeze([
  defineWorkspaceOverlayV1({ id: "lifecycle.primary", contractRevision: 1 }),
  defineWorkspaceOverlayV1({ id: "lifecycle.detail", contractRevision: 1 }),
]);

function deferredV1() {
  let resolve!: () => void;
  const promise = new Promise<void>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return Object.freeze({ promise, resolve });
}

function renderLifecycleRootV1(input: {
  readonly restart: () => Promise<SessionAnchorResultV1>;
  readonly beginNewGame?: () => void | Promise<unknown>;
  readonly playerProfile?: PlayerProfileStoreV1;
  readonly capabilities?: RuntimeCapabilityPortV1;
  readonly labels?: Partial<DefaultGameRootLabelsV1>;
}) {
  let returnToTitle:
    | DefaultGameRootSlotContextV1<unknown, unknown>["systemDialogs"]["returnToTitle"]
    | undefined;
  const inputRouter = createInputRouterV1();
  const overlayFailures: Array<{ readonly code: string; readonly error: unknown }> = [];
  const preparations = new Map<LifecycleOverlayIdV1, ReturnType<typeof deferredV1>>([
    ["lifecycle.primary", deferredV1()],
    ["lifecycle.detail", deferredV1()],
  ]);
  const overlayInternal = createWorkspaceOverlaySessionInternalV1<LifecycleOverlayIdV1>({
    inputRouter,
    epochAllocator: createLocalWorkspaceOverlayEpochAllocatorInternalV1(),
    definitions: lifecycleOverlayDefinitionsV1,
    reportFailure: (code, error) => overlayFailures.push(Object.freeze({ code, error })),
  });
  const overlaySession = createWorkspaceOverlayPublicSessionInternalV1(overlayInternal);
  const overlayResolver = Object.freeze({
    resolve: (id: LifecycleOverlayIdV1) =>
      Object.freeze({
        accessibleName: id,
        content: <p>{id}</p>,
        prepare: () => preparations.get(id)!.promise,
      }),
  });
  const systemDialogSession = createSystemDialogSessionStoreV1();
  const publication = Object.freeze({ revision: 0 });
  const anchor = Object.freeze({ epoch: 0, origin: "bootstrap" });

  render(
    <DefaultGameRootV1
      composition={{
        presentation: Object.freeze({
          getSnapshot: () => publication,
          subscribe: () => () => undefined,
        }),
        anchor: Object.freeze({
          getCurrent: () => anchor,
          subscribe: () => () => undefined,
        }),
        input: inputRouter,
        intents: Object.freeze({}),
        cues: Object.freeze({}),
        overlaySession,
        systemDialogSession,
        interactionSession: Object.freeze({}),
        updateUiState: () => undefined,
      } as never}
      semantic={Object.freeze({})}
      accessibleName="Lifecycle fixture"
      applicationId="lifecycle-fixture"
      viewport={undefined as never}
      {...(input.playerProfile === undefined ? {} : { playerProfile: input.playerProfile })}
      {...(input.capabilities === undefined ? {} : { capabilities: input.capabilities })}
      {...(input.labels === undefined ? {} : { labels: input.labels })}
      lifecycle={Object.freeze({ restart: input.restart })}
      titleScreen={Object.freeze({
        title: "Lifecycle fixture",
        ...(input.beginNewGame === undefined ? {} : { beginNewGame: input.beginNewGame }),
      })}
      slots={Object.freeze({
        hud: (context: DefaultGameRootSlotContextV1<unknown, unknown>) => {
          returnToTitle = context.systemDialogs.returnToTitle;
          return null;
        },
        overlayResolver: () => overlayResolver,
      })}
    />,
  );

  return Object.freeze({
    overlayInternal,
    overlaySession,
    overlayFailures,
    resolvePreparation(id: LifecycleOverlayIdV1) {
      preparations.get(id)!.resolve();
    },
    systemDialogSession,
    returnToTitle: () => {
      if (returnToTitle === undefined) {
        throw new TypeError("missing returnToTitle fixture");
      }
      return returnToTitle();
    },
  });
}

async function settleOverlayPreparationV1(
  fixture: ReturnType<typeof renderLifecycleRootV1>,
  id: LifecycleOverlayIdV1,
): Promise<void> {
  const candidate = fixture.overlayInternal.getRenderSnapshotInternalV1().entries.find(
    (entry) => entry.overlayId === id && entry.readiness === "preparing",
  );
  expect(candidate).toBeDefined();
  const readiness = fixture.overlayInternal.beginCandidatePreparationInternalV1(
    candidate!.surfaceInstanceId,
  );
  await act(async () => {
    fixture.resolvePreparation(id);
    await expect(readiness).resolves.toEqual({ kind: "ready" });
  });
}

async function openActiveTopologyV1(fixture: ReturnType<typeof renderLifecycleRootV1>): Promise<
  Readonly<{
    system: { readonly active: "settings" };
    overlay: {
      readonly primaryId: "lifecycle.primary";
      readonly detailIds: readonly ["lifecycle.detail"];
    };
  }>
> {
  act(() => {
    fixture.systemDialogSession.open("settings");
    expect(fixture.overlaySession.openPrimary("lifecycle.primary")).toEqual({
      kind: "preparing",
      code: "overlay.preparation_started",
    });
  });
  await settleOverlayPreparationV1(fixture, "lifecycle.primary");
  act(() => {
    expect(fixture.overlaySession.pushDetail("lifecycle.detail")).toEqual({
      kind: "preparing",
      code: "overlay.preparation_started",
    });
  });
  await settleOverlayPreparationV1(fixture, "lifecycle.detail");
  return Object.freeze({
    system: Object.freeze({ active: "settings" as const }),
    overlay: Object.freeze({
      primaryId: "lifecycle.primary" as const,
      detailIds: Object.freeze(["lifecycle.detail"] as const),
    }),
  });
}

describe("DefaultGameRootV1 lifecycle result handling", () => {
  it("forwards the Story opt-in cutscene label to the default Settings control", async () => {
    const playerProfile = await createPlayerProfileStoreV1({
      records: createMemoryHostRecordStoreV1(),
      storyId: "story.test.default-root-settings",
    });
    const fixture = renderLifecycleRootV1({
      restart: async () => anchoredV1,
      playerProfile,
      capabilities: disabledCapabilitiesV1,
      labels: Object.freeze({ settingsSkipCutscenesLabel: "Skip cinematic waits" }),
    });

    act(() => fixture.systemDialogSession.open("settings"));

    expect(
      screen.getByRole("checkbox", { name: "Skip cinematic waits" }),
    ).toBeInTheDocument();
  });

  it.each(
    [
      Object.freeze({
        kind: "rejected" as const,
        code: "validation_failed" as const,
      }),
      Object.freeze({
        kind: "faulted" as const,
        code: "runtime.anchor_failed",
      }),
    ] satisfies readonly SessionAnchorResultV1[],
  )(
    "keeps the title in place and skips the opening hook when restart returns $kind",
    async (result) => {
      const beginNewGame = vi.fn();
      const restart = vi.fn(async () => result);
      renderLifecycleRootV1({ restart, beginNewGame });

      await userEvent.setup().click(screen.getByRole("button", { name: "New game" }));
      await waitFor(() => expect(restart).toHaveBeenCalledTimes(1));

      expect(beginNewGame).not.toHaveBeenCalled();
      expect(screen.getByRole("dialog", { name: "Lifecycle fixture" })).toBeInTheDocument();
      expect(screen.getByRole("alert")).toHaveTextContent("Unable to start a new game.");
      expect(screen.getByRole("alert")).toHaveAttribute(
        "data-title-lifecycle-failure",
        `${result.kind}:${result.code}`,
      );
    },
  );

  it.each([
    () => {
      throw new Error("synthetic restart throw");
    },
    async () => {
      throw new Error("synthetic restart rejection");
    },
  ])(
    "presents an unexpected New game restart failure without dismissing the title",
    async (restart) => {
      const beginNewGame = vi.fn();
      renderLifecycleRootV1({ restart, beginNewGame });

      await userEvent.setup().click(screen.getByRole("button", { name: "New game" }));

      expect(await screen.findByRole("alert")).toHaveTextContent("Unable to start a new game.");
      expect(screen.getByRole("alert")).toHaveAttribute(
        "data-title-lifecycle-failure",
        "unexpected",
      );
      expect(beginNewGame).not.toHaveBeenCalled();
      expect(screen.getByRole("dialog", { name: "Lifecycle fixture" })).toBeInTheDocument();
    },
  );

  it.each([
    () => {
      throw new Error("synthetic begin throw");
    },
    async () => {
      throw new Error("synthetic begin rejection");
    },
  ])("presents an opening-hook failure without dismissing the title", async (beginNewGame) => {
    const restart = vi.fn(async () => anchoredV1);
    renderLifecycleRootV1({ restart, beginNewGame });

    await userEvent.setup().click(screen.getByRole("button", { name: "New game" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Unable to start a new game.");
    expect(screen.getByRole("alert")).toHaveAttribute("data-title-lifecycle-failure", "unexpected");
    expect(screen.getByRole("dialog", { name: "Lifecycle fixture" })).toBeInTheDocument();
  });

  it.each(
    [
      Object.freeze({
        kind: "rejected" as const,
        code: "validation_failed" as const,
      }),
      Object.freeze({
        kind: "faulted" as const,
        code: "runtime.anchor_failed",
      }),
    ] satisfies readonly SessionAnchorResultV1[],
  )(
    "rejects returnToTitle on $kind and retains the current foreground",
    async (result) => {
      const restart = vi
        .fn<() => Promise<SessionAnchorResultV1>>()
        .mockResolvedValueOnce(anchoredV1)
        .mockResolvedValueOnce(result);
      const fixture = renderLifecycleRootV1({ restart });

      await userEvent.setup().click(screen.getByRole("button", { name: "New game" }));
      await waitFor(() =>
        expect(screen.queryByRole("dialog", { name: "Lifecycle fixture" })).toBeNull()
      );
      const topology = await openActiveTopologyV1(fixture);

      await expect(fixture.returnToTitle()).rejects.toThrow(
        `ui.lifecycle_restart_${result.kind}:${result.code}`,
      );
      expect(fixture.systemDialogSession.getSnapshot()).toEqual(topology.system);
      expect(fixture.overlaySession.getSnapshot()).toEqual(topology.overlay);
      expect(screen.queryByRole("dialog", { name: "Lifecycle fixture" })).toBeNull();
    },
  );

  it("returns a rejected Promise for a synchronous returnToTitle restart failure", async () => {
    const restart = vi
      .fn<() => Promise<SessionAnchorResultV1>>()
      .mockResolvedValueOnce(anchoredV1)
      .mockImplementationOnce(() => {
        throw new Error("synthetic return-to-title throw");
      });
    const fixture = renderLifecycleRootV1({ restart });

    await userEvent.setup().click(screen.getByRole("button", { name: "New game" }));
    await waitFor(() =>
      expect(screen.queryByRole("dialog", { name: "Lifecycle fixture" })).toBeNull()
    );
    const topology = await openActiveTopologyV1(fixture);

    let outcome: Promise<void> | undefined;
    expect(() => {
      outcome = fixture.returnToTitle();
      void outcome.catch(() => undefined);
    }).not.toThrow();
    expect(outcome).toBeDefined();
    await expect(outcome).rejects.toThrow("synthetic return-to-title throw");
    expect(fixture.systemDialogSession.getSnapshot()).toEqual(topology.system);
    expect(fixture.overlaySession.getSnapshot()).toEqual(topology.overlay);
    expect(screen.queryByRole("dialog", { name: "Lifecycle fixture" })).toBeNull();
  });

  it("closes active presentation topology before showing the title after an anchored return", async () => {
    const restart = vi.fn(async () => anchoredV1);
    const fixture = renderLifecycleRootV1({ restart });

    await userEvent.setup().click(screen.getByRole("button", { name: "New game" }));
    await waitFor(() =>
      expect(screen.queryByRole("dialog", { name: "Lifecycle fixture" })).toBeNull()
    );
    await openActiveTopologyV1(fixture);

    await fixture.returnToTitle();

    expect(fixture.systemDialogSession.getSnapshot()).toEqual({ active: null });
    expect(fixture.overlaySession.getSnapshot()).toEqual({
      primaryId: null,
      detailIds: [],
    });
    expect(screen.getByRole("dialog", { name: "Lifecycle fixture" })).toBeInTheDocument();
  });

  it("finishes the anchored return when a System close subscriber throws, then rejects", async () => {
    const restart = vi.fn(async () => anchoredV1);
    const fixture = renderLifecycleRootV1({ restart });

    await userEvent.setup().click(screen.getByRole("button", { name: "New game" }));
    await waitFor(() =>
      expect(screen.queryByRole("dialog", { name: "Lifecycle fixture" })).toBeNull()
    );
    await openActiveTopologyV1(fixture);
    const systemFailure = new Error("synthetic System close subscriber failure");
    fixture.systemDialogSession.subscribe(() => {
      if (fixture.systemDialogSession.getSnapshot().active === null) {
        throw systemFailure;
      }
    });

    await expect(fixture.returnToTitle()).rejects.toBe(systemFailure);

    expect(fixture.systemDialogSession.getSnapshot()).toEqual({ active: null });
    expect(fixture.overlaySession.getSnapshot()).toEqual({
      primaryId: null,
      detailIds: [],
    });
    expect(screen.getByRole("dialog", { name: "Lifecycle fixture" })).toBeInTheDocument();
  });

  it("isolates an Overlay close subscriber failure without weakening the System failure", async () => {
    const restart = vi.fn(async () => anchoredV1);
    const fixture = renderLifecycleRootV1({ restart });

    await userEvent.setup().click(screen.getByRole("button", { name: "New game" }));
    await waitFor(() =>
      expect(screen.queryByRole("dialog", { name: "Lifecycle fixture" })).toBeNull()
    );
    await openActiveTopologyV1(fixture);
    const systemFailure = new Error("synthetic System close subscriber failure");
    const overlayFailure = new Error("synthetic Overlay close subscriber failure");
    fixture.systemDialogSession.subscribe(() => {
      if (fixture.systemDialogSession.getSnapshot().active === null) {
        throw systemFailure;
      }
    });
    fixture.overlaySession.subscribe(() => {
      if (fixture.overlaySession.getSnapshot().primaryId === null) {
        throw overlayFailure;
      }
    });

    await expect(fixture.returnToTitle()).rejects.toBe(systemFailure);

    expect(fixture.overlayFailures).toEqual([
      { code: "ui.workspace_overlay_subscriber_failed", error: overlayFailure },
    ]);
    expect(fixture.systemDialogSession.getSnapshot()).toEqual({ active: null });
    expect(fixture.overlaySession.getSnapshot()).toEqual({
      primaryId: null,
      detailIds: [],
    });
    expect(screen.getByRole("dialog", { name: "Lifecycle fixture" })).toBeInTheDocument();
  });

  it("keeps the successful restart and opening-hook order unchanged", async () => {
    const order: string[] = [];
    const restart = vi.fn(async () => {
      order.push("restart");
      return anchoredV1;
    });
    const beginNewGame = vi.fn(() => {
      order.push("begin");
    });
    renderLifecycleRootV1({ restart, beginNewGame });

    await userEvent.setup().click(screen.getByRole("button", { name: "New game" }));
    await waitFor(() =>
      expect(screen.queryByRole("dialog", { name: "Lifecycle fixture" })).toBeNull()
    );

    expect(order).toEqual(["restart", "begin"]);
  });
});
