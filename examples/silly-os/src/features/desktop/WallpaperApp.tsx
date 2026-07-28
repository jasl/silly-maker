// SPDX-License-Identifier: MIT
// 桌面切片·显示属性：壁纸选择——写入权威状态（随存档持久），示范
// "桌面偏好也是游戏状态"。
import { useState } from "react";
import type { ReactElement } from "react";

import type { OsSemanticPortV1 } from "../../application/ui-kit.ts";
import { dispatchV1, os98, osBevelInV1, osBevelOutV1 } from "../../application/ui-kit.ts";
import { osWallpaperIdsV1 } from "../../state.ts";
import { osWallpaperStylesV1 } from "./Desktop.tsx";

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
              onChange={() => setSelected(wallpaperId)}
            />
            {uiText(`text.os.wallpaper.${wallpaperId}`)}
          </label>
        ))}
      </div>
      <button
        type="button"
        data-os-wallpaper-apply="true"
        onClick={() => dispatchV1(props.semantic, { kind: "set_wallpaper", wallpaperId: selected })}
        style={{
          ...osBevelOutV1,
          background: os98.face,
          padding: "3px 14px",
          font: os98.font,
          justifySelf: "start",
        }}
      >
        {uiText("text.os.wallpaper.apply")}
      </button>
    </div>
  );
}
