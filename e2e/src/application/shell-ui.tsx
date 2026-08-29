// SPDX-License-Identifier: MIT
// PascalCase React shell widgets (Vite Fast Refresh–safe).
// Narrative rendering is a passive Story skin; composition owns its lifecycle and actions.
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { ReactElement } from "react";

import type { DeepReadonly } from "@sillymaker/base";
import type {
  AssetUrlRegistryV1,
  DefaultGameRootSlotsV1,
  SemanticStageEntryRendererV1,
} from "@sillymaker/ui";
import {
  Button,
  ChromeWidgetSurfaceV1,
  SemanticStageV1,
  useNarrativeAsideV1,
} from "@sillymaker/ui";

import { labStageInspectControllerV1 } from "./stage-inspect.ts";

import type { LabActionIdV1 } from "./semantic.ts";
import type { LabApplicationInstanceV1 } from "./core-definition.ts";
import type { LabUiOverlayIdV1, LabUiPublicationV1 } from "./composition.tsx";
import { labUiTextV1 } from "./ui-text.ts";
import { labDrillChromeLayoutV1, labDrillEngageIntentIdV1 } from "../chrome/index.ts";
import { labDrillTripwireChoiceIdV1 } from "../gameplay/narrative.ts";
import {
  labBeaconPulseCueIdV1,
  labStageAmbientCatalogV1,
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
  "lab.begin_drill": "text.e2e.lab.action.begin_drill",
  "lab.toggle_collector": "text.e2e.lab.action.toggle_collector",
  "lab.sell_sample": "text.e2e.lab.action.sell_sample",
  "lab.buy_banner": "text.e2e.lab.action.buy_banner",
});

/**
 * The crate-glow hover reveal (shaped-hit-regions drill): the region's
 * declared `hoverAssetId` resolved to an inline SVG matching the collection
 * port's octagon in the crate's 166×126 geometry box. Reveal is feedback
 * only — activation flows through `onHitRegionActivate` below.
 */
const labCrateGlowUrlV1 = `data:image/svg+xml,${
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 166 126">' +
      '<polygon points="20 0, 146 0, 166 20, 166 106, 146 126, 20 126, 0 106, 0 20" ' +
      'fill="rgba(255, 214, 130, 0.4)" stroke="#ffd682" stroke-width="4"/></svg>',
  )
}`;

/**
 * The Lab's stage asset port. The conformance Story ships no media files,
 * so hover-reveal art resolves to a static data URI; everything else keeps
 * the code-native fallback. Static registry — the revision never moves.
 */
export const labStageAssetsV1: AssetUrlRegistryV1 = Object.freeze({
  resolve: (assetId: never, usage: never) =>
    (usage as string) === "stage_hover_reveal" &&
      (assetId as string) === "asset.e2e.lab.crate-glow"
      ? Object.freeze({ delivery: "runtime_image", url: labCrateGlowUrlV1 })
      : Object.freeze({ delivery: "code_fallback" }),
  observe: () => Object.freeze({ revision: 0 }),
  subscribe: () => () => {},
});

/**
 * Code-native stage entry renderers keyed by the catalog's renderer IDs.
 * They draw from Strict JSON props only; missing registrations fall back to
 * the host's code-native placeholder with a diagnostic.
 */
export const labStageRenderersV1: Readonly<Record<string, SemanticStageEntryRendererV1>> = Object
  .freeze({
    "renderer.e2e.lab.stage-background": ({ entry }) => (
      <div
        data-lab-surface={String(entry.props.surface)}
        style={{
          width: "1600px",
          height: "1000px",
          background: entry.props.surface === "storeroom"
            ? "linear-gradient(180deg, #3a3630, #17140f)"
            : "linear-gradient(180deg, #2b3a4a, #101820)",
        }}
      />
    ),
    // The catalog geometry owns each content box and anchor; renderers
    // fill the engine-provided box without their own translate.
    "renderer.e2e.lab.stage-character": ({ entry, frameIndex }) => (
      <figure
        data-lab-character={entry.contentId}
        data-lab-pose={String(entry.props.pose)}
        data-lab-expression={String(entry.props.expression)}
        data-lab-frame-asset={frameIndex === null
          ? undefined
          : (entry.frameAssetIds[frameIndex] as string)}
        style={{
          margin: 0,
          width: "100%",
          height: "100%",
          borderRadius: "110px 110px 12px 12px",
          // frame 1 is the mid-entrance step pose; the tint swap is the
          // one-shot frame-set drill made visible.
          background: frameIndex === 1 ? "rgba(189, 205, 214, 0.85)" : "rgba(214, 205, 189, 0.85)",
        }}
      >
        <figcaption style={{ paddingBlockStart: "1rem", textAlign: "center", color: "#20242c" }}>
          {entry.accessibleName} · {String(entry.props.expression)}
        </figcaption>
      </figure>
    ),
    "renderer.e2e.lab.stage-prop": ({ entry, frameIndex }) => (
      <div
        data-lab-prop={entry.contentId}
        data-lab-latch={typeof entry.props.latch === "string" ? entry.props.latch : undefined}
        data-lab-frame-asset={frameIndex === null
          ? undefined
          : (entry.frameAssetIds[frameIndex] as string)}
        style={entry.props.variant === "banner"
          ? {
            width: "100%",
            height: "100%",
            boxSizing: "border-box",
            border: "3px solid #8a5a2b",
            background: "#b3452e",
          }
          : {
            width: "100%",
            height: "100%",
            boxSizing: "border-box",
            // The engaged latch is the visible conditional-overlay variant.
            border: entry.props.latch === "engaged" ? "3px solid #4d8a5a" : "3px solid #9c8a63",
            // frame 1 is the beacon's lit frame from the ambient loop drill.
            background: frameIndex === 1 ? "#b8a15a" : "#6f6146",
          }}
      />
    ),
  });

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

