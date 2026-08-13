// SPDX-License-Identifier: MIT
import type { MotionChannelV1, MotionDocumentV1 } from "@sillymaker/base";
import { motionChannelBaselineV1, parseMotionDocumentV1 } from "@sillymaker/base";

/**
 * Pure Motion Document edits behind the Workbench's direct manipulation:
 * dragging the pose ghost writes offset keyframes at a time stop, dragging
 * a timeline dot moves a keyframe's position. Every edit returns a new
 * strictly-admitted document (the input is never mutated), so drafts stay
 * valid by construction and the numeric inspector remains the equal
 * secondary entry over the same data.
 */

const motionOffsetValueLimitV1 = 100_000;

function clampMotionOffsetV1(value: number): number {
  return Math.min(
    motionOffsetValueLimitV1,
    Math.max(-motionOffsetValueLimitV1, Math.round(value)),
  );
}

function clampAtPermilleV1(value: number): number {
  return Math.min(1000, Math.max(0, Math.round(value)));
}

interface MutableKeyframeV1 {
  atPermille: number;
  value: number;
  easing?: unknown;
}

interface MutableTrackV1 {
  channel: MotionChannelV1;
  keyframes: MutableKeyframeV1[];
}

interface MutableDocumentV1 {
  tracks: MutableTrackV1[];
}

function cloneDocumentV1(motionDocument: MotionDocumentV1): MutableDocumentV1 & MotionDocumentV1 {
  return JSON.parse(JSON.stringify(motionDocument)) as MutableDocumentV1 & MotionDocumentV1;
}

function setTrackValueAtV1(
  draft: MutableDocumentV1,
  channel: MotionChannelV1,
  atPermille: number,
  value: number,
): void {
  let track = draft.tracks.find((candidate) => candidate.channel === channel);
  if (track === undefined) {
    const baseline = motionChannelBaselineV1(channel);
    track = {
      channel,
      keyframes: [{ atPermille: 0, value: baseline }, { atPermille: 1000, value: baseline }],
    };
    draft.tracks.push(track);
  }
  const exact = track.keyframes.find((keyframe) => keyframe.atPermille === atPermille);
  if (exact !== undefined) {
    exact.value = value;
    return;
  }
  const insertIndex = track.keyframes.findIndex((keyframe) => keyframe.atPermille > atPermille);
  // Tracks are pinned at 0/1000, so a non-exact stop always sits strictly
  // inside and the insertion keeps atPermille strictly increasing.
  track.keyframes.splice(
    insertIndex === -1 ? track.keyframes.length : insertIndex,
    0,
    { atPermille, value },
  );
}

/**
 * Writes the pose offsets at one time stop: an exact keyframe updates in
 * place, a missing one is inserted, and a missing track is created with
 * baseline endpoints first. `atPermille` is clamped to 0..1000 and offset
 * values to the admitted integer bounds.
 */
export function setMotionOffsetKeyframesV1(
  motionDocument: MotionDocumentV1,
  atPermille: number,
  offsets: { readonly offsetX?: number; readonly offsetY?: number },
): MotionDocumentV1 {
  const stop = clampAtPermilleV1(atPermille);
  const draft = cloneDocumentV1(motionDocument);
  if (offsets.offsetX !== undefined) {
    setTrackValueAtV1(draft, "offsetX", stop, clampMotionOffsetV1(offsets.offsetX));
  }
  if (offsets.offsetY !== undefined) {
    setTrackValueAtV1(draft, "offsetY", stop, clampMotionOffsetV1(offsets.offsetY));
  }
  return parseMotionDocumentV1(draft);
}

/**
 * Moves one keyframe's time stop, clamped strictly between its neighbors;
 * the pinned first (0‰) and last (1000‰) keyframes never move. Returns the
 * input document when nothing can change.
 */
export function moveMotionKeyframeV1(
  motionDocument: MotionDocumentV1,
  channel: MotionChannelV1,
  keyframeIndex: number,
  atPermille: number,
): MotionDocumentV1 {
  const draft = cloneDocumentV1(motionDocument);
  const track = draft.tracks.find((candidate) => candidate.channel === channel);
  if (track === undefined) return motionDocument;
  const previous = track.keyframes[keyframeIndex - 1];
  const current = track.keyframes[keyframeIndex];
  const following = track.keyframes[keyframeIndex + 1];
  if (previous === undefined || current === undefined || following === undefined) {
    return motionDocument;
  }
  const clamped = Math.min(
    following.atPermille - 1,
    Math.max(previous.atPermille + 1, clampAtPermilleV1(atPermille)),
  );
  if (clamped === current.atPermille) return motionDocument;
  current.atPermille = clamped;
  return parseMotionDocumentV1(draft);
}
