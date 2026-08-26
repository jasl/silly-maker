// SPDX-License-Identifier: MIT
import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import type { NarrativeAsideV1 } from "@sillymaker/base";

import type { NarrativeAsideViewV1 } from "./narrative-aside-controller.ts";
import { createNarrativeAsideControllerV1 } from "./narrative-aside-controller.ts";

/**
 * React wiring for the narrative aside controller: subscribes the
 * instance's zero-authority aside push channel and exposes the local
 * paging view. The Story renderer owns the pixels (a content-sized window
 * in a Story-owned slot); the engine never paints, never registers
 * stage-input isolation, and never dispatches — `advance`/`dismiss` are
 * purely local presentation moves.
 */
export interface UseNarrativeAsideInputV1 {
  readonly subscribeNarrativeAsides: (
    listener: (aside: NarrativeAsideV1) => void,
  ) => () => void;
  /** The current presentation epoch (anchor replacement clears the aside). */
  readonly epoch: number;
  /** True while an authoritative say/choice pending owns the dialogue surface. */
  readonly dialoguePending: boolean;
}

export interface UseNarrativeAsideResultV1 {
  readonly view: NarrativeAsideViewV1 | null;
  readonly advance: () => void;
  readonly dismiss: () => void;
}

export function useNarrativeAsideV1(
  input: UseNarrativeAsideInputV1,
): UseNarrativeAsideResultV1 {
  const { subscribeNarrativeAsides, epoch, dialoguePending } = input;
  const [controller] = useState(() => createNarrativeAsideControllerV1({ epoch, dialoguePending }));
  useEffect(() => {
    controller.syncPresentation({ epoch, dialoguePending });
  }, [controller, epoch, dialoguePending]);
  useEffect(
    () => subscribeNarrativeAsides((aside) => controller.push(aside)),
    [controller, subscribeNarrativeAsides],
  );
  const view = useSyncExternalStore(controller.subscribe, controller.view, controller.view);
  const advance = useCallback(() => controller.advance(), [controller]);
  const dismiss = useCallback(() => controller.dismiss(), [controller]);
  return useMemo(
    () => Object.freeze({ view, advance, dismiss }),
    [view, advance, dismiss],
  );
}
