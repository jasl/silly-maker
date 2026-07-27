// SPDX-License-Identifier: MIT
import type {
  HostAtomicRecordStoreV1,
  HostRecordKeyV1,
  HostRecordMutationV1,
  HostRecordNamespaceV1,
  HostRecordRevisionV1,
} from "../../contracts/host.ts";

/**
 * The player profile: the Seen registry and playback preferences. It lives
 * in its own Host record — outside every Game Save — so loading a save
 * never rewinds what the player has read or how they configured playback,
 * and (M3) player rollback will not undo it either. Corrupt or missing
 * records fall back to defaults instead of blocking play.
 */

export interface PlayerPlaybackPreferencesV1 {
  /** Characters revealed per second; 0 means instant text. */
  readonly textRevealCharsPerSecond: number;
  /** Auto mode waits this long after the text fully reveals. */
  readonly autoWaitMs: number;
  /** skip_read stops at unread lines; skip_all skips everything skippable. */
  readonly skipPolicy: "skip_read" | "skip_all";
  readonly masterGainPermille: number;
  readonly muted: boolean;
}

export interface PlayerProfileV1 {
  readonly profileRevision: 1;
  /** definitionId -> highest seenRevision the player has read. */
  readonly seen: Readonly<Record<string, number>>;
  /**
   * Story meta progress (album/gallery unlocks, endings reached):
   * a monotone entryId -> value map that outlives every Game Save,
   * generalizing the Seen registry. Story code owns the key vocabulary.
   */
  readonly meta: Readonly<Record<string, number>>;
  readonly preferences: PlayerPlaybackPreferencesV1;
}

export const defaultPlayerProfileV1: PlayerProfileV1 = Object.freeze({
  profileRevision: 1,
  seen: Object.freeze({}),
  meta: Object.freeze({}),
  preferences: Object.freeze({
    textRevealCharsPerSecond: 40,
    autoWaitMs: 600,
    skipPolicy: "skip_read" as const,
    masterGainPermille: 1000,
    muted: false,
  }),
});

export function isSeenV1(
  profile: PlayerProfileV1,
  definitionId: string,
  seenRevision: number,
): boolean {
  const recorded = profile.seen[definitionId];
  return recorded !== undefined && recorded >= seenRevision;
}

export function markMetaV1(profile: PlayerProfileV1, entryId: string, value = 1): PlayerProfileV1 {
  const recorded = profile.meta[entryId];
  if (recorded !== undefined && recorded >= value) return profile;
  return Object.freeze({
    ...profile,
    meta: Object.freeze({ ...profile.meta, [entryId]: value }),
  });
}

export function markSeenV1(
  profile: PlayerProfileV1,
  definitionId: string,
  seenRevision: number,
): PlayerProfileV1 {
  const recorded = profile.seen[definitionId];
  if (recorded !== undefined && recorded >= seenRevision) return profile;
  return Object.freeze({
    ...profile,
    seen: Object.freeze({ ...profile.seen, [definitionId]: seenRevision }),
  });
}

function parsePlayerProfileV1(value: unknown): PlayerProfileV1 | null {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as {
    readonly profileRevision?: unknown;
    readonly seen?: unknown;
    readonly meta?: unknown;
    readonly preferences?: unknown;
  };
  if (record.profileRevision !== 1) return null;
  if (record.seen === null || typeof record.seen !== "object" || Array.isArray(record.seen)) {
    return null;
  }
  const seen: Record<string, number> = {};
  for (const [key, revision] of Object.entries(record.seen)) {
    if (typeof revision !== "number" || !Number.isSafeInteger(revision) || revision < 1) {
      return null;
    }
    seen[key] = revision;
  }
  // Legacy profiles predate meta progress; treat absence as empty.
  const metaSource = record.meta ?? {};
  if (metaSource === null || typeof metaSource !== "object" || Array.isArray(metaSource)) {
    return null;
  }
  const meta: Record<string, number> = {};
  for (const [key, entryValue] of Object.entries(metaSource)) {
    if (typeof entryValue !== "number" || !Number.isSafeInteger(entryValue) || entryValue < 1) {
      return null;
    }
    meta[key] = entryValue;
  }
  const preferences = record.preferences as Partial<PlayerPlaybackPreferencesV1> | null | undefined;
  if (preferences === null || typeof preferences !== "object") return null;
  const defaults = defaultPlayerProfileV1.preferences;
  const charsPerSecond = preferences.textRevealCharsPerSecond;
  const autoWaitMs = preferences.autoWaitMs;
  const skipPolicy = preferences.skipPolicy;
  const masterGain = preferences.masterGainPermille;
  const muted = preferences.muted;
  if (
    (charsPerSecond !== undefined &&
      (!Number.isSafeInteger(charsPerSecond) || (charsPerSecond as number) < 0)) ||
    (autoWaitMs !== undefined &&
      (!Number.isSafeInteger(autoWaitMs) || (autoWaitMs as number) < 0)) ||
    (skipPolicy !== undefined && skipPolicy !== "skip_read" && skipPolicy !== "skip_all") ||
    (masterGain !== undefined &&
      (!Number.isSafeInteger(masterGain) ||
        (masterGain as number) < 0 ||
        (masterGain as number) > 1000)) ||
    (muted !== undefined && typeof muted !== "boolean")
  ) {
    return null;
  }
  return Object.freeze({
    profileRevision: 1,
    seen: Object.freeze(seen),
    meta: Object.freeze(meta),
    preferences: Object.freeze({
      textRevealCharsPerSecond: charsPerSecond ?? defaults.textRevealCharsPerSecond,
      autoWaitMs: autoWaitMs ?? defaults.autoWaitMs,
      skipPolicy: skipPolicy ?? defaults.skipPolicy,
      masterGainPermille: masterGain ?? defaults.masterGainPermille,
      muted: muted ?? defaults.muted,
    }),
  });
}

