// SPDX-License-Identifier: MIT
import { useSyncExternalStore } from "react";
import type { ReactElement } from "react";

import type { RuntimeCapabilityPortV1 } from "@sillymaker/base";
import type { PlayerProfileStoreV1 } from "@sillymaker/base/runtime";
import { Button } from "../primitives/button.tsx";

/**
 * The engine-baseline Settings sections every game gets for free: per-bus
 * volumes (BGM / voice / SFX) with a mute quick toggle, text playback
 * preferences (reveal speed, auto-forward wait), a fullscreen toggle (the
 * same API in browsers and desktop webviews), and a developer-tools switch
 * that persists the debug_tools capability so the DevDock is reachable
 * without URL parameters — off by default, never part of the game UI.
 * Story-declared sections render after these. All values are persisted
 * Host preferences that outlive saves.
 */

export interface DefaultSettingsLabelsV1 {
  readonly bgmVolumeLabel: string;
  readonly voiceVolumeLabel: string;
  readonly sfxVolumeLabel: string;
  readonly mutedLabel: string;
  /** Optional — defaults to English when a Story has not localized it yet. */
  readonly skipCutscenesLabel?: string;
  readonly textSpeedLabel: string;
  readonly autoWaitLabel: string;
  readonly fullscreenLabel: string;
  readonly developerToolsLabel: string;
}

function VolumeSliderV1(props: {
  readonly label: string;
  readonly value: number;
  readonly testId: string;
  onChange(next: number): void;
}): ReactElement {
  return (
    <label style={{ display: "flex", gap: "8px", alignItems: "center" }}>
      <span style={{ minInlineSize: "7em" }}>{props.label}</span>
      <input
        type="range"
        min={0}
        max={1000}
        step={50}
        data-default-settings-volume={props.testId}
        value={props.value}
        onChange={(event) => props.onChange(Number(event.target.value))}
      />
      <span>{String(Math.round(props.value / 10))}%</span>
    </label>
  );
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
      <VolumeSliderV1
        label={props.labels.bgmVolumeLabel}
        value={preferences.bgmGainPermille}
        testId="bgm"
        onChange={(next) => void props.playerProfile.updatePreferences({ bgmGainPermille: next })}
      />
      <VolumeSliderV1
        label={props.labels.voiceVolumeLabel}
        value={preferences.voiceGainPermille}
        testId="voice"
        onChange={(next) => void props.playerProfile.updatePreferences({ voiceGainPermille: next })}
      />
      <VolumeSliderV1
        label={props.labels.sfxVolumeLabel}
        value={preferences.sfxGainPermille}
        testId="sfx"
        onChange={(next) => void props.playerProfile.updatePreferences({ sfxGainPermille: next })}
      />
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
      <label style={{ display: "flex", gap: "8px", alignItems: "center" }}>
        <input
          type="checkbox"
          data-default-settings-skip-cutscenes="true"
          checked={preferences.skipCutscenes}
          onChange={(event) => {
            void props.playerProfile.updatePreferences({ skipCutscenes: event.target.checked });
          }}
        />
        {props.labels.skipCutscenesLabel ?? "Skip cutscenes"}
      </label>
      <label style={{ display: "flex", gap: "8px", alignItems: "center" }}>
        <span style={{ minInlineSize: "7em" }}>{props.labels.textSpeedLabel}</span>
        <input
          type="range"
          min={10}
          max={160}
          step={10}
          data-default-settings-text-speed="true"
          value={preferences.textRevealCharsPerSecond}
          onChange={(event) => {
            void props.playerProfile.updatePreferences({
              textRevealCharsPerSecond: Number(event.target.value),
            });
          }}
        />
        <span>{String(preferences.textRevealCharsPerSecond)}</span>
      </label>
      <label style={{ display: "flex", gap: "8px", alignItems: "center" }}>
        <span style={{ minInlineSize: "7em" }}>{props.labels.autoWaitLabel}</span>
        <input
          type="range"
          min={200}
          max={4000}
          step={200}
          data-default-settings-auto-wait="true"
          value={preferences.autoWaitMs}
          onChange={(event) => {
            void props.playerProfile.updatePreferences({ autoWaitMs: Number(event.target.value) });
          }}
        />
        <span>{`${String(preferences.autoWaitMs)}ms`}</span>
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
