// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";

import type { AudioIntentV1, TransientEffectV1 } from "@sillymaker/base";
import { parseAudioIntentV1 } from "@sillymaker/base";

import { createFakeAudioHostV1 } from "./audio-host.ts";
import { createAudioPresenterV1 } from "./audio-presenter.ts";

function intentV1(input: {
  readonly bgm?: string | null;
  readonly ambient?: string | null;
  readonly voice?: {
    readonly assetId: string;
    readonly occurrenceId: string;
    readonly stopPolicy?: "stop_on_advance" | "sustain";
  } | null;
}): AudioIntentV1 {
  return parseAudioIntentV1({
    bgm:
      input.bgm === undefined || input.bgm === null
        ? null
        : { assetId: input.bgm, loop: true, gainPermille: 800, fadeMs: 300 },
    ambient:
      input.ambient === undefined || input.ambient === null
        ? null
        : { assetId: input.ambient, loop: true, gainPermille: 500, fadeMs: 200 },
    voice:
      input.voice === undefined || input.voice === null
        ? null
        : {
            assetId: input.voice.assetId,
            interactionDefinitionId: "interaction.test.say",
            occurrenceId: input.voice.occurrenceId,
            stopPolicy: input.voice.stopPolicy ?? "stop_on_advance",
          },
  });
}

function effectV1(
  sequence: number,
  epoch: number,
  assetId = "audio.test.chime",
): TransientEffectV1 {
  return Object.freeze({
    effectSequence: sequence,
    epoch,
    effectId: "audio.sfx",
    payload: Object.freeze({ assetId }),
  });
}

function presenterV1() {
  const host = createFakeAudioHostV1();
  const presenter = createAudioPresenterV1({
    host,
    resolveEffectAsset: (effect) =>
      effect.effectId === "audio.sfx" && typeof effect.payload.assetId === "string"
        ? { assetId: effect.payload.assetId }
        : null,
  });
  return { host, presenter };
}

