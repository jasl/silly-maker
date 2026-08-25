// SPDX-License-Identifier: MIT
import type { CompiledCodeSurfaceCompositionV1 } from "@sillymaker/ui/code-surface";
import {
  createGuiCompositionUnitSessionInternalV1,
  defineGuiCompositionUnitManifestInternalV1,
  type GuiCompositionUnitLeaseInternalV1,
} from "@sillymaker/ui/code-surface/internal";

import type { LabCodeSurfaceContextV1 } from "./code-surface-catalog.ts";
import {
  labCodeSurfaceCompositionIdV1,
  labCodeSurfaceRuntimePathV1,
  labCodeSurfaceSourceV1,
} from "./conformance-selection.ts";

export const labGuiCompositionUnitManifestV1 = defineGuiCompositionUnitManifestInternalV1<
  LabCodeSurfaceContextV1
>({
  revision: 1,
  compositions: [{
    compositionId: labCodeSurfaceCompositionIdV1,
    runtimePath: labCodeSurfaceRuntimePathV1,
    source: labCodeSurfaceSourceV1,
    loadCatalog: async () => {
      const module = await import("./code-surface-catalog.ts");
      return module.labCodeSurfaceCatalogV1;
    },
  }],
});

export interface LabCodeSurfaceRuntimeV1 {
  prepare(): Promise<GuiCompositionUnitLeaseInternalV1<LabCodeSurfaceContextV1>>;
  requirePlan(): CompiledCodeSurfaceCompositionV1<LabCodeSurfaceContextV1>;
  dispose(): void;
}

/** Exact-query Engine Lab owner; the engine session remains the sole GUI-plan cache. */
export function createLabCodeSurfaceRuntimeV1(
  loadRuntimeBytes: (runtimePath: string) => Promise<Uint8Array>,
): LabCodeSurfaceRuntimeV1 {
  const session = createGuiCompositionUnitSessionInternalV1({
    manifest: labGuiCompositionUnitManifestV1,
    loadRuntimeBytes,
  });
  let retained: Promise<GuiCompositionUnitLeaseInternalV1<LabCodeSurfaceContextV1>> | null = null;
  let disposed = false;

  const prepare = async (): Promise<GuiCompositionUnitLeaseInternalV1<LabCodeSurfaceContextV1>> => {
    if (disposed) throw new TypeError("e2e.code_surface_runtime_disposed");
    if (retained === null) {
      const acquiring = session.acquire(labCodeSurfaceCompositionIdV1).catch((error: unknown) => {
        if (retained === acquiring) retained = null;
        throw error;
      });
      retained = acquiring;
    }
    return await retained;
  };

  return {
    prepare,
    requirePlan(): CompiledCodeSurfaceCompositionV1<LabCodeSurfaceContextV1> {
      const resident = session.getResident(labCodeSurfaceCompositionIdV1);
      if (resident === null) throw new TypeError("e2e.code_surface_plan_not_prepared");
      return resident.plan;
    },
    dispose(): void {
      if (disposed) return;
      disposed = true;
      const lease = retained;
      retained = null;
      if (lease !== null) void lease.then((resolved) => resolved.release(), () => undefined);
      session.dispose();
    },
  };
}
