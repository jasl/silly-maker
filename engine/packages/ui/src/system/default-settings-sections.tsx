// SPDX-License-Identifier: MIT
import { useSyncExternalStore } from "react";
import type { ReactElement } from "react";

import type { RuntimeCapabilityPortV1 } from "@sillymaker/base";
import type { PlayerProfileStoreV1 } from "@sillymaker/base/runtime";
import { Button } from "../primitives/Button.tsx";

/**
 * The engine-baseline Settings sections every game gets for free: master
 * volume and mute (persisted Host preferences that outlive saves), a
 * fullscreen toggle (the same API in browsers and desktop webviews), and
 * a developer-tools switch that persists the debug_tools capability so
 * the DevDock is reachable without URL parameters — off by default,
 * never part of the game UI. Story-declared sections render after these.
 */

export interface DefaultSettingsLabelsV1 {
  readonly volumeLabel: string;
  readonly mutedLabel: string;
  readonly fullscreenLabel: string;
  readonly developerToolsLabel: string;
}

export function DefaultSettingsSectionsV1(props: {
  readonly playerProfile: PlayerProfileStoreV1;
  readonly capabilities: RuntimeCapabilityPortV1;
  readonly labels: DefaultSettingsLabelsV1;
}): ReactElement {
  const profile = useSyncExternalStore(
    (listener) => props.playerProfile.subscribe(listener),
    () => props.playerProfile.current(),
    () => props.playerProfile.current(),
  );
  const capabilities = useSyncExternalStore(
    props.capabilities.state.subscribe,
    props.capabilities.state.getCurrent,
    props.capabilities.state.getCurrent,
  );
  const preferences = profile.preferences;

  return (
    <div data-default-settings="true" style={{ display: "grid", gap: "12px" }}>
      <label style={{ display: "flex", gap: "8px", alignItems: "center" }}>
        {props.labels.volumeLabel}
        <input
          type="range"
          min={0}
          max={1000}
          step={50}
          data-default-settings-volume="true"
          value={preferences.masterGainPermille}
          onChange={(event) => {
            void props.playerProfile.updatePreferences({
              masterGainPermille: Number(event.target.value),
            });
          }}
        />
        <span>{String(Math.round(preferences.masterGainPermille / 10))}%</span>
      </label>
      <label style={{ display: "flex", gap: "8px", alignItems: "center" }}>
        <input
          type="checkbox"
          data-default-settings-muted="true"
          checked={preferences.muted}
          onChange={(event) => {
            void props.playerProfile.updatePreferences({ muted: event.target.checked });
          }}
        />
        {props.labels.mutedLabel}
      </label>
      <Button
        data-default-settings-fullscreen="true"
        onClick={() => {
          if (typeof document === "undefined") return;
          if (document.fullscreenElement === null) {
            void document.documentElement.requestFullscreen?.();
          } else {
            void document.exitFullscreen?.();
          }
        }}
      >
        {props.labels.fullscreenLabel}
      </Button>
      <label style={{ display: "flex", gap: "8px", alignItems: "center" }}>
        <input
          type="checkbox"
          data-default-settings-devtools="true"
          checked={capabilities.debugTools}
          onChange={(event) => {
            // The switch grants the whole developer surface: the DevDock and
            // its Story tuning (cheat) panels. A single-player game keeps
            // that freedom local; the default remains off.
            void props.capabilities.setEnabled("debug_tools", event.target.checked);
            void props.capabilities.setEnabled("cheats", event.target.checked);
          }}
        />
        {props.labels.developerToolsLabel}
      </label>
    </div>
  );
}
