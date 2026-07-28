// SPDX-License-Identifier: MIT
// PascalCase React shell widgets (Vite Fast Refresh–safe).
// Narrative player lives in `narrative-ui.tsx`; application binding in `composition.tsx`.
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { ReactElement } from "react";

import type { DeepReadonly, InteractionResolutionV1 } from "@sillymaker/base";
import type { DefaultGameRootSlotsV1, SemanticStageEntryRendererV1 } from "@sillymaker/ui";
import { Button, SemanticStageV1 } from "@sillymaker/ui";

import type { LabActionIdV1 } from "./semantic.ts";
import type { LabApplicationInstanceV1 } from "./core-definition.ts";
import type { LabUiOverlayIdV1, LabUiPublicationV1 } from "./composition.tsx";
import { labUiTextV1 } from "./ui-text.ts";
import {
  labBeaconPulseCueIdV1,
  labStageTransitionCatalogV1,
  labTimelineCatalogV1,
} from "../presentation.ts";

type LabSemanticPortV1 = LabApplicationInstanceV1["semantic"];

const labActionTextIdsV1: Readonly<Record<LabActionIdV1, string>> = Object.freeze({
  "lab.collect_sample": "text.e2e.lab.action.collect_sample",
  "lab.begin_procedure": "text.e2e.lab.action.begin_procedure",
  "lab.advance_procedure": "text.e2e.lab.action.advance_procedure",
  "lab.run_experiment": "text.e2e.lab.action.run_experiment",
  "lab.begin_calibration": "text.e2e.lab.action.begin_calibration",
  "lab.sell_sample": "text.e2e.lab.action.sell_sample",
  "lab.buy_banner": "text.e2e.lab.action.buy_banner",
});

/**
 * Code-native stage entry renderers keyed by the catalog's renderer IDs.
 * They draw from Strict JSON props only; missing registrations fall back to
 * the host's code-native placeholder with a diagnostic.
 */
export const labStageRenderersV1: Readonly<Record<string, SemanticStageEntryRendererV1>> =
  Object.freeze({
    "renderer.e2e.lab.stage-background": ({ entry }) => (
      <div
        data-lab-surface={String(entry.props.surface)}
        style={{
          width: "1600px",
          height: "1000px",
          background:
            entry.props.surface === "storeroom"
              ? "linear-gradient(180deg, #3a3630, #17140f)"
              : "linear-gradient(180deg, #2b3a4a, #101820)",
        }}
      />
    ),
    "renderer.e2e.lab.stage-character": ({ entry }) => (
      <figure
        data-lab-character={entry.contentId}
        data-lab-pose={String(entry.props.pose)}
        data-lab-expression={String(entry.props.expression)}
        style={{
          margin: 0,
          width: "220px",
          height: "360px",
          borderRadius: "110px 110px 12px 12px",
          background: "rgba(214, 205, 189, 0.85)",
          transform: "translate(-50%, -100%)",
        }}
      >
        <figcaption style={{ paddingBlockStart: "1rem", textAlign: "center", color: "#20242c" }}>
          {entry.accessibleName} · {String(entry.props.expression)}
        </figcaption>
      </figure>
    ),
    "renderer.e2e.lab.stage-prop": ({ entry }) => (
      <div
        data-lab-prop={entry.contentId}
        style={
          entry.props.variant === "banner"
            ? {
                width: "420px",
                height: "72px",
                border: "3px solid #8a5a2b",
                background: "#b3452e",
                transform: "translate(-50%, -100%)",
              }
            : {
                width: "160px",
                height: "120px",
                border: "3px solid #9c8a63",
                background: "#6f6146",
                transform: "translate(-50%, -100%)",
              }
        }
      />
    ),
  });

function labResolveV1(
  semantic: LabSemanticPortV1,
  expectedOccurrenceId: string,
  resolution: InteractionResolutionV1,
): void {
  void semantic.dispatch(
    Object.freeze({ kind: "resolve" as const, expectedOccurrenceId, resolution }),
  );
}

/**
 * The player rollback control (R7): availability comes from the instance
 * ring on every publication render, and the action is the instance port —
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
      onClick={() => void props.instance.rollback.toPrevious()}
    >
      {labUiTextV1("text.e2e.lab.player.rollback")}
    </Button>
  );
}

/**
 * Presentation-barrier load recovery. A barrier restored by a load, refresh,
 * or rebootstrap arrives on a fresh presentation epoch (or a fresh mount);
 * its transition will never replay, so the `settle` policy acknowledges it
 * immediately through the ordinary semantic command. Barriers created
 * in-session keep waiting for the real transition acknowledgment, and any
 * late pre-load callback was already dropped by the reconciler's epoch
 * fence.
 */
