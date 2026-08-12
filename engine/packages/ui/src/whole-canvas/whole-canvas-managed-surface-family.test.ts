// SPDX-License-Identifier: MIT
import { describe, expect, it, vi } from "vitest";

import {
  createWholeCanvasManagedSurfaceFamilyContractInternalV1,
  type WholeCanvasManagedSurfaceCatalogRowInternalV1,
  type WholeCanvasManagedSurfaceFamilyContractInternalV1,
} from "./whole-canvas-managed-surface-family.ts";

function catalogRowV1(input: {
  readonly targetId: string;
  readonly placements: readonly ("primary" | "detail")[];
  readonly actionIds?: readonly string[];
  readonly defaultActionId?: string | null;
}): WholeCanvasManagedSurfaceCatalogRowInternalV1 {
  return Object.freeze({
    targetId: input.targetId,
    contractRevision: 1,
    placements: Object.freeze([...input.placements]),
    actionIds: Object.freeze([...(input.actionIds ?? [])]),
    defaultActionId: input.defaultActionId ?? null,
  });
}

describe("whole-canvas managed Surface family", () => {
  it("freezes the exact owner, slots, layer, four definitions, and stable sidecars", () => {
    const catalog = Object.freeze([
      catalogRowV1({
        targetId: "test.whole-canvas.primary",
        placements: ["primary"],
        actionIds: ["test.action.primary"],
        defaultActionId: "test.action.primary",
      }),
      catalogRowV1({
        targetId: "test.whole-canvas.detail",
        placements: ["detail"],
        actionIds: ["test.action.detail"],
      }),
    ]);
    const contract = createWholeCanvasManagedSurfaceFamilyContractInternalV1(catalog);

    expect(Object.isFrozen(contract)).toBe(true);
    expect(Reflect.ownKeys(contract)).toEqual([
      "ownerId",
      "resolvedOwnerIds",
      "resolvedSlotDescriptors",
      "definitions",
      "stableDefinitionSidecars",
      "catalog",
    ]);
    expect(contract.ownerId).toBe("surface-owner.whole-canvas");
    expect(contract.resolvedOwnerIds).toEqual(["surface-owner.whole-canvas"]);
    expect(contract.resolvedSlotDescriptors).toEqual([
      {
        kind: "root",
        slotId: "surface-slot.whole-canvas.primary",
        cardinality: "single",
      },
      {
        kind: "child",
        parentDefinitionId: "surface.whole-canvas.primary",
        slotId: "surface-slot.whole-canvas.detail",
        cardinality: "single",
      },
    ]);

    expect(Reflect.ownKeys(contract.definitions)).toEqual([
      "primary",
      "detail",
      "bootSplash",
      "title",
    ]);
    const definitionKeys = [
      "definitionId",
      "contractRevision",
      "ownerId",
      "slotId",
      "layerId",
      "layerOrder",
      "placement",
      "modality",
      "inputPolicy",
      "dismissPolicy",
      "focusPolicy",
      "navigationPolicy",
      "actionIds",
      "readiness",
    ];
    for (const definition of Object.values(contract.definitions)) {
      expect(Object.isFrozen(definition)).toBe(true);
      expect(Reflect.ownKeys(definition)).toEqual(definitionKeys);
      expect(definition.ownerId).toBe("surface-owner.whole-canvas");
      expect(definition.layerId).toBe("surface-layer.whole-canvas");
      expect(definition.modality).toBe("blocking");
      expect(definition.inputPolicy).toEqual({
        kind: "managed",
        inputContextId: "whole_canvas",
      });
      expect(definition.readiness).toEqual({
        initialOpen: "blocking_fallback",
        primaryReplacement: "retain_current",
        childOpen: "blocking_fallback",
      });
    }
    expect(contract.definitions.primary).toEqual({
      definitionId: "surface.whole-canvas.primary",
      contractRevision: 1,
      ownerId: "surface-owner.whole-canvas",
      slotId: "surface-slot.whole-canvas.primary",
      layerId: "surface-layer.whole-canvas",
      layerOrder: 45,
      placement: "root",
      modality: "blocking",
      inputPolicy: { kind: "managed", inputContextId: "whole_canvas" },
      dismissPolicy: { back: false, escape: false, backdrop: false, routedCancel: false },
      focusPolicy: {
        kind: "owns_focus",
        initialTargetId: "surface-focus.whole-canvas.primary",
        trap: true,
        restore: "previous_owner",
      },
      navigationPolicy: { kind: "none" },
      actionIds: ["ui.confirm", "ui.cancel", "test.action.primary"],
      readiness: {
        initialOpen: "blocking_fallback",
        primaryReplacement: "retain_current",
        childOpen: "blocking_fallback",
      },
    });
    expect(contract.definitions.detail).toEqual({
      definitionId: "surface.whole-canvas.detail",
      contractRevision: 1,
      ownerId: "surface-owner.whole-canvas",
      slotId: "surface-slot.whole-canvas.detail",
      layerId: "surface-layer.whole-canvas",
      layerOrder: 46,
      placement: "child",
      modality: "blocking",
      inputPolicy: { kind: "managed", inputContextId: "whole_canvas" },
      dismissPolicy: { back: true, escape: true, backdrop: true, routedCancel: true },
      focusPolicy: {
        kind: "owns_focus",
        initialTargetId: "surface-focus.whole-canvas.detail",
        trap: true,
        restore: "opener",
      },
      navigationPolicy: { kind: "close" },
      actionIds: ["ui.confirm", "ui.cancel", "test.action.detail"],
      readiness: {
        initialOpen: "blocking_fallback",
        primaryReplacement: "retain_current",
        childOpen: "blocking_fallback",
      },
    });
    expect(contract.definitions.bootSplash).toEqual({
      definitionId: "surface.whole-canvas.boot-splash",
      contractRevision: 1,
      ownerId: "surface-owner.whole-canvas",
      slotId: "surface-slot.whole-canvas.primary",
      layerId: "surface-layer.whole-canvas",
      layerOrder: 45,
      placement: "root",
      modality: "blocking",
      inputPolicy: { kind: "managed", inputContextId: "whole_canvas" },
      focusPolicy: {
        kind: "owns_focus",
        initialTargetId: "surface-focus.whole-canvas.splash-dismiss",
        trap: true,
        restore: "none",
      },
      dismissPolicy: { back: true, escape: true, backdrop: false, routedCancel: true },
      navigationPolicy: { kind: "close" },
      actionIds: ["ui.confirm", "ui.cancel", "whole-canvas.dismiss-splash"],
      readiness: {
        initialOpen: "blocking_fallback",
        primaryReplacement: "retain_current",
        childOpen: "blocking_fallback",
      },
    });
    expect(contract.definitions.title).toEqual({
      definitionId: "surface.whole-canvas.title",
      contractRevision: 1,
      ownerId: "surface-owner.whole-canvas",
      slotId: "surface-slot.whole-canvas.primary",
      layerId: "surface-layer.whole-canvas",
      layerOrder: 45,
      placement: "root",
      modality: "blocking",
      inputPolicy: { kind: "managed", inputContextId: "whole_canvas" },
      focusPolicy: {
        kind: "owns_focus",
        initialTargetId: "surface-focus.whole-canvas.title-primary",
        trap: true,
        restore: "previous_owner",
      },
      dismissPolicy: { back: false, escape: false, backdrop: false, routedCancel: false },
      navigationPolicy: { kind: "none" },
      actionIds: [
        "ui.confirm",
        "ui.cancel",
        "whole-canvas.title.new-game",
        "whole-canvas.title.continue",
        "whole-canvas.title.open-load",
        "whole-canvas.title.open-settings",
      ],
      readiness: {
        initialOpen: "blocking_fallback",
        primaryReplacement: "retain_current",
        childOpen: "blocking_fallback",
      },
    });
    expect(contract.stableDefinitionSidecars.map((row) => row.definition)).toEqual([
      contract.definitions.primary,
      contract.definitions.bootSplash,
      contract.definitions.title,
    ]);
    expect(contract.stableDefinitionSidecars).not.toContainEqual(
      expect.objectContaining({ definition: contract.definitions.detail }),
    );
    expect(contract.catalog).toEqual(catalog);
    expect(contract.catalog).not.toBe(catalog);
    expect(Object.isFrozen(contract.catalog)).toBe(true);
  });

  it("admits an empty dormant catalog and exact canonical root parameters", () => {
    const first = createWholeCanvasManagedSurfaceFamilyContractInternalV1(Object.freeze([]));
    expect(first.catalog).toEqual([]);
    expect(first.definitions.primary.actionIds).toEqual(["ui.confirm", "ui.cancel"]);
    expect(first.definitions.detail.actionIds).toEqual(["ui.confirm", "ui.cancel"]);

    for (const sidecar of first.stableDefinitionSidecars) {
      const parameters = sidecar.parameterSchema.parse({
        targetId: "test.whole-canvas.a",
        parameters: { z: 2, a: true },
      }) as Readonly<Record<string, unknown>>;
      expect(parameters).toEqual({
        targetId: "test.whole-canvas.a",
        parameters: { a: true, z: 2 },
      });
      expect(Object.isFrozen(parameters)).toBe(true);
      expect(Object.isFrozen(parameters.parameters)).toBe(true);

      for (
        const invalid of [
          null,
          { targetId: "test.whole-canvas.a" },
          { targetId: "test.whole-canvas.a", parameters: {}, extra: true },
          { targetId: "not a stable id", parameters: {} },
          { targetId: "test.whole-canvas.a", parameters: { invalid: undefined } },
        ]
      ) {
        expect(() => sidecar.parameterSchema.parse(invalid)).toThrowError(
          "ui.whole_canvas_target_invalid",
        );
      }
    }
  });

  it("rejects malformed, duplicate, wrong-default, and reserved catalog rows", () => {
    const valid = catalogRowV1({
      targetId: "test.whole-canvas.primary",
      placements: ["primary"],
      actionIds: ["test.action.run"],
      defaultActionId: "test.action.run",
    });
    const sparseCatalog: unknown[] = [];
    sparseCatalog.length = 1;
    Object.freeze(sparseCatalog);
    const reversedPlacements = Object.freeze(["detail", "primary"]);
    const extraActionIds = ["test.action.run"];
    Object.defineProperty(extraActionIds, "extra", { value: true, enumerable: true });
    Object.freeze(extraActionIds);
    const extraCatalog = [valid];
    Object.defineProperty(extraCatalog, "extra", { value: true, enumerable: true });
    Object.freeze(extraCatalog);
    const accessorRow = Object.freeze(Object.defineProperties({}, {
      targetId: { get: () => "test.whole-canvas.accessor", enumerable: true },
      contractRevision: { value: 1, enumerable: true },
      placements: { value: Object.freeze(["primary"]), enumerable: true },
      actionIds: { value: Object.freeze([]), enumerable: true },
      defaultActionId: { value: null, enumerable: true },
    }));
    const customPrototypeRow = Object.freeze(Object.assign(
      Object.create({ inherited: true }),
      valid,
    ));
    const placementGetter = vi.fn(() => "primary");
    const accessorPlacements: unknown[] = [];
    Object.defineProperty(accessorPlacements, "0", {
      get: placementGetter,
      enumerable: true,
      configurable: false,
    });
    Object.freeze(accessorPlacements);
    const actionGetter = vi.fn(() => "test.action.run");
    const accessorActions: unknown[] = [];
    Object.defineProperty(accessorActions, "0", {
      get: actionGetter,
      enumerable: true,
      configurable: false,
    });
    Object.freeze(accessorActions);
    const symbolActions = ["test.action.run"];
    Object.defineProperty(symbolActions, Symbol("extra"), { value: true });
    Object.freeze(symbolActions);
    const invalidRows: readonly unknown[] = [
      [Object.freeze({ ...valid, contractRevision: 2 })],
      [Object.freeze({ ...valid, placements: Object.freeze([]) })],
      [Object.freeze({ ...valid, placements: reversedPlacements })],
      [Object.freeze({ ...valid, actionIds: Object.freeze(["ui.cancel"]) })],
      [Object.freeze({ ...valid, actionIds: extraActionIds })],
      [Object.freeze({ ...valid, defaultActionId: "test.action.missing" })],
      [valid, valid],
      [Object.freeze({ ...valid, extra: true })],
      sparseCatalog,
      extraCatalog,
      [accessorRow],
      [customPrototypeRow],
      [Object.freeze({ ...valid, placements: accessorPlacements })],
      [Object.freeze({ ...valid, actionIds: accessorActions })],
      [Object.freeze({ ...valid, actionIds: symbolActions })],
    ];
    for (const catalog of invalidRows) {
      expect(() =>
        createWholeCanvasManagedSurfaceFamilyContractInternalV1(
          (Array.isArray(catalog) && !Object.isFrozen(catalog)
            ? Object.freeze(catalog)
            : catalog) as never,
        )
      ).toThrowError("ui.whole_canvas_catalog_invalid");
    }
    const revokedCatalog = Proxy.revocable([], {});
    revokedCatalog.revoke();
    expect(() =>
      createWholeCanvasManagedSurfaceFamilyContractInternalV1(
        revokedCatalog.proxy as never,
      )
    ).toThrowError("ui.whole_canvas_catalog_invalid");
    expect(placementGetter).not.toHaveBeenCalled();
    expect(actionGetter).not.toHaveBeenCalled();
  });

  it("keeps the family contract source-relative", () => {
    type Keys = keyof WholeCanvasManagedSurfaceFamilyContractInternalV1;
    const keys: readonly Keys[] = [
      "ownerId",
      "resolvedOwnerIds",
      "resolvedSlotDescriptors",
      "definitions",
      "stableDefinitionSidecars",
      "catalog",
    ];
    expect(keys).toHaveLength(6);
  });
});
