// @vitest-environment jsdom
// SPDX-License-Identifier: MIT
// The engine audio component over deterministic fakes: continuous intent
// follows publications, one-shot SFX follow the effect stream, and the
// player profile drives master volume/mute live.
import { cleanup, render } from "@testing-library/react";
import { act } from "react";
import { afterEach, describe, expect, it } from "vitest";

import type { AudioIntentV1, TransientEffectV1 } from "@sillymaker/base";
import { silentAudioIntentV1 } from "@sillymaker/base";
import { createPlayerProfileStoreV1 } from "@sillymaker/base/runtime";
import { createMemoryHostRecordStoreV1 } from "@sillymaker/base/testkit";

import { createFakeAudioHostV1 } from "./audio-host.ts";
import type { FakeAudioHostV1 } from "./audio-host.ts";
import { GameAudioV1 } from "./game-audio.tsx";
import type { GameAudioPortsV1 } from "./game-audio.tsx";

interface FakeInstanceV1 {
  readonly ports: GameAudioPortsV1;
  publish(intent: AudioIntentV1): void;
  emit(effect: TransientEffectV1): void;
}

function createFakeInstanceV1(): FakeInstanceV1 {
  let revision = 1;
  let intent: AudioIntentV1 = silentAudioIntentV1;
  const semanticListeners = new Set<() => void>();
  const effectListeners = new Set<(effect: TransientEffectV1) => void>();
  return Object.freeze({
    ports: Object.freeze({
      semantic: Object.freeze({
        observe: () => Object.freeze({ revision, audio: intent }),
        subscribe(listener: () => void) {
          semanticListeners.add(listener);
          return () => semanticListeners.delete(listener);
        },
      }),
      presentationAnchor: () => Object.freeze({ epoch: 1 }),
      subscribePresentationAnchor: () => () => undefined,
      subscribeTransientEffects(listener: (effect: TransientEffectV1) => void) {
        effectListeners.add(listener);
        return () => effectListeners.delete(listener);
      },
    }),
    publish(next: AudioIntentV1): void {
      revision += 1;
      intent = next;
      for (const listener of [...semanticListeners]) listener();
    },
    emit(effect: TransientEffectV1): void {
      for (const listener of [...effectListeners]) listener(effect);
    },
  });
}

const selectIntentV1 = (publication: unknown): AudioIntentV1 =>
  (publication as { readonly audio: AudioIntentV1 }).audio;

afterEach(cleanup);

describe("GameAudioV1", () => {
  it("drives continuous channels, one-shot effects, and profile volume", async () => {
    const host: FakeAudioHostV1 = createFakeAudioHostV1();
    const instance = createFakeInstanceV1();
    const playerProfile = await createPlayerProfileStoreV1({
      records: createMemoryHostRecordStoreV1(),
      storyId: "story.test.audio",
      reportFailure: () => {},
    });
    const voiceControls: {
      replay: (() => boolean) | null;
      playing: (() => boolean) | null;
    } = { replay: null, playing: null };

    const view = render(
      <GameAudioV1
        ports={instance.ports}
        createHost={() => host}
        selectIntent={selectIntentV1}
        resolveEffectAsset={(effect) =>
          effect.effectId === "sfx" ? { assetId: String(effect.payload.assetId) } : null}
        playerProfile={playerProfile}
        registerReplayVoice={(replay) => {
          voiceControls.replay = replay;
        }}
        registerCurrentVoicePlaying={(playing) => {
          voiceControls.playing = playing;
        }}
      />,
    );

    // Profile defaults are applied on mount.
    expect(host.masterGainPermille()).toBe(playerProfile.current().preferences.masterGainPermille);
    expect(host.isMuted()).toBe(false);
    expect(voiceControls.playing?.()).toBe(false);

    // A publication with a BGM intent starts the channel.
    act(() =>
      instance.publish(
        Object.freeze({
          bgm: Object.freeze({
            assetId: "audio.test.bgm",
            loop: true,
            gainPermille: 800,
            fadeMs: 200,
          }),
          ambient: null,
          voice: null,
        }),
      )
    );
    expect(host.channel("bgm")?.assetId).toBe("audio.test.bgm");

    act(() =>
      instance.publish(
        Object.freeze({
          bgm: null,
          ambient: null,
          voice: Object.freeze({
            assetId: "audio.test.voice",
            interactionDefinitionId: "interaction.test.say",
            occurrenceId: "interaction-occurrence.test.1",
            stopPolicy: "stop_on_advance" as const,
          }),
        }),
      )
    );
    expect(voiceControls.playing?.()).toBe(true);
    host.finishChannel("voice");
    expect(voiceControls.playing?.()).toBe(false);
    expect(voiceControls.replay?.()).toBe(true);
    expect(voiceControls.playing?.()).toBe(true);

    // A transient effect plays a one-shot; duplicates are fenced.
    const effect = Object.freeze({
      effectId: "sfx",
      payload: Object.freeze({ assetId: "audio.test.ding" }),
      epoch: 1,
      effectSequence: 1,
    }) as unknown as TransientEffectV1;
    act(() => instance.emit(effect));
    act(() => instance.emit(effect));
    expect(host.effects()).toHaveLength(1);

    // Volume/mute preferences reach the host live — including the buses.
    await act(async () => {
      await playerProfile.updatePreferences({
        masterGainPermille: 250,
        bgmGainPermille: 600,
        voiceGainPermille: 400,
        sfxGainPermille: 300,
        muted: true,
      });
    });
    expect(host.masterGainPermille()).toBe(250);
    expect(host.busGainPermille("bgm")).toBe(600);
    expect(host.busGainPermille("voice")).toBe(400);
    expect(host.busGainPermille("sfx")).toBe(300);
    expect(host.isMuted()).toBe(true);

    view.unmount();
    expect(voiceControls.replay).toBeNull();
    expect(voiceControls.playing).toBeNull();
  });

  it("stops all channels and disposes the host on unmount", () => {
    const host = createFakeAudioHostV1();
    const instance = createFakeInstanceV1();
    const view = render(
      <GameAudioV1 ports={instance.ports} createHost={() => host} selectIntent={selectIntentV1} />,
    );
    view.unmount();
    expect(host.isDisposed()).toBe(true);
  });
});
