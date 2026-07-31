// SPDX-License-Identifier: MIT
import { useEffect, useRef, useState } from "react";
import type { ReactElement } from "react";

import type {
  StageRenderTargetV1,
  StageTransitionCatalogV1,
  TimelineCatalogV1,
  TimelineSampleV1,
} from "@sillymaker/base";

import type { PresentationClockV1 } from "../presentation-run/presentation-clock.ts";
import { createAnimationFramePresentationClockV1 } from "../presentation-run/presentation-clock.ts";
import type {
  SemanticStageEntryRendererV1,
  SemanticStageHostDiagnosticV1,
} from "./semantic-stage-host.tsx";
import { SemanticStageHostV1 } from "./semantic-stage-host.tsx";
import type { StageReconcilerV1, StageTransitionAcknowledgmentV1 } from "./stage-reconciler.ts";
import { createStageReconcilerV1, settledStageFrameV1 } from "./stage-reconciler.ts";
import type { TimelineCueRunV1, TimelinePlayerV1 } from "./timeline-player.ts";
import { createTimelinePlayerV1 } from "./timeline-player.ts";

/**
 * The animated semantic stage: owns one Stage Reconciler for the lifetime of
 * the mounted component, feeds it committed publication targets, suspends
 * runs while the page is hidden, honors reduced motion live, and renders the
 * resulting frames through the stage host. Unmounting disposes the
 * reconciler, so no ticks or listeners survive HMR or page teardown.
 */

const reducedMotionQueryV1 = "(prefers-reduced-motion: reduce)";

function readReducedMotionV1(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  return window.matchMedia(reducedMotionQueryV1).matches;
}

export interface SemanticStagePropsV1 {
  readonly target: StageRenderTargetV1;
  /** The committed semantic publication revision this target came from. */
  readonly revision: number;
  /** The presentation epoch; load/rollback/rebootstrap suppress edges. */
  readonly epoch: number;
  readonly catalog: StageTransitionCatalogV1;
  readonly renderers: Readonly<Record<string, SemanticStageEntryRendererV1>>;
  readonly accessibleName: string;
  /** Injectable for tests; defaults to the animation-frame clock. */
  readonly clock?: PresentationClockV1;
  /** Story timelines; cues resolve here when the registry plays them. */
  readonly timelines?: TimelineCatalogV1;
  /** The composition cue registry this mounted stage binds to. */
  readonly cues?: { register(controller: { play(cueId: string): boolean } | null): void };
  /** Timeline events in order, exactly once per occurrence. */
  onTimelineEvent?(eventId: string): void;
  /** Content hit-region activations (pointer or keyboard). */
  onHitRegionActivate?: Parameters<typeof SemanticStageHostV1>[0]["onHitRegionActivate"];
  onAcknowledgment?(acknowledgment: StageTransitionAcknowledgmentV1): void;
  reportDiagnostic?(diagnostic: SemanticStageHostDiagnosticV1): void;
  reportFailure?(code: string, detail: string): void;
}

export function SemanticStageV1(props: SemanticStagePropsV1): ReactElement {
  const { target, revision, epoch } = props;
  const [version, setVersion] = useState(0);
  const reducedMotionRef = useRef(readReducedMotionV1());
  const acknowledgmentRef = useRef(props.onAcknowledgment);
  const failureRef = useRef(props.reportFailure);
  const timelineEventRef = useRef(props.onTimelineEvent);
  acknowledgmentRef.current = props.onAcknowledgment;
  failureRef.current = props.reportFailure;
  timelineEventRef.current = props.onTimelineEvent;

  // One clock, one reconciler, one timeline player per mounted stage.
  const [clock] = useState<PresentationClockV1>(
    () => props.clock ?? createAnimationFramePresentationClockV1(),
  );
  const [reconciler] = useState<StageReconcilerV1>(() =>
    createStageReconcilerV1({
      clock,
      catalog: props.catalog,
      prefersReducedMotion: () => reducedMotionRef.current,
      onAcknowledgment: (acknowledgment) => acknowledgmentRef.current?.(acknowledgment),
      reportFailure: (code, detail) => failureRef.current?.(code, detail),
    })
  );
  const retargetedRef = useRef(false);

  // Timelines are decorative overlays: one active cue at a time (a new cue
  // cancels the previous one), samples never touch the reconciler frames,
  // and every ending clears back to the settled rendering.
  const [timelinePlayer] = useState<TimelinePlayerV1>(() =>
    createTimelinePlayerV1({ clock, reducedMotion: () => reducedMotionRef.current })
  );
  const [overlay, setOverlay] = useState<TimelineSampleV1 | null>(null);
  const [activeCueId, setActiveCueId] = useState<string | null>(null);
  const activeCueRef = useRef<TimelineCueRunV1 | null>(null);
  const timelinesRef = useRef(props.timelines);
  timelinesRef.current = props.timelines;

  useEffect(() => {
    const registry = props.cues;
    if (registry === undefined) return () => {};
    const controller = {
      play(cueId: string): boolean {
        const definition = timelinesRef.current?.resolveTimeline(cueId) ?? null;
        if (definition === null) return false;
        activeCueRef.current?.cancel();
        // Zero-duration runs (reduced motion, pure-event cues) finish
        // synchronously inside play(), before `cueRun` initializes — the
        // flag routes that case past the closure without touching it.
        let finishedSynchronously = false;
        let started = false;
        const cueRun = timelinePlayer.play({
          definition,
          epoch,
          onSample: (sample) => setOverlay(sample),
          onEvent: (eventId) => timelineEventRef.current?.(eventId),
          onFinished: () => {
            if (!started) {
              finishedSynchronously = true;
              return;
            }
            if (activeCueRef.current === cueRun) {
              activeCueRef.current = null;
              setActiveCueId(null);
            }
          },
        });
        started = true;
        if (finishedSynchronously) return true;
        activeCueRef.current = cueRun;
        setActiveCueId(definition.timelineId);
        return true;
      },
    };
    registry.register(controller);
    return () => registry.register(null);
  }, [props.cues, timelinePlayer, epoch]);

  useEffect(() => {
    const unsubscribe = reconciler.subscribe(() => setVersion((current) => current + 1));
    return () => {
      unsubscribe();
      reconciler.dispose();
      timelinePlayer.dispose();
    };
  }, [reconciler, timelinePlayer]);

  useEffect(() => {
    reconciler.retarget({ target, revision, epoch });
    retargetedRef.current = true;
    setVersion((current) => current + 1);
  }, [reconciler, target, revision, epoch]);

  useEffect(() => {
    if (typeof document === "undefined") return () => {};
    const onVisibilityChange = (): void => {
      if (document.visibilityState === "hidden") reconciler.suspend();
      else reconciler.resume();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, [reconciler]);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return () => {};
    }
    const query = window.matchMedia(reducedMotionQueryV1);
    const onChange = (): void => {
      reducedMotionRef.current = query.matches;
    };
    onChange();
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  // Frames are rebuilt per render; `version` bumps re-render the component
  // whenever the reconciler notifies (ticks, settles, retargets).
  void version;
  const frame = retargetedRef.current ? reconciler.frame() : settledStageFrameV1(target);

  return (
    <SemanticStageHostV1
      frame={frame}
      renderers={props.renderers}
      accessibleName={props.accessibleName}
      overlay={overlay?.values ?? null}
      activeCueId={activeCueId}
      {...(props.onHitRegionActivate === undefined
        ? {}
        : { onHitRegionActivate: props.onHitRegionActivate })}
      {...(props.reportDiagnostic === undefined
        ? {}
        : { reportDiagnostic: props.reportDiagnostic })}
    />
  );
}
