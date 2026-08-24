// @vitest-environment jsdom
// SPDX-License-Identifier: MIT
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createLabGameUiDefinitionV1 } from "../application/composition.tsx";
import { createLabApplicationInstanceV1 } from "../application/core-application.ts";
import {
  createLabWholeCanvasConformanceV1,
  LabWholeCanvasRendererV1,
  labWholeCanvasActionIdsV1,
  labWholeCanvasCatalogV1,
  labWholeCanvasPreparationEventsV1,
  labWholeCanvasTargetIdsV1,
  resolveLabWholeCanvasTargetV1,
} from "../application/whole-canvas-conformance.tsx";

afterEach(() => {
  document.body.innerHTML = "";
  globalThis.window.history.replaceState({}, "", "/");
  vi.restoreAllMocks();
});

describe("S4b.1c Engine Lab whole-canvas conformance consumer", () => {
  it("defines the five-row placement, action-order, and null-default catalog", () => {
    expect(labWholeCanvasCatalogV1).toEqual([
      {
        targetId: labWholeCanvasTargetIdsV1.home,
        contractRevision: 1,
        placements: ["primary"],
        actionIds: [
          labWholeCanvasActionIdsV1.showStatus,
          labWholeCanvasActionIdsV1.showStorage,
          labWholeCanvasActionIdsV1.showSpecimenCatalog,
        ],
        defaultActionId: null,
      },
      {
        targetId: labWholeCanvasTargetIdsV1.status,
        contractRevision: 1,
        placements: ["primary"],
        actionIds: [
          labWholeCanvasActionIdsV1.showHome,
          labWholeCanvasActionIdsV1.showStorage,
          labWholeCanvasActionIdsV1.showSpecimenCatalog,
        ],
        defaultActionId: null,
      },
      {
        targetId: labWholeCanvasTargetIdsV1.storage,
        contractRevision: 1,
        placements: ["primary"],
        actionIds: [
          labWholeCanvasActionIdsV1.showHome,
          labWholeCanvasActionIdsV1.showStatus,
          labWholeCanvasActionIdsV1.showSpecimenCatalog,
        ],
        defaultActionId: null,
      },
      {
        targetId: labWholeCanvasTargetIdsV1.specimenCatalog,
        contractRevision: 1,
        placements: ["primary"],
        actionIds: [
          labWholeCanvasActionIdsV1.showHome,
          labWholeCanvasActionIdsV1.showStatus,
          labWholeCanvasActionIdsV1.showStorage,
          labWholeCanvasActionIdsV1.openSpecimenDetail,
        ],
        defaultActionId: null,
      },
      {
        targetId: labWholeCanvasTargetIdsV1.specimenDetail,
        contractRevision: 1,
        placements: ["detail"],
        actionIds: [],
        defaultActionId: null,
      },
    ]);
  });

  it("resolves navigation intents in the catalog order without an owner dispatcher", () => {
    const resolved = resolveLabWholeCanvasTargetV1(Object.freeze({
      publication: Object.freeze({}) as unknown as Parameters<
        typeof resolveLabWholeCanvasTargetV1
      >[0]["publication"],
      placement: "primary",
      target: Object.freeze({
        targetId: labWholeCanvasTargetIdsV1.specimenCatalog,
        parameters: Object.freeze({}),
      }),
    }));

    expect(resolved.actions.map(({ actionId }) => actionId)).toEqual(
      labWholeCanvasCatalogV1[3]?.actionIds,
    );
    expect(resolved.actions.map(({ intent }) => intent.kind)).toEqual([
      "replace_primary",
      "replace_primary",
      "replace_primary",
      "open_detail",
    ]);
    expect(resolved.actions.at(-1)?.intent).toEqual({
      kind: "open_detail",
      target: {
        targetId: labWholeCanvasTargetIdsV1.specimenDetail,
        parameters: { specimenId: "specimen.alpha" },
      },
    });
  });

  it("keeps the renderer passive and emits only its captured action/back callbacks", async () => {
    const onAction = vi.fn();
    const onBack = vi.fn();
    render(
      <LabWholeCanvasRendererV1
        kind="detail"
        primary={Object.freeze({
          targetId: labWholeCanvasTargetIdsV1.specimenCatalog,
          parameters: Object.freeze({}),
        })}
        target={Object.freeze({
          targetId: labWholeCanvasTargetIdsV1.specimenDetail,
          parameters: Object.freeze({ specimenId: "specimen.alpha" }),
        })}
        view={Object.freeze({ specimenId: "specimen.alpha" })}
        actions={Object.freeze([])}
        resolveText={(textId) => textId}
        onAction={onAction}
        onBack={onBack}
      />,
    );

    const back = screen.getByRole("button", {
      name: "text.e2e.lab.whole-canvas.back",
    });
    expect(back).toHaveAttribute("data-lab-whole-canvas-back", "true");
    await userEvent.setup().click(back);
    expect(onBack).toHaveBeenCalledTimes(1);
    expect(onAction).not.toHaveBeenCalled();
  });

  it("omits the source, definition, launchers, and listeners outside the exact query", async () => {
    const instance = await createLabApplicationInstanceV1();
    const addEventListener = vi.spyOn(globalThis.window, "addEventListener");
    try {
      for (
        const search of [
          "/",
          "/?whole_canvas_conformance",
          "/?whole_canvas_conformance=0",
          "/?whole_canvas_conformance=2",
        ]
      ) {
        globalThis.window.history.replaceState({}, "", search);
        const ui = createLabGameUiDefinitionV1({ instance });
        expect(Object.hasOwn(ui, "wholeCanvas")).toBe(false);
        ui.dispose?.();
      }
      const preparationEventTypes = new Set<string>(
        Object.values(labWholeCanvasPreparationEventsV1),
      );
      expect(
        addEventListener.mock.calls.filter(([type]) => preparationEventTypes.has(type)),
      ).toEqual([]);
    } finally {
      await instance.dispose();
    }
  });

  it("allocates one definition and removable readiness listeners for the exact query", async () => {
    const instance = await createLabApplicationInstanceV1();
    const addEventListener = vi.spyOn(globalThis.window, "addEventListener");
    const removeEventListener = vi.spyOn(globalThis.window, "removeEventListener");
    globalThis.window.history.replaceState({}, "", "/?whole_canvas_conformance=1");
    try {
      const ui = createLabGameUiDefinitionV1({ instance });
      expect(Object.hasOwn(ui, "wholeCanvas")).toBe(true);
      for (const eventName of Object.values(labWholeCanvasPreparationEventsV1)) {
        expect(addEventListener.mock.calls.filter(([type]) => type === eventName)).toHaveLength(1);
      }
      ui.dispose?.();
      ui.dispose?.();
      for (const eventName of Object.values(labWholeCanvasPreparationEventsV1)) {
        expect(removeEventListener.mock.calls.filter(([type]) => type === eventName)).toHaveLength(
          1,
        );
      }
    } finally {
      await instance.dispose();
    }
  });

  it("creates a conformance rig with a working launcher", () => {
    const rig = createLabWholeCanvasConformanceV1({ eventTarget: globalThis.window });
    const restart = vi.fn(() => Promise.resolve());
    try {
      render(rig.renderLaunchers(restart));
      expect(screen.getByRole("button", { name: "重启 Whole Canvas 会话" }))
        .toHaveAttribute("data-lab-whole-canvas-launcher", "restart");
    } finally {
      rig.dispose();
    }
  });
});
