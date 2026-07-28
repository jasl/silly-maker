// SPDX-License-Identifier: MIT
// 扫雷切片·UI：经典三段式（计数器/笑脸/计时）+ 网格。左键翻格右键
// 插旗都发语义 invocation；雷区从不出现在发布面上（进行中 mine=null），
// UI 想作弊也读不到。计时器是纯 UI 装饰（权威状态无墙钟）。
import { useEffect, useRef, useState } from "react";
import type { ReactElement } from "react";

import type { DeepReadonly } from "@sillymaker/base";

import type { OsMinesweeperViewV1 } from "../../simulation.ts";
import { osMinePresetsV1 } from "../../simulation.ts";
import type { OsSemanticPortV1 } from "../../application/ui-kit.ts";
import { dispatchV1, os98, osBevelInV1, osBevelOutV1, osLcdV1 } from "../../application/ui-kit.ts";

const adjacentColors = [
  "",
  "#0000ff",
  "#008000",
  "#ff0000",
  "#000080",
  "#800000",
  "#008080",
  "#000000",
  "#808080",
] as const;

function CellButtonV1(props: {
  readonly view: DeepReadonly<OsMinesweeperViewV1>["cells"][number];
  readonly x: number;
  readonly y: number;
  readonly finished: boolean;
  readonly semantic: OsSemanticPortV1;
}): ReactElement {
  const { view } = props;
  const revealed = view.state === "revealed";
  const glyph = revealed
    ? view.mine === true
      ? "✷"
      : view.adjacent !== null && view.adjacent > 0
        ? String(view.adjacent)
        : ""
    : view.state === "flagged"
      ? "⚑"
      : props.finished && view.mine === true
        ? "✷"
        : "";
  const color =
    revealed && view.adjacent !== null
      ? adjacentColors[Math.min(view.adjacent, 8)]
      : view.state === "flagged"
        ? "#c00000"
        : "#000000";
  return (
    <button
      type="button"
      data-os-mine-cell={`${String(props.x)}.${String(props.y)}`}
      data-os-mine-state={view.state}
      disabled={props.finished && !revealed && view.state !== "flagged" && view.mine !== true}
      onClick={() => {
        if (props.finished || revealed) return;
        dispatchV1(props.semantic, { kind: "mine_reveal", x: props.x, y: props.y });
      }}
      onContextMenu={(event) => {
        event.preventDefault();
        if (props.finished || revealed) return;
        dispatchV1(props.semantic, { kind: "mine_flag", x: props.x, y: props.y });
      }}
      style={{
        inlineSize: "20px",
        blockSize: "20px",
        padding: 0,
        display: "grid",
        placeContent: "center",
        fontFamily: '"Courier New", monospace',
        fontWeight: 700,
        fontSize: "13px",
        lineHeight: 1,
        color,
        ...(revealed
          ? {
              border: "1px solid #808080",
              borderWidth: "1px 0 0 1px",
              background: view.mine === true ? "#ff4040" : "#c0c0c0",
            }
          : { ...osBevelOutV1 }),
      }}
    >
      {glyph}
    </button>
  );
}

function LcdV1(props: { readonly value: number; readonly testId: string }): ReactElement {
  const clamped = Math.max(-99, Math.min(999, props.value));
  const text =
    clamped < 0
      ? `-${String(Math.abs(clamped)).padStart(2, "0")}`
      : String(clamped).padStart(3, "0");
  return (
    <span
      data-os-mine-lcd={props.testId}
      style={{ ...osLcdV1, padding: "1px 4px", fontSize: "16px" }}
    >
      {text}
    </span>
  );
}

export function OsMinesweeperAppV1(props: {
  readonly minesweeper: DeepReadonly<OsMinesweeperViewV1> | null;
  readonly semantic: OsSemanticPortV1;
  readonly uiText: (textId: string) => string;
}): ReactElement {
  const { minesweeper, semantic, uiText } = props;
  const [preset, setPreset] = useState<"beginner" | "intermediate" | "expert">("beginner");
  const [seconds, setSeconds] = useState(0);
  const runningRef = useRef(false);

  const status = minesweeper?.status ?? null;
  // Win98 语义：首次翻格才开始计时（开局静止在 000）。
  const anyRevealed =
    minesweeper !== null && minesweeper.cells.some((cell) => cell.state === "revealed");
  const playing = status === "playing" && anyRevealed;
  const boardWidth = minesweeper === null ? 0 : minesweeper.width;
  useEffect(() => {
    runningRef.current = playing;
    if (!playing) return undefined;
    const timer = setInterval(() => {
      if (runningRef.current) setSeconds((current) => Math.min(999, current + 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [playing, boardWidth]);

  const newGame = (nextPreset: "beginner" | "intermediate" | "expert"): void => {
    const config = osMinePresetsV1[nextPreset];
    if (config === undefined) return;
    setPreset(nextPreset);
    setSeconds(0);
    dispatchV1(semantic, {
      kind: "mine_new",
      width: config.width,
      height: config.height,
      mines: config.mines,
    });
  };

  // 开窗即开局（无盘面时）。
  useEffect(() => {
    if (minesweeper === null) newGame("beginner");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const face = status === "lost" ? "🙁" : status === "won" ? "😎" : "🙂";
  return (
    <div
      style={{
        display: "grid",
        gap: "6px",
        padding: "8px",
        alignContent: "start",
        font: os98.font,
        overflow: "auto",
      }}
    >
      <div style={{ display: "flex", gap: "4px" }}>
        {(["beginner", "intermediate", "expert"] as const).map((id) => (
          <button
            key={id}
            type="button"
            data-os-mine-preset={id}
            aria-pressed={preset === id}
            onClick={() => newGame(id)}
            style={{
              ...(preset === id ? osBevelInV1 : osBevelOutV1),
              background: os98.face,
              padding: "2px 8px",
              font: os98.font,
            }}
          >
            {uiText(`text.os.mine.${id}`)}
          </button>
        ))}
      </div>
      {minesweeper === null ? null : (
        <div
          style={{
            display: "grid",
            gap: "6px",
            ...osBevelInV1,
            background: os98.face,
            padding: "6px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <LcdV1 value={minesweeper.flagsLeft} testId="flags" />
            <button
              type="button"
              data-os-mine-face={status ?? "idle"}
              aria-label={uiText("text.os.mine.new")}
              onClick={() => newGame(preset)}
              style={{ ...osBevelOutV1, padding: "1px 4px", fontSize: "15px", lineHeight: 1 }}
            >
              {face}
            </button>
            <LcdV1 value={seconds} testId="time" />
          </div>
          <div
            data-os-mine-board={minesweeper.status}
            style={{
              display: "grid",
              gridTemplateColumns: `repeat(${String(minesweeper.width)}, 20px)`,
              ...osBevelInV1,
              background: "#808080",
              padding: "1px",
              gap: 0,
              inlineSize: "fit-content",
            }}
            onContextMenu={(event) => event.preventDefault()}
          >
            {minesweeper.cells.map((cell, index) => {
              const x = index % minesweeper.width;
              const y = Math.floor(index / minesweeper.width);
              return (
                <CellButtonV1
                  key={`${String(x)}.${String(y)}`}
                  view={cell}
                  x={x}
                  y={y}
                  finished={minesweeper.status !== "playing"}
                  semantic={semantic}
                />
              );
            })}
          </div>
          {minesweeper.status === "playing" ? null : (
            <p data-os-mine-result={minesweeper.status} style={{ margin: 0, fontWeight: 700 }}>
              {uiText(minesweeper.status === "won" ? "text.os.mine.won" : "text.os.mine.lost")}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