describe("createAudioPresenterV1", () => {
  it("reconciles BGM/ambient replace, loop, and fade intents idempotently", () => {
    const { host, presenter } = presenterV1();

    presenter.retarget({ intent: intentV1({ bgm: "audio.test.theme" }), revision: 1, epoch: 0 });
    expect(host.channel("bgm")).toMatchObject({ assetId: "audio.test.theme", loop: true });

    // Same revision re-projection: no replay, no restart.
    presenter.retarget({ intent: intentV1({ bgm: "audio.test.theme" }), revision: 1, epoch: 0 });
    expect(host.operations().filter((op) => op.startsWith("play:bgm"))).toHaveLength(1);

    // New revision with the same steady state: still no restart.
    presenter.retarget({ intent: intentV1({ bgm: "audio.test.theme" }), revision: 2, epoch: 0 });
    expect(host.operations().filter((op) => op.startsWith("play:bgm"))).toHaveLength(1);

    // Replace crossfades to the new track; ambient joins independently.
    presenter.retarget({
      intent: intentV1({ bgm: "audio.test.storm", ambient: "audio.test.rain" }),
      revision: 3,
      epoch: 0,
    });
    expect(host.channel("bgm")).toMatchObject({ assetId: "audio.test.storm", fadeMs: 300 });
    expect(host.channel("ambient")).toMatchObject({ assetId: "audio.test.rain" });

    // Clearing a channel stops it with its fade.
    presenter.retarget({ intent: intentV1({ ambient: "audio.test.rain" }), revision: 4, epoch: 0 });
    expect(host.channel("bgm")).toBeNull();
    expect(host.operations()).toContain("stop:bgm:fade=300");
  });

  it("restores continuous intent across an epoch change without replaying effects", () => {
    const { host, presenter } = presenterV1();
    presenter.retarget({ intent: intentV1({ bgm: "audio.test.theme" }), revision: 5, epoch: 0 });
    presenter.onTransientEffect(effectV1(1, 0));
    expect(host.effects()).toHaveLength(1);

    // Load: epoch bumps, a DIFFERENT continuous intent is restored, and the
    // channels reconcile to the loaded targets.
    presenter.retarget({ intent: intentV1({ bgm: "audio.test.storm" }), revision: 6, epoch: 1 });
    expect(host.channel("bgm")).toMatchObject({ assetId: "audio.test.storm" });

    // Old-epoch effects are stale after the load; nothing replays.
    presenter.onTransientEffect(effectV1(2, 0));
    expect(host.effects()).toHaveLength(1);
  });

  it("plays each SFX occurrence at most once per epoch via the watermark", () => {
    const { host, presenter } = presenterV1();
    presenter.retarget({ intent: intentV1({}), revision: 1, epoch: 0 });

    presenter.onTransientEffect(effectV1(1, 0));
    presenter.onTransientEffect(effectV1(2, 0));
    // Re-delivery of an already-consumed sequence (re-projection, duplicate
    // subscription) is dropped by the instance-local watermark.
    presenter.onTransientEffect(effectV1(1, 0));
    presenter.onTransientEffect(effectV1(2, 0));
    expect(host.effects()).toHaveLength(2);
    expect(host.effects().map((effect) => effect.assetId)).toEqual([
      "audio.test.chime",
      "audio.test.chime",
    ]);
  });

  it("ties voice to the say occurrence with stop_on_advance and sustain", () => {
    const { host, presenter } = presenterV1();

    presenter.retarget({
      intent: intentV1({
        voice: { assetId: "audio.test.line1", occurrenceId: "interaction-occurrence.1" },
      }),
      revision: 1,
      epoch: 0,
    });
    expect(host.channel("voice")).toMatchObject({ assetId: "audio.test.line1" });

    // Advance: stop_on_advance stops the old line even with no new voice.
    presenter.retarget({ intent: intentV1({}), revision: 2, epoch: 0 });
    expect(host.channel("voice")).toBeNull();

    // Sustain: the line keeps playing when the interaction moves on.
    presenter.retarget({
      intent: intentV1({
        voice: {
          assetId: "audio.test.line2",
          occurrenceId: "interaction-occurrence.2",
          stopPolicy: "sustain",
        },
      }),
      revision: 3,
      epoch: 0,
    });
    presenter.retarget({ intent: intentV1({}), revision: 4, epoch: 0 });
    expect(host.channel("voice")).toMatchObject({ assetId: "audio.test.line2" });

    // A NEW voice line always replaces the sustained one.
    presenter.retarget({
      intent: intentV1({
        voice: { assetId: "audio.test.line3", occurrenceId: "interaction-occurrence.3" },
      }),
      revision: 5,
      epoch: 0,
    });
    expect(host.channel("voice")).toMatchObject({ assetId: "audio.test.line3" });

    // Voice replay is a player control that re-triggers the current line.
    expect(presenter.replayVoice()).toBe(true);
    expect(host.operations().filter((op) => op.startsWith("play:voice"))).toHaveLength(4);
  });

  it("suspends, resumes, and disposes without duplicate or leaked playback", () => {
    const { host, presenter } = presenterV1();
    presenter.retarget({ intent: intentV1({ bgm: "audio.test.theme" }), revision: 1, epoch: 0 });

    presenter.suspend();
    presenter.suspend();
    expect(host.operations().filter((op) => op === "suspend")).toHaveLength(1);
    presenter.resume();
    expect(host.isSuspended()).toBe(false);

    presenter.dispose();
    expect(host.channel("bgm")).toBeNull();
    presenter.onTransientEffect(effectV1(9, 0));
    expect(host.effects()).toHaveLength(0);
    presenter.retarget({ intent: intentV1({ bgm: "audio.test.storm" }), revision: 2, epoch: 0 });
    expect(host.channel("bgm")).toBeNull();
  });
});
