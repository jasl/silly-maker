// SPDX-License-Identifier: MIT
import type { AuthoringSceneRuntimeV1 } from "@sillymaker/base";
import type { CompiledCodeSurfaceCompositionV1 } from "@sillymaker/ui/code-surface";
import {
  assertNarrativeUnitDependencyClosureV1,
  createNarrativeUnitSessionV1,
  createSceneUnitSessionV1,
  defineNarrativeUnitManifestV1,
  defineSceneUnitManifestV1,
  type NarrativeUnitLeaseV1,
  type SceneUnitLeaseV1,
} from "@sillymaker/base/runtime";
import type {
  WebAddressableRuntimeDefinitionV1,
  WebAddressableRuntimeInstanceV1,
  WebTextContentObservationV1,
} from "@sillymaker/web";

import {
  defineLabExecutionContextV1,
  labDrillSceneUnitIdV1,
  type LabExecutionContextV1,
  labProcedureSceneUnitIdV1,
} from "../gameplay/runtime-plans.ts";
import type { LabCodeSurfaceContextV1 } from "./code-surface-catalog.ts";
import {
  isLabCodeSurfaceConformanceSelectedV1,
  labCodeSurfaceCompositionIdV1,
  labCodeSurfaceSourceV1,
} from "./conformance-selection.ts";
import {
  createLabRuntimeInspectorOwnerV1,
  type LabRuntimeInspectorOwnerV1,
  type LabRuntimeInspectorUnitDeclarationV1,
} from "./runtime-inspection.ts";
import type { LabInvocationV1 } from "./semantic.ts";
import type { LabNarrativePlanV1 } from "../gameplay/narrative-runtime.ts";
import {
  labCalibrationEntryNodeIdV1,
  labCalibrationNarrativeUnitIdV1,
  labDrillChamberNodeIdV1,
  labDrillNarrativeUnitIdV1,
  labNarrativePositionForCursorV1,
} from "../gameplay/narrative-topology.ts";
import type { LabSnapshotV1 } from "../gameplay/simulation.ts";

export const labSceneUnitManifestV1 = defineSceneUnitManifestV1({
  revision: 1,
  scenes: [
    {
      sceneId: labProcedureSceneUnitIdV1,
      source: "src/scenes/procedure/procedure.authoring-scene.json",
      load: async () => {
        const module = await import("../scenes/procedure/index.ts");
        return { sceneRuntimePlanV1: module.labProcedureSceneRuntimePlanV1 };
      },
    },
    {
      sceneId: labDrillSceneUnitIdV1,
      source: "src/scenes/drill/drill.authoring-scene.json",
      load: async () => {
        const module = await import("../scenes/drill/index.ts");
        return { sceneRuntimePlanV1: module.labDrillSceneRuntimePlanV1 };
      },
    },
  ],
});

export const labNarrativeUnitManifestV1 = defineNarrativeUnitManifestV1<LabNarrativePlanV1>({
  revision: 1,
  units: [
    {
      unitId: labCalibrationNarrativeUnitIdV1,
      entryNodeIds: [labCalibrationEntryNodeIdV1],
      externalReferences: [],
      source: "src/gameplay/narrative-units/calibration.ts",
      load: async () => {
        const module = await import("../gameplay/narrative-units/calibration.ts");
        return module.labCalibrationNarrativeUnitV1;
      },
    },
    {
      unitId: labDrillNarrativeUnitIdV1,
      entryNodeIds: [labDrillChamberNodeIdV1],
      externalReferences: [],
      dependencies: { sceneIds: [labDrillSceneUnitIdV1] },
      source: "src/gameplay/narrative-units/drill.ts",
      load: async () => {
        const module = await import("../gameplay/narrative-units/drill.ts");
        return module.labDrillNarrativeUnitV1;
      },
    },
  ],
});

