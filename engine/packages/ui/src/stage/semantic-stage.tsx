// SPDX-License-Identifier: MIT
import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ReactElement, ReactNode } from "react";

import type {
  MotionSampleV1,
  StageAmbientCatalogV1,
  StageCueDispatchBatchV1,
  StageRenderTargetV1,
  StageTransitionCatalogV1,
  TimelineCatalogV1,
  TimelineSampleV1,
} from "@sillymaker/base";
import { motionTotalDurationMsV1, sampleMotionAtV1 } from "@sillymaker/base";

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
  /**
   * Presentation edge context: the instance-stamped dispatch batch (from
   * `instance.stageCueDispatches()`). The stage forwards the list into the
   * retarget only when the batch's revision and epoch match this exact
   * publication; anything else is dropped and resolution stays
   * context-free. Purely presentational — never authoritative.
   */
  readonly dispatches?: StageCueDispatchBatchV1 | null;
  readonly catalog: StageTransitionCatalogV1;
  /**
   * Presence-bound ambient loops (ambient-loop-motion, accepted
   * 2026-08-15): looping motions sampled on the presentation clock while
   * an entry is settled. Purely decorative presentation — no commands, no
   * authoritative state, no Save/digest/replay bytes.
   */
  readonly ambient?: StageAmbientCatalogV1;
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
  /**
   * Hover-reveal asset URLs (shaped-hit-regions, accepted 2026-08-21);
   * see SemanticStageHostPropsV1.assets.
   */
  readonly assets?: Parameters<typeof SemanticStageHostV1>[0]["assets"];
  /** Dev-only provenance controller; see SemanticStageHostPropsV1.inspect. */
  readonly inspect?: Parameters<typeof SemanticStageHostV1>[0]["inspect"];
  reportDiagnostic?(diagnostic: SemanticStageHostDiagnosticV1): void;
  reportFailure?(code: string, detail: string): void;
}

function SemanticStageCurrentnessCommitInternalV1(props: {
  readonly failureRef: { current: SemanticStagePropsV1["reportFailure"] };
  readonly timelineEventRef: { current: SemanticStagePropsV1["onTimelineEvent"] };
  readonly compositionDriverRef: {
    current: SemanticStageCompositionDriverInternalV1 | null;
  };
  readonly timelinesRef: { current: TimelineCatalogV1 | undefined };
  readonly ambientSettledAtRef: { current: Map<string, number> };
  readonly failure: SemanticStagePropsV1["reportFailure"];
  readonly timelineEvent: SemanticStagePropsV1["onTimelineEvent"];
  readonly compositionDriver: SemanticStageCompositionDriverInternalV1 | null;
  readonly timelines: TimelineCatalogV1 | undefined;
  readonly ambientSettledAt: Map<string, number> | null;
}): null {
  const {
    failureRef,
    timelineEventRef,
    compositionDriverRef,
    timelinesRef,
    ambientSettledAtRef,
    failure,
    timelineEvent,
    compositionDriver,
    timelines,
    ambientSettledAt,
  } = props;
  useLayoutEffect(() => {
    failureRef.current = failure;
    timelineEventRef.current = timelineEvent;
    compositionDriverRef.current = compositionDriver;
    timelinesRef.current = timelines;
    if (ambientSettledAt !== null) ambientSettledAtRef.current = ambientSettledAt;
  }, [
    ambientSettledAt,
    ambientSettledAtRef,
    compositionDriver,
    compositionDriverRef,
    failure,
    failureRef,
    timelineEvent,
    timelineEventRef,
    timelines,
    timelinesRef,
  ]);
  return null;
}

