# Pointer gesture fence

状态：**已落地**（2026-07-29）。专家评审 approve-with-changes 后合入 `@sillymaker/ui`。

## API

```ts
import type { PointerEvent as ReactPointerEvent } from "react";
import {
  useStagePointerGestureFenceV1,
  armStagePointerGestureFenceV1,
  STAGE_POINTER_GESTURE_FENCE_TIMEOUT_MS_V1,
} from "@sillymaker/ui";

const arm = useStagePointerGestureFenceV1("narrative");
// primary onPointerUp, before dismiss dispatch:
arm(event);
// Escape / keyboard cancel: do NOT arm
```

- Implementation: `engine/packages/ui/src/shell/pointer-gesture-fence.ts` + `game-stage.tsx` port
- Stage root: `<main data-stage-root="true">`
- Release: swallowed primary click | next `pointerdown` | 500ms | GameStage unmount
- Caller unmount does **not** clear the fence
- No Base / Story snapshot state

## Consumers

- Engine Lab: the calibration choice carries a When Cancel option（「先返回」, loops back
  under a fresh occurrence）; its pointerup dismiss arms the fence, keyboard skips arm.
- `tmp/imouto-mono` choice cancel (backdrop /「返回」pointer path) uses the hook; Escape skips arm.

## Tests

- Vitest jsdom: controller + GameStage hook (`pointer-gesture-fence.test.ts`, `game-stage.test.tsx`)
- Vitest headless (Lab): When Cancel re-presents the choice under the next occurrence; the stale occurrence rejects (`e2e/src/test/narrative.test.ts`)
- Playwright (real browser): `engine/packages/web/e2e/engine/input.spec.ts` performs a raw `pointerdown → pointerup` on 先返回 — the menu unmounts, the browser synthesizes `click`, and a document-level probe proves the fence swallowed it (occurrence advances exactly once; the next deliberate click lands). Verified discriminating: the test fails with the fence arm removed.
