// SPDX-License-Identifier: MIT
import type { ResolvedAudioAssetEntryV1, ResolvedAudioManifestV1 } from "@sillymaker/base";
import type {
  AudioHostChannelV1,
  AudioHostDiagnosticV1,
  AudioHostEffectInputV1,
  AudioHostPlayInputV1,
  AudioHostV1,
  AudioBusV1,
} from "@sillymaker/ui";
import { audioBusForChannelV1 } from "@sillymaker/ui";

/**
 * The browser Audio Host: decodes and caches audio bytes, applies
 * continuous channels with gain fades, unlocks the AudioContext on the
 * first user gesture, and degrades to silence with a structured diagnostic
 * whenever autoplay is denied or media is missing/undecodable. Nothing here
 * touches gameplay State, and no audio node or
 * playback cursor is ever saved.
 */

interface WebAudioBufferLikeV1 {
  readonly duration: number;
}

interface WebAudioNodeLikeV1 {
  connect(target: unknown): unknown;
  disconnect(): void;
}

interface WebGainNodeLikeV1 extends WebAudioNodeLikeV1 {
  readonly gain: {
    value: number;
    setValueAtTime(value: number, startTime: number): unknown;
    linearRampToValueAtTime(value: number, endTime: number): unknown;
    cancelScheduledValues(startTime: number): unknown;
  };
}

interface WebBufferSourceLikeV1 extends WebAudioNodeLikeV1 {
  buffer: WebAudioBufferLikeV1 | null;
  loop: boolean;
  start(when?: number): void;
  stop(when?: number): void;
  addEventListener(type: "ended", listener: () => void, options?: { once?: boolean }): void;
}

/** The minimal AudioContext surface the host needs; injectable for tests. */
export interface WebAudioContextLikeV1 {
  readonly state: "suspended" | "running" | "closed";
  readonly currentTime: number;
  readonly destination: unknown;
  resume(): Promise<void>;
  suspend(): Promise<void>;
  close(): Promise<void>;
  createGain(): WebGainNodeLikeV1;
  createBufferSource(): WebBufferSourceLikeV1;
  decodeAudioData(bytes: ArrayBuffer): Promise<WebAudioBufferLikeV1>;
}

export interface CreateWebAudioHostOptionsV1 {
  readonly manifest: ResolvedAudioManifestV1;
  resolveRuntimeUrl(runtimePath: string): string;
  /** Injectable for tests; defaults to `new AudioContext()`. */
  createContext?(): WebAudioContextLikeV1;
  /** Injectable for tests; defaults to `fetch` returning response bytes. */
  fetchBytes?(url: string): Promise<Uint8Array>;
  reportDiagnostic?(diagnostic: AudioHostDiagnosticV1): void;
  /** Gesture event target for autoplay unlock; defaults to `document`. */
  readonly unlockTarget?: Pick<EventTarget, "addEventListener" | "removeEventListener">;
}

interface ActiveChannelV1 {
  readonly source: WebBufferSourceLikeV1;
  readonly gain: WebGainNodeLikeV1;
  readonly assetId: string;
}

async function defaultFetchBytesV1(url: string): Promise<Uint8Array> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`audio fetch failed with status ${String(response.status)}`);
  return new Uint8Array(await response.arrayBuffer());
}