/** The Engine Lab's narrow M2 cross-owner closure checkpoint. */
export function assertLabNarrativeUnitClosureV1(): void {
  assertNarrativeUnitDependencyClosureV1(labNarrativeUnitManifestV1, {
    sceneIds: new Set(labSceneUnitManifestV1.scenes.map((scene) => scene.sceneId)),
    guiCompositionIds: new Set(),
    textPackIds: new Set(),
    assetIds: new Set(),
  });
}

/** Exact manifest summaries shared with the detached dev-only Inspector view. */
export const labAddressableRuntimeUnitDeclarationsV1:
  readonly LabRuntimeInspectorUnitDeclarationV1[] = [
    ...labSceneUnitManifestV1.scenes.map((scene) => ({
      kind: "scene" as const,
      unitId: scene.sceneId,
      source: scene.source,
    })),
    ...labNarrativeUnitManifestV1.units.map((unit) => ({
      kind: "narrative" as const,
      unitId: unit.unitId,
      source: unit.source,
      references: [
        ...(unit.dependencies?.sceneIds ?? []).map((unitId) => ({
          kind: "scene" as const,
          unitId,
        })),
        ...(unit.dependencies?.guiCompositionIds ?? []).map((unitId) => ({
          kind: "gui" as const,
          unitId,
        })),
        ...(unit.dependencies?.textPackIds ?? []).map((unitId) => ({
          kind: "text" as const,
          unitId,
        })),
        ...(unit.dependencies?.assetIds ?? []).map((unitId) => ({
          kind: "asset" as const,
          unitId,
        })),
      ],
    })),
    {
      kind: "gui",
      unitId: labCodeSurfaceCompositionIdV1,
      source: labCodeSurfaceSourceV1,
    },
  ];

export interface LabWebExecutionContextV1 extends LabExecutionContextV1 {
  requireCodeSurfacePlan(): CompiledCodeSurfaceCompositionV1<LabCodeSurfaceContextV1>;
  readonly runtimeInspection: LabRuntimeInspectorOwnerV1;
}

type LabAddressableRuntimeInstanceV1 = WebAddressableRuntimeInstanceV1<
  LabWebExecutionContextV1,
  LabInvocationV1,
  LabSnapshotV1
>;

