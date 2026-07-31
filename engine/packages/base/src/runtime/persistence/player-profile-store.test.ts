// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";

import {
  appendNarrativeHistoryV1,
  emptyNarrativeHistoryV1,
  parseNarrativeHistoryV1,
} from "../../contracts/narrative-history.ts";
import type { NarrativeHistoryEntryV1 } from "../../contracts/narrative-history.ts";
import { createMemoryHostRecordStoreV1 } from "../../contracts/host.ts";
import {
  createPlayerProfileStoreV1,
  defaultPlayerProfileV1,
  isSeenV1,
} from "./player-profile-store.ts";

function entryV1(sequence: number): NarrativeHistoryEntryV1 {
  return Object.freeze({
    kind: "say" as const,
    occurrenceId: `interaction-occurrence.${String(sequence)}`,
    definitionId: "interaction.test.line",
    seenRevision: 1,
    speakerTextId: null,
    textId: "text.test.line",
    voiceAssetId: null,
  });
}

describe("NarrativeHistoryV1", () => {
  it("appends within the bounded window and round-trips canonically", () => {
    let history = emptyNarrativeHistoryV1;
    for (let index = 1; index <= 5; index += 1) {
      history = appendNarrativeHistoryV1(history, entryV1(index), 3);
    }
    expect(history.entries.map((entry) => entry.occurrenceId)).toEqual([
      "interaction-occurrence.3",
      "interaction-occurrence.4",
      "interaction-occurrence.5",
    ]);
    expect(parseNarrativeHistoryV1(JSON.parse(JSON.stringify(history)))).toEqual(history);
  });

  it("rejects duplicate occurrences and oversized histories", () => {
    const history = appendNarrativeHistoryV1(emptyNarrativeHistoryV1, entryV1(1));
    expect(() =>
      parseNarrativeHistoryV1({ entries: [...history.entries, ...history.entries] }),
    ).toThrow("history_occurrence_duplicate");
  });
});

describe("createPlayerProfileStoreV1", () => {
  it("starts from defaults, persists seen and preferences, and reloads them", async () => {
    const records = createMemoryHostRecordStoreV1();
    const store = await createPlayerProfileStoreV1({ records, storyId: "story.test.demo" });
    expect(store.current()).toEqual(defaultPlayerProfileV1);

    await store.markSeen("interaction.test.line", 2);
    await store.updatePreferences({
      autoWaitMs: 250,
      skipPolicy: "skip_all",
      skipCutscenes: true,
    });
    expect(isSeenV1(store.current(), "interaction.test.line", 2)).toBe(true);
    expect(isSeenV1(store.current(), "interaction.test.line", 3)).toBe(false);

    const reopened = await createPlayerProfileStoreV1({ records, storyId: "story.test.demo" });
    expect(reopened.current().seen).toEqual({ "interaction.test.line": 2 });
    expect(reopened.current().preferences).toMatchObject({
      autoWaitMs: 250,
      skipPolicy: "skip_all",
      skipCutscenes: true,
    });

    // Profiles written before skipCutscenes still load (soft-default false).
    await records.commit([
      {
        kind: "put",
        namespace: "settings",
        key: "player-profile/story.test.legacy" as never,
        expectedRevision: null,
        bytes: new TextEncoder().encode(
          JSON.stringify({
            profileRevision: 1,
            seen: {},
            meta: {},
            preferences: {
              textRevealCharsPerSecond: 40,
              autoWaitMs: 600,
              skipPolicy: "skip_read",
              masterGainPermille: 1000,
              bgmGainPermille: 1000,
              voiceGainPermille: 1000,
              sfxGainPermille: 1000,
              muted: false,
              locale: null,
            },
          }),
        ),
      },
    ]);
    const legacy = await createPlayerProfileStoreV1({
      records,
      storyId: "story.test.legacy",
    });
    expect(legacy.current().preferences.skipCutscenes).toBe(false);

    // Profiles are per story.
    const other = await createPlayerProfileStoreV1({ records, storyId: "story.test.other" });
    expect(other.current()).toEqual(defaultPlayerProfileV1);
  });

  it("falls back to defaults for corrupt records and rejects invalid updates", async () => {
    const records = createMemoryHostRecordStoreV1();
    await records.commit([
      {
        kind: "put",
        namespace: "settings",
        key: "player-profile/story.test.demo" as never,
        expectedRevision: null,
        bytes: new TextEncoder().encode("{not json"),
      },
    ]);
    const store = await createPlayerProfileStoreV1({ records, storyId: "story.test.demo" });
    expect(store.current()).toEqual(defaultPlayerProfileV1);
    await expect(store.updatePreferences({ autoWaitMs: -5 })).rejects.toThrow(
      "invalid player preference update",
    );
  });
});
