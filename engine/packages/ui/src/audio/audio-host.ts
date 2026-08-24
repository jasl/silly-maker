// SPDX-License-Identifier: MIT
import type { AudioChannelIntentV1 } from "@sillymaker/base";

/**
 * The Host-neutral audio playback surface the audio presenter drives.
 * Browsers implement it over Web Audio; deterministic tests use the fake
 * host. Hosts own decode, caching, unlock, volume, and page lifecycle; they
 * never touch gameplay State, and playback failures degrade to silence with
 * a diagnostic instead of blocking anything.
 */

export type AudioHostChannelV1 = "bgm" | "ambient" | "voice";

/**
 * Player-facing volume buses: `bgm` groups the continuous music/ambient
 * channels, `voice` the voice channel, and `sfx` the one-shot effects.
 */
export type AudioBusV1 = "bgm" | "voice" | "sfx";

export const audioBusForChannelV1 = (channel: AudioHostChannelV1): AudioBusV1 =>
  channel === "voice" ? "voice" : "bgm";

export interface AudioHostPlayInputV1 {
  readonly channel: AudioHostChannelV1;
  readonly assetId: string;
  readonly loop: boolean;
  readonly gainPermille: number;
  readonly fadeMs: number;
}

export interface AudioHostEffectInputV1 {
  readonly assetId: string;
  readonly gainPermille: number;
}

export interface AudioHostDiagnosticV1 {
  readonly code:
    | "audio.autoplay_denied"
    | "audio.decode_failed"
    | "audio.asset_missing";
  readonly assetId: string | null;
  readonly detail: string;
}

export interface AudioHostV1 {
  /** Starts (or crossfades to) the asset on a continuous channel. */
  play(input: AudioHostPlayInputV1): void;
  /** Stops a continuous channel, fading out over fadeMs. */
  stop(channel: AudioHostChannelV1, fadeMs: number): void;
  /** Fire-and-forget one-shot effect; never tracked, never restored. */
  playEffect(input: AudioHostEffectInputV1): void;
  setMasterGain(gainPermille: number): void;
  /** Per-bus player volume multiplied under the master gain. */
  setBusGain(bus: AudioBusV1, gainPermille: number): void;
  setMuted(muted: boolean): void;
  /** Page-visibility suspension; resume continues continuous channels. */
  suspend(): void;
  resume(): void;
  dispose(): void;
}

export interface FakeAudioChannelStateV1 {
  readonly assetId: string;
  readonly loop: boolean;
  readonly gainPermille: number;
  readonly fadeMs: number;
}

export interface FakeAudioHostV1 extends AudioHostV1 {
  channel(channel: AudioHostChannelV1): FakeAudioChannelStateV1 | null;
  effects(): readonly AudioHostEffectInputV1[];
  operations(): readonly string[];
  isSuspended(): boolean;
  isMuted(): boolean;
  masterGainPermille(): number;
  busGainPermille(bus: AudioBusV1): number;
  isDisposed(): boolean;
}

/** Deterministic in-memory audio host for unit and headless tests. */
export function createFakeAudioHostV1(): FakeAudioHostV1 {
  const channels = new Map<AudioHostChannelV1, FakeAudioChannelStateV1>();
  const effects: AudioHostEffectInputV1[] = [];
  const operations: string[] = [];
  let suspended = false;
  let muted = false;
  let masterGain = 1000;
  const busGains = new Map<AudioBusV1, number>([
    ["bgm", 1000],
    ["voice", 1000],
    ["sfx", 1000],
  ]);
  let disposed = false;

  return {
    play(input: AudioHostPlayInputV1): void {
      if (disposed) return;
      channels.set(input.channel, {
        assetId: input.assetId,
        loop: input.loop,
        gainPermille: input.gainPermille,
        fadeMs: input.fadeMs,
      });
      operations.push(`play:${input.channel}:${input.assetId}:fade=${String(input.fadeMs)}`);
    },
    stop(channel: AudioHostChannelV1, fadeMs: number): void {
      if (disposed) return;
      if (channels.delete(channel)) {
        operations.push(`stop:${channel}:fade=${String(fadeMs)}`);
      }
    },
    playEffect(input: AudioHostEffectInputV1): void {
      if (disposed) return;
      effects.push(input);
      operations.push(`effect:${input.assetId}`);
    },
    setMasterGain(gainPermille: number): void {
      masterGain = gainPermille;
      operations.push(`master:${String(gainPermille)}`);
    },
    setBusGain(bus: AudioBusV1, gainPermille: number): void {
      busGains.set(bus, gainPermille);
      operations.push(`bus:${bus}:${String(gainPermille)}`);
    },
    setMuted(nextMuted: boolean): void {
      muted = nextMuted;
      operations.push(`muted:${String(nextMuted)}`);
    },
    suspend(): void {
      if (suspended || disposed) return;
      suspended = true;
      operations.push("suspend");
    },
    resume(): void {
      if (!suspended || disposed) return;
      suspended = false;
      operations.push("resume");
    },
    dispose(): void {
      if (disposed) return;
      disposed = true;
      channels.clear();
      operations.push("dispose");
    },
    channel: (channel: AudioHostChannelV1) => channels.get(channel) ?? null,
    effects: () => [...effects],
    operations: () => [...operations],
    isSuspended: () => suspended,
    isMuted: () => muted,
    masterGainPermille: () => masterGain,
    busGainPermille: (bus: AudioBusV1) => busGains.get(bus) ?? 1000,
    isDisposed: () => disposed,
  };
}

/** True when two channel intents describe the same steady-state playback. */
export function sameChannelPlaybackV1(
  left: AudioChannelIntentV1 | null,
  right: AudioChannelIntentV1 | null,
): boolean {
  if (left === null || right === null) return left === right;
  return (
    left.assetId === right.assetId &&
    left.loop === right.loop &&
    left.gainPermille === right.gainPermille
  );
}
