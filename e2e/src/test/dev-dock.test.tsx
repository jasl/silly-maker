// SPDX-License-Identifier: MIT
// @vitest-environment jsdom
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { createLabApplicationInstanceV1 } from "../application/core-application.ts";
import { createLabDevDockContributionsV1 } from "../application/dev-dock.tsx";

afterEach(cleanup);

describe("Lab DevDock contributions", () => {
  it("exposes read-only inspectors whose data matches the observe surface", async () => {
    const instance = await createLabApplicationInstanceV1();
    try {
      const contributions = createLabDevDockContributionsV1({ instance });
      expect(contributions.panels.map((panel) => panel.id)).toEqual([
        "panel.e2e.stage",
        "panel.e2e.interaction",
        "panel.e2e.audio",
        "panel.e2e.graph",
        "panel.e2e.provenance",
        "panel.e2e.workbench",
      ]);
      expect(contributions.panels.every((panel) => panel.authority === "read_only")).toBe(true);
      expect(
        contributions.panels.map((panel) => [panel.id, panel.stage ?? "live"]),
      ).toEqual([
        ["panel.e2e.stage", "live"],
        ["panel.e2e.interaction", "live"],
        ["panel.e2e.audio", "live"],
        ["panel.e2e.graph", "live"],
        ["panel.e2e.provenance", "live"],
        ["panel.e2e.workbench", "live"],
      ]);

      // Drive the narrative to a boundary, then the inspectors must show the
      // same data the headless observe surface reports.
      const begin = await instance.semantic.dispatch({
        kind: "invoke",
        actionId: "lab.begin_calibration",
      } as never);
      expect(begin).toMatchObject({ kind: "committed" });
      const publication = instance.semantic.observe();

      const interactionPanel = contributions.panels.find(
        (panel) => panel.id === "panel.e2e.interaction",
      );
      const { container } = render(<>{interactionPanel?.render()}</>);
      const text = container.textContent ?? "";
      expect(text).toContain(publication.narrative.pending?.occurrenceId ?? "missing");
      expect(text).toContain(publication.narrative.pending?.definitionId ?? "missing");

      // The graph panel highlights the pending interaction and is lint clean.
      const graphPanel = contributions.panels.find((panel) => panel.id === "panel.e2e.graph");
      const graphRender = render(<>{graphPanel?.render()}</>);
      const active = graphRender.container.querySelector("[data-graph-active='true']");
      expect(active).not.toBeNull();
      expect(graphRender.container.querySelector("[data-graph-lint='clean']")).not.toBeNull();
    } finally {
      await instance.dispose();
    }
  });
});
