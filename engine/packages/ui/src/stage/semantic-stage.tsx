// SPDX-License-Identifier: MIT
import { useEffect, useRef, useState } from "react";
import type { ReactElement } from "react";

import type { StageRenderTargetV2, StageTransitionCatalogV2 } from "@sillymaker/base";

import type { PresentationClockV1 } from "../presentation-run/presentation-clock.js";
import { createAnimationFramePresentationClockV1 } from "../presentation-run/presentation-clock.js";
import type {
  SemanticStageEntryRendererV2,
  SemanticStageHostDiagnosticV2,
} from "./semantic-stage-host.js";
import { SemanticStageHostV2 } from "./semantic-stage-host.js";
import type { StageReconcilerV2, StageTransitionAcknowledgmentV2 } from "./stage-reconciler.js";
import { createStageReconcilerV2, settledStageFrameV2 } from "./stage-reconciler.js";

/**
 * The animated semantic stage: owns one Stage Reconciler for the lifetime of
 * the mounted component, feeds it committed publication targets, suspends
 * runs while the page is hidden, honors reduced motion live, and renders the
 * resulting frames through the stage host. Unmounting disposes the
 * reconciler, so no ticks or listeners survive HMR or page teardown.
 */

const reducedMotionQueryV2 = "(prefers-reduced-motion: reduce)";

function readReducedMotionV2(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  return window.matchMedia(reducedMotionQueryV2).matches;
}

export interface SemanticStagePropsV2 {
  readonly target: StageRenderTargetV2;
  /** The committed semantic publication revision this target came from. */
  readonly revision: number;
  /** The presentation epoch; load/rollback/rebootstrap suppress edges. */
  readonly epoch: number;
  readonly catalog: StageTransitionCatalogV2;
  readonly renderers: Readonly<Record<string, SemanticStageEntryRendererV2>>;
  readonly accessibleName: string;
  /** Injectable for tests; defaults to the animation-frame clock. */
  readonly clock?: PresentationClockV1;
  onAcknowledgment?(acknowledgment: StageTransitionAcknowledgmentV2): void;
  reportDiagnostic?(diagnostic: SemanticStageHostDiagnosticV2): void;
  reportFailure?(code: string, detail: string): void;
}

export function SemanticStageV2(props: SemanticStagePropsV2): ReactElement {
  const { target, revision, epoch } = props;
  const [version, setVersion] = useState(0);
  const reducedMotionRef = useRef(readReducedMotionV2());
  const acknowledgmentRef = useRef(props.onAcknowledgment);
  const failureRef = useRef(props.reportFailure);
  acknowledgmentRef.current = props.onAcknowledgment;
  failureRef.current = props.reportFailure;

  // One reconciler per mounted stage; catalog and clock are mount-stable.
  const [reconciler] = useState<StageReconcilerV2>(() =>
    createStageReconcilerV2({
      clock: props.clock ?? createAnimationFramePresentationClockV1(),
      catalog: props.catalog,
      prefersReducedMotion: () => reducedMotionRef.current,
      onAcknowledgment: (acknowledgment) => acknowledgmentRef.current?.(acknowledgment),
      reportFailure: (code, detail) => failureRef.current?.(code, detail),
    }),
  );
  const retargetedRef = useRef(false);

  useEffect(() => {
    const unsubscribe = reconciler.subscribe(() => setVersion((current) => current + 1));
    return () => {
      unsubscribe();
      reconciler.dispose();
    };
  }, [reconciler]);

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
    const query = window.matchMedia(reducedMotionQueryV2);
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
  const frame = retargetedRef.current ? reconciler.frame() : settledStageFrameV2(target);

  return (
    <SemanticStageHostV2
      frame={frame}
      renderers={props.renderers}
      accessibleName={props.accessibleName}
      {...(props.reportDiagnostic === undefined
        ? {}
        : { reportDiagnostic: props.reportDiagnostic })}
    />
  );
}
