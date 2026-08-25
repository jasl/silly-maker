// SPDX-License-Identifier: MIT
import { parseLocaleId, type TextContentSessionV1 } from "@sillymaker/base";
import type { PlayerPlaybackPreferencesV1, PlayerProfileStoreV1 } from "@sillymaker/base/runtime";

export interface PrepareWebTextLocalePlayerProfileInputInternalV1 {
  readonly profile: PlayerProfileStoreV1;
  readonly textContent: TextContentSessionV1;
  /** Initial logical packs, acquired only after the selected locale is current. */
  readonly prepareInitial?: () => void | Promise<void>;
  reportFailure(code: string, error: unknown): void;
}

/**
 * Selects the persisted locale before the first content lease, then exposes
 * one profile port whose locale publication follows Text activation.
 *
 * The Text session owns latest-request-wins activation. A superseded request
 * therefore never publishes stale profile preferences.
 *
 * @internal
 */
export async function prepareWebTextLocalePlayerProfileInternalV1(
  input: PrepareWebTextLocalePlayerProfileInputInternalV1,
): Promise<PlayerProfileStoreV1> {
  const { profile, textContent } = input;
  const persistedLocale = profile.current().preferences.locale;

  try {
    const activated = await textContent.activateLocale(
      persistedLocale === null ? null : parseLocaleId(persistedLocale),
    );
    if (!activated) {
      throw new TypeError("web.text_content_locale_initial_activation_superseded");
    }
    await input.prepareInitial?.();
  } catch (error) {
    input.reportFailure("web.text_content_locale_unavailable", error);
    if (persistedLocale === null) throw error;
    const restoredDefault = await textContent.activateLocale(null);
    if (!restoredDefault) {
      throw new TypeError("web.text_content_locale_fallback_superseded", { cause: error });
    }
    await input.prepareInitial?.();
    await profile.updatePreferences({ locale: null });
  }

  return {
    current: profile.current,
    subscribe: profile.subscribe,
    markSeen: profile.markSeen,
    markMeta: profile.markMeta,
    async updatePreferences(
      update: Partial<PlayerPlaybackPreferencesV1>,
    ): Promise<void> {
      if (!Object.hasOwn(update, "locale")) {
        await profile.updatePreferences(update);
        return;
      }
      const activated = await textContent.activateLocale(
        update.locale === null || update.locale === undefined ? null : parseLocaleId(update.locale),
      );
      if (!activated) return;
      await profile.updatePreferences(update);
    },
  };
}
