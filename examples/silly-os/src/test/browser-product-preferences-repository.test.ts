// SPDX-License-Identifier: MIT

import { describe, expect, it, vi } from "vitest";

import {
  browserProductPreferencesMaximumSerializedUtf8BytesV1,
  browserProductPreferencesStorageKeyV1,
  BrowserProductPreferencesRepositoryErrorV1,
  createBrowserProductPreferencesRepositoryV1,
  defaultBrowserProductPreferencesSnapshotV1,
  type BrowserProductPreferencesStorageEventTargetV1,
} from "../application/preferences/browser-product-preferences-repository.ts";

class MemoryStorageV1 implements Storage {
  readonly values = new Map<string, string>();
  getFailure: Error | null = null;
  setFailure: Error | null = null;
  removeFailure: Error | null = null;

  get length(): number {
    return this.values.size;
  }

  clear(): void {
    this.values.clear();
  }

  getItem(key: string): string | null {
    if (this.getFailure !== null) throw this.getFailure;
    return this.values.get(key) ?? null;
  }

  key(index: number): string | null {
    return [...this.values.keys()][index] ?? null;
  }

  removeItem(key: string): void {
    if (this.removeFailure !== null) throw this.removeFailure;
    this.values.delete(key);
  }

  setItem(key: string, value: string): void {
    if (this.setFailure !== null) throw this.setFailure;
    this.values.set(key, value);
  }
}

class StorageEventTargetV1 implements BrowserProductPreferencesStorageEventTargetV1 {
  readonly listeners = new Set<(event: StorageEvent) => void>();

  addEventListener(_type: "storage", listener: (event: StorageEvent) => void): void {
    this.listeners.add(listener);
  }

  removeEventListener(_type: "storage", listener: (event: StorageEvent) => void): void {
    this.listeners.delete(listener);
  }

  dispatch(event: StorageEvent): void {
    for (const listener of [...this.listeners]) listener(event);
  }
}

function storageEventV1(input: {
  readonly key: string;
  readonly newValue: string | null;
  readonly storageArea: Storage | null;
}): StorageEvent {
  return input as StorageEvent;
}

function createRepositoryV1(
  storage = new MemoryStorageV1(),
  eventTarget = new StorageEventTargetV1(),
) {
  return {
    eventTarget,
    repository: createBrowserProductPreferencesRepositoryV1({ storage, eventTarget }),
    storage,
  };
}

