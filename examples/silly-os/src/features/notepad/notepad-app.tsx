// SPDX-License-Identifier: MIT
// 记事本切片·UI：文本编辑 + 文件列表。文件保存在权威游戏状态里
// （fs_write/fs_remove 命令原子提交）；对这台电脑来说权威状态就是硬盘。
// 编辑中的草稿是 UI 瞬态；点保存才落盘。
import { useEffect, useState } from "react";
import type { ReactElement } from "react";

import type { DeepReadonly } from "@sillymaker/base";

import type { OsGameViewV1 } from "../../simulation.ts";
import type { OsSemanticPortV1 } from "../../application/ui-kit.ts";
import { dispatchV1, os98, osBevelInV1 } from "../../application/ui-kit.ts";

const toolButton = { padding: "2px 10px" } as const;

export function OsNotepadAppV1(props: {
  readonly files: DeepReadonly<OsGameViewV1>["files"];
  readonly semantic: OsSemanticPortV1;
  readonly uiText: (textId: string) => string;
}): ReactElement {
  const { files, semantic, uiText } = props;
  const [name, setName] = useState("");
  const [draft, setDraft] = useState("");
  const [savedFlash, setSavedFlash] = useState(false);

  // 保存回执：权威状态里出现同名同内容文件时闪一次"已保存"。
  const savedMatch = files.some((file) => file.name === name && file.content === draft);
  useEffect(() => {
    if (!savedMatch) return undefined;
    setSavedFlash(true);
    const timer = setTimeout(() => setSavedFlash(false), 1200);
    return () => clearTimeout(timer);
  }, [savedMatch]);

  const save = (): void => {
    const trimmed = name.trim() === "" ? uiText("text.os.notepad.untitled") : name.trim();
    setName(trimmed);
    dispatchV1(semantic, { kind: "fs_write", name: trimmed, content: draft });
  };

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "150px 1fr",
        gap: "6px",
        padding: "6px",
        minBlockSize: 0,
        font: os98.font,
      }}
    >
      <aside style={{ display: "grid", gridTemplateRows: "auto 1fr", gap: "4px", minBlockSize: 0 }}>
        <button
          type="button"
          data-os-notepad-new="true"
          style={toolButton}
          onClick={() => {
            setName("");
            setDraft("");
          }}
        >
          {uiText("text.os.notepad.new")}
        </button>
        <ul
          data-os-notepad-files="true"
          style={{
            ...osBevelInV1,
            margin: 0,
            padding: "2px",
            listStyle: "none",
            overflowY: "auto",
            minBlockSize: 0,
            display: "block",
          }}
        >
          {files.length === 0 ? (
            <li style={{ padding: "4px", color: "#606060" }}>{uiText("text.os.notepad.empty")}</li>
          ) : (
            files.map((file) => (
              <li key={file.name} style={{ display: "flex", gap: "2px" }}>
                <button
                  type="button"
                  data-os-notepad-file={file.name}
                  onClick={() => {
                    setName(file.name);
                    setDraft(file.content);
                  }}
                  style={{
                    flex: 1,
                    border: "none",
                    background: name === file.name ? "#000080" : "transparent",
                    color: name === file.name ? "#ffffff" : "#000000",
                    font: os98.font,
                    textAlign: "start",
                    padding: "2px 4px",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {file.name}
                </button>
                <button
                  type="button"
                  aria-label={`${uiText("text.os.notepad.delete")} ${file.name}`}
                  data-os-notepad-delete={file.name}
                  onClick={() => dispatchV1(semantic, { kind: "fs_remove", name: file.name })}
                  style={{ border: "none", background: "transparent", cursor: "default" }}
                >
                  ✕
                </button>
              </li>
            ))
          )}
        </ul>
      </aside>
      <div style={{ display: "grid", gridTemplateRows: "auto 1fr", gap: "4px", minBlockSize: 0 }}>
        <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
          <label style={{ display: "flex", gap: "4px", alignItems: "center", flex: 1 }}>
            {uiText("text.os.notepad.file")}
            <input
              type="text"
              className="os-input"
              data-os-notepad-name="true"
              value={name}
              placeholder={uiText("text.os.notepad.untitled")}
              onChange={(event) => setName(event.target.value)}
              style={{ flex: 1, padding: "2px 4px" }}
            />
          </label>
          <button
            type="button"
            className="os-button"
            data-os-notepad-save="true"
            style={toolButton}
            onClick={save}
          >
            {savedFlash ? uiText("text.os.notepad.saved") : uiText("text.os.notepad.save")}
          </button>
        </div>
        <textarea
          className="os-input"
          data-os-notepad-text="true"
          value={draft}
          placeholder={uiText("text.os.notepad.placeholder")}
          onChange={(event) => setDraft(event.target.value)}
          style={{ resize: "none", padding: "4px", minBlockSize: 0 }}
        />
      </div>
    </div>
  );
}
