// SPDX-License-Identifier: MIT
import { useEffect } from "react";

import type { AudioIntentV1, TransientEffectV1 } from "@sillymaker/base";
import type { PlayerProfileStoreV1 } from "@sillymaker/base/runtime";

import type { AudioHostV1 } from "./audio-host.ts";
import type { ResolvedEffectAssetV1 } from "./audio-presenter.ts";
import { createAudioPresenterV1 } from "./audio-presenter.ts";

/**
 * The application-instance surface the audio component observes. Every
 * member is part of the core application contract; the component only
 * reads publications and streams — it never touches gameplay State.
 */
export interface GameAudioPortsV1 {
  readonly semantic: {
    observe(): unknown;
    subscribe(listener: () => void): () => void;
  };
  presentationAnchor(): { readonly epoch: number };
  subscribePresentationAnchor(listener: () => void): () => void;
  subscribeTransientEffects(listener: (effect: TransientEffectV1) => void): () => void;
}

export interface GameAudioPropsV1 {
  readonly ports: GameAudioPortsV1;
  readonly createHost: () => AudioHostV1;
  /** Reads the Story's saveable continuous intent from a publication. */
  selectIntent(publication: unknown): AudioIntentV1;
  /** Maps a commit-only transient effect to a one-shot SFX; null ignores. */
  resolveEffectAsset?(effect: TransientEffectV1): ResolvedEffectAssetV1 | null;
  readonly sfxGainPermille?: number;
  /**
   * Live master volume/mute: the component subscribes to the profile and
   * forwards `masterGainPermille`/`muted` to the host, so the Settings
   * sliders take effect immediately and persist across sessions.
   */
  readonly playerProfile?: PlayerProfileStoreV1;
  /** Receives the voice-replay control (player UI); null on unmount. */
  registerReplayVoice?(replay: (() => boolean) | null): void;
  /** Receives a synchronous current-line voice activity query; null on unmount. */
  registerCurrentVoicePlaying?(query: (() => boolean) | null): void;
}

/**
 * The engine audio lifetime: one Audio Host plus one presenter per mounted
 * component. Continuous channels follow the semantic publication (saveable
 * intent), one-shot SFX follow the commit-only transient effect stream with
 * epoch fencing, page visibility suspends and resumes playback, and the
 * player profile drives master volume and mute.
 */
export function GameAudioV1(props: GameAudioPropsV1): null {
  const {
    ports,
    createHost,
    selectIntent,
    resolveEffectAsset,
    sfxGainPermille,
    playerProfile,
    registerReplayVoice,
    registerCurrentVoicePlaying,
  } = props;
  useEffect(() => {
    const host = createHost();
    const presenter = createAudioPresenterV1({
      host,
      ...(resolveEffectAsset === undefined ? {} : { resolveEffectAsset }),
      ...(sfxGainPermille === undefined ? {} : { sfxGainPermille }),
    });
    const apply = (): void => {
      const publication = ports.semantic.observe();
      presenter.retarget({
        intent: selectIntent(publication),
        revision: (publication as { readonly revision: number }).revision,
        epoch: ports.presentationAnchor().epoch,
      });
    };
    const applyProfile = (): void => {
      if (playerProfile === undefined) return;
      const preferences = playerProfile.current().preferences;
      host.setMasterGain(preferences.masterGainPermille);
      host.setBusGain("bgm", preferences.bgmGainPermille);
      host.setBusGain("voice", preferences.voiceGainPermille);
      host.setBusGain("sfx", preferences.sfxGainPermille);
      host.setMuted(preferences.muted);
    };
    applyProfile();
    apply();
    const unsubscribeSemantic = ports.semantic.subscribe(apply);
    const unsubscribeAnchor = ports.subscribePresentationAnchor(apply);
    const unsubscribeEffects = ports.subscribeTransientEffects((effect) =>
      presenter.onTransientEffect(effect)
    );
    const unsubscribeProfile = playerProfile?.subscribe(applyProfile);
    const hasDocument = typeof document !== "undefined";
    const onVisibilityChange = (): void => {
      if (document.visibilityState === "hidden") presenter.suspend();
      else presenter.resume();
    };
    if (hasDocument) document.addEventListener("visibilitychange", onVisibilityChange);
    registerReplayVoice?.(() => presenter.replayVoice());
    registerCurrentVoicePlaying?.(() => presenter.isCurrentVoicePlaying());
    return () => {
      registerCurrentVoicePlaying?.(null);
      registerReplayVoice?.(null);
      if (hasDocument) document.removeEventListener("visibilitychange", onVisibilityChange);
      unsubscribeProfile?.();
      unsubscribeEffects();
      unsubscribeAnchor();
      unsubscribeSemantic();
      presenter.dispose();
      host.dispose();
    };
  }, [
    ports,
    createHost,
    selectIntent,
    resolveEffectAsset,
    sfxGainPermille,
    playerProfile,
    registerReplayVoice,
    registerCurrentVoicePlaying,
  ]);
  return null;
}
