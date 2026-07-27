// SPDX-License-Identifier: MIT
import type { TimelineDefinitionV1, TimelineSampleV1 } from "@sillymaker/base";
import { evaluateTimelineAtV1, timelineDurationV1 } from "@sillymaker/base";

import type { PresentationClockV1 } from "../presentation-run/presentation-clock.ts";
import type { PresentationRunOutcomeV1 } from "../presentation-run/presentation-run.ts";
import { createPresentationRunV1 } from "../presentation-run/presentation-run.ts";

/**
 * The Timeline player (R5): a thin adapter between the pure timeline
 * sampler and the Presentation Run lifecycle. It owns no gameplay
 * authority — overlay samples flow to the caller, events fire exactly once
 * in order (watermark fencing), and every finished or cancelled cue clears
 * back to the settled rendering.
 */

export type TimelineCueStatusV1 = "pending" | "running" | "paused" | "settled" | "cancelled";

export interface TimelineCueObservationV1 {
  readonly cueId: string;
  readonly status: TimelineCueStatusV1;
  readonly elapsedMs: number;
  readonly durationMs: number;
  readonly playbackRate: number;
}

export interface TimelineCueRunV1 {
  readonly runId: string;
  readonly cueId: string;
  readonly epoch: number;
  status(): TimelineCueStatusV1;
  observe(): TimelineCueObservationV1;
  pause(): void;
  resume(): void;
  /** Jump to the end: final events fire once, then the overlay clears. */
  skipToEnd(): void;
  /** Abandon mid-flight: no further events, the overlay clears. */
  cancel(): void;
  /** Playback-rate multiplier for fast-forward; must be > 0. */
  setPlaybackRate(rate: number): void;
  subscribe(listener: () => void): () => void;
  dispose(): void;
}

export interface PlayTimelineOptionsV1 {
  readonly definition: TimelineDefinitionV1;
  readonly epoch: number;
  /** Overlay values for the current frame; empty when the cue is done. */
  onSample?(sample: TimelineSampleV1 | null): void;
  /** Fires exactly once per event occurrence, in timeline order. */
  onEvent?(eventId: string): void;
  onFinished?(outcome: PresentationRunOutcomeV1): void;
}

export interface TimelinePlayerV1 {
  play(options: PlayTimelineOptionsV1): TimelineCueRunV1;
  dispose(): void;
}

export interface CreateTimelinePlayerOptionsV1 {
  readonly clock: PresentationClockV1;
  /** Live reduced-motion signal; a reduced cue settles instantly. */
  reducedMotion?(): boolean;
}

/** A clock wrapper whose time advances at an adjustable multiple. */
function createScaledClockV1(base: PresentationClockV1): {
  readonly clock: PresentationClockV1;
  setRate(rate: number): void;
  rate(): number;
} {
  let rate = 1;
  let anchorScaled = 0;
  let anchorBase = base.now();
  const scaledNow = (): number => anchorScaled + (base.now() - anchorBase) * rate;
  return Object.freeze({
    clock: Object.freeze({
      now: scaledNow,
      requestTick: (callback: (now: number) => void) =>
        base.requestTick(() => callback(scaledNow())),
    }),
    setRate(next: number): void {
      if (!Number.isFinite(next) || next <= 0) {
        throw new TypeError("timeline playback rate must be > 0");
      }
      anchorScaled = scaledNow();
      anchorBase = base.now();
      rate = next;
    },
    rate: () => rate,
  });
}

export function createTimelinePlayerV1(options: CreateTimelinePlayerOptionsV1): TimelinePlayerV1 {
  const active = new Set<TimelineCueRunV1>();
  let disposed = false;
  let nextRunSequence = 1;

  const play = (playOptions: PlayTimelineOptionsV1): TimelineCueRunV1 => {
    if (disposed) throw new TypeError("timeline player is disposed");
    const definition = playOptions.definition;
    const durationMs = timelineDurationV1(definition);
    const runId = `timeline-run.${String(nextRunSequence)}`;
    nextRunSequence += 1;
    const scaled = createScaledClockV1(options.clock);
    const listeners = new Set<() => void>();

    let eventWatermark = 0;
    let finished = false;

    const emitEventsUpTo = (sample: TimelineSampleV1): void => {
      while (eventWatermark < sample.firedEventIds.length) {
        const eventId = sample.firedEventIds[eventWatermark];
        eventWatermark += 1;
        if (eventId !== undefined) playOptions.onEvent?.(eventId);
      }
    };

    const finishWith = (outcome: PresentationRunOutcomeV1): void => {
      if (finished) return;
      finished = true;
      if (outcome === "completed" || outcome === "skipped" || outcome === "interrupted") {
        // Settling a cue delivers its full event trail exactly once …
        emitEventsUpTo(evaluateTimelineAtV1(definition, durationMs));
      }
      // … and every ending clears the overlay back to the settled rendering.
      playOptions.onSample?.(null);
      playOptions.onFinished?.(outcome);
      active.delete(cueRun);
      notify();
    };

    // Under reduced motion the run lasts zero milliseconds: starting it
    // completes it, the full event trail fires once, and no animation
    // frames are produced — the stable fallback the contract requires.
    const reduced = options.reducedMotion?.() === true;
    const run = createPresentationRunV1({
      runId,
      definitionId: definition.timelineId,
      epoch: playOptions.epoch,
      durationMs: reduced ? 0 : durationMs,
      clock: scaled.clock,
      onFinished: finishWith,
    });

    const notify = (): void => {
      for (const listener of [...listeners]) listener();
    };

    const elapsedMs = (): number =>
      run.status() === "settled" ? durationMs : run.progress() * durationMs;

    const unsubscribeRun = run.subscribe(() => {
      if (finished) return;
      const sample = evaluateTimelineAtV1(definition, elapsedMs());
      emitEventsUpTo(sample);
      playOptions.onSample?.(sample);
      notify();
    });

    const cueRun: TimelineCueRunV1 = Object.freeze({
      runId,
      cueId: definition.timelineId,
      epoch: playOptions.epoch,
      status: () => run.status(),
      observe: () =>
        Object.freeze({
          cueId: definition.timelineId,
          status: run.status(),
          elapsedMs: Math.round(elapsedMs()),
          durationMs,
          playbackRate: scaled.rate(),
        }),
      pause: () => run.pause(),
      resume: () => run.resume(),
      skipToEnd: () => run.skipToEnd(),
      cancel: () => run.cancel(),
      setPlaybackRate: (rate: number) => {
        scaled.setRate(rate);
      },
      subscribe(listener: () => void): () => void {
        listeners.add(listener);
        return () => listeners.delete(listener);
      },
      dispose(): void {
        finished = true;
        unsubscribeRun();
        run.dispose();
        listeners.clear();
        active.delete(cueRun);
      },
    });
    active.add(cueRun);
    run.start();
    return cueRun;
  };

  return Object.freeze({
    play,
    dispose(): void {
      disposed = true;
      for (const cueRun of [...active]) cueRun.dispose();
      active.clear();
    },
  });
}
