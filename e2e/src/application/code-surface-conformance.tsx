// SPDX-License-Identifier: MIT
import type { ReactElement } from "react";
import { useMemo } from "react";
import {
  CodeSurfaceCompositionHostV1,
  type CompiledCodeSurfaceCompositionV1,
} from "@sillymaker/ui/code-surface";

import type { LabCodeSurfaceContextV1 } from "./code-surface-catalog.ts";
import type { LabApplicationInstanceV1 } from "./core-definition.ts";
import type { LabRuntimeInspectorOwnerV1 } from "./runtime-inspection.ts";

export function LabCodeSurfaceConformancePanelV1(props: {
  readonly semantic: LabApplicationInstanceV1["semantic"];
  readonly composition: CompiledCodeSurfaceCompositionV1<LabCodeSurfaceContextV1>;
  readonly runtimeInspection?: LabRuntimeInspectorOwnerV1;
}): ReactElement {
  const context = useMemo<LabCodeSurfaceContextV1>(() => ({
    async collectSample() {
      await props.semantic.dispatch({
        kind: "invoke" as const,
        actionId: "lab.collect_sample" as const,
      });
    },
  }), [props.semantic]);
  return (
    <CodeSurfaceCompositionHostV1
      composition={props.composition}
      context={context}
      {...(props.runtimeInspection === undefined ? {} : {
        reportFault: props.runtimeInspection.reportCodeSurfaceFault,
        observeLifecycle: props.runtimeInspection.observeCodeSurfaceLifecycle,
      })}
    />
  );
}