export interface PlayerProfileStoreV1 {
  /** The current in-memory profile; loads resolve before first use. */
  current(): PlayerProfileV1;
  subscribe(listener: () => void): () => void;
  markSeen(definitionId: string, seenRevision: number): Promise<void>;
  /** Monotonically records Story meta progress (album unlocks, endings). */
  markMeta(entryId: string, value?: number): Promise<void>;
  updatePreferences(update: Partial<PlayerPlaybackPreferencesV1>): Promise<void>;
}

export interface CreatePlayerProfileStoreOptionsV1 {
  readonly records: HostAtomicRecordStoreV1;
  readonly storyId: string;
  reportFailure?(code: string, error: unknown): void;
}

/** Player profiles are Host settings — never part of the save namespace. */
const profileNamespaceV1: HostRecordNamespaceV1 = "settings";

export async function createPlayerProfileStoreV1(
  options: CreatePlayerProfileStoreOptionsV1,
): Promise<PlayerProfileStoreV1> {
  const key = `player-profile/${options.storyId}` as HostRecordKeyV1;
  const listeners = new Set<() => void>();
  let profile = defaultPlayerProfileV1;
  let revision: HostRecordRevisionV1 | null = null;
  let writeTail: Promise<void> = Promise.resolve();

  try {
    const stored = await options.records.read(profileNamespaceV1, key);
    if (stored !== null) {
      const decoded: unknown = JSON.parse(new TextDecoder().decode(stored.bytes));
      const parsed = parsePlayerProfileV1(decoded);
      if (parsed !== null) {
        profile = parsed;
        revision = stored.revision;
      }
    }
  } catch (error) {
    options.reportFailure?.("profile.read_failed", error);
  }

  const notify = (): void => {
    for (const listener of [...listeners]) listener();
  };

  const persist = (): void => {
    const snapshot = profile;
    writeTail = writeTail.then(async () => {
      try {
        const bytes = new TextEncoder().encode(JSON.stringify(snapshot));
        const mutation: HostRecordMutationV1 = {
          kind: "put",
          namespace: profileNamespaceV1,
          key,
          bytes,
          expectedRevision: revision,
        };
        const result = await options.records.commit([mutation]);
        if (result.kind === "committed") {
          const record = result.records.find((candidate) => candidate.key === key);
          revision = record?.revision ?? revision;
        } else {
          // Another tab won the race; adopt whatever is now stored.
          const stored = await options.records.read(profileNamespaceV1, key);
          revision = stored?.revision ?? revision;
        }
      } catch (error) {
        options.reportFailure?.("profile.write_failed", error);
      }
    });
  };

  return Object.freeze({
    current: () => profile,
    subscribe(listener: () => void): () => void {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    async markSeen(definitionId: string, seenRevision: number): Promise<void> {
      const next = markSeenV1(profile, definitionId, seenRevision);
      if (next === profile) return;
      profile = next;
      notify();
      persist();
      await writeTail;
    },
    async markMeta(entryId: string, value = 1): Promise<void> {
      const next = markMetaV1(profile, entryId, value);
      if (next === profile) return;
      profile = next;
      notify();
      persist();
      await writeTail;
    },
    async updatePreferences(update: Partial<PlayerPlaybackPreferencesV1>): Promise<void> {
      const merged = parsePlayerProfileV1({
        profileRevision: 1,
        seen: profile.seen,
        meta: profile.meta,
        preferences: { ...profile.preferences, ...update },
      });
      if (merged === null) throw new TypeError("invalid player preference update");
      profile = merged;
      notify();
      persist();
      await writeTail;
    },
  });
}
