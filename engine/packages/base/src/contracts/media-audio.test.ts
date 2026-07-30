// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";

import { createAssetDemandPlanV1 } from "./asset-demand.ts";
import { parseAudioIntentV1, parseVoiceIntentV1, resolveAudioManifestV1 } from "./media-audio.ts";
import { PresentationDataError } from "./presentation-data.ts";

const digestV1 = `sha256:${"b".repeat(64)}`;

describe("audio media contracts", () => {
  it("resolves slots to verified providers or the silence fallback", () => {
    const manifest = resolveAudioManifestV1(
      [
        { assetId: "audio.test.theme", kind: "music", fallback: "silence", loadGroup: "bootstrap" },
        { assetId: "audio.test.hum", kind: "ambient", fallback: "silence", loadGroup: "scene" },
      ],
      [
        {
          assetId: "audio.test.theme",
          runtimePath: "audio/theme.ogg",
          mediaType: "audio/ogg",
          byteLength: 2048,
          sha256: digestV1,
          durationMs: 30_000,
        },
      ],
    );
    expect(manifest.entries).toMatchObject([
      { assetId: "audio.test.theme", delivery: "runtime_audio", provider: { byteLength: 2048 } },
      { assetId: "audio.test.hum", delivery: "silence_fallback", provider: null },
    ]);
    // Round-trips as plain JSON.
    expect(JSON.parse(JSON.stringify(manifest))).toEqual(manifest);
  });

  it("accepts audio/mp4 providers (m4a/AAC payloads)", () => {
    const manifest = resolveAudioManifestV1(
      [{ assetId: "audio.test.jingle", kind: "sfx", fallback: "silence", loadGroup: "on_demand" }],
      [
        {
          assetId: "audio.test.jingle",
          runtimePath: "audio/jingle.m4a",
          mediaType: "audio/mp4",
          byteLength: 512,
          sha256: digestV1,
          durationMs: null,
        },
      ],
    );
    expect(manifest.entries).toMatchObject([
      { assetId: "audio.test.jingle", provider: { mediaType: "audio/mp4" } },
    ]);
    expect(() =>
      resolveAudioManifestV1(
        [
          {
            assetId: "audio.test.jingle",
            kind: "sfx",
            fallback: "silence",
            loadGroup: "on_demand",
          },
        ],
        [
          {
            assetId: "audio.test.jingle",
            runtimePath: "audio/jingle.m4a",
            mediaType: "audio/x-m4a",
            byteLength: 512,
            sha256: digestV1,
            durationMs: null,
          },
        ],
      ),
    ).toThrow("audio_media_type_invalid");
  });

  it("rejects duplicate slots, orphan providers, and image-flavored kinds", () => {
    const slot = {
      assetId: "audio.test.theme",
      kind: "music",
      fallback: "silence",
      loadGroup: "bootstrap",
    };
    expect(() => resolveAudioManifestV1([slot, slot], [])).toThrow("audio_slot_duplicate");
    expect(() =>
      resolveAudioManifestV1(
        [slot],
        [
          {
            assetId: "audio.test.ghost",
            runtimePath: "audio/ghost.ogg",
            mediaType: "audio/ogg",
            byteLength: 1,
            sha256: digestV1,
            durationMs: null,
          },
        ],
      ),
    ).toThrow("audio_provider_unknown_slot");
    expect(() => resolveAudioManifestV1([{ ...slot, kind: "background" }], [])).toThrow(
      "audio_kind_invalid",
    );
  });

  it("validates audio intent integers and voice policies", () => {
    const intent = parseAudioIntentV1({
      bgm: { assetId: "audio.test.theme", loop: true, gainPermille: 800, fadeMs: 400 },
      ambient: null,
      voice: {
        assetId: "audio.test.line",
        interactionDefinitionId: "interaction.test.say",
        occurrenceId: "interaction-occurrence.3",
        stopPolicy: "sustain",
      },
    });
    expect(JSON.parse(JSON.stringify(intent))).toEqual(intent);
    expect(() =>
      parseAudioIntentV1({
        bgm: { assetId: "audio.test.theme", loop: true, gainPermille: 800.5, fadeMs: 0 },
        ambient: null,
        voice: null,
      }),
    ).toThrow(PresentationDataError);
    expect(() =>
      parseVoiceIntentV1({
        assetId: "audio.test.line",
        interactionDefinitionId: "interaction.test.say",
        occurrenceId: "interaction-occurrence.3",
        stopPolicy: "loop_forever",
      }),
    ).toThrow("voice_stop_policy_invalid");
  });

  it("builds bounded demand plans and rejects duplicates", () => {
    const plan = createAssetDemandPlanV1({
      planId: "plan.test.stage",
      entries: [
        { assetId: "asset.test.bg", priority: "blocking", group: "stage" },
        { assetId: "audio.test.theme", priority: "opportunistic", group: "audio" },
      ],
    });
    expect(plan).toMatchObject({
      maxConcurrent: 4,
      retry: { maxAttempts: 2, backoffMs: 250 },
      retention: { kind: "while_demanded" },
    });
    expect(() =>
      createAssetDemandPlanV1({
        planId: "plan.test.duplicate",
        entries: [
          { assetId: "asset.test.bg", priority: "blocking", group: "stage" },
          { assetId: "asset.test.bg", priority: "opportunistic", group: "stage" },
        ],
      }),
    ).toThrow("duplicates");
  });
});
