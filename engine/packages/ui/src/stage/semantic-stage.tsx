// SPDX-License-Identifier: MIT
import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ReactElement, ReactNode } from "react";

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
import type {
  StageAcknowledgedRunAuthorityInternalV1,
  StageReconcilerV1,
  StageRetargetInputV1,
  StageTransitionAcknowledgmentV1,
} from "./stage-reconciler.ts";
import {
  claimStageAcknowledgedRunAuthorityInternalV1,
  createStageReconcilerV1,
  settledStageFrameV1,
} from "./stage-reconciler.ts";
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

export interface SemanticStageCompositionDriverInternalV1 {
  retargetInternalV1(input: StageRetargetInputV1): void;
  suspendInternalV1(): void;
  resumeInternalV1(): void;
  skipAllInternalV1(): void;
  disposeInternalV1(): void;
  isCurrentInternalV1(): boolean;
}

interface SemanticStageCompositionDriverRecordInternalV1 {
  readonly claimant: object;
  readonly authority: StageAcknowledgedRunAuthorityInternalV1;
  readonly driver: SemanticStageCompositionDriverInternalV1;
}

interface SemanticStageCompositionDriverLifetimeInternalV1 {
  activateInternalV1(): void;
  deactivateInternalV1(): void;
  setTerminalCleanupInternalV1(cleanup: () => void): void;
  disposeTerminalInternalV1(): void;
}

const semanticStageCompositionDriverRecordsInternalV1 = new WeakMap<
  StageReconcilerV1,
  SemanticStageCompositionDriverRecordInternalV1
>();
const semanticStageCompositionDriverLifetimesInternalV1 = new WeakMap<
  SemanticStageCompositionDriverInternalV1,
  SemanticStageCompositionDriverLifetimeInternalV1
>();

interface SemanticStageCompositionRetargetDelegateRecordInternalV1 {
  readonly delegate: (input: StageRetargetInputV1) => boolean;
  readonly afterMutationInternalV1: (() => void) | null;
  routing: boolean;
  draining: boolean;
}

const semanticStageCompositionRetargetDelegatesInternalV1 = new WeakMap<
  SemanticStageCompositionDriverInternalV1,
  SemanticStageCompositionRetargetDelegateRecordInternalV1
>();

/** @internal Installs the composition's current Barrier-aware retarget route. */
export function bindSemanticStageCompositionRetargetDelegateInternalV1(
  driver: SemanticStageCompositionDriverInternalV1,
  delegate: (input: StageRetargetInputV1) => boolean,
  afterMutationInternalV1?: () => void,
): () => void {
  if (
    !semanticStageCompositionDriverLifetimesInternalV1.has(driver) ||
    !driver.isCurrentInternalV1() || typeof delegate !== "function" ||
    (afterMutationInternalV1 !== undefined && typeof afterMutationInternalV1 !== "function") ||
    semanticStageCompositionRetargetDelegatesInternalV1.has(driver)
  ) {
    throw new TypeError("ui.semantic_stage_composition_retarget_delegate_invalid");
  }
  const record: SemanticStageCompositionRetargetDelegateRecordInternalV1 = {
    delegate,
    afterMutationInternalV1: afterMutationInternalV1 ?? null,
    routing: false,
    draining: false,
  };
  semanticStageCompositionRetargetDelegatesInternalV1.set(driver, record);
  let active = true;
  return Object.freeze((): void => {
    if (!active) return;
    active = false;
    if (semanticStageCompositionRetargetDelegatesInternalV1.get(driver) === record) {
      semanticStageCompositionRetargetDelegatesInternalV1.delete(driver);
    }
  });
}

function drainSemanticStageCompositionAfterMutationInternalV1(
  driver: SemanticStageCompositionDriverInternalV1,
  expectedRecord?: SemanticStageCompositionRetargetDelegateRecordInternalV1,
): void {
  const record = semanticStageCompositionRetargetDelegatesInternalV1.get(driver);
  if (
    record === undefined || (expectedRecord !== undefined && record !== expectedRecord) ||
    record.routing || record.draining || record.afterMutationInternalV1 === null
  ) return;
  record.draining = true;
  try {
    record.afterMutationInternalV1();
  } catch {
    // The composition callback owns fail-closed reporting; never replace the
    // already-committed Stage mutation or clock terminal with its exception.
  } finally {
    record.draining = false;
  }
}

