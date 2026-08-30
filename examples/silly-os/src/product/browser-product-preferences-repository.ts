// SPDX-License-Identifier: MIT
/// <reference lib="dom" />

import { sillyOsLocaleRegistryV1, type SillyOsLocaleV1 } from "../content/copy.ts";

export const browserProductPreferencesStorageKeyV1 =
  "sillymaker.example-silly-os.product-preferences.v1";
export const browserProductPreferencesRevisionV1 = 1 as const;
export const browserProductPreferencesMaximumSerializedUtf8BytesV1 = 512;

export const browserProductThemesV1 = Object.freeze(
  [
    "system",
    "light",
    "dark",
  ] as const,
);

export type SillyOsThemeModeV1 = (typeof browserProductThemesV1)[number];

export interface BrowserProductPreferencesSnapshotV1 {
  readonly revision: 1;
  readonly locale: SillyOsLocaleV1 | null;
  readonly theme: SillyOsThemeModeV1;
}

export const defaultBrowserProductPreferencesSnapshotV1: BrowserProductPreferencesSnapshotV1 =
  Object.freeze({
    revision: browserProductPreferencesRevisionV1,
    locale: null,
    theme: "system",
  });

export type BrowserProductPreferencesRepositoryOperationV1 =
  | "set_locale"
  | "set_theme"
  | "clear";

export type BrowserProductPreferencesRepositoryFailureCodeV1 =
  | "invalid_locale"
  | "invalid_theme"
  | "storage_unavailable";

export class BrowserProductPreferencesRepositoryErrorV1 extends Error {
  readonly code: BrowserProductPreferencesRepositoryFailureCodeV1;
  readonly operation: BrowserProductPreferencesRepositoryOperationV1;

  constructor(
    code: BrowserProductPreferencesRepositoryFailureCodeV1,
    operation: BrowserProductPreferencesRepositoryOperationV1,
  ) {
    super(`Browser Product preferences repository ${operation} failed: ${code}`);
    this.name = "BrowserProductPreferencesRepositoryErrorV1";
    this.code = code;
    this.operation = operation;
  }
}

