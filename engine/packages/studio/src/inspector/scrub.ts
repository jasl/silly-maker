// SPDX-License-Identifier: MIT
import {
  evaluateTimelineAtV1,
  motionTotalDurationMsV1,
  sampleMotionAtV1,
  timelineDurationV1,
} from "@sillymaker/base";
import type {
  MotionDefinitionV1,
  MotionSampleV1,
  TimelineCatalogV1,
  TimelineChannelValueV1,
  TimelineDefinitionV1,
} from "@sillymaker/base";
import type { CompiledAuthoringSceneV1 } from "@sillymaker/base/authoring/scene";

export type InspectorScrubChoiceV1 =
  | {
    readonly key: string;
    readonly kind: "motion";
    readonly label: string;
    readonly durationMs: number;
    readonly entryKey: string;
    readonly definition: MotionDefinitionV1;
  }
  | {
    readonly key: string;
    readonly kind: "timeline";
    readonly label: string;
    readonly durationMs: number;
    readonly definition: TimelineDefinitionV1;
  };

export interface InspectorScrubSampleV1 {
  readonly timelineOverlay: readonly TimelineChannelValueV1[] | null;
  readonly motionOverlay: ReadonlyMap<string, MotionSampleV1> | null;
}

/** Resolved current-Scene references only; source enumeration stays outside this model. */
export function inspectorScrubChoicesV1(
  compiled: CompiledAuthoringSceneV1,
  motionDefinitions: ReadonlyMap<string, MotionDefinitionV1>,
  timelineCatalog: TimelineCatalogV1 | undefined,
): readonly InspectorScrubChoiceV1[] {
  const targetByObject = new Map(
    compiled.objectTargets.map(({ objectId, target }) => [objectId as string, target] as const),
  );
  const choices: InspectorScrubChoiceV1[] = [];
  const seen = new Set<string>();

  for (const reference of compiled.bindings.motions) {
    const target = targetByObject.get(reference.objectId as string);
    const definition = motionDefinitions.get(reference.id);
    if (target === undefined || definition === undefined) continue;
    const key = `motion:${reference.objectId as string}:${reference.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    choices.push({
      key,
      kind: "motion",
      label: `${reference.id} · ${reference.objectId as string}`,
      durationMs: motionTotalDurationMsV1(definition),
      entryKey: `${target.layerId as string}:${target.tag as string}`,
      definition,
    });
  }

  if (timelineCatalog !== undefined) {
    for (const reference of compiled.bindings.timelines) {
      const key = `timeline:${reference.id}`;
      if (seen.has(key)) continue;
      const definition = timelineCatalog.resolveTimeline(reference.id);
      if (definition === null) continue;
      seen.add(key);
      choices.push({
        key,
        kind: "timeline",
        label: reference.id,
        durationMs: timelineDurationV1(definition),
        definition,
      });
    }
  }
  return choices;
}

/** Pure preview sampling. It never advances a Session or authoring revision. */
export function sampleInspectorScrubV1(
  choice: InspectorScrubChoiceV1 | null,
  elapsedMs: number,
): InspectorScrubSampleV1 {
  if (choice === null) return { timelineOverlay: null, motionOverlay: null };
  const clamped = Math.max(0, Math.min(choice.durationMs, elapsedMs));
  if (choice.kind === "timeline") {
    return {
      timelineOverlay: evaluateTimelineAtV1(choice.definition, clamped).values,
      motionOverlay: null,
    };
  }
  return {
    timelineOverlay: null,
    motionOverlay: new Map([[choice.entryKey, sampleMotionAtV1(choice.definition, clamped)]]),
  };
}