export function LabBarrierRecoveryV1(props: {
  readonly publication: DeepReadonly<LabUiPublicationV1>;
  readonly semantic: LabSemanticPortV1;
}): null {
  const pending = props.publication.semantic.narrative.pending;
  const epoch = props.publication.view.anchorEpoch;
  const { semantic } = props;
  const barrier = pending?.kind === "presentation_barrier" ? pending : null;
  const barrierOccurrenceId = barrier?.occurrenceId ?? null;
  const barrierTransitionId = barrier?.expectedTransitionId ?? null;
  const loadRecovery = barrier?.loadRecovery ?? null;
  const seenEpochRef = useRef<number | null>(null);

  useEffect(() => {
    const freshEpoch = seenEpochRef.current !== epoch;
    seenEpochRef.current = epoch;
    if (!freshEpoch || barrierOccurrenceId === null || barrierTransitionId === null) return;
    // The Engine Lab ships the `settle` policy; a future `replay` policy
    // would re-run the transition before acknowledging.
    if (loadRecovery === "settle") {
      labResolveV1(
        semantic,
        barrierOccurrenceId,
        Object.freeze({ kind: "barrier_completed" as const, transitionId: barrierTransitionId }),
      );
    }
  }, [semantic, epoch, barrierOccurrenceId, barrierTransitionId, loadRecovery]);

  return null;
}

export function LabHudV1(props: {
  readonly publication: DeepReadonly<LabUiPublicationV1>;
  readonly semantic: LabSemanticPortV1;
}): ReactElement {
  return (
    <div data-lab-hud="true">
      <p>
        {labUiTextV1("text.e2e.lab.hud.samples")}
        {String(props.publication.view.samplesCollected)} · {labUiTextV1("text.e2e.lab.hud.steps")}
        {String(props.publication.view.procedureSteps)}
      </p>
      <div role="group" aria-label="实验操作">
        {props.publication.semantic.actions.map((action) => (
          <Button
            key={action.actionId}
            disabled={!action.enabled}
            data-lab-action-id={action.actionId}
            onClick={() =>
              void props.semantic.dispatch(
                Object.freeze({ kind: "invoke" as const, actionId: action.actionId }),
              )
            }
          >
            {labUiTextV1(labActionTextIdsV1[action.actionId])}
          </Button>
        ))}
      </div>
    </div>
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
 * a data probe for tests. Pure presentation: no gameplay dispatch here.
 */
export function LabStageV1(props: {
  readonly context: Parameters<
    NonNullable<
      DefaultGameRootSlotsV1<LabUiPublicationV1, LabSemanticPortV1, LabUiOverlayIdV1>["background"]
    >
  >[0];
}): ReactElement {
  const { context } = props;
  const pending = context.publication.semantic.narrative.pending;
  const calibration = context.publication.semantic.narrative.calibration;
  const [lastCueEvent, setLastCueEvent] = useState<string | null>(null);
  const previousCalibrationRef = useRef(calibration);
  const intents = context.intents;

  useEffect(() => {
    const previous = previousCalibrationRef.current;
    previousCalibrationRef.current = calibration;
    if (previous === null && calibration !== null) {
      intents.execute(
        Object.freeze({ kind: "presentation.play_cue" as const, cueId: labBeaconPulseCueIdV1 }),
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
        timelines={labTimelineCatalogV1}
        cues={context.cues}
        onTimelineEvent={(eventId) => setLastCueEvent(eventId)}
        onAcknowledgment={(acknowledgment) => {
          // A completed acknowledged transition confirms a pending
          // presentation barrier through an ordinary semantic command.
          // Mismatched or late acknowledgments dispatch nothing here, and
          // anything stale that still slips through is rejected at the
          // queue front by the occurrence fence.
          if (
            pending?.kind === "presentation_barrier" &&
            acknowledgment.outcome !== "cancelled" &&
            acknowledgment.transitionId === pending.expectedTransitionId
          ) {
            labResolveV1(
              context.semantic,
              pending.occurrenceId,
              Object.freeze({
                kind: "barrier_completed" as const,
                transitionId: acknowledgment.transitionId,
              }),
            );
          }
        }}
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
              onClick={() =>
                void props.semantic.dispatch(Object.freeze({ kind: "invoke" as const, actionId }))
              }
            >
              {labUiTextV1(labActionTextIdsV1[actionId])}
            </Button>
          );
        })}
      </div>
    </div>
  );
}
