// SPDX-License-Identifier: MIT
import { useSyncExternalStore } from "react";

import type { PlayerProfileStoreV1 } from "@sillymaker/base/runtime";

/**
 * The locale-aware text hook every Story UI re-implemented: subscribes to
 * the player profile (so a Settings language switch re-renders live) and
 * binds the Story's catalog lookup to the current locale preference.
 */
export function useLocaleTextV1(
  playerProfile: PlayerProfileStoreV1,
  textForLocale: (locale: string | null, textId: string) => string,
): (textId: string) => string {
  const profile = useSyncExternalStore(
    (listener) => playerProfile.subscribe(listener),
    () => playerProfile.current(),
    () => playerProfile.current(),
  );
  const locale = profile.preferences.locale;
  return (textId: string) => textForLocale(locale, textId);
}