export function createWebAudioHostV1(options: CreateWebAudioHostOptionsV1): AudioHostV1 {
  const entriesById = new Map<string, ResolvedAudioAssetEntryV1>(
    options.manifest.entries.map((entry) => [entry.assetId, entry]),
  );
  const fetchBytes = options.fetchBytes ?? defaultFetchBytesV1;
  const reportDiagnostic = options.reportDiagnostic ?? (() => undefined);
  const unlockTarget = options.unlockTarget ?? (typeof document === "undefined" ? null : document);

  let context: WebAudioContextLikeV1 | null = null;
  let masterGain: WebGainNodeLikeV1 | null = null;
  const busNodes = new Map<AudioBusV1, WebGainNodeLikeV1>();
  const busPermille = new Map<AudioBusV1, number>([
    ["bgm", 1000],
    ["voice", 1000],
    ["sfx", 1000],
  ]);
  let unlocked = false;
  let muted = false;
  let masterPermille = 1000;
  let disposed = false;
  const buffers = new Map<string, Promise<WebAudioBufferLikeV1 | null>>();
  const channels = new Map<AudioHostChannelV1, ActiveChannelV1>();
  /** Desired continuous playback applied once the context unlocks. */
  const pendingChannelPlays = new Map<AudioHostChannelV1, AudioHostPlayInputV1>();
  let removeUnlockListeners: (() => void) | undefined;

  const ensureContextV1 = (): WebAudioContextLikeV1 | null => {
    if (disposed) return null;
    if (context !== null) return context;
    try {
      context = options.createContext !== undefined
        ? options.createContext()
        : (new AudioContext() as unknown as WebAudioContextLikeV1);
    } catch (error) {
      reportDiagnostic({
        code: "audio.autoplay_denied",
        assetId: null,
        detail: `AudioContext unavailable: ${
          error instanceof Error ? error.message : String(error)
        }`,
      });
      return null;
    }
    masterGain = context.createGain();
    applyMasterGainV1();
    masterGain.connect(context.destination);
    for (const bus of ["bgm", "voice", "sfx"] as const) {
      const node = context.createGain();
      node.gain.value = (busPermille.get(bus) ?? 1000) / 1000;
      node.connect(masterGain);
      busNodes.set(bus, node);
    }
    if (context.state === "running") {
      unlocked = true;
    } else {
      reportDiagnostic({
        code: "audio.autoplay_denied",
        assetId: null,
        detail: "AudioContext is suspended until a user gesture unlocks it",
      });
      registerUnlockListenersV1();
    }
    return context;
  };

  const applyMasterGainV1 = (): void => {
    if (masterGain === null) return;
    masterGain.gain.value = muted ? 0 : masterPermille / 1000;
  };

  const registerUnlockListenersV1 = (): void => {
    if (unlockTarget === null || removeUnlockListeners !== undefined) return;
    const onGesture = (): void => {
      void unlockNowV1();
    };
    unlockTarget.addEventListener("pointerdown", onGesture);
    unlockTarget.addEventListener("keydown", onGesture);
    removeUnlockListeners = () => {
      unlockTarget.removeEventListener("pointerdown", onGesture);
      unlockTarget.removeEventListener("keydown", onGesture);
      removeUnlockListeners = undefined;
    };
  };

  const unlockNowV1 = async (): Promise<void> => {
    if (disposed || context === null || unlocked) return;
    try {
      await context.resume();
    } catch {
      return;
    }
    unlocked = true;
    removeUnlockListeners?.();
    for (const [, play] of pendingChannelPlays) startChannelV1(play);
    pendingChannelPlays.clear();
  };

  const loadBufferV1 = (assetId: string): Promise<WebAudioBufferLikeV1 | null> => {
    const cached = buffers.get(assetId);
    if (cached !== undefined) return cached;
    const loading = (async (): Promise<WebAudioBufferLikeV1 | null> => {
      const entry = entriesById.get(assetId);
      if (entry === undefined) {
        reportDiagnostic({
          code: "audio.asset_missing",
          assetId,
          detail: "asset is not declared in the audio manifest",
        });
        return null;
      }
      if (entry.delivery === "silence_fallback") return null;
      const activeContext = ensureContextV1();
      if (activeContext === null) return null;
      const bytes = await fetchBytes(options.resolveRuntimeUrl(entry.provider.runtimePath));
      try {
        return await activeContext.decodeAudioData(bytes.slice().buffer as ArrayBuffer);
      } catch (error) {
        reportDiagnostic({
          code: "audio.decode_failed",
          assetId,
          detail: error instanceof Error ? error.message : String(error),
        });
        return null;
      }
    })();
    const guarded = loading.catch((error: unknown) => {
      reportDiagnostic({
        code: "audio.decode_failed",
        assetId,
        detail: error instanceof Error ? error.message : String(error),
      });
      return null;
    });
    buffers.set(assetId, guarded);
    // Failed loads leave the cache so a later demand can open a new cycle.
    void guarded.then((buffer) => {
      if (buffer === null) buffers.delete(assetId);
    });
    return guarded;
  };

  const stopChannelV1 = (channel: AudioHostChannelV1, fadeMs: number): void => {
    const active = channels.get(channel);
    if (active === undefined) return;
    channels.delete(channel);
    const activeContext = context;
    if (activeContext === null) return;
    try {
      if (fadeMs > 0) {
        const now = activeContext.currentTime;
        active.gain.gain.cancelScheduledValues(now);
        active.gain.gain.setValueAtTime(active.gain.gain.value, now);
        active.gain.gain.linearRampToValueAtTime(0, now + fadeMs / 1000);
        active.source.stop(now + fadeMs / 1000);
      } else {
        active.source.stop();
      }
      active.source.addEventListener(
        "ended",
        () => {
          active.source.disconnect();
          active.gain.disconnect();
        },
        { once: true },
      );
    } catch {
      // Stopping an already-ended source is fine.
    }
  };

  const startChannelV1 = (input: AudioHostPlayInputV1): void => {
    const activeContext = ensureContextV1();
    if (activeContext === null || masterGain === null || disposed) return;
    if (!unlocked) {
      pendingChannelPlays.set(input.channel, input);
      return;
    }
    void loadBufferV1(input.assetId).then((buffer) => {
      if (buffer === null || disposed) return;
      // The desired state may have moved on while the bytes loaded.
      const pendingReplacement = channels.get(input.channel);
      if (pendingReplacement?.assetId === input.assetId) return;
      stopChannelV1(input.channel, 0);
      const gain = activeContext.createGain();
      const source = activeContext.createBufferSource();
      source.buffer = buffer;
      source.loop = input.loop;
      source.connect(gain);
      gain.connect(
        busNodes.get(audioBusForChannelV1(input.channel)) ?? (masterGain as WebGainNodeLikeV1),
      );
      const target = input.gainPermille / 1000;
      if (input.fadeMs > 0) {
        const now = activeContext.currentTime;
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(target, now + input.fadeMs / 1000);
      } else {
        gain.gain.value = target;
      }
      source.addEventListener(
        "ended",
        () => {
          if (channels.get(input.channel)?.source === source) channels.delete(input.channel);
          source.disconnect();
          gain.disconnect();
        },
        { once: true },
      );
      source.start();
      channels.set(input.channel, { source, gain, assetId: input.assetId });
    });
  };

  return Object.freeze({
    play(input: AudioHostPlayInputV1): void {
      if (disposed) return;
      startChannelV1(input);
    },
    stop(channel: AudioHostChannelV1, fadeMs: number): void {
      pendingChannelPlays.delete(channel);
      stopChannelV1(channel, fadeMs);
    },
    playEffect(input: AudioHostEffectInputV1): void {
      if (disposed) return;
      const activeContext = ensureContextV1();
      if (activeContext === null || masterGain === null) return;
      if (!unlocked) {
        // One-shots are never queued: replaying them later would be wrong.
        reportDiagnostic({
          code: "audio.autoplay_denied",
          assetId: input.assetId,
          detail: "effect dropped because the AudioContext is still locked",
        });
        return;
      }
      void loadBufferV1(input.assetId).then((buffer) => {
        if (buffer === null || disposed) return;
        const gain = activeContext.createGain();
        gain.gain.value = input.gainPermille / 1000;
        const source = activeContext.createBufferSource();
        source.buffer = buffer;
        source.connect(gain);
        gain.connect(busNodes.get("sfx") ?? (masterGain as WebGainNodeLikeV1));
        source.addEventListener(
          "ended",
          () => {
            source.disconnect();
            gain.disconnect();
          },
          { once: true },
        );
        source.start();
      });
    },
    setMasterGain(gainPermille: number): void {
      masterPermille = Math.min(1000, Math.max(0, gainPermille));
      applyMasterGainV1();
    },
    setBusGain(bus: AudioBusV1, gainPermille: number): void {
      const clamped = Math.min(1000, Math.max(0, gainPermille));
      busPermille.set(bus, clamped);
      const node = busNodes.get(bus);
      if (node !== undefined) node.gain.value = clamped / 1000;
    },
    setMuted(nextMuted: boolean): void {
      muted = nextMuted;
      applyMasterGainV1();
    },
    suspend(): void {
      if (disposed || context === null || !unlocked) return;
      void context.suspend().catch(() => undefined);
    },
    resume(): void {
      if (disposed || context === null || !unlocked) return;
      void context.resume().catch(() => undefined);
    },
    dispose(): void {
      if (disposed) return;
      disposed = true;
      removeUnlockListeners?.();
      pendingChannelPlays.clear();
      for (const channel of [...channels.keys()]) stopChannelV1(channel, 0);
      buffers.clear();
      if (context !== null) void context.close().catch(() => undefined);
      context = null;
      masterGain = null;
      busNodes.clear();
    },
  });
}