function setSemanticStageCompositionDriverEffectActiveInternalV1(
  driver: SemanticStageCompositionDriverInternalV1,
  active: boolean,
): void {
  const lifetime = semanticStageCompositionDriverLifetimesInternalV1.get(driver);
  if (active) lifetime?.activateInternalV1();
  else lifetime?.deactivateInternalV1();
}

function disposeSemanticStageCompositionDriverTerminalInternalV1(
  driver: SemanticStageCompositionDriverInternalV1,
): void {
  semanticStageCompositionDriverLifetimesInternalV1.get(driver)?.disposeTerminalInternalV1();
}

function setSemanticStageCompositionDriverTerminalCleanupInternalV1(
  driver: SemanticStageCompositionDriverInternalV1,
  cleanup: () => void,
): void {
  semanticStageCompositionDriverLifetimesInternalV1.get(driver)?.setTerminalCleanupInternalV1(
    cleanup,
  );
}

export function createSemanticStageCompositionDriverInternalV1(
  reconciler: StageReconcilerV1,
  claimant: object,
): SemanticStageCompositionDriverInternalV1 {
  const authority = claimStageAcknowledgedRunAuthorityInternalV1(reconciler, claimant);
  const installed = semanticStageCompositionDriverRecordsInternalV1.get(reconciler);
  if (installed !== undefined) {
    if (installed.claimant !== claimant || installed.authority !== authority) {
      throw new TypeError("ui.semantic_stage_composition_driver_invalid");
    }
    return installed.driver;
  }

  let current = true;
  let effectActive = true;
  let currentEpoch: number | null = null;
  let terminalCleanup: (() => void) | null = null;
  let driver!: SemanticStageCompositionDriverInternalV1;
  const disposeTerminal = (): void => {
    if (!current) return;
    current = false;
    effectActive = false;
    semanticStageCompositionRetargetDelegatesInternalV1.delete(driver);
    const cleanup = terminalCleanup;
    terminalCleanup = null;
    try {
      authority.disposeInternalV1();
    } finally {
      try {
        cleanup?.();
      } catch {
        // Terminal cleanup is best effort after the authority is fenced.
      }
    }
  };
  const candidate: SemanticStageCompositionDriverInternalV1 = {
    retargetInternalV1(
      this: SemanticStageCompositionDriverInternalV1,
      input: StageRetargetInputV1,
    ): void {
      if (this !== driver || !current || !effectActive) return;
      const delegateRecord = semanticStageCompositionRetargetDelegatesInternalV1.get(driver);
      if (delegateRecord !== undefined) {
        if (delegateRecord.routing || delegateRecord.draining) return;
        delegateRecord.routing = true;
        let handled: unknown;
        try {
          handled = delegateRecord.delegate(input);
        } catch {
          return;
        } finally {
          delegateRecord.routing = false;
        }
        if (
          !current || !effectActive ||
          semanticStageCompositionRetargetDelegatesInternalV1.get(driver) !== delegateRecord
        ) return;
        if (handled === true) {
          currentEpoch = input.epoch;
          drainSemanticStageCompositionAfterMutationInternalV1(driver, delegateRecord);
          return;
        }
        if (handled !== false) return;
      }
      if (currentEpoch === input.epoch) {
        authority.retargetInternalV1(input);
        drainSemanticStageCompositionAfterMutationInternalV1(driver, delegateRecord);
        return;
      }
      const result = authority.retargetPresentationGenerationInternalV1(input);
      if (result.kind !== "faulted") currentEpoch = input.epoch;
      drainSemanticStageCompositionAfterMutationInternalV1(driver, delegateRecord);
    },
    suspendInternalV1(this: SemanticStageCompositionDriverInternalV1): void {
      if (this !== driver || !current || !effectActive) return;
      const delegateRecord = semanticStageCompositionRetargetDelegatesInternalV1.get(driver);
      if (delegateRecord?.routing === true || delegateRecord?.draining === true) return;
      authority.suspendInternalV1();
      drainSemanticStageCompositionAfterMutationInternalV1(driver, delegateRecord);
    },
    resumeInternalV1(this: SemanticStageCompositionDriverInternalV1): void {
      if (this !== driver || !current || !effectActive) return;
      const delegateRecord = semanticStageCompositionRetargetDelegatesInternalV1.get(driver);
      if (delegateRecord?.routing === true || delegateRecord?.draining === true) return;
      authority.resumeInternalV1();
      drainSemanticStageCompositionAfterMutationInternalV1(driver, delegateRecord);
    },
    skipAllInternalV1(this: SemanticStageCompositionDriverInternalV1): void {
      if (this !== driver || !current || !effectActive) return;
      const delegateRecord = semanticStageCompositionRetargetDelegatesInternalV1.get(driver);
      if (delegateRecord?.routing === true || delegateRecord?.draining === true) return;
      authority.skipAllInternalV1();
      drainSemanticStageCompositionAfterMutationInternalV1(driver, delegateRecord);
    },
    disposeInternalV1(this: SemanticStageCompositionDriverInternalV1): void {
      if (this !== driver || !current) return;
      disposeTerminal();
    },
    isCurrentInternalV1(this: SemanticStageCompositionDriverInternalV1): boolean {
      return this === driver && current && effectActive;
    },
  };
  driver = Object.freeze(candidate);
  semanticStageCompositionDriverLifetimesInternalV1.set(
    driver,
    Object.freeze({
      activateInternalV1(): void {
        if (current) effectActive = true;
      },
      deactivateInternalV1(): void {
        effectActive = false;
      },
      setTerminalCleanupInternalV1(cleanup: () => void): void {
        if (!current) {
          cleanup();
          return;
        }
        terminalCleanup = cleanup;
      },
      disposeTerminalInternalV1: disposeTerminal,
    }),
  );
  semanticStageCompositionDriverRecordsInternalV1.set(reconciler, {
    claimant,
    authority,
    driver,
  });
  return driver;
}

