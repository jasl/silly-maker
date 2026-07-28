// SPDX-License-Identifier: MIT
// 桌面切片·图标：自绘像素风 SVG（本仓库原创，CC0）。原版 Windows 98
// 图标是 Microsoft 版权物，不使用；这些是致意年代风格的独立绘制。
import type { ReactElement } from "react";

function px(x: number, y: number, fill: string, w = 1, h = 1): ReactElement {
  return (
    <rect key={`${String(x)}.${String(y)}.${fill}`} x={x} y={y} width={w} height={h} fill={fill} />
  );
}

const iconFrame = (size: number, children: readonly ReactElement[]): ReactElement => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    shapeRendering="crispEdges"
    aria-hidden="true"
    style={{ display: "block", imageRendering: "pixelated" }}
  >
    {children}
  </svg>
);

/** 扫雷：黑色地雷 + 高光。 */
export function OsMineIconV1({ size = 32 }: { readonly size?: number }): ReactElement {
  return iconFrame(size, [
    px(7, 1, "#000", 2, 2),
    px(7, 13, "#000", 2, 2),
    px(1, 7, "#000", 2, 2),
    px(13, 7, "#000", 2, 2),
    px(3, 3, "#000", 2, 2),
    px(11, 3, "#000", 2, 2),
    px(3, 11, "#000", 2, 2),
    px(11, 11, "#000", 2, 2),
    px(4, 4, "#000", 8, 8),
    px(5, 3, "#000", 6, 10),
    px(3, 5, "#000", 10, 6),
    px(5, 5, "#fff", 2, 2),
  ]);
}

/** 记事本：白纸蓝头 + 横线。 */
export function OsNotepadIconV1({ size = 32 }: { readonly size?: number }): ReactElement {
  return iconFrame(size, [
    px(3, 1, "#808080", 10, 14),
    px(2, 2, "#fff", 10, 13),
    px(2, 2, "#000080", 10, 2),
    px(3, 6, "#9999b8", 8, 1),
    px(3, 8, "#9999b8", 8, 1),
    px(3, 10, "#9999b8", 6, 1),
    px(3, 12, "#9999b8", 7, 1),
  ]);
}

/** 浏览器：地球。 */
export function OsBrowserIconV1({ size = 32 }: { readonly size?: number }): ReactElement {
  return iconFrame(size, [
    px(4, 1, "#000080", 8, 14),
    px(2, 3, "#000080", 12, 10),
    px(1, 4, "#000080", 14, 8),
    px(4, 2, "#2a6fd6", 8, 12),
    px(2, 4, "#2a6fd6", 12, 8),
    px(5, 3, "#3fbf5f", 4, 3),
    px(3, 7, "#3fbf5f", 3, 4),
    px(9, 8, "#3fbf5f", 4, 3),
    px(10, 4, "#3fbf5f", 2, 2),
    px(5, 12, "#3fbf5f", 3, 1),
    px(5, 2, "#8fd4ff", 2, 1),
  ]);
}

/** 显示属性：显示器。 */
export function OsDisplayIconV1({ size = 32 }: { readonly size?: number }): ReactElement {
  return iconFrame(size, [
    px(1, 2, "#808080", 14, 10),
    px(2, 3, "#000", 12, 8),
    px(2, 3, "#008080", 12, 7),
    px(3, 4, "#00b0b0", 5, 3),
    px(6, 12, "#808080", 4, 1),
    px(4, 13, "#c0c0c0", 8, 2),
    px(4, 14, "#808080", 8, 1),
  ]);
}

/** 开始按钮方块 logo（四色格）。 */
export function OsStartLogoV1({ size = 16 }: { readonly size?: number }): ReactElement {
  return iconFrame(size, [
    px(2, 2, "#e05038", 5, 5),
    px(9, 2, "#3fbf5f", 5, 5),
    px(2, 9, "#2a6fd6", 5, 5),
    px(9, 9, "#f0c040", 5, 5),
  ]);
}

/** 我的电脑（关于/引导用）。 */
export function OsComputerIconV1({ size = 32 }: { readonly size?: number }): ReactElement {
  return iconFrame(size, [
    px(2, 1, "#c0c0c0", 12, 9),
    px(3, 2, "#000", 10, 7),
    px(3, 2, "#008080", 10, 6),
    px(4, 3, "#00b0b0", 4, 2),
    px(6, 10, "#808080", 4, 1),
    px(2, 11, "#c0c0c0", 12, 3),
    px(3, 12, "#3fbf5f", 1, 1),
    px(10, 12, "#404040", 3, 1),
  ]);
}
