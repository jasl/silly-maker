// SPDX-License-Identifier: MIT
import type { MotionDefinitionV1 } from "./motion.ts";
import type { StageLayerIdV1 } from "./semantic-stage.ts";
import type { StageRenderEntryV1 } from "./stage-render-target.ts";

/**
 * Presence-bound ambient loops (ambient-loop-motion proposal, accepted
 * 2026-08-15): a looping motion sampled while an entry is settled on stage.
 *
 * Ambient is derived presentation data — a catalog resolved per entry, the
 * same family as the transition catalog. The loop is an ordinary
 * `sillymaker.motion` Document; loop semantics live in the binding, never
 * in the Document. Sampling runs on the presentation clock and composes
 * over the settled placement exactly like a one-shot transition (offsets
 * add, permille channels multiply). Nothing here touches authoritative
 * state, commands, Saves, digests, or replay.
 */

export interface StageAmbientBindingV1 {
  readonly motion: MotionDefinitionV1;
  /**
   * Presentation-only phase offset in milliseconds: the sampled phase is
   * `(elapsedSinceSettle + phaseMs) % totalDuration`. Lets multiple
   * entries share one loop Document without moving in lockstep (they all
   * settle at the same instant on a scene open).
   */
  readonly phaseMs: number;
}

export interface StageAmbientCatalogV1 {
  /** The loop for one settled entry; null means no ambient behavior. */
  resolveAmbient(
    layerId: StageLayerIdV1,
    entry: StageRenderEntryV1,
  ): StageAmbientBindingV1 | null;
}