export function SemanticStageV1(props: SemanticStagePropsV1): ReactElement {
  const { target, revision, epoch } = props;
  const compositionBinding = useContext(SemanticStageCompositionClaimantContextInternalV1);
  const [version, setVersion] = useState(0);
  const [reducedMotionRef] = useState(() => ({ current: readReducedMotionV1() }));
  const failureRef = useRef(props.reportFailure);
  const timelineEventRef = useRef(props.onTimelineEvent);
  /** Each looping entry's settle instant; forgotten while its edge flies. */
  const ambientSettledAtRef = useRef(new Map<string, number>());

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

  // Pairing guard: a dispatch batch applies only to exactly the committed
  // publication it was stamped for. `batch.dispatches` is a stable frozen
  // list, so the paired value is reference-stable across re-renders.
  const dispatchBatch = props.dispatches ?? null;
  const pairedDispatches = dispatchBatch !== null && dispatchBatch.revision === revision &&
      dispatchBatch.epoch === epoch && dispatchBatch.dispatches.length > 0
    ? dispatchBatch.dispatches
    : undefined;

  useEffect(() => {
    const input = pairedDispatches === undefined
      ? { target, revision, epoch }
      : { target, revision, epoch, dispatches: pairedDispatches };
    if (compositionDriver === null) reconciler.retarget(input);
    else compositionDriver.retargetInternalV1(input);
    retargetedRef.current = true;
    setVersion((current) => current + 1);
  }, [compositionDriver, reconciler, target, revision, epoch, pairedDispatches]);

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
      // Ambient loops start/stop with this preference; re-render so the
      // sampling pass below re-evaluates (transitions apply it at run
      // derivation and are unaffected by the extra render).
      setVersion((current) => current + 1);
    };
    onChange();
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, [reducedMotionRef]);

  // Frames are rebuilt per render; `version` bumps re-render the component
  // whenever the reconciler notifies (ticks, settles, retargets).
  void version;
  const frame = retargetedRef.current ? reconciler.frame() : settledStageFrameV1(target);

  // Presence-bound ambient loops, sampled per render on the presentation
  // clock: a settled entry with a resolved binding samples at
  // `(now - settledAt + phaseMs) % duration`; an in-flight edge suspends
  // the loop (its settle instant is forgotten, so settling restarts the
  // phase), and reduced motion settles every loop. Freeze semantics come
  // free from the clock: a frozen `now()` holds the sampled pose and the
  // resume offset keeps the phase continuous.
  const ambientCatalog = props.ambient ?? null;
  let ambientSamples: Map<string, MotionSampleV1> | null = null;
  let ambientSettledAtCommit: Map<string, number> | null = null;
  if (ambientCatalog !== null && !reducedMotionRef.current) {
    const settledAtByKey = new Map(ambientSettledAtRef.current);
    ambientSettledAtCommit = settledAtByKey;
    const seen = new Set<string>();
    const now = clock.now();
    for (const layer of frame.layers) {
      for (const frameEntry of layer.entries) {
        if (frameEntry.phase !== "settled") {
          settledAtByKey.delete(frameEntry.entry.key);
          continue;
        }
        seen.add(frameEntry.entry.key);
        const binding = ambientCatalog.resolveAmbient(layer.layerId, frameEntry.entry);
        if (binding === null) continue;
        const total = motionTotalDurationMsV1(binding.motion);
        if (total <= 0) continue;
        let settledAt = settledAtByKey.get(frameEntry.entry.key);
        if (settledAt === undefined) {
          settledAt = now;
          settledAtByKey.set(frameEntry.entry.key, settledAt);
        }
        const elapsed = (now - settledAt + binding.phaseMs) % total;
        ambientSamples ??= new Map();
        ambientSamples.set(frameEntry.entry.key, sampleMotionAtV1(binding.motion, elapsed));
      }
    }
    for (const key of settledAtByKey.keys()) {
      if (!seen.has(key)) settledAtByKey.delete(key);
    }
  }
  const ambientActive = ambientSamples !== null;

  // While at least one settled entry loops, keep requesting presentation
  // ticks: each tick re-renders and resamples. The loop stops the moment
  // every ambient suspends (edges in flight), reduced motion settles them,
  // or the entries leave the stage. Transitions keep their own one-shot
  // tickers, so `data-stage-settled` semantics are untouched; a freeze
  // parks the pending tick until resume.
  useEffect(() => {
    if (!ambientActive) return () => {};
    let effectActive = true;
    let cancel: (() => void) | null = null;
    const schedule = (): void => {
      cancel = clock.requestTick(() => {
        cancel = null;
        if (!effectActive) return;
        setVersion((current) => current + 1);
        schedule();
      });
    };
    schedule();
    return () => {
      effectActive = false;
      cancel?.();
    };
  }, [ambientActive, clock]);

  return (
    <>
      <SemanticStageCurrentnessCommitInternalV1
        failureRef={failureRef}
        timelineEventRef={timelineEventRef}
        compositionDriverRef={compositionDriverRef}
        timelinesRef={timelinesRef}
        ambientSettledAtRef={ambientSettledAtRef}
        failure={props.reportFailure}
        timelineEvent={props.onTimelineEvent}
        compositionDriver={compositionDriver}
        timelines={props.timelines}
        ambientSettledAt={ambientSettledAtCommit}
      />
      <SemanticStageHostV1
        frame={frame}
        renderers={props.renderers}
        accessibleName={props.accessibleName}
        overlay={overlay?.values ?? null}
        ambient={ambientSamples}
        activeCueId={activeCueId}
        {...(props.onHitRegionActivate === undefined
          ? {}
          : { onHitRegionActivate: props.onHitRegionActivate })}
        {...(props.assets === undefined ? {} : { assets: props.assets })}
        {...(props.inspect === undefined ? {} : { inspect: props.inspect })}
        {...(props.reportDiagnostic === undefined
          ? {}
          : { reportDiagnostic: props.reportDiagnostic })}
      />
    </>
  );
}