export interface BrowserProductPreferencesStorageV1 {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface BrowserProductPreferencesStorageEventTargetV1 {
  addEventListener(type: "storage", listener: (event: StorageEvent) => void): void;
  removeEventListener(type: "storage", listener: (event: StorageEvent) => void): void;
}

export interface BrowserProductPreferencesRepositoryV1 {
  /** Stable cached snapshot for React's useSyncExternalStore contract. */
  getSnapshot(): BrowserProductPreferencesSnapshotV1;
  subscribe(listener: () => void): () => void;
  setLocale(value: unknown): SillyOsLocaleV1 | null;
  setTheme(value: unknown): SillyOsThemeModeV1;
  clear(): void;
}

const admittedLocalesV1 = new Set<SillyOsLocaleV1>(
  sillyOsLocaleRegistryV1.map(({ value }) => value),
);
const admittedThemesV1 = new Set<SillyOsThemeModeV1>(browserProductThemesV1);

function isLocaleV1(value: unknown): value is SillyOsLocaleV1 {
  return typeof value === "string" && admittedLocalesV1.has(value as SillyOsLocaleV1);
}

function isThemeV1(value: unknown): value is SillyOsThemeModeV1 {
  return typeof value === "string" && admittedThemesV1.has(value as SillyOsThemeModeV1);
}

function freezeSnapshotV1(input: {
  readonly locale: SillyOsLocaleV1 | null;
  readonly theme: SillyOsThemeModeV1;
}): BrowserProductPreferencesSnapshotV1 {
  return Object.freeze({
    revision: browserProductPreferencesRevisionV1,
    locale: input.locale,
    theme: input.theme,
  });
}

function admitSnapshotV1(value: unknown): BrowserProductPreferencesSnapshotV1 | null {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return null;
  const keys = Object.keys(value);
  if (
    keys.length !== 3 ||
    !["revision", "locale", "theme"].every((key) => Object.hasOwn(value, key))
  ) return null;
  const snapshot = value as Record<string, unknown>;
  const revision = snapshot.revision;
  const locale = snapshot.locale;
  const theme = snapshot.theme;
  if (
    revision !== browserProductPreferencesRevisionV1 ||
    (locale !== null && !isLocaleV1(locale)) ||
    !isThemeV1(theme)
  ) return null;
  return freezeSnapshotV1({ locale, theme });
}

function decodeSnapshotV1(serialized: string): BrowserProductPreferencesSnapshotV1 | null {
  if (
    new TextEncoder().encode(serialized).byteLength >
      browserProductPreferencesMaximumSerializedUtf8BytesV1
  ) return null;
  try {
    return admitSnapshotV1(JSON.parse(serialized));
  } catch {
    return null;
  }
}

function snapshotsEqualV1(
  left: BrowserProductPreferencesSnapshotV1,
  right: BrowserProductPreferencesSnapshotV1,
): boolean {
  return left.locale === right.locale && left.theme === right.theme;
}

/**
 * Owns only non-secret, product-wide Browser preferences. Invalid or unreadable
 * stored state falls back without mutating storage; failed writes never publish
 * an in-memory value that was not persisted.
 */
export function createBrowserProductPreferencesRepositoryV1(options: {
  readonly storage: BrowserProductPreferencesStorageV1;
  readonly eventTarget: BrowserProductPreferencesStorageEventTargetV1;
  readonly storageKey?: string;
}): BrowserProductPreferencesRepositoryV1 {
  const storageKey = options.storageKey ?? browserProductPreferencesStorageKeyV1;
  const listeners = new Set<() => void>();
  let listening = false;

  const loadInitialSnapshotV1 = (): BrowserProductPreferencesSnapshotV1 => {
    let serialized: string | null;
    try {
      serialized = options.storage.getItem(storageKey);
    } catch {
      return defaultBrowserProductPreferencesSnapshotV1;
    }
    return serialized === null
      ? defaultBrowserProductPreferencesSnapshotV1
      : decodeSnapshotV1(serialized) ?? defaultBrowserProductPreferencesSnapshotV1;
  };

  let snapshot = loadInitialSnapshotV1();

  const publishSnapshotV1 = (next: BrowserProductPreferencesSnapshotV1): void => {
    if (snapshotsEqualV1(snapshot, next)) return;
    snapshot = next;
    for (const listener of [...listeners]) listener();
  };

  const persistSnapshotV1 = (
    next: BrowserProductPreferencesSnapshotV1,
    operation: BrowserProductPreferencesRepositoryOperationV1,
  ): void => {
    try {
      options.storage.setItem(storageKey, JSON.stringify(next));
    } catch {
      throw new BrowserProductPreferencesRepositoryErrorV1(
        "storage_unavailable",
        operation,
      );
    }
    publishSnapshotV1(next);
  };

  const onStorageV1 = (event: StorageEvent): void => {
    if (
      event.key !== storageKey ||
      (event.storageArea !== null && event.storageArea !== options.storage)
    ) return;
    const next = event.newValue === null
      ? defaultBrowserProductPreferencesSnapshotV1
      : decodeSnapshotV1(event.newValue) ?? defaultBrowserProductPreferencesSnapshotV1;
    publishSnapshotV1(next);
  };

  return Object.freeze({
    getSnapshot(): BrowserProductPreferencesSnapshotV1 {
      return snapshot;
    },

    subscribe(listener: () => void): () => void {
      listeners.add(listener);
      if (!listening) {
        listening = true;
        options.eventTarget.addEventListener("storage", onStorageV1);
      }
      return () => {
        listeners.delete(listener);
        if (listening && listeners.size === 0) {
          listening = false;
          options.eventTarget.removeEventListener("storage", onStorageV1);
        }
      };
    },

    setLocale(value: unknown): SillyOsLocaleV1 | null {
      if (value !== null && !isLocaleV1(value)) {
        throw new BrowserProductPreferencesRepositoryErrorV1(
          "invalid_locale",
          "set_locale",
        );
      }
      persistSnapshotV1(
        freezeSnapshotV1({ locale: value, theme: snapshot.theme }),
        "set_locale",
      );
      return value;
    },

    setTheme(value: unknown): SillyOsThemeModeV1 {
      if (!isThemeV1(value)) {
        throw new BrowserProductPreferencesRepositoryErrorV1(
          "invalid_theme",
          "set_theme",
        );
      }
      persistSnapshotV1(
        freezeSnapshotV1({ locale: snapshot.locale, theme: value }),
        "set_theme",
      );
      return value;
    },

    clear(): void {
      try {
        options.storage.removeItem(storageKey);
      } catch {
        throw new BrowserProductPreferencesRepositoryErrorV1(
          "storage_unavailable",
          "clear",
        );
      }
      publishSnapshotV1(defaultBrowserProductPreferencesSnapshotV1);
    },
  });
}
