// SPDX-License-Identifier: MIT
// 桌面切片·开机画面：模拟经典 Windows boot——黑屏、居中 logo、底部
// 滚动进度条；数秒后自动进桌面，点击立即跳过。AI 生成声明在此展示
// （本作不使用引擎的片头/标题屏）。
import { useEffect, useState } from "react";
import type { ReactElement } from "react";

import { OsStartLogoV1 } from "./icons.tsx";

const bootCssV1 = `
@keyframes os-boot-bar {
  0% { translate: -64px 0; }
  100% { translate: 260px 0; }
}
@media (prefers-reduced-motion: reduce) {
  [data-os-boot] [data-os-boot-bar] { animation: none !important; }
}
`;

export const osBootDurationMsV1 = 2400;

export function OsBootScreenV1(props: {
  readonly title: string;
  readonly aiNotice: string;
  onDone(): void;
}): ReactElement {
  const { onDone } = props;
  const [leaving, setLeaving] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setLeaving(true), osBootDurationMsV1);
    return () => clearTimeout(timer);
  }, []);
  useEffect(() => {
    if (!leaving) return undefined;
    const timer = setTimeout(onDone, 260);
    return () => clearTimeout(timer);
  }, [leaving, onDone]);
  return (
    <div
      data-os-boot="true"
      onClick={() => setLeaving(true)}
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 300_000,
        display: "grid",
        placeContent: "center",
        gap: "22px",
        justifyItems: "center",
        background: "#000000",
        color: "#ffffff",
        pointerEvents: "auto",
        opacity: leaving ? 0 : 1,
        transition: "opacity 240ms ease-out",
        cursor: "default",
        userSelect: "none",
      }}
    >
      <style>{bootCssV1}</style>
      <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
        <OsStartLogoV1 size={56} />
        <span
          style={{
            font: '700 40px "Times New Roman", "Noto Serif SC", serif',
            fontStyle: "italic",
            letterSpacing: "1px",
          }}
        >
          {props.title}
        </span>
      </div>
      <p style={{ margin: 0, font: '12px "MS Sans Serif", Tahoma, sans-serif', opacity: 0.75 }}>
        {props.aiNotice}
      </p>
      <div
        style={{
          inlineSize: "260px",
          blockSize: "14px",
          border: "1px solid #808080",
          overflow: "hidden",
          background: "#101010",
        }}
      >
        <span
          data-os-boot-bar="true"
          style={{
            display: "block",
            inlineSize: "64px",
            blockSize: "100%",
            background: "linear-gradient(90deg, #000080, #1084d0, #000080)",
            animation: "os-boot-bar 1.1s linear infinite",
          }}
        />
      </div>
    </div>
  );
}
