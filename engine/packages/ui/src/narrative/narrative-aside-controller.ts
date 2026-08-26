// SPDX-License-Identifier: MIT
import type { NarrativeAsidePageV1, NarrativeAsideV1 } from "@sillymaker/base";

/**
 * Narrative aside controller (narrative-aside proposal, opened 2026-08-27):
 * the host-local paging state machine for the instance's zero-authority
 * aside push channel. It is pure presentation — advancing or dismissing
 * never dispatches a command, never registers stage-input isolation, and
 * never captures focus. Epoch fencing plus a per-instance sequence
 * watermark mirror the transient-effect consumer contract: stale-epoch
 * pushes and same-epoch re-deliveries drop, an aside arriving while an
 * authoritative say/choice pending owns the dialogue surface drops
 * (q4: never queued), and an authoritative dialogue appearing mid-aside
 * force-dismisses the presentation.
 */
export interface NarrativeAsideViewV1 {
  readonly asideSequence: number;
  readonly page: NarrativeAsidePageV1;
  readonly pageIndex: number;
  readonly pageCount: number;
}

export interface NarrativeAsidePresentationContextV1 {
  /** The current presentation epoch (anchor replacement clears the aside). */
  readonly epoch: number;
  /** True while an authoritative say/choice pending owns the dialogue surface. */
  readonly dialoguePending: boolean;
}

export interface NarrativeAsideControllerV1 {
  /** The current presentation view; a stable reference until state changes. */
  view(): NarrativeAsideViewV1 | null;
  subscribe(listener: () => void): () => void;
  /** Instance push ingress: stale epoch / watermark / dialogue-owned drops. */
  push(aside: NarrativeAsideV1): void;
  /** Presentation context updates (epoch changes, say/choice pendings). */
  syncPresentation(context: NarrativeAsidePresentationContextV1): void;
  /** Local page advance; advancing past the last page dismisses. */
  advance(): void;
  dismiss(): void;
}

interface ActiveAsideInternalV1 {
  readonly asideSequence: number;
  readonly pages: readonly NarrativeAsidePageV1[];
  pageIndex: number;
}

export function createNarrativeAsideControllerV1(
  initial: NarrativeAsidePresentationContextV1,
): NarrativeAsideControllerV1 {
  const listeners = new Set<() => void>();
  let currentEpoch = initial.epoch;
  let dialoguePending = initial.dialoguePending;
  let consumedWatermark = 0;
  let active: ActiveAsideInternalV1 | null = null;
  let currentView: NarrativeAsideViewV1 | null = null;

  function recomputeViewAndNotify(): void {
    currentView = active === null ? null : Object.freeze({
      asideSequence: active.asideSequence,
      page: active.pages[active.pageIndex] as NarrativeAsidePageV1,
      pageIndex: active.pageIndex,
      pageCount: active.pages.length,
    });
    for (const listener of [...listeners]) listener();
  }

  return Object.freeze({
    view: () => currentView,
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    push: (aside: NarrativeAsideV1) => {
      // Pushes from another epoch are stale by definition; the watermark
      // additionally drops same-epoch re-deliveries. A push arriving while
      // the authoritative dialogue owns the surface is consumed-by-drop,
      // so it can never surface later (q4: no queue).
      if (aside.epoch !== currentEpoch) return;
      if (aside.asideSequence <= consumedWatermark) return;
      consumedWatermark = aside.asideSequence;
      if (dialoguePending || aside.pages.length === 0) return;
      active = {
        asideSequence: aside.asideSequence,
        pages: aside.pages,
        pageIndex: 0,
      };
      recomputeViewAndNotify();
    },
    syncPresentation: (context: NarrativeAsidePresentationContextV1) => {
      const epochChanged = context.epoch !== currentEpoch;
      currentEpoch = context.epoch;
      dialoguePending = context.dialoguePending;
      if (active !== null && (epochChanged || dialoguePending)) {
        active = null;
        recomputeViewAndNotify();
      }
    },
    advance: () => {
      if (active === null) return;
      if (active.pageIndex + 1 < active.pages.length) {
        active.pageIndex += 1;
      } else {
        active = null;
      }
      recomputeViewAndNotify();
    },
    dismiss: () => {
      if (active === null) return;
      active = null;
      recomputeViewAndNotify();
    },
  });
}
