// SPDX-License-Identifier: MIT
import { useSyncExternalStore } from "react";
import type { ReactElement } from "react";

import type { PlayerProfileStoreV1 } from "@sillymaker/base/runtime";

/**
 * The one-click mute toggle for the system menu: a speaker icon that
 * flips the persisted `muted` preference (the same value as the Settings
 * checkbox — both read the live profile, so they never disagree).
 */
export function MuteToggleV1(props: {
  readonly playerProfile: PlayerProfileStoreV1;
  /** Accessible name, e.g. "静音" / "Mute". */
  readonly label: string;
}): ReactElement {
  const profile = useSyncExternalStore(
    (listener) => props.playerProfile.subscribe(listener),
    () => props.playerProfile.current(),
    () => props.playerProfile.current(),
  );
  const muted = profile.preferences.muted;
  return (
    <button
      type="button"
      className="silly-icon-button"
      data-mute-toggle={muted ? "muted" : "unmuted"}
      aria-label={props.label}
      aria-pressed={muted}
      onClick={() => {
        void props.playerProfile.updatePreferences({ muted: !muted });
      }}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" fill="none">
        <path
          d="M4 9v6h4l5 4V5L8 9H4Z"
          fill="currentColor"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinejoin="round"
        />
        {muted
          ? (
            <path
              d="M16 9l5 6M21 9l-5 6"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          )
          : (
            <>
              <path
                d="M15.5 9.5a3.5 3.5 0 0 1 0 5"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
              <path
                d="M17.8 7.2a6.5 6.5 0 0 1 0 9.6"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </>
          )}
      </svg>
    </button>
  );
}
