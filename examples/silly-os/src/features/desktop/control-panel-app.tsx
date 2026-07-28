// SPDX-License-Identifier: MIT
// Desktop slice · control panel: the system's own settings window (language/locale +
// system info). The engine's default settings dialog stays unexposed — settings is just an ordinary desktop window.
import { useEffect, useState } from "react";
import type { ReactElement } from "react";

import type { PlayerProfileStoreV1 } from "@sillymaker/base/runtime";

import { os98, osBevelInV1 } from "../../application/ui-kit.ts";
import { OsComputerIconV1 } from "./icons.tsx";

export function OsControlPanelAppV1(props: {
  readonly playerProfile: PlayerProfileStoreV1;
  readonly uiText: (textId: string) => string;
}): ReactElement {
  const { uiText } = props;
  const [, setVersion] = useState(0);
  useEffect(
    () => props.playerProfile.subscribe(() => setVersion((current) => current + 1)),
    [props.playerProfile],
  );
  const current = props.playerProfile.current().preferences.locale ?? "auto";
  const options = [
    { id: "auto", label: uiText("text.os.settings.language.auto") },
    { id: "zh-CN", label: "中文" },
    { id: "en", label: "English" },
  ] as const;
  return (
    <div
      style={{
        display: "grid",
        gap: "10px",
        padding: "12px",
        alignContent: "start",
        font: os98.font,
      }}
    >
      <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
        <OsComputerIconV1 size={32} />
        <div>
          <strong style={{ display: "block" }}>SillyOS 98</strong>
          <span style={{ color: "#404040" }}>{uiText("text.os.settings.about")}</span>
        </div>
      </div>
      <hr
        style={{
          inlineSize: "100%",
          border: "none",
          borderBlockStart: "1px solid #808080",
          borderBlockEnd: "1px solid #ffffff",
          margin: 0,
        }}
      />
      <label style={{ display: "flex", gap: "8px", alignItems: "center" }}>
        {uiText("text.os.settings.language")}
        <select
          className="os-select"
          data-os-settings-language="true"
          value={current}
          onChange={(event) => {
            const value = event.target.value;
            void props.playerProfile.updatePreferences({
              locale: value === "auto" ? null : value,
            });
          }}
        >
          {options.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <p
        style={{
          ...osBevelInV1,
          background: "#ffffff",
          margin: 0,
          padding: "8px 10px",
          fontSize: "11px",
          lineHeight: 1.7,
          color: "#404040",
        }}
      >
        {uiText("text.os.settings.notice")}
      </p>
    </div>
  );
}
