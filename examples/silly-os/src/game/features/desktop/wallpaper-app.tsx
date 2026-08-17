// SPDX-License-Identifier: MIT
// Desktop slice · display properties: wallpaper selection — writes authoritative state
// (persists with saves), demonstrating that desktop preferences are game state too.
import { useState } from "react";
import type { ReactElement } from "react";

import type { OsSemanticPortV1 } from "../../../application/ui-kit.ts";
import { dispatchV1, os98, osBevelInV1 } from "../../../application/ui-kit.ts";
import { osWallpaperIdsV1 } from "../../state.ts";
import { osWallpaperStylesV1 } from "./desktop.tsx";

export function OsWallpaperAppV1(props: {
  readonly current: string;
  readonly semantic: OsSemanticPortV1;
  readonly uiText: (textId: string) => string;
}): ReactElement {
  const { uiText } = props;
  const [selected, setSelected] = useState(props.current);
  return (
    <div
      style={{
        display: "grid",
        gap: "8px",
        padding: "10px",
        alignContent: "start",
        font: os98.font,
      }}
    >
      <div
        aria-hidden="true"
        style={{
          ...osBevelInV1,
          blockSize: "120px",
          padding: 0,
          overflow: "hidden",
          ...osWallpaperStylesV1[selected],
        }}
      />
      <div role="radiogroup" style={{ display: "grid", gap: "4px" }}>
        {osWallpaperIdsV1.map((wallpaperId) => (
          <label key={wallpaperId} style={{ display: "flex", gap: "6px", alignItems: "center" }}>
            <input
              type="radio"
              name="os-wallpaper"
              data-os-wallpaper-option={wallpaperId}
              checked={selected === wallpaperId}
              onChange={() =>
                setSelected(wallpaperId)}
            />
            {uiText(`text.os.wallpaper.${wallpaperId}`)}
          </label>
        ))}
      </div>
      <button
        type="button"
        className="os-button"
        data-os-wallpaper-apply="true"
        onClick={() => dispatchV1(props.semantic, { kind: "set_wallpaper", wallpaperId: selected })}
        style={{ padding: "3px 14px", justifySelf: "start" }}
      >
        {uiText("text.os.wallpaper.apply")}
      </button>
    </div>
  );
}
