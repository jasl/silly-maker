// SPDX-License-Identifier: MIT
// 共享数值条：自绘轨道+填充（原生 <progress> 轨道配色跨浏览器不可控，
// 6px 细条下退化严重——评估记录见 docs/engine/design/window-model.md）。
import type { ReactElement } from "react";

export function CatcafeStatBarV1(props: {
  readonly label: string;
  readonly value: number;
  readonly accent: string;
  readonly testId: string;
}): ReactElement {
  return (
    <div data-cc-stat={props.testId} style={{ display: "grid", gap: "2px" }}>
      <span style={{ display: "flex", justifyContent: "space-between", fontSize: "12px" }}>
        <span>{props.label}</span>
        <span>{String(props.value)}</span>
      </span>
      <span
        role="progressbar"
        aria-label={props.label}
        aria-valuenow={props.value}
        aria-valuemin={0}
        aria-valuemax={100}
        style={{
          display: "block",
          blockSize: "6px",
          borderRadius: "3px",
          background: "rgba(255, 255, 255, 0.12)",
          overflow: "hidden",
        }}
      >
        <span
          style={{
            display: "block",
            blockSize: "100%",
            inlineSize: `${String(Math.max(0, Math.min(100, props.value)))}%`,
            background: props.accent,
            transition: "inline-size 300ms ease",
          }}
        />
      </span>
    </div>
  );
}
