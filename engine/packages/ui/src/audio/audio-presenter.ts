// SPDX-License-Identifier: MIT
import type { AudioIntentV1, TransientEffectV1 } from "@sillymaker/base";
import { silentAudioIntentV1 } from "@sillymaker/base";

import type { AudioHostV1 } from "./audio-host.ts";
import { sameChannelPlaybackV1 } from "./audio-host.ts";

/**
 * The audio presenter reconciles the Story's saveable continuous audio
 * intent (BGM, ambient, current voice) and the commit-only transient effect
 * stream against an Audio Host. It is pure presentation: it observes
 * publications, never writes gameplay State, and epoch fencing plus an
 * instance-local consumed watermark guarantee one-shot effects play at most
 * once per presentation epoch and are never replayed by re-projection,
 * load, or rebootstrap.
 */

export interface AudioPresenterRetargetInputV1 {
  readonly intent: AudioIntentV1;
  readonly revision: number;
  readonly epoch: number;
}

export interface AudioPresenterV1 {
  /** Reconciles the continuous channels after a publication. */
  retarget(input: AudioPresenterRetargetInputV1): void;
  /** Feeds one commit-only transient effect from the instance stream. */
  onTransientEffect(effect: TransientEffectV1): void;
  /** Replays the current voice line (player control; no gameplay effect). */
  replayVoice(): boolean;
  suspend(): void;
  resume(): void;
  dispose(): void;
}

export interface ResolvedEffectAssetV1 {
  readonly assetId: string;
  /** Per-effect gain (authored SFX volume); defaults to `sfxGainPermille`. */
  readonly gainPermille?: number;
}

export interface CreateAudioPresenterOptionsV1 {
  readonly host: AudioHostV1;
  /** Maps a transient effect to a playable SFX asset; null ignores it. */
  resolveEffectAsset?(effect: TransientEffectV1): ResolvedEffectAssetV1 | null;
  readonly sfxGainPermille?: number;
}

export function createAudioPresenterV1(options: CreateAudioPresenterOptionsV1): AudioPresenterV1 {
  const sfxGain = options.sfxGainPermille ?? 1000;
  let current: AudioIntentV1 = silentAudioIntentV1;
  let currentEpoch: number | null = null;
  let currentRevision: number | null = null;
  let consumedWatermark = 0;
  let disposed = false;

  const reconcileChannelV1 = (
    channel: "bgm" | "ambient",
    previous: AudioIntentV1[typeof channel],
    next: AudioIntentV1[typeof channel],
  ): void => {
    if (sameChannelPlaybackV1(previous, next)) return;
    if (next === null) {
      options.host.stop(channel, previous?.fadeMs ?? 0);
      return;
    }
    options.host.play({
      channel,
      assetId: next.assetId,
      loop: next.loop,
      gainPermille: next.gainPermille,
      fadeMs: next.fadeMs,
    });
  };

  const reconcileVoiceV1 = (
    previous: AudioIntentV1["voice"],
    next: AudioIntentV1["voice"],
  ): void => {
    if (previous?.occurrenceId === next?.occurrenceId && previous?.assetId === next?.assetId) {
      return;
    }
    if (previous !== null && next?.occurrenceId !== previous.occurrenceId) {
      // The interaction moved on: stop_on_advance lines stop, sustain lines
      // keep playing until they end naturally or another voice starts.
      if (previous.stopPolicy === "stop_on_advance" || next !== null) {
        options.host.stop("voice", 0);
      }
    }
    if (next !== null) {
      options.host.play({
        channel: "voice",
        assetId: next.assetId,
        loop: false,
        gainPermille: 1000,
        fadeMs: 0,
      });
    }
  };

  return Object.freeze({
    retarget(input: AudioPresenterRetargetInputV1): void {
      if (disposed) return;

      // Epoch changes (load, rollback, rebootstrap) re-anchor playback:
      // continuous intent is restored from the loaded State, and the
      // watermark primes so no pre-load one-shot effect can replay.
      if (currentEpoch !== null && input.epoch !== currentEpoch) {
        currentEpoch = input.epoch;
        currentRevision = input.revision;
        const previous = current;
        current = input.intent;
        reconcileChannelV1("bgm", previous.bgm, input.intent.bgm);
        reconcileChannelV1("ambient", previous.ambient, input.intent.ambient);
        reconcileVoiceV1(previous.voice, input.intent.voice);
        return;
      }

      // Same-revision re-projections are not a new edge.
      if (currentEpoch === input.epoch && currentRevision === input.revision) return;

      const previous = current;
      currentEpoch = input.epoch;
      currentRevision = input.revision;
      current = input.intent;
      reconcileChannelV1("bgm", previous.bgm, input.intent.bgm);
      reconcileChannelV1("ambient", previous.ambient, input.intent.ambient);
      reconcileVoiceV1(previous.voice, input.intent.voice);
    },

    onTransientEffect(effect: TransientEffectV1): void {
      if (disposed) return;
      // Effects from another epoch are stale by definition; the watermark
      // additionally drops duplicates within the current epoch.
      if (currentEpoch !== null && effect.epoch !== currentEpoch) return;
      if (effect.effectSequence <= consumedWatermark) return;
      consumedWatermark = effect.effectSequence;
      const resolved = options.resolveEffectAsset?.(effect) ?? null;
      if (resolved === null) return;
      options.host.playEffect({
        assetId: resolved.assetId,
        gainPermille: resolved.gainPermille ?? sfxGain,
      });
    },

    replayVoice(): boolean {
      if (disposed || current.voice === null) return false;
      options.host.play({
        channel: "voice",
        assetId: current.voice.assetId,
        loop: false,
        gainPermille: 1000,
        fadeMs: 0,
      });
      return true;
    },

    suspend(): void {
      if (disposed) return;
      options.host.suspend();
    },
    resume(): void {
      if (disposed) return;
      options.host.resume();
    },
    dispose(): void {
      if (disposed) return;
      disposed = true;
      options.host.stop("bgm", 0);
      options.host.stop("ambient", 0);
      options.host.stop("voice", 0);
    },
  });
}
