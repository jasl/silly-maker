// SPDX-License-Identifier: MIT
import { useMemo, useSyncExternalStore } from "react";
import type { ReactElement } from "react";

import { lintNarrativeGraphV1 } from "@sillymaker/base";
import type {
  DevDockContributionSetV1,
  MotionWorkbenchPreviewV1,
  NarrativeGraphDiagnosticViewV1,
} from "@sillymaker/ui/debug";
import {
  DebugNarrativeGraphViewV1,
  DebugValueInspectorV1,
  MotionWorkbenchLauncherV1,
  StageProvenancePanelV1,
  createDevDockContributionSetV1,
  createDevServerMotionIoV1,
  openStorySourceInDevServerV1,
} from "@sillymaker/ui/debug";
import {
  createSemanticStageStateV1,
  projectStageRenderTargetV1,
  reduceStageMutationsV1,
} from "@sillymaker/base";

import type { LabApplicationInstanceV1 } from "./core-definition.ts";
import { projectLabNarrativeGraphV1 } from "../gameplay/narrative-graph.ts";
import { labStageContentCatalogV1 } from "../presentation.ts";
import {
  labStageContentIdsV1,
  labStageIdV1,
  labStageLayerIdsV1,
  labStageTagsV1,
} from "../stage-ids.ts";
import { labViewportCanvasV1 } from "./composition.tsx";
import { labStageRenderersV1 } from "./shell-ui.tsx";
import {
  labMotionSourcesV1,
  labStageInspectControllerV1,
  labWorkbenchStoreV1,
} from "./stage-inspect.ts";

/**
 * The Workbench preview fixture: the storeroom background plus the lead
 * character at their canonical placement — the same detached-target pattern
 * as the Cat Cafe narrative preview (no Session, no reconciler).
 */
function labWorkbenchPreviewV1(): MotionWorkbenchPreviewV1 {
  const empty = createSemanticStageStateV1({
    stageId: labStageIdV1,
    layerIds: [...labStageLayerIdsV1],
  });
  const outcome = reduceStageMutationsV1(empty, [
    Object.freeze({
      kind: "show" as const,
      layerId: "layer.e2e.background",
      tag: labStageTagsV1.background,
      contentId: labStageContentIdsV1.backgroundStoreroom,
    }),
    Object.freeze({
      kind: "show" as const,
      layerId: "layer.e2e.characters",
      tag: labStageTagsV1.alpha,
      contentId: labStageContentIdsV1.characterAlpha,
      zOrder: 10,
      placement: Object.freeze({
        x: 480,
        y: 620,
        scalePermille: 1000,
        opacityPermille: 1000,
        mirrored: false,
      }),
      appearance: Object.freeze({ pose: "standing", expression: "neutral" }),
    }),
  ]);
  if (outcome.kind !== "applied") throw new TypeError("lab workbench preview must apply");
  return Object.freeze({
    target: projectStageRenderTargetV1(outcome.state, labStageContentCatalogV1).target,
    renderers: labStageRenderersV1,
    entryKey: `layer.e2e.characters:${labStageTagsV1.alpha}`,
    canvas: labViewportCanvasV1,
  });
}

function LabWorkbenchPanelV1(): ReactElement {
  const preview = useMemo(labWorkbenchPreviewV1, []);
  const io = useMemo(createDevServerMotionIoV1, []);
  return (
    <MotionWorkbenchLauncherV1
      store={labWorkbenchStoreV1}
      sources={labMotionSourcesV1}
      fallbackPreview={preview}
      cases={[
        {
          caseId: "case.e2e.char-enter",
          label: "角色入场（储藏室）",
          motionId: "motion.e2e.char-enter",
          preview,
        },
      ]}
      io={io}
    />
  );
}

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
  const source = (read: () => unknown) =>
    Object.freeze({
      read,
      subscribe: (listener: () => void) => semantic.subscribe(listener),
    });

  const graph = projectLabNarrativeGraphV1();
  const diagnostics: readonly NarrativeGraphDiagnosticViewV1[] = lintNarrativeGraphV1(graph).map(
    (diagnostic) =>
      Object.freeze({
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
        render: () => (
          <StageProvenancePanelV1
            controller={labStageInspectControllerV1}
            motionSources={labMotionSourcesV1}
            openSource={openStorySourceInDevServerV1}
            onEditMotion={(entry, capture) => labWorkbenchStoreV1.open(entry, capture)}
          />
        ),
      },
      {
        id: "panel.e2e.workbench",
        side: "left",
        title: "Motion 工坊",
        authority: "read_only",
        render: () => <LabWorkbenchPanelV1 />,
      },
    ],
  });
}
