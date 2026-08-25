// SPDX-License-Identifier: MIT
import { defineTextContentManifestV1 } from "@sillymaker/base";
import type { WebTextContentObservationV1, WebTextContentPackObservationV1 } from "@sillymaker/web";
import { describe, expect, it, vi } from "vitest";
import { readFile } from "node:fs/promises";

import {
  assertLabNarrativeUnitClosureV1,
  createLabAddressableRuntimeInstanceV1,
  labNarrativeUnitManifestV1,
  labSceneUnitManifestV1,
} from "../application/addressable-runtime.ts";
import { labRuntimeInspectorSourceV1 } from "../application/runtime-inspection.ts";
import { createLabApplicationInstanceV1 } from "../application/core-application.ts";
import { labDrillSceneUnitIdV1, labProcedureSceneUnitIdV1 } from "../gameplay/runtime-plans.ts";
import {
  labCalibrationNarrativeNodeIdsV1,
  labCalibrationNarrativeUnitIdV1,
  labDrillNarrativeNodeIdsV1,
  labDrillNarrativeUnitIdV1,
  labNarrativePositionForCursorV1,
} from "../gameplay/narrative-topology.ts";

describe("Engine Lab addressable runtime", () => {
  it("loads only the opening pair, then literal-loads the exact drill pair once", async () => {
    const runtime = createLabAddressableRuntimeInstanceV1();
    const context = runtime.executionContext;

    expect(() => context.requireScenePlan(labProcedureSceneUnitIdV1)).toThrow(
      "e2e.scene_plan_not_prepared",
    );
    await runtime.prepareInitial?.();
    // The real Browser path activates this owner from the committed Player
    // layout effect. This focused test performs that commit step explicitly.
    context.runtimeInspection.activate();

    const ownerId = context.runtimeInspection.ownerId;
    const initialRows = labRuntimeInspectorSourceV1.getSnapshot().units.filter((unit) =>
      unit.ownerId === ownerId
    );
    expect(initialRows.filter((unit) => unit.status === "loaded").map((unit) => unit.unitId))
      .toEqual([labCalibrationNarrativeUnitIdV1, labProcedureSceneUnitIdV1]);
    expect(initialRows.find((unit) => unit.unitId === labDrillNarrativeUnitIdV1)?.status).toBe(
      "unloaded",
    );

    expect(context.requireScenePlan(labProcedureSceneUnitIdV1).sceneId).toBe(
      labProcedureSceneUnitIdV1,
    );
    expect(context.requireNarrativePlan(labCalibrationNarrativeUnitIdV1).nodeIds).toEqual(
      labCalibrationNarrativeNodeIdsV1,
    );
    expect(() => context.requireScenePlan(labDrillSceneUnitIdV1)).toThrow(
      "e2e.scene_plan_not_prepared",
    );
    expect(() => context.requireNarrativePlan(labDrillNarrativeUnitIdV1)).toThrow(
      "e2e.narrative_plan_not_prepared",
    );

    const beginDrill = { kind: "invoke" as const, actionId: "lab.begin_drill" as const };
    await Promise.all([
      runtime.prepareSemanticInvocation?.(beginDrill),
      runtime.prepareSemanticInvocation?.(beginDrill),
    ]);
    const first = context.requireNarrativePlan(labDrillNarrativeUnitIdV1);
    const second = context.requireNarrativePlanForCursor("node.e2e.drill.chamber");
    expect(first).toBe(second);
    expect(first.nodeIds).toEqual(labDrillNarrativeNodeIdsV1);
    expect(context.requireScenePlan(labDrillSceneUnitIdV1).sceneId).toBe(
      labDrillSceneUnitIdV1,
    );
    expect(
      labRuntimeInspectorSourceV1.getSnapshot().units.filter((unit) =>
        unit.ownerId === ownerId && unit.status === "loaded"
      ),
    ).toHaveLength(4);

    runtime.dispose();
    expect(() => context.requireNarrativePlan(labCalibrationNarrativeUnitIdV1)).toThrow(
      "e2e.narrative_plan_not_prepared",
    );
    expect(
      labRuntimeInspectorSourceV1.getSnapshot().units.filter((unit) => unit.ownerId === ownerId)
        .every((unit) => unit.status === "released"),
    ).toBe(true);
  });

  it("keeps the existing Save cursor stable and prepares its exact replacement unit", async () => {
    const application = await createLabApplicationInstanceV1();
    await application.semantic.dispatch({ kind: "invoke", actionId: "lab.begin_drill" });
    const snapshot = application.admin.inspectForTest().snapshot;
    const cursor = snapshot.state.simulation.narrative.cursor;
    expect(cursor).toBe("node.e2e.drill.chamber");
    if (cursor === null) throw new TypeError("expected drill cursor");
    expect(labNarrativePositionForCursorV1(cursor)).toEqual({
      unitId: labDrillNarrativeUnitIdV1,
      nodeId: cursor,
    });

    const runtime = createLabAddressableRuntimeInstanceV1();
    await runtime.prepareInitial?.();
    expect(() => runtime.executionContext.requireNarrativePlan(labDrillNarrativeUnitIdV1))
      .toThrow("e2e.narrative_plan_not_prepared");
    await runtime.prepareReplacement?.(snapshot);
    expect(runtime.executionContext.requireNarrativePlanForCursor(cursor).nodeIds).toEqual(
      labDrillNarrativeNodeIdsV1,
    );
    expect(runtime.executionContext.requireScenePlan(labDrillSceneUnitIdV1).sceneId).toBe(
      labDrillSceneUnitIdV1,
    );

    runtime.dispose();
    await application.dispose();
  });

  it("loads the GUI document and catalog only for the explicitly selected Web start", async () => {
    const bytes = await readFile(
      new URL(
        "../../assets/gui/code-surface-conformance.gui-composition.json",
        import.meta.url,
      ),
    );
    const runtime = createLabAddressableRuntimeInstanceV1({
      codeSurfaceConformance: true,
      loadRuntimeBytes: (runtimePath) => {
        expect(runtimePath).toBe("assets/gui/code-surface-conformance.gui-composition.json");
        return Promise.resolve(bytes);
      },
    });

    expect(() => runtime.executionContext.requireCodeSurfacePlan()).toThrow(
      "e2e.code_surface_plan_not_prepared",
    );
    await runtime.prepareInitial?.();
    expect(runtime.executionContext.requireCodeSurfacePlan().compositionId).toBe(
      "gui.e2e.code-surface-conformance",
    );
    const ownerId = runtime.executionContext.runtimeInspection.ownerId;
    expect(
      labRuntimeInspectorSourceV1.getSnapshot().codeSurfaceNodes.filter((node) =>
        node.ownerId === ownerId
      ),
    ).toEqual([
      expect.objectContaining({
        nodeId: "node.e2e.code-surface-shell",
        source: "src/application/code-surfaces/conformance-shell.tsx",
        layoutDomain: "application",
        stateOwner: "react_local",
      }),
      expect.objectContaining({
        nodeId: "node.e2e.code-surface-detail",
        source: "src/application/code-surfaces/conformance-detail.tsx",
        layoutDomain: "parent_slot",
        parentNodeId: "node.e2e.code-surface-shell",
      }),
    ]);

    runtime.dispose();
    expect(() => runtime.executionContext.requireCodeSurfacePlan()).toThrow(
      "e2e.code_surface_plan_not_prepared",
    );
  });

  it("projects Web-owned Text packs without turning untouched packs into acquisitions", async () => {
    const manifest = defineTextContentManifestV1({
      revision: 1,
      defaultLocale: "zh-CN",
      locales: [
        { locale: "zh-CN", fallbackLocale: null },
        { locale: "en", fallbackLocale: "zh-CN" },
      ],
      packs: [
        {
          packId: "text-pack.e2e.runtime-opening",
          variants: [
            {
              locale: "zh-CN",
              runtimePath: "assets/content/runtime-opening.zh-CN.text-pack.json",
            },
            {
              locale: "en",
              runtimePath: "assets/content/runtime-opening.en.text-pack.json",
            },
          ],
        },
        {
          packId: "text-pack.e2e.runtime-later",
          variants: [
            {
              locale: "zh-CN",
              runtimePath: "assets/content/runtime-later.zh-CN.text-pack.json",
            },
            {
              locale: "en",
              runtimePath: "assets/content/runtime-later.en.text-pack.json",
            },
          ],
        },
      ],
    });
    type PackIdV1 = (typeof manifest.packs)[number]["packId"];
    const rows = new Map<PackIdV1, WebTextContentPackObservationV1>(
      manifest.packs.map((pack) =>
        [pack.packId, {
          packId: pack.packId,
          status: "unloaded" as const,
          attempt: 0,
          failureCount: 0,
          timing: null,
          diagnosticCode: null,
        }] as const
      ),
    );
    const listeners = new Set<(packId: PackIdV1) => void>();
    const retry = vi.fn((packId: PackIdV1) => {
      const previous = rows.get(packId)!;
      rows.set(packId, {
        ...previous,
        status: "loaded",
        timing: { loadMs: 1, admitMs: 1, activateMs: 0, totalMs: 2 },
        diagnosticCode: null,
      });
      for (const listener of listeners) listener(packId);
      return Promise.resolve(true);
    });
    const textContent: WebTextContentObservationV1 = {
      packs: manifest.packs,
      get: (packId) => rows.get(packId)!,
      subscribe(listener) {
        listeners.add(listener);
        return () => listeners.delete(listener);
      },
      retry,
    };
    const runtime = createLabAddressableRuntimeInstanceV1({ textContent });
    const owner = runtime.executionContext.runtimeInspection;
    owner.activate();
    const opening = manifest.packs.find((pack) => pack.packId === "text-pack.e2e.runtime-opening");
    const later = manifest.packs.find((pack) => pack.packId === "text-pack.e2e.runtime-later");
    const unit = (packId: string) =>
      labRuntimeInspectorSourceV1.getSnapshot().units.find((candidate) =>
        candidate.ownerId === owner.ownerId && candidate.unitId === packId
      );

    expect(unit(opening!.packId)).toMatchObject({ status: "unloaded", attempt: 0 });
    expect(unit(later!.packId)).toMatchObject({ status: "unloaded", attempt: 0 });
    expect(unit(opening!.packId)?.source).toBe(
      "en: assets/content/runtime-opening.en.text-pack.json, " +
        "zh-CN: assets/content/runtime-opening.zh-CN.text-pack.json",
    );

    rows.set(
      opening!.packId,
      {
        ...rows.get(opening!.packId)!,
        status: "failed",
        attempt: 1,
        failureCount: 1,
        diagnosticCode: "web.text_content_required",
      } satisfies WebTextContentPackObservationV1,
    );
    for (const listener of listeners) listener(opening!.packId);

    expect(unit(opening!.packId)).toMatchObject({
      status: "failed",
      attempt: 1,
      failureCount: 1,
      retryable: true,
    });
    expect(unit(later!.packId)).toMatchObject({ status: "unloaded", attempt: 0 });
    await expect(labRuntimeInspectorSourceV1.retry({
      ownerId: owner.ownerId,
      kind: "text",
      unitId: opening!.packId,
    })).resolves.toBe(true);
    expect(retry).toHaveBeenCalledExactlyOnceWith(opening!.packId);
    expect(unit(opening!.packId)).toMatchObject({ status: "loaded", attempt: 1 });
    await expect(labRuntimeInspectorSourceV1.retry({
      ownerId: owner.ownerId,
      kind: "text",
      unitId: opening!.packId,
    })).resolves.toBe(false);

    runtime.dispose();
    expect(unit(later!.packId)).toBeUndefined();
    await expect(labRuntimeInspectorSourceV1.retry({
      ownerId: owner.ownerId,
      kind: "text",
      unitId: opening!.packId,
    })).resolves.toBe(false);
  });

  it("owns two typed Scene/Narrative units and closes Narrative Scene references", () => {
    expect(labSceneUnitManifestV1.scenes.map((scene) => scene.sceneId)).toEqual([
      labDrillSceneUnitIdV1,
      labProcedureSceneUnitIdV1,
    ]);
    expect(labNarrativeUnitManifestV1.units.map((unit) => unit.unitId)).toEqual([
      labCalibrationNarrativeUnitIdV1,
      labDrillNarrativeUnitIdV1,
    ]);
    expect(() => assertLabNarrativeUnitClosureV1()).not.toThrow();
  });
});
