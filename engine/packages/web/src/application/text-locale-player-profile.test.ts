// SPDX-License-Identifier: MIT
import type { TextContentSessionV1 } from "@sillymaker/base";
import {
  defaultPlayerProfileV1,
  type PlayerPlaybackPreferencesV1,
  type PlayerProfileStoreV1,
  type PlayerProfileV1,
} from "@sillymaker/base/runtime";
import { describe, expect, it, vi } from "vitest";

import { prepareWebTextLocalePlayerProfileInternalV1 } from "./text-locale-player-profile.ts";

function createProfileV1(locale: string | null): {
  readonly profile: PlayerProfileStoreV1;
  readonly publications: (string | null)[];
} {
  let current: PlayerProfileV1 = {
    ...defaultPlayerProfileV1,
    preferences: { ...defaultPlayerProfileV1.preferences, locale },
  };
  const publications: (string | null)[] = [];
  return {
    profile: {
      current: () => current,
      subscribe: () => () => undefined,
      markSeen: vi.fn(async () => undefined),
      markMeta: vi.fn(async () => undefined),
      async updatePreferences(update: Partial<PlayerPlaybackPreferencesV1>): Promise<void> {
        current = {
          ...current,
          preferences: { ...current.preferences, ...update },
        };
        publications.push(current.preferences.locale);
      },
    },
    publications,
  };
}

function createTextSessionV1(
  activateLocale: TextContentSessionV1["activateLocale"],
): TextContentSessionV1 {
  return {
    manifest: {
      revision: 1 as never,
      defaultLocale: "en" as never,
      locales: [{ locale: "en" as never, fallbackLocale: null }],
      packs: [],
      digest: "digest.test" as never,
    },
    currentLocale: () => "en" as never,
    activateLocale,
    acquire: vi.fn(async () => ({
      packId: "text.test" as never,
      generation: "digest.test" as never,
      timing: { loadMs: 0, admitMs: 0, activateMs: 0, totalMs: 0 },
      release: vi.fn(),
    })),
    resolveText: vi.fn(() => "text"),
    loadedPackIds: () => [],
    loadedEntryCount: () => 0 as never,
    loadedVariantCount: () => 0 as never,
    dispose: vi.fn(),
  };
}

