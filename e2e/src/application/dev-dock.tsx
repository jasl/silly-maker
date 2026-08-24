// SPDX-License-Identifier: MIT
import { useSyncExternalStore } from "react";
import type { ReactElement } from "react";

import { lintNarrativeGraphV1 } from "@sillymaker/base";
import type {
  DevDockContributionSetV1,
  NarrativeGraphDiagnosticViewV1,
} from "@sillymaker/ui/debug";
import {
  DebugNarrativeGraphViewV1,
  DebugValueInspectorV1,
  StageProvenancePanelV1,
  createDevDockContributionSetV1,
} from "@sillymaker/ui/debug";
import { openStorySourceInDevServerV1 } from "@sillymaker/ui/debug/dev-source-client";

import type { LabApplicationInstanceV1 } from "./core-definition.ts";
import { projectLabNarrativeGraphV1 } from "../gameplay/narrative-graph.ts";
import { labMotionSourcesV1, labStageInspectControllerV1 } from "./stage-inspect.ts";

/**
 * The Engine Lab DevDock contributions (R6.1/6.2): read-only inspectors
 * over the exact publication surface the player UI and headless agents
 * consume, plus the narrative graph with its live lint results. Loaded
 * lazily behind the debug_tools capability — none of this enters the
 * player bundle or the resident player DOM.
 */

type LabSemanticV1 = LabApplicationInstanceV1["semantic"];
type LabPublicationV1 = ReturnType<LabSemanticV1["observe"]>;

/** Lint locations carry the node's source ref (`file#nodeId`). */
function nodeIdFromDiagnosticLocationV1(file: string | undefined): string | null {
  if (file === undefined) return null;
  const hashIndex = file.indexOf("#");
  return hashIndex < 0 ? null : file.slice(hashIndex + 1);
}

function LabPublicationSubscriberV1(props: {
  readonly semantic: LabSemanticV1;
  render(publication: LabPublicationV1): ReactElement;
}): ReactElement {
  const publication = useSyncExternalStore(
    props.semantic.subscribe,
    props.semantic.observe,
    props.semantic.observe,
  );
  return props.render(publication);
}

export function createLabDevDockContributionsV1(input: {
  readonly instance: LabApplicationInstanceV1;
}): DevDockContributionSetV1 {
  const semantic = input.instance.semantic;
  const source = (read: () => unknown) => ({
    read,
    subscribe: (listener: () => void) => semantic.subscribe(listener),
  });

  const graph = projectLabNarrativeGraphV1();
  const diagnostics: readonly NarrativeGraphDiagnosticViewV1[] = lintNarrativeGraphV1(graph).map(
    (diagnostic) => ({
      code: diagnostic.code,
      nodeId: nodeIdFromDiagnosticLocationV1(
        diagnostic.location !== undefined && "file" in diagnostic.location
          ? diagnostic.location.file
          : undefined,
      ),
      message: diagnostic.message,
    }),
  );

  return createDevDockContributionSetV1({
    panels: [
      {
        id: "panel.e2e.stage",
        side: "right",
        title: "语义舞台",
        authority: "read_only",
        render: () => (
          <DebugValueInspectorV1
            inspectorId="lab-stage"
            source={source(() => semantic.observe().game.stage)}
          />
        ),
      },
      {
        id: "panel.e2e.interaction",
        side: "right",
        title: "交互与历史",
        authority: "read_only",
        render: () => (
          <DebugValueInspectorV1
            inspectorId="lab-interaction"
            source={source(() => {
              const narrative = semantic.observe().narrative;
              return {
                phase: narrative.phase,
                pending: narrative.pending,
                choiceOptions: narrative.choiceOptions,
                calibration: narrative.calibration,
                historyLength: narrative.history.entries.length,
                historyTail: narrative.history.entries.slice(-5),
              };
            })}
          />
        ),
      },
      {
        id: "panel.e2e.audio",
        side: "right",
        title: "音频意图",
        authority: "read_only",
        render: () => (
          <DebugValueInspectorV1
            inspectorId="lab-audio"
            source={source(() => semantic.observe().game.audio)}
          />
        ),
      },
      {
        id: "panel.e2e.graph",
        side: "left",
        title: "叙事图",
        authority: "read_only",
        render: () => (
          <LabPublicationSubscriberV1
            semantic={semantic}
            render={(publication) => (
              <DebugNarrativeGraphViewV1
                graph={graph}
                diagnostics={diagnostics}
                activeDefinitionId={publication.narrative.pending?.definitionId ?? null}
              />
            )}
          />
        ),
      },
      {
        id: "panel.e2e.provenance",
        side: "left",
        title: "舞台溯源",
        authority: "read_only",
        // Click-to-inspect needs the live stage beside the card.
        stage: "live",
        render: () => (
          <StageProvenancePanelV1
            controller={labStageInspectControllerV1}
            motionSources={labMotionSourcesV1}
            openSource={openStorySourceInDevServerV1}
          />
        ),
      },
    ],
  });
}
