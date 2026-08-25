// @vitest-environment jsdom
// SPDX-License-Identifier: MIT
import { cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { createLabApplicationInstanceV1 } from "../application/core-application.ts";
import { LabRuntimeInspectionActivationV1 } from "../application/runtime-inspection-react.tsx";
import {
  createLabRuntimeInspectorOwnerV1,
  labRuntimeInspectorSourceV1,
} from "../application/runtime-inspection.ts";
import { labDrillSceneUnitIdV1 } from "../gameplay/runtime-plans.ts";
import { labDrillNarrativeUnitIdV1 } from "../gameplay/narrative-topology.ts";

afterEach(cleanup);

describe("Engine Lab committed runtime references", () => {
  it("marks current only from the committed semantic publication", async () => {
    const application = await createLabApplicationInstanceV1();
    const owner = createLabRuntimeInspectorOwnerV1([
      { kind: "scene", unitId: labDrillSceneUnitIdV1, source: "src/drill.json" },
      { kind: "narrative", unitId: labDrillNarrativeUnitIdV1, source: "src/drill.ts" },
    ]);
    render(
      <LabRuntimeInspectionActivationV1
        semantic={application.semantic}
        owner={owner}
        codeSurfaceSelected={false}
      />,
    );
    expect(
      labRuntimeInspectorSourceV1.getSnapshot().units.filter((unit) =>
        unit.ownerId === owner.ownerId && unit.current
      ),
    ).toEqual([]);

    await application.semantic.dispatch({ kind: "invoke", actionId: "lab.begin_drill" });
    await waitFor(() =>
      expect(
        labRuntimeInspectorSourceV1.getSnapshot().units.filter((unit) =>
          unit.ownerId === owner.ownerId && unit.current
        ).map((unit) => `${unit.kind}:${unit.unitId}`),
      ).toEqual([
        `narrative:${labDrillNarrativeUnitIdV1}`,
        `scene:${labDrillSceneUnitIdV1}`,
      ])
    );

    owner.retire();
    await application.dispose();
  });
});
