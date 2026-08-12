// @vitest-environment jsdom
// SPDX-License-Identifier: MIT
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";

import type { DeepReadonly } from "@sillymaker/base";
import { createPlayerProfileStoreV1 } from "@sillymaker/base/runtime";
import { createMemoryHostRecordStoreV1 } from "@sillymaker/base/testkit";
import type { WholeCanvasSurfaceRendererPropsV1 } from "@sillymaker/ui";
import { createWebHostV1, startWebGameApplicationV1 } from "@sillymaker/web";

import {
  catcafeGameApplicationV1,
  projectCatcafeWholeCanvasSurfaceSelectionV1,
} from "../application/composition.tsx";
import { createCatcafeApplicationInstanceV1 } from "../application/core-application.ts";
import type { CatcafeSemanticPublicationV1 } from "../application/ui-kit.ts";
import { CatcafeEndingScreenV1 } from "../features/endings/ending-screen.tsx";

type CatcafeWholeCanvasTargetIdV1 = "catcafe.ending";
type CatcafeWholeCanvasActionIdV1 = "cc.enter_postgame" | "cc.restart";

afterEach(() => {
  cleanup();
  document.body.replaceChildren();
});

it("boots and disposes the package-owned Splash and Title WholeCanvas Host", async () => {
  const root = document.createElement("div");
  root.id = "root";
  document.body.append(root);
  const started = await startWebGameApplicationV1(catcafeGameApplicationV1, {
    rootElement: root,
    host: createWebHostV1({
      records: createMemoryHostRecordStoreV1(),
      seeds: [20260812],
      uuids: ["0c36c727-b97c-42ff-a3b8-4846a4e44dce"],
    }),
    capabilitySearch: "",
    registerPageLifecycle: false,
  });

  try {
    await waitFor(() => {
      const splashHost = root.querySelector<HTMLElement>(
        "[data-whole-canvas-surface='primary'][data-whole-canvas-root-kind='boot_splash'][data-whole-canvas-phase='current']",
      );
      expect(splashHost).not.toBeNull();
      expect(splashHost?.querySelector("[data-boot-splash='true']")).not.toBeNull();
    });

    const splash = root.querySelector<HTMLElement>("[data-boot-splash='true']");
    expect(splash).not.toBeNull();
    fireEvent.click(splash!);

    await waitFor(() => {
      const titleHost = root.querySelector<HTMLElement>(
        "[data-whole-canvas-surface='primary'][data-whole-canvas-root-kind='title'][data-whole-canvas-phase='current']",
      );
      expect(titleHost).not.toBeNull();
      expect(titleHost?.querySelector("[data-title-screen='true']")).not.toBeNull();
      expect(root.querySelector("[data-boot-splash='true']")).toBeNull();
    });

    const newGame = root.querySelector<HTMLButtonElement>("[data-title-new-game='true']");
    expect(newGame).not.toBeNull();
    fireEvent.click(newGame!);

    await waitFor(() => {
      expect(root.querySelector("[data-title-screen='true']")).toBeNull();
      const dialogue = root.querySelector<HTMLElement>("[data-dialogue]");
      expect(dialogue).not.toBeNull();
      const renderShell = dialogue?.closest<HTMLElement>(
        "[data-narrative-surface-render-shell='dialogue']",
      );
      expect(renderShell).not.toBeNull();
      expect(renderShell).not.toHaveAttribute("inert");
      expect(renderShell).not.toHaveAttribute("aria-hidden");
      expect(renderShell?.style.visibility).not.toBe("hidden");
    });
  } finally {
    await started.dispose();
  }

  expect(started.isDisposed()).toBe(true);
  expect(root.querySelector("[data-whole-canvas-surface]")).toBeNull();
}, 10_000);

it("projects one immutable ending primary only while semantic ending state exists", () => {
  const endingPublication = Object.freeze({
    game: Object.freeze({ ending: "ordinary" }),
  }) as unknown as DeepReadonly<CatcafeSemanticPublicationV1>;
  const selection = projectCatcafeWholeCanvasSurfaceSelectionV1(endingPublication);

  expect(selection).toEqual({
    primary: {
      targetId: "catcafe.ending",
      parameters: { ending: "ordinary" },
    },
  });
  expect(Object.isFrozen(selection)).toBe(true);
  expect(Object.isFrozen(selection.primary)).toBe(true);
  expect(Object.isFrozen(selection.primary?.parameters)).toBe(true);

  const gameplayPublication = Object.freeze({
    game: Object.freeze({ ending: null }),
  }) as unknown as DeepReadonly<CatcafeSemanticPublicationV1>;
  expect(projectCatcafeWholeCanvasSurfaceSelectionV1(gameplayPublication)).toEqual({
    primary: null,
  });
});

it("publishes the Cat definition only through the high-level wholeCanvas Story seam", async () => {
  const instance = await createCatcafeApplicationInstanceV1();
  const playerProfile = await createPlayerProfileStoreV1({
    records: createMemoryHostRecordStoreV1(),
    storyId: "story.example.cat-cafe",
  });
  let disposeUi: (() => void) | undefined;
  try {
    const ui = catcafeGameApplicationV1.ui(
      { instance, playerProfile } as unknown as Parameters<typeof catcafeGameApplicationV1.ui>[0],
    );
    disposeUi = ui.dispose;
    expect(Object.hasOwn(ui, "wholeCanvas")).toBe(true);
    expect(Object.hasOwn(ui.slots ?? {}, "wholeCanvas")).toBe(false);
  } finally {
    disposeUi?.();
    await instance.dispose();
  }
});

it("renders the ending as passive frame UI and emits only exact frame-bound actions", () => {
  const onAction = vi.fn<(actionId: CatcafeWholeCanvasActionIdV1) => void>();
  const onBack = vi.fn<() => void>();
  const frame = Object.freeze({
    kind: "primary" as const,
    target: Object.freeze({
      targetId: "catcafe.ending" as const,
      parameters: Object.freeze({ ending: "ordinary" }),
    }),
    view: Object.freeze({ ending: "ordinary" }),
    actions: Object.freeze([
      Object.freeze({
        actionId: "cc.enter_postgame" as const,
        status: "enabled" as const,
        reasonTextIds: Object.freeze([]),
      }),
      Object.freeze({
        actionId: "cc.restart" as const,
        status: "enabled" as const,
        reasonTextIds: Object.freeze([]),
      }),
    ]),
    resolveText: (textId: string) => textId,
    onAction,
    onBack,
  }) satisfies WholeCanvasSurfaceRendererPropsV1<
    CatcafeWholeCanvasTargetIdV1,
    CatcafeWholeCanvasActionIdV1
  >;

  const view = render(<CatcafeEndingScreenV1 frame={frame} registry={null} />);
  const ending = view.container.querySelector<HTMLElement>("[data-cc-ending='ordinary']");
  expect(ending).not.toBeNull();
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(ending?.style.position).toBe("");
  expect(ending?.style.zIndex).toBe("");
  expect(ending?.style.pointerEvents).toBe("");

  fireEvent.click(screen.getByRole("button", { name: "text.cc.ending.continue" }));
  fireEvent.click(screen.getByRole("button", { name: "text.cc.ending.restart" }));
  expect(onAction.mock.calls).toEqual([["cc.enter_postgame"], ["cc.restart"]]);
  expect(onBack).not.toHaveBeenCalled();
});
