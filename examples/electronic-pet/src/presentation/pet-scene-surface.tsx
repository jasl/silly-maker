// SPDX-License-Identifier: MIT
import { admitGuiCompositionDocumentV1 } from "@sillymaker/base/gui-composition";
import { CodeSurfaceCompositionHostV1 } from "@sillymaker/ui/code-surface";
import type { ReactElement } from "react";

import compositionSourceV1 from "./pet-scene.gui-composition.json" with { type: "json" };
import type { ElectronicPetSceneContextV1 } from "./pet-scene-catalog.ts";
import { electronicPetSceneCatalogV1 } from "./pet-scene-catalog.ts";

const compositionV1 = electronicPetSceneCatalogV1.compile(
  admitGuiCompositionDocumentV1(compositionSourceV1),
);

export function ElectronicPetSceneSurfaceV1(
  props: { readonly context: ElectronicPetSceneContextV1 },
): ReactElement {
  return (
    <CodeSurfaceCompositionHostV1
      composition={compositionV1}
      context={props.context}
      reportFault={(fault) => props.context.reportFailure(fault.error)}
    />
  );
}