/** Creates one Web-start owner; loaders remain literal and build-known. */
export function createLabAddressableRuntimeInstanceV1(input: {
  readonly codeSurfaceConformance?: boolean;
  readonly loadRuntimeBytes?: (runtimePath: string) => Promise<Uint8Array>;
  readonly textContent?: WebTextContentObservationV1;
} = {}): LabAddressableRuntimeInstanceV1 {
  const sceneSession = createSceneUnitSessionV1({ manifest: labSceneUnitManifestV1 });
  const narrativeSession = createNarrativeUnitSessionV1({ manifest: labNarrativeUnitManifestV1 });
  const retainedScenes = new Map<string, Promise<SceneUnitLeaseV1>>();
  const retainedNarratives = new Map<string, Promise<NarrativeUnitLeaseV1<LabNarrativePlanV1>>>();
  const scenePlans = new Map<string, AuthoringSceneRuntimeV1>();
  const narrativePlans = new Map<string, LabNarrativePlanV1>();
  let codeSurfaceRuntime: import("./code-surface-runtime.ts").LabCodeSurfaceRuntimeV1 | null = null;
  let disposed = false;
  const runtimeInspection = createLabRuntimeInspectorOwnerV1(
    [
      ...labAddressableRuntimeUnitDeclarationsV1,
      ...(input.textContent?.packs.map((pack) => ({
        kind: "text" as const,
        unitId: pack.packId,
        source: pack.variants.map((variant) => `${variant.locale}: ${variant.runtimePath}`).join(
          ", ",
        ),
      })) ?? []),
    ],
  );
  const syncTextInspection = (packId: Parameters<WebTextContentObservationV1["get"]>[0]): void => {
    const observation = input.textContent;
    if (observation === undefined) return;
    const pack = observation.get(packId);
    runtimeInspection.projectUnit({
      kind: "text",
      unitId: pack.packId,
      status: pack.status,
      attempt: pack.attempt,
      failureCount: pack.failureCount,
      timing: pack.timing,
      diagnostic: pack.diagnosticCode === null ? null : { code: pack.diagnosticCode },
    });
  };
  if (input.textContent !== undefined) {
    for (const pack of input.textContent.packs) {
      runtimeInspection.setRetry(
        "text",
        pack.packId,
        () => input.textContent!.retry(pack.packId),
      );
      syncTextInspection(pack.packId);
    }
  }
  const unsubscribeTextInspection = input.textContent?.subscribe(syncTextInspection);

  const retainScene = (sceneId: string): Promise<SceneUnitLeaseV1> => {
    const current = retainedScenes.get(sceneId);
    if (current !== undefined) return current;
    runtimeInspection.acquiring("scene", sceneId);
    const acquiring = sceneSession.acquire(sceneId).then(
      (lease) => {
        if (disposed) {
          lease.release();
          throw new TypeError("e2e.addressable_runtime_disposed");
        }
        scenePlans.set(sceneId, lease.plan);
        runtimeInspection.loaded("scene", sceneId, lease.timing);
        return lease;
      },
      (error: unknown) => {
        retainedScenes.delete(sceneId);
        runtimeInspection.failed("scene", sceneId, {
          code: "e2e.scene_unit_acquire_failed",
          ...(error instanceof Error ? { detail: error.message } : {}),
        });
        throw error;
      },
    );
    retainedScenes.set(sceneId, acquiring);
    return acquiring;
  };

  const retainNarrative = (
    unitId: string,
  ): Promise<NarrativeUnitLeaseV1<LabNarrativePlanV1>> => {
    const current = retainedNarratives.get(unitId);
    if (current !== undefined) return current;
    runtimeInspection.acquiring("narrative", unitId);
    const acquiring = narrativeSession.acquire(unitId).then(
      (lease) => {
        if (disposed) {
          lease.release();
          throw new TypeError("e2e.addressable_runtime_disposed");
        }
        narrativePlans.set(unitId, lease.plan);
        runtimeInspection.loaded("narrative", unitId, lease.timing);
        return lease;
      },
      (error: unknown) => {
        retainedNarratives.delete(unitId);
        runtimeInspection.failed("narrative", unitId, {
          code: "e2e.narrative_unit_acquire_failed",
          ...(error instanceof Error ? { detail: error.message } : {}),
        });
        throw error;
      },
    );
    retainedNarratives.set(unitId, acquiring);
    return acquiring;
  };

  const retainGui = async (): Promise<void> => {
    runtimeInspection.acquiring("gui", labCodeSurfaceCompositionIdV1);
    const loadRuntimeBytes = input.loadRuntimeBytes;
    if (loadRuntimeBytes === undefined) {
      runtimeInspection.failed("gui", labCodeSurfaceCompositionIdV1, {
        code: "e2e.code_surface_runtime_loader_missing",
      });
      throw new TypeError("e2e.code_surface_runtime_loader_missing");
    }
    try {
      if (codeSurfaceRuntime === null) {
        const module = await import("./code-surface-runtime.ts");
        codeSurfaceRuntime = module.createLabCodeSurfaceRuntimeV1(loadRuntimeBytes);
      }
      const lease = await codeSurfaceRuntime.prepare();
      runtimeInspection.loaded("gui", labCodeSurfaceCompositionIdV1, lease.timing);
      runtimeInspection.installCodeSurfaceInspection(lease.plan.inspection);
    } catch (error) {
      runtimeInspection.failed("gui", labCodeSurfaceCompositionIdV1, {
        code: "e2e.gui_unit_acquire_failed",
        ...(error instanceof Error ? { detail: error.message } : {}),
      });
      throw error;
    }
  };

  for (const scene of labSceneUnitManifestV1.scenes) {
    runtimeInspection.setRetry("scene", scene.sceneId, async () => {
      await retainScene(scene.sceneId);
      return true;
    });
  }
  for (const unit of labNarrativeUnitManifestV1.units) {
    runtimeInspection.setRetry("narrative", unit.unitId, async () => {
      await retainNarrative(unit.unitId);
      return true;
    });
  }
  runtimeInspection.setRetry("gui", labCodeSurfaceCompositionIdV1, async () => {
    await retainGui();
    return true;
  });

  const executionContext: LabWebExecutionContextV1 = {
    ...defineLabExecutionContextV1({
      requireScenePlan(sceneId: string): AuthoringSceneRuntimeV1 {
        const plan = scenePlans.get(sceneId);
        if (plan === undefined) throw new TypeError(`e2e.scene_plan_not_prepared:${sceneId}`);
        return plan;
      },
      requireNarrativePlan(unitId: string): LabNarrativePlanV1 {
        const plan = narrativePlans.get(unitId);
        if (plan === undefined) throw new TypeError(`e2e.narrative_plan_not_prepared:${unitId}`);
        return plan;
      },
    }),
    requireCodeSurfacePlan() {
      if (codeSurfaceRuntime === null) {
        throw new TypeError("e2e.code_surface_plan_not_prepared");
      }
      return codeSurfaceRuntime.requirePlan();
    },
    runtimeInspection,
  };

  return {
    executionContext,
    async prepareInitial(): Promise<void> {
      // Only the small opening/current pair enters the initial application graph.
      await Promise.all([
        retainScene(labProcedureSceneUnitIdV1),
        retainNarrative(labCalibrationNarrativeUnitIdV1),
      ]);
      if (input.codeSurfaceConformance === true) {
        await retainGui();
      }
    },
    async prepareSemanticInvocation(invocation): Promise<void> {
      if (invocation.kind !== "invoke") return;
      switch (invocation.actionId) {
        case "lab.begin_procedure":
          await retainScene(labProcedureSceneUnitIdV1);
          return;
        case "lab.begin_calibration":
          await retainNarrative(labCalibrationNarrativeUnitIdV1);
          return;
        case "lab.begin_drill":
          await Promise.all([
            retainScene(labDrillSceneUnitIdV1),
            retainNarrative(labDrillNarrativeUnitIdV1),
          ]);
          return;
        default:
          return;
      }
    },
    async prepareReplacement(snapshot): Promise<void> {
      const preparations: Promise<unknown>[] = [];
      if (snapshot.state.simulation.procedure.phase !== "idle") {
        preparations.push(retainScene(labProcedureSceneUnitIdV1));
      }
      const cursor = snapshot.state.simulation.narrative.cursor;
      if (cursor !== null) {
        const position = labNarrativePositionForCursorV1(cursor);
        preparations.push(retainNarrative(position.unitId));
        if (position.unitId === labDrillNarrativeUnitIdV1) {
          preparations.push(retainScene(labDrillSceneUnitIdV1));
        }
      }
      await Promise.all(preparations);
    },
    dispose(): void {
      if (disposed) return;
      disposed = true;
      // Visited authoritative plans stay resident for synchronous replay during
      // this generation. The accepted successor/app close releases every claim.
      for (const lease of retainedScenes.values()) {
        void lease.then((resolved) => resolved.release(), () => undefined);
      }
      for (const lease of retainedNarratives.values()) {
        void lease.then((resolved) => resolved.release(), () => undefined);
      }
      codeSurfaceRuntime?.dispose();
      codeSurfaceRuntime = null;
      retainedScenes.clear();
      retainedNarratives.clear();
      scenePlans.clear();
      narrativePlans.clear();
      sceneSession.dispose();
      narrativeSession.dispose();
      unsubscribeTextInspection?.();
      runtimeInspection.retire();
    },
  };
}

export const labAddressableRuntimeV1: WebAddressableRuntimeDefinitionV1<
  LabExecutionContextV1,
  LabInvocationV1,
  LabSnapshotV1
> = {
  create: (host) =>
    createLabAddressableRuntimeInstanceV1({
      codeSurfaceConformance: isLabCodeSurfaceConformanceSelectedV1(),
      loadRuntimeBytes: host.loadRuntimeBytes,
      ...(host.textContent === undefined ? {} : { textContent: host.textContent }),
    }),
};
