// SPDX-License-Identifier: MIT
// Desktop slice · taskbar volume: a speaker lives in the tray; clicking opens the classic
// volume popup (slider + mute). Writes Host-profile playback preferences (all three audio buses share the value), persistent across sessions.
import { useEffect, useState } from "react";
import type { ReactElement } from "react";

import type { PlayerProfileStoreV1 } from "@sillymaker/base/runtime";

import { os98, osBevelOutV1 } from "../../../application/ui-kit.ts";
import { osTaskbarHeightV1 } from "./desktop.tsx";

export function OsVolumeTrayV1(props: {
  readonly playerProfile: PlayerProfileStoreV1;
  readonly volumeLabel: string;
  readonly muteLabel: string;
}): ReactElement {
  const [open, setOpen] = useState(false);
  const [, setVersion] = useState(0);
  useEffect(
    () => props.playerProfile.subscribe(() => setVersion((current) => current + 1)),
    [props.playerProfile],
  );
  const preferences = props.playerProfile.current().preferences;
  const gain = preferences.bgmGainPermille;
  const muted = preferences.muted;
  return (
    <span style={{ position: "relative", display: "inline-flex" }}>
      <button
        type="button"
        className="os-button"
        data-os-volume-tray="true"
        aria-label={props.volumeLabel}
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        style={{ padding: "2px 6px", fontSize: "12px", lineHeight: 1.2 }}
      >
        {muted ? "🔇" : "🔊"}
      </button>
      {open
        ? (
          <div
            data-os-volume-popup="true"
            style={{
              position: "absolute",
              insetInlineEnd: 0,
              insetBlockEnd: `${String(osTaskbarHeightV1 - 6)}px`,
              padding: "10px",
              display: "grid",
              gap: "8px",
              font: os98.font,
              ...osBevelOutV1,
            }}
          >
            <strong>{props.volumeLabel}</strong>
            <input
              type="range"
              min={0}
              max={1000}
              step={50}
              value={gain}
              data-os-volume-slider="true"
              aria-label={props.volumeLabel}
              onChange={(event) => {
                const value = Number(event.target.value);
                void props.playerProfile.updatePreferences({
                  bgmGainPermille: value,
                  voiceGainPermille: value,
                  sfxGainPermille: value,
                });
              }}
              style={{ inlineSize: "120px" }}
            />
            <label style={{ display: "flex", gap: "6px", alignItems: "center" }}>
              <input
                type="checkbox"
                data-os-volume-mute="true"
                checked={muted}
                onChange={(event) =>
                  void props.playerProfile.updatePreferences({ muted: event.target.checked })}
              />
              {props.muteLabel}
            </label>
          </div>
        )
        : null}
    </span>
  );
}