export function LabHudV1(props: {
  readonly publication: DeepReadonly<LabUiPublicationV1>;
  readonly semantic: LabSemanticPortV1;
}): ReactElement {
  const monitors = props.publication.semantic.game.monitors;
  // The chrome M3 conformance: the layout Document declares the widgets;
  // this port is the whole Story side — availability from the published
  // projection, activation mapped onto the occurrence-fenced collector
  // write (the mid-hold-input command). Widgets never route; the hold's
  // own `when` arm reads the committed write at the next settlement's t=0.
  const pending = props.publication.semantic.narrative.pending;
  const sharedHold = pending !== null && pending.kind === "hold" && pending.stageInput === "shared"
    ? pending
    : null;
  const anyHold = pending !== null && pending.kind === "hold" ? pending : null;
  return (
    <div data-lab-hud="true">
      <p>
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
                Object.freeze({ kind: "invoke" as const, actionId: action.actionId }),
              )}
          >
            {labUiTextV1(labActionTextIdsV1[action.actionId])}
          </Button>
        ))}
      </div>
      <div data-lab-chrome-widgets="true" style={{ position: "relative" }}>
        <ChromeWidgetSurfaceV1
          layout={labDrillChromeLayoutV1}
          intents={{
            stateOf: (intentId) => {
              if (intentId !== labDrillEngageIntentIdV1 || sharedHold === null) {
                return Object.freeze({ status: "hidden" as const });
              }
              return monitors.collectorEngaged
                ? Object.freeze({
                  status: "disabled" as const,
                  reasonTextIds: Object.freeze(["text.e2e.lab.chrome.engaged"]),
                })
                : Object.freeze({ status: "enabled" as const });
            },
            onActivate: (intentId) => {
              if (intentId !== labDrillEngageIntentIdV1 || sharedHold === null) return;
              void props.semantic.dispatch(
                Object.freeze({
                  kind: "hold_write" as const,
                  actionId: "lab.engage_collector" as const,
                  expectedHoldOccurrenceId: sharedHold.occurrenceId,
                }),
              );
            },
          }}
          holdProgress={anyHold === null
            ? null
            : { remainingMs: anyHold.remainingMs, totalMs: anyHold.totalMs }}
          resolveText={labUiTextV1}
        />
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
              Object.freeze({ kind: "invoke" as const, actionId: "lab.collect_sample" as const }),
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
              Object.freeze({
                kind: "resolve" as const,
                expectedOccurrenceId: pending.occurrenceId,
                resolution: Object.freeze({
                  kind: "choose" as const,
                  choiceId: labDrillTripwireChoiceIdV1,
                }),
              }),
            );
            return;
          }
          if (pending.kind === "hold" && pending.stageInput === "shared") {
            // The mid-hold input write, fenced to this hold's occurrence;
            // the hold's own arm reads it at the next settlement's t=0.
            void context.semantic.dispatch(
              Object.freeze({
                kind: "hold_write" as const,
                actionId: "lab.engage_collector" as const,
                expectedHoldOccurrenceId: pending.occurrenceId,
              }),
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
              onClick={() =>
                void props.semantic.dispatch(Object.freeze({ kind: "invoke" as const, actionId }))}
            >
              {labUiTextV1(labActionTextIdsV1[actionId])}
            </Button>
          );
        })}
      </div>
    </div>
  );
}