describe("Web Text locale player profile", () => {
  it("activates the persisted locale before the first content acquisition", async () => {
    const events: string[] = [];
    const { profile } = createProfileV1("ja");
    const textContent = createTextSessionV1(async (locale) => {
      events.push(`activate:${locale}`);
      return true;
    });

    await prepareWebTextLocalePlayerProfileInternalV1({
      profile,
      textContent,
      prepareInitial: async () => {
        events.push("acquire");
        await textContent.acquire("text.test" as never);
      },
      reportFailure: vi.fn(),
    });

    expect(events).toEqual(["activate:ja", "acquire"]);
  });

  it("warns, restores the default locale, and repairs an unavailable persisted preference", async () => {
    const { profile, publications } = createProfileV1("fr");
    const activateLocale = vi.fn(async (locale: string | null) => {
      if (locale === "fr") throw new TypeError("text_content.locale_unknown");
      return true;
    });
    const reportFailure = vi.fn();

    const bound = await prepareWebTextLocalePlayerProfileInternalV1({
      profile,
      textContent: createTextSessionV1(activateLocale as never),
      reportFailure,
    });

    expect(activateLocale.mock.calls.map(([locale]) => locale)).toEqual(["fr", null]);
    expect(reportFailure).toHaveBeenCalledExactlyOnceWith(
      "web.text_content_locale_unavailable",
      expect.any(TypeError),
    );
    expect(bound.current().preferences.locale).toBeNull();
    expect(publications).toEqual([null]);
  });

  it("retries initial packs under the default locale before repairing the profile", async () => {
    const events: string[] = [];
    const { profile, publications } = createProfileV1("ja");
    let activeLocale: string | null = null;
    const reportFailure = vi.fn();

    await prepareWebTextLocalePlayerProfileInternalV1({
      profile,
      textContent: createTextSessionV1(async (locale) => {
        activeLocale = locale;
        events.push(`activate:${locale}`);
        return true;
      }),
      prepareInitial: () => {
        events.push(`acquire:${activeLocale}`);
        if (activeLocale === "ja") throw new Error("translation unavailable");
      },
      reportFailure,
    });

    expect(events).toEqual(["activate:ja", "acquire:ja", "activate:null", "acquire:null"]);
    expect(publications).toEqual([null]);
    expect(reportFailure).toHaveBeenCalledExactlyOnceWith(
      "web.text_content_locale_unavailable",
      expect.any(Error),
    );
  });

  it("publishes a locale preference only after successful Text activation", async () => {
    const { profile, publications } = createProfileV1(null);
    const activateLocale = vi.fn(async () => true);
    const bound = await prepareWebTextLocalePlayerProfileInternalV1({
      profile,
      textContent: createTextSessionV1(activateLocale),
      reportFailure: vi.fn(),
    });

    await bound.updatePreferences({ locale: "zh-CN", autoWaitMs: 900 });

    expect(activateLocale).toHaveBeenLastCalledWith("zh-CN");
    expect(bound.current().preferences).toMatchObject({ locale: "zh-CN", autoWaitMs: 900 });
    expect(publications).toEqual(["zh-CN"]);
  });

  it("passes non-locale profile work through without touching Text", async () => {
    const { profile } = createProfileV1(null);
    const activateLocale = vi.fn(async () => true);
    const bound = await prepareWebTextLocalePlayerProfileInternalV1({
      profile,
      textContent: createTextSessionV1(activateLocale),
      reportFailure: vi.fn(),
    });

    await bound.updatePreferences({ muted: true });
    await bound.markSeen("line.test", 1);
    await bound.markMeta("ending.test", 2);

    expect(bound.current().preferences.muted).toBe(true);
    expect(activateLocale).toHaveBeenCalledOnce();
    expect(profile.markSeen).toHaveBeenCalledExactlyOnceWith("line.test", 1);
    expect(profile.markMeta).toHaveBeenCalledExactlyOnceWith("ending.test", 2);
  });

  it("keeps the predecessor profile when locale activation fails", async () => {
    const { profile, publications } = createProfileV1(null);
    let initial = true;
    const failure = new Error("locale bytes unavailable");
    const bound = await prepareWebTextLocalePlayerProfileInternalV1({
      profile,
      textContent: createTextSessionV1(async () => {
        if (initial) {
          initial = false;
          return true;
        }
        throw failure;
      }),
      reportFailure: vi.fn(),
    });

    await expect(bound.updatePreferences({ locale: "ja" })).rejects.toBe(failure);
    expect(bound.current().preferences.locale).toBeNull();
    expect(publications).toEqual([]);
  });

  it("does not publish an older activation superseded by the latest request", async () => {
    const { profile, publications } = createProfileV1(null);
    const completions = new Map<string, (activated: boolean) => void>();
    let initial = true;
    const bound = await prepareWebTextLocalePlayerProfileInternalV1({
      profile,
      textContent: createTextSessionV1((locale) => {
        if (initial) {
          initial = false;
          return Promise.resolve(true);
        }
        return new Promise<boolean>((resolve) => completions.set(String(locale), resolve));
      }),
      reportFailure: vi.fn(),
    });

    const older = bound.updatePreferences({ locale: "ja" });
    const latest = bound.updatePreferences({ locale: "zh-CN" });
    completions.get("zh-CN")?.(true);
    await latest;
    completions.get("ja")?.(false);
    await older;

    expect(bound.current().preferences.locale).toBe("zh-CN");
    expect(publications).toEqual(["zh-CN"]);
  });
});