describe("Browser Product preferences repository", () => {
  it("returns one stable frozen default snapshot without writing storage", () => {
    const { repository, storage } = createRepositoryV1();

    expect(repository.getSnapshot()).toBe(defaultBrowserProductPreferencesSnapshotV1);
    expect(repository.getSnapshot()).toBe(repository.getSnapshot());
    expect(repository.getSnapshot()).toEqual({
      revision: 1,
      locale: null,
      theme: "system",
    });
    expect(Object.isFrozen(repository.getSnapshot())).toBe(true);
    expect(storage.getItem(browserProductPreferencesStorageKeyV1)).toBeNull();
  });

  it("strictly admits one bounded exact V1 snapshot and falls back for malformed state", () => {
    const admittedStorage = new MemoryStorageV1();
    admittedStorage.setItem(
      browserProductPreferencesStorageKeyV1,
      JSON.stringify({ revision: 1, locale: "zh-CN", theme: "dark" }),
    );
    const admitted = createRepositoryV1(admittedStorage).repository.getSnapshot();
    expect(admitted).toEqual({ revision: 1, locale: "zh-CN", theme: "dark" });
    expect(Object.isFrozen(admitted)).toBe(true);

    const malformedValues = [
      "not-json",
      JSON.stringify([]),
      JSON.stringify({ revision: 2, locale: "en", theme: "light" }),
      JSON.stringify({ revision: 1, locale: "fr", theme: "light" }),
      JSON.stringify({ revision: 1, locale: "en", theme: "sepia" }),
      JSON.stringify({ revision: 1, locale: "en", theme: "light", extra: true }),
      "x".repeat(browserProductPreferencesMaximumSerializedUtf8BytesV1 + 1),
    ];
    for (const serialized of malformedValues) {
      const storage = new MemoryStorageV1();
      storage.setItem(browserProductPreferencesStorageKeyV1, serialized);
      expect(createRepositoryV1(storage).repository.getSnapshot()).toBe(
        defaultBrowserProductPreferencesSnapshotV1,
      );
      expect(storage.getItem(browserProductPreferencesStorageKeyV1)).toBe(serialized);
    }
  });

  it("persists locale and theme independently and notifies local subscribers only on change", () => {
    const { repository, storage } = createRepositoryV1();
    const listener = vi.fn();
    repository.subscribe(listener);

    expect(repository.setLocale("zh-CN")).toBe("zh-CN");
    const localized = repository.getSnapshot();
    expect(localized).toEqual({ revision: 1, locale: "zh-CN", theme: "system" });
    expect(repository.getSnapshot()).toBe(localized);
    expect(repository.setTheme("dark")).toBe("dark");
    expect(repository.getSnapshot()).toEqual({
      revision: 1,
      locale: "zh-CN",
      theme: "dark",
    });
    expect(listener).toHaveBeenCalledTimes(2);

    repository.setTheme("dark");
    expect(listener).toHaveBeenCalledTimes(2);
    expect(repository.setLocale(null)).toBeNull();
    expect(listener).toHaveBeenCalledTimes(3);
    expect(JSON.parse(storage.getItem(browserProductPreferencesStorageKeyV1) ?? "null"))
      .toEqual({ revision: 1, locale: null, theme: "dark" });
  });

  it("rejects values outside the locale and theme registries before touching storage", () => {
    const { repository, storage } = createRepositoryV1();
    const listener = vi.fn();
    repository.subscribe(listener);

    expect(() => repository.setLocale("zh"))
      .toThrowError(expect.objectContaining({ code: "invalid_locale", operation: "set_locale" }));
    expect(() => repository.setTheme("auto"))
      .toThrowError(expect.objectContaining({ code: "invalid_theme", operation: "set_theme" }));
    expect(storage.getItem(browserProductPreferencesStorageKeyV1)).toBeNull();
    expect(repository.getSnapshot()).toBe(defaultBrowserProductPreferencesSnapshotV1);
    expect(listener).not.toHaveBeenCalled();
  });

  it("clears only its exact key and publishes the stable default snapshot", () => {
    const { repository, storage } = createRepositoryV1();
    const listener = vi.fn();
    repository.subscribe(listener);
    storage.setItem("sillyos.unrelated", "preserve-me");
    repository.setTheme("light");

    repository.clear();

    expect(repository.getSnapshot()).toBe(defaultBrowserProductPreferencesSnapshotV1);
    expect(storage.getItem(browserProductPreferencesStorageKeyV1)).toBeNull();
    expect(storage.getItem("sillyos.unrelated")).toBe("preserve-me");
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it("propagates exact-key storage events and keeps subscription attachment bounded", () => {
    const { eventTarget, repository, storage } = createRepositoryV1();
    const listener = vi.fn();
    const unsubscribe = repository.subscribe(listener);
    expect(eventTarget.listeners.size).toBe(1);

    const remote = JSON.stringify({ revision: 1, locale: "en", theme: "dark" });
    eventTarget.dispatch(storageEventV1({
      key: "sillyos.unrelated",
      newValue: remote,
      storageArea: storage,
    }));
    eventTarget.dispatch(storageEventV1({
      key: browserProductPreferencesStorageKeyV1,
      newValue: remote,
      storageArea: new MemoryStorageV1(),
    }));
    expect(listener).not.toHaveBeenCalled();

    eventTarget.dispatch(storageEventV1({
      key: browserProductPreferencesStorageKeyV1,
      newValue: remote,
      storageArea: storage,
    }));
    expect(repository.getSnapshot()).toEqual({ revision: 1, locale: "en", theme: "dark" });
    expect(listener).toHaveBeenCalledOnce();

    eventTarget.dispatch(storageEventV1({
      key: browserProductPreferencesStorageKeyV1,
      newValue: remote,
      storageArea: null,
    }));
    expect(listener).toHaveBeenCalledOnce();

    eventTarget.dispatch(storageEventV1({
      key: browserProductPreferencesStorageKeyV1,
      newValue: null,
      storageArea: storage,
    }));
    expect(repository.getSnapshot()).toBe(defaultBrowserProductPreferencesSnapshotV1);
    expect(listener).toHaveBeenCalledTimes(2);

    unsubscribe();
    expect(eventTarget.listeners.size).toBe(0);
  });

  it("falls back for malformed remote state and reports write failures without publishing", () => {
    const { eventTarget, repository, storage } = createRepositoryV1();
    const listener = vi.fn();
    repository.subscribe(listener);
    repository.setTheme("dark");
    listener.mockClear();

    eventTarget.dispatch(storageEventV1({
      key: browserProductPreferencesStorageKeyV1,
      newValue: JSON.stringify({ revision: 1, locale: "en", theme: "invalid" }),
      storageArea: storage,
    }));
    expect(repository.getSnapshot()).toBe(defaultBrowserProductPreferencesSnapshotV1);
    expect(listener).toHaveBeenCalledOnce();

    storage.setFailure = new Error("quota");
    expect(() => repository.setLocale("en")).toThrowError(
      BrowserProductPreferencesRepositoryErrorV1,
    );
    expect(repository.getSnapshot()).toBe(defaultBrowserProductPreferencesSnapshotV1);
    expect(listener).toHaveBeenCalledOnce();

    storage.removeFailure = new Error("blocked");
    expect(() => repository.clear()).toThrowError(
      expect.objectContaining({ code: "storage_unavailable", operation: "clear" }),
    );
    expect(repository.getSnapshot()).toBe(defaultBrowserProductPreferencesSnapshotV1);
    expect(listener).toHaveBeenCalledOnce();
  });

  it("uses the default snapshot when the initial storage read is unavailable", () => {
    const storage = new MemoryStorageV1();
    storage.getFailure = new Error("blocked");

    expect(createRepositoryV1(storage).repository.getSnapshot()).toBe(
      defaultBrowserProductPreferencesSnapshotV1,
    );
  });
});
