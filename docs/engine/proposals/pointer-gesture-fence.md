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

- `tmp/imouto-mono` choice cancel (backdrop /「返回」pointer path) uses the hook; Escape skips arm.

## Tests

- Vitest jsdom: controller + GameStage hook (`pointer-gesture-fence.test.ts`, `game-stage.test.tsx`)
- Playwright: `engine/packages/web/e2e/engine/input.spec.ts` asserts `data-stage-root` (Lab has no cancelable When Cancel yet; full synthesis covered in vitest)
