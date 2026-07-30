# Pointer gesture fence

状态：**已落地的战术桥接**（2026-07-29；2026-07-30 收紧 API）。它解决 surface 在 primary `pointerup` 中同步卸载后，浏览器继续派发遗留 `click` 并命中下层的问题；不是最终 Surface lifecycle authority。

## Supported Story API

```ts
import type { PointerEvent as ReactPointerEvent } from "react";
import { useStagePointerGestureFenceV1 } from "@sillymaker/ui";

const arm = useStagePointerGestureFenceV1("narrative");

function dismiss(event: ReactPointerEvent<Element>): void {
  arm(event); // primary pointerup, before the dismiss dispatch
  // dispatch semantic/surface dismiss intent
}
```

Keyboard/Escape/gamepad cancel 不 arm。raw controller、timeout 常量和 fence handle 保持 package-internal；Story 不应管理 listener、timeout 或 handle lifecycle。

## Current behavior

- owner 是 persistent `GameStageV1`，调用组件卸载不会立即清掉 fence；
- GameStage rearm 前释放旧 handle；
- primary pointerup 被 prevent/stop；随后同一手势的 pointer-generated primary click 被 capture swallow；
- next pointerdown、timeout、GameStage unmount 或 explicit internal release 清除；
- non-primary pointer button 不 arm；`click.detail === 0` 的键盘/程序激活不被吞；
- fence 期间通过 Stage input isolation 防止下层输入 owner 接管；
- 不进入 Base、Story Snapshot、Save 或 semantic transcript。

## Verification

- controller tests：primary click、next pointerdown、timeout、non-primary、keyboard click、owner rearm；
- GameStage hook tests：caller unmount 后 fence 仍由 stage owner 持有；
- Engine Lab headless：旧 semantic occurrence 拒绝；
- real browser：raw `pointerdown -> pointerup -> synthesized click` 不触发下层 action，下一次 deliberate gesture 正常工作。

## Known limits

- timeout 只是 browser-event fallback，不是稳定业务身份；
- fence 不替代 `surfaceInstanceId` / `topologyRevision` / semantic occurrence 的 stale rejection；
- 它只覆盖同步 dismiss click-through，不覆盖 delayed readiness、async callbacks、focus restore 或多 surface topology；
- 它不应扩展成通用 global gesture manager。

## Absorption/removal gate

[Managed Surface lifecycle plan](../plans/2026-07-30-surface-contract-harness.md) 的 web adapter 应最终拥有完整 physical gesture lifecycle（pointercancel、capture loss、visibility/focus reset、instance/topology fencing）。届时：

1. 现有 hook 可成为 adapter 的薄 facade；或
2. 若 InputRouter/Coordinator 可在不依赖 timeout 的情况下拒绝遗留 click，则删除 fence。

在此之前保持最小实现；不得把 raw helper 重新导出为公共 Story API。
