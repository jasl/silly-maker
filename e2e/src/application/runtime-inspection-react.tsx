// SPDX-License-Identifier: MIT
import { useLayoutEffect } from "react";
import type { ReactElement } from "react";

import type { RuntimeInspectorUnitIdentityV1 } from "@sillymaker/studio";

import { labDrillSceneUnitIdV1, labProcedureSceneUnitIdV1 } from "../gameplay/runtime-plans.ts";
import { labDrillNarrativeUnitIdV1 } from "../gameplay/narrative-topology.ts";
import type { LabApplicationInstanceV1 } from "./core-definition.ts";
import { labCodeSurfaceCompositionIdV1 } from "./conformance-selection.ts";
import type { LabRuntimeInspectorOwnerV1 } from "./runtime-inspection.ts";

export function LabRuntimeInspectionActivationV1(props: {
  readonly semantic: LabApplicationInstanceV1["semantic"];
  readonly owner: LabRuntimeInspectorOwnerV1;
  readonly codeSurfaceSelected: boolean;
}): ReactElement | null {
  useLayoutEffect(() => {
    props.owner.activate();
    const update = (): void => {
      const publication = props.semantic.observe();
      const current: RuntimeInspectorUnitIdentityV1[] = [];
      if (publication.game.procedurePhase !== "idle") {
        current.push({ kind: "scene", unitId: labProcedureSceneUnitIdV1 });
      }
      const narrativeUnitId = publication.narrative.unitId;
      if (narrativeUnitId !== null) {
        current.push({ kind: "narrative", unitId: narrativeUnitId });
        if (narrativeUnitId === labDrillNarrativeUnitIdV1) {
          current.push({ kind: "scene", unitId: labDrillSceneUnitIdV1 });
        }
      }
      if (props.codeSurfaceSelected) {
        current.push({ kind: "gui", unitId: labCodeSurfaceCompositionIdV1 });
      }
      props.owner.setCurrent(current);
    };
    update();
    return props.semantic.subscribe(update);
  }, [props.codeSurfaceSelected, props.owner, props.semantic]);
  return null;
}