interface SemanticStageCompositionBindingInternalV1 {
  readonly claimant: object;
  readonly onBindInternalV1:
    | ((
      reconciler: StageReconcilerV1,
      driver: SemanticStageCompositionDriverInternalV1,
    ) => () => void)
    | null;
}

const SemanticStageCompositionClaimantContextInternalV1 = createContext<
  SemanticStageCompositionBindingInternalV1 | null
>(null);

export function SemanticStageCompositionClaimantProviderInternalV1(props: {
  readonly claimant: object;
  readonly onBindInternalV1?: (
    reconciler: StageReconcilerV1,
    driver: SemanticStageCompositionDriverInternalV1,
  ) => () => void;
  readonly children: ReactNode;
}): ReactElement {
  const { claimant, onBindInternalV1 } = props;
  if (typeof claimant !== "object" || claimant === null) {
    throw new TypeError("ui.semantic_stage_composition_claimant_invalid");
  }
  const binding = useMemo<SemanticStageCompositionBindingInternalV1>(
    () => Object.freeze({ claimant, onBindInternalV1: onBindInternalV1 ?? null }),
    [claimant, onBindInternalV1],
  );
  return (
    <SemanticStageCompositionClaimantContextInternalV1.Provider value={binding}>
      {props.children}
    </SemanticStageCompositionClaimantContextInternalV1.Provider>
  );
}

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
  const compositionBinding = useContext(SemanticStageCompositionClaimantContextInternalV1);
  const [version, setVersion] = useState(0);
  const reducedMotionRef = useRef(readReducedMotionV1());
  const acknowledgmentRef = useRef(props.onAcknowledgment);
  const failureRef = useRef(props.reportFailure);
  const timelineEventRef = useRef(props.onTimelineEvent);
  acknowledgmentRef.current = props.onAcknowledgment;
  failureRef.current = props.reportFailure;
  timelineEventRef.current = props.onTimelineEvent;

  // One raw clock, one drain-wrapped clock, one reconciler, and one timeline
  // player per mounted Stage. Preserve the raw receiver for custom clocks;
  // the wrapper only adds a same-stack post-tick composition drain.
  const compositionDriverRef = useRef<SemanticStageCompositionDriverInternalV1 | null>(null);
  const [rawClock] = useState<PresentationClockV1>(
    () => props.clock ?? createAnimationFramePresentationClockV1(),
  );
  const [clock] = useState<PresentationClockV1>(() =>
    Object.freeze({
      now: () => Reflect.apply(rawClock.now, rawClock, []),
      requestTick(callback: (now: number) => void): () => void {
        return Reflect.apply(rawClock.requestTick, rawClock, [
          (now: number): void => {
            try {
              callback(now);
            } finally {
              const driver = compositionDriverRef.current;
              if (driver !== null) {
                drainSemanticStageCompositionAfterMutationInternalV1(driver);
              }
            }
          },
        ]) as () => void;
      },
    })
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
  const [compositionClaimant] = useState<object | null>(
    () => compositionBinding?.claimant ?? null,
  );
  if ((compositionBinding?.claimant ?? null) !== compositionClaimant) {
    throw new TypeError("ui.semantic_stage_composition_claimant_changed");
  }
  const [compositionDriver] = useState<SemanticStageCompositionDriverInternalV1 | null>(() =>
    compositionClaimant === null
      ? null
      : createSemanticStageCompositionDriverInternalV1(reconciler, compositionClaimant)
  );
  compositionDriverRef.current = compositionDriver;
  const terminalCleanupGenerationRef = useRef(0);
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
    if (compositionDriver === null) return () => {};
    setSemanticStageCompositionDriverTerminalCleanupInternalV1(compositionDriver, () => {
      activeCueRef.current = null;
      timelinePlayer.dispose();
    });
    setSemanticStageCompositionDriverEffectActiveInternalV1(compositionDriver, true);
    return () => {
      setSemanticStageCompositionDriverEffectActiveInternalV1(compositionDriver, false);
    };
  }, [compositionDriver, timelinePlayer]);

  const onBindInternalV1 = compositionBinding?.onBindInternalV1 ?? null;
  useEffect(() => {
    if (compositionDriver === null || onBindInternalV1 === null) return () => {};
    const release = onBindInternalV1(reconciler, compositionDriver);
    if (typeof release !== "function") {
      throw new TypeError("ui.semantic_stage_composition_bind_invalid");
    }
    let current = true;
    return () => {
      if (!current) return;
      current = false;
      release();
    };
  }, [compositionDriver, onBindInternalV1, reconciler]);

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
    terminalCleanupGenerationRef.current += 1;
    const unsubscribe = reconciler.subscribe(() => setVersion((current) => current + 1));
    return () => {
      unsubscribe();
      const cleanupGeneration = terminalCleanupGenerationRef.current + 1;
      terminalCleanupGenerationRef.current = cleanupGeneration;
      queueMicrotask(() => {
        if (terminalCleanupGenerationRef.current !== cleanupGeneration) return;
        if (compositionDriver === null) {
          reconciler.dispose();
          timelinePlayer.dispose();
        } else disposeSemanticStageCompositionDriverTerminalInternalV1(compositionDriver);
      });
    };
  }, [compositionDriver, reconciler, timelinePlayer]);

  useEffect(() => {
    if (compositionDriver === null) reconciler.retarget({ target, revision, epoch });
    else compositionDriver.retargetInternalV1({ target, revision, epoch });
    retargetedRef.current = true;
    setVersion((current) => current + 1);
  }, [compositionDriver, reconciler, target, revision, epoch]);

  useEffect(() => {
    if (typeof document === "undefined") return () => {};
    let effectActive = true;
    const onVisibilityChange = (): void => {
      if (!effectActive) return;
      if (document.visibilityState === "hidden") {
        if (compositionDriver === null) reconciler.suspend();
        else compositionDriver.suspendInternalV1();
      } else if (compositionDriver === null) reconciler.resume();
      else compositionDriver.resumeInternalV1();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      effectActive = false;
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [compositionDriver, reconciler]);

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
