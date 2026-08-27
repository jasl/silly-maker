// SPDX-License-Identifier: MIT
// Component-only PascalCase React shell widgets (Vite Fast Refresh–safe).
// Narrative rendering is a passive Story skin; composition owns its lifecycle and actions.
import { lazy, Suspense, useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { ReactElement } from "react";

import type { DeepReadonly } from "@sillymaker/base";
import type { DefaultGameRootSlotsV1 } from "@sillymaker/ui";
import { Button, SemanticStageV1, useNarrativeAsideV1 } from "@sillymaker/ui";

import { labStageInspectControllerV1 } from "./stage-inspect.ts";
import { labStageAssetsV1, labStageRenderersV1 } from "./stage-rendering.tsx";

import type { LabActionIdV1 } from "./semantic.ts";
import type { CompiledCodeSurfaceCompositionV1 } from "@sillymaker/ui/code-surface";
import type { LabCodeSurfaceContextV1 } from "./code-surface-catalog.ts";
import type { LabApplicationInstanceV1 } from "./core-definition.ts";
import type { LabRuntimeInspectorOwnerV1 } from "./runtime-inspection.ts";
import type { LabUiOverlayIdV1, LabUiPublicationV1 } from "./composition.tsx";
import { labUiTextV1 } from "./ui-text.ts";
import { labDrillTripwireChoiceIdV1 } from "../gameplay/narrative-runtime.ts";
import {
  labBeaconPulseCueIdV1,
  labStageAmbientCatalogV1,
  labStageTransitionCatalogV1,
  labTimelineCatalogV1,
} from "../presentation.ts";

type LabSemanticPortV1 = LabApplicationInstanceV1["semantic"];

const LazyLabCodeSurfaceConformancePanelV1 = lazy(() =>
  import("./code-surface-conformance.tsx").then((module) => ({
    default: module.LabCodeSurfaceConformancePanelV1,
  }))
);

export function LabCodeSurfaceConformanceV1(props: {
  readonly semantic: LabSemanticPortV1;
  readonly composition: CompiledCodeSurfaceCompositionV1<LabCodeSurfaceContextV1>;
  readonly runtimeInspection?: LabRuntimeInspectorOwnerV1;
}): ReactElement {
  return (
    <Suspense fallback={null}>
      <LazyLabCodeSurfaceConformancePanelV1
        semantic={props.semantic}
        composition={props.composition}
        {...(props.runtimeInspection === undefined
          ? {}
          : { runtimeInspection: props.runtimeInspection })}
      />
    </Suspense>
  );
}

const labActionTextIdsV1: Readonly<Record<LabActionIdV1, string>> = {
  "lab.collect_sample": "text.e2e.lab.action.collect_sample",
  "lab.begin_procedure": "text.e2e.lab.action.begin_procedure",
  "lab.advance_procedure": "text.e2e.lab.action.advance_procedure",
  "lab.run_experiment": "text.e2e.lab.action.run_experiment",
  "lab.begin_calibration": "text.e2e.lab.action.begin_calibration",
  "lab.begin_drill": "text.e2e.lab.action.begin_drill",
  "lab.toggle_collector": "text.e2e.lab.action.toggle_collector",
  "lab.sell_sample": "text.e2e.lab.action.sell_sample",
  "lab.buy_banner": "text.e2e.lab.action.buy_banner",
};

/**
 * The player rollback control (R7): availability comes from the instance
 * timeline on every publication render, and the action is the instance port —
 * pure player surface, no debug capability involved.
 */
export function LabRollbackControlV1(props: {
  readonly instance: LabApplicationInstanceV1;
  readonly publication: DeepReadonly<LabUiPublicationV1>;
}): ReactElement {
  const rollback = props.instance.rollback;
  const steps = useSyncExternalStore(
    rollback.subscribe,
    () => rollback.available().steps,
    () => rollback.available().steps,
  );
  return (
    <Button
      data-lab-rollback="true"
      data-lab-rollback-steps={String(steps)}
      disabled={steps < 1}
      onClick={() => void rollback.toPrevious()}
    >
      {labUiTextV1("text.e2e.lab.player.rollback")}
    </Button>
  );
}

export function LabHudV1(props: {
  readonly publication: DeepReadonly<LabUiPublicationV1>;
  readonly semantic: LabSemanticPortV1;
}): ReactElement {
  const monitors = props.publication.semantic.game.monitors;
  return (
    <div data-lab-hud="true">
      <p data-lab-samples={String(props.publication.view.samplesCollected)}>
        {labUiTextV1("text.e2e.lab.hud.samples")}
        {String(props.publication.view.samplesCollected)} · {labUiTextV1("text.e2e.lab.hud.steps")}
        {String(props.publication.view.procedureSteps)}
      </p>
      <p
        data-lab-monitors="true"
        data-lab-gauge-level={String(monitors.gaugeLevel)}
        data-lab-ambient-ignitions={String(monitors.ambientIgnitions)}
        data-lab-collector-units={String(monitors.collectorUnits)}
        data-lab-collector-engaged={monitors.collectorEngaged ? "true" : "false"}
        data-lab-realtime-active={monitors.realtimeActive ? "true" : "false"}
      >
        {labUiTextV1("text.e2e.lab.monitors.gauge")}
        {String(monitors.gaugeLevel)} · {labUiTextV1("text.e2e.lab.monitors.ambient")}
        {String(monitors.ambientIgnitions)} · {labUiTextV1("text.e2e.lab.monitors.collector")}
        {String(monitors.collectorUnits)}
      </p>
      <div role="group" aria-label="实验操作">
        {props.publication.semantic.actions.map((action) => (
          <Button
            key={action.actionId}
            disabled={!action.enabled}
            data-lab-action-id={action.actionId}
            onClick={() =>
              void props.semantic.dispatch(
                { kind: "invoke" as const, actionId: action.actionId },
              )}
          >
            {labUiTextV1(labActionTextIdsV1[action.actionId])}
          </Button>
        ))}
      </div>
    </div>
  );
}

/**
 * The narrative aside window (narrative-aside conformance): a
 * zero-authority dialogue box fed by the instance's commit-only aside push
 * channel. Pages advance locally — no semantic dispatch, no stage-input
 * isolation, no focus capture — and an authoritative say/choice pending
 * taking the dialogue surface force-dismisses it. The Story owns these
 * pixels; the engine only supplies the paging controller.
 */
export function LabAsideWindowV1(props: {
  readonly instance: LabApplicationInstanceV1;
  readonly publication: DeepReadonly<LabUiPublicationV1>;
}): ReactElement | null {
  const pending = props.publication.semantic.narrative.pending;
  const aside = useNarrativeAsideV1({
    subscribeNarrativeAsides: props.instance.subscribeNarrativeAsides,
    epoch: props.publication.view.anchorEpoch,
    dialoguePending: pending !== null && (pending.kind === "say" || pending.kind === "choice"),
  });
  if (aside.view === null) return null;
  return (
    <aside
      data-lab-aside="true"
      data-lab-aside-sequence={String(aside.view.asideSequence)}
      data-lab-aside-page-index={String(aside.view.pageIndex)}
      data-lab-aside-page-count={String(aside.view.pageCount)}
    >
      {aside.view.page.speakerTextId === null
        ? null
        : <p data-lab-aside-speaker="true">{labUiTextV1(aside.view.page.speakerTextId)}</p>}
      <p data-lab-aside-text="true">{labUiTextV1(aside.view.page.textId)}</p>
      <Button data-lab-aside-advance="true" onClick={aside.advance}>
        {labUiTextV1("text.e2e.lab.narrative.cal.advance")}
      </Button>
    </aside>
  );
}

/**
 * The Engine Lab Story contributions for the default GameRoot: a stage
 * panel, a HUD with the action catalog, a completion narrative line, and a
 * journal overlay — all added without modifying the composer.
 */
/**
 * The Lab stage slot: the semantic stage plus the R5 timeline wiring. A
 * committed calibration result triggers the beacon-pulse cue through the
 * ordinary presentation intent, and the last timeline event is exposed as
 * a data probe for tests. The one stage-to-gameplay path is the declared
 * hit region: activating the crate's collection port dispatches the same
 * semantic invocation as the HUD button — the stage never mutates State.
 */
export function LabStageV1(props: {
  readonly context: Parameters<
    NonNullable<
      DefaultGameRootSlotsV1<LabUiPublicationV1, LabSemanticPortV1, LabUiOverlayIdV1>["background"]
    >
  >[0];
}): ReactElement {
  const { context } = props;
  const calibration = context.publication.semantic.narrative.calibration;
  const [lastCueEvent, setLastCueEvent] = useState<string | null>(null);
  const previousCalibrationRef = useRef(calibration);
  const intents = context.intents;

  useEffect(() => {
    const previous = previousCalibrationRef.current;
    previousCalibrationRef.current = calibration;
    if (previous === null && calibration !== null) {
      intents.execute(
        { kind: "presentation.play_cue" as const, cueId: labBeaconPulseCueIdV1 },
      );
    }
  }, [calibration, intents]);

  return (
    <section
      data-lab-stage="true"
      data-lab-cue-event={lastCueEvent ?? undefined}
      aria-label={context.publication.view.stageName}
    >
      <SemanticStageV1
        target={context.publication.view.stageTarget}
        revision={context.publication.semantic.revision}
        epoch={context.publication.view.anchorEpoch}
        catalog={labStageTransitionCatalogV1}
        renderers={labStageRenderersV1}
        accessibleName={context.publication.view.stageName}
        ambient={labStageAmbientCatalogV1}
        timelines={labTimelineCatalogV1}
        cues={context.cues}
        onTimelineEvent={(eventId) => setLastCueEvent(eventId)}
        assets={labStageAssetsV1}
        onHitRegionActivate={(activation) => {
          if (activation.regionId !== "zone.crate.collect") return;
          // Pending-aware routing (the shared-stage-input composition):
          // regions never gain routing power — every branch lands on an
          // occurrence-fenced command that rejects stale fences whole.
          const pending = context.publication.semantic.narrative.pending;
          if (pending === null) {
            void context.semantic.dispatch(
              { kind: "invoke" as const, actionId: "lab.collect_sample" as const },
            );
            return;
          }
          if (
            pending.kind === "choice" && pending.stageInput === "shared" &&
            pending.options.some((option) => option.choiceId === labDrillTripwireChoiceIdV1)
          ) {
            // The night-menu shape: the crate is the collector fixture, so
            // activating it chooses the tripwire option on this occurrence.
            void context.semantic.dispatch(
              {
                kind: "resolve" as const,
                expectedOccurrenceId: pending.occurrenceId,
                resolution: {
                  kind: "choose" as const,
                  choiceId: labDrillTripwireChoiceIdV1,
                },
              },
            );
            return;
          }
          if (pending.kind === "hold" && pending.stageInput === "shared") {
            // The mid-hold input write, fenced to this hold's occurrence;
            // the hold's own arm reads it at the next settlement's t=0.
            void context.semantic.dispatch(
              {
                kind: "hold_write" as const,
                actionId: "lab.engage_collector" as const,
                expectedHoldOccurrenceId: pending.occurrenceId,
              },
            );
          }
          // Isolated pendings: the stage is inert for real pointers; a
          // synthetic activation must not dispatch anything.
        }}
        inspect={labStageInspectControllerV1}
      />
    </section>
  );
}

/**
 * The semantic shop overlay — the AI-authoring canary for Story overlays.
 * It renders exclusively from the published projection (balance, action
 * availability with blocked reasons) and dispatches ordinary semantic
 * invocations; it never reads raw State and never mutates anything itself.
 */
export function LabShopOverlayV1(props: {
  readonly publication: DeepReadonly<LabUiPublicationV1>;
  readonly semantic: LabSemanticPortV1;
}): ReactElement {
  const shopActionIds = ["lab.sell_sample", "lab.buy_banner"] as const;
  return (
    <div data-lab-shop="true">
      <p data-lab-shop-balance={String(props.publication.view.credits)}>
        {labUiTextV1("text.e2e.lab.overlay.shop.balance")}
        {String(props.publication.view.credits)}
      </p>
      <div role="group" aria-label={labUiTextV1("text.e2e.lab.overlay.shop.title")}>
        {shopActionIds.map((actionId) => {
          const action = props.publication.semantic.actions.find(
            (candidate) => candidate.actionId === actionId,
          );
          if (action === undefined) return null;
          return (
            <Button
              key={actionId}
              disabled={!action.enabled}
              data-lab-shop-action={actionId}
              data-lab-shop-blocked={action.blockedBy ?? undefined}
              onClick={() => void props.semantic.dispatch({ kind: "invoke" as const, actionId })}
            >
              {labUiTextV1(labActionTextIdsV1[actionId])}
            </Button>
          );
        })}
      </div>
    </div>
  );
}
