// SPDX-License-Identifier: MIT
import type { DeepReadonly, InteractionSurfaceId } from "@sillymaker/base";

import type { OverlayOpenResultV1 } from "../overlays/workspace-overlay-session.ts";
import type { PresentationIntentV1 } from "./contracts.ts";

export interface PresentationIntentRouteContextV1 {
  readonly returnFocusId: string | null;
}

export type PresentationIntentRouteResultV1 =
  | { readonly kind: "executed" }
  | Extract<OverlayOpenResultV1, { readonly kind: "rejected" | "faulted" }>
  | {
    readonly kind: "rejected";
    readonly code: "presentation.intent_unknown";
  };

export interface PresentationOverlayWriterV1 {
  open(overlayId: string): OverlayOpenResultV1;
}

export interface PresentationInteractionSessionWriterV1 {
  open(surfaceId: InteractionSurfaceId, returnFocusId: string | null): void;
  leave(): void;
}

export interface PresentationCueWriterV1 {
  play(cueId: string): void;
}

export interface PresentationIntentRouterOptionsV1 {
  readonly knownOverlayIds: readonly string[];
  readonly knownSurfaceIds: readonly InteractionSurfaceId[];
  readonly knownCueIds: readonly string[];
  readonly overlay: PresentationOverlayWriterV1;
  readonly session: PresentationInteractionSessionWriterV1;
  readonly cue: PresentationCueWriterV1;
}

export interface PresentationIntentRouterV1 {
  execute(
    intent: DeepReadonly<PresentationIntentV1>,
    context?: DeepReadonly<PresentationIntentRouteContextV1>,
  ): PresentationIntentRouteResultV1;
}

const presentationIntentExecutedV1: PresentationIntentRouteResultV1 = {
  kind: "executed",
};

const presentationIntentUnknownV1: PresentationIntentRouteResultV1 = {
  kind: "rejected",
  code: "presentation.intent_unknown",
};

export function createPresentationIntentRouterV1(
  options: PresentationIntentRouterOptionsV1,
): PresentationIntentRouterV1 {
  const knownOverlayIds = new Set(options.knownOverlayIds);
  const knownSurfaceIds = new Set(options.knownSurfaceIds);
  const knownCueIds = new Set(options.knownCueIds);

  return {
    execute(
      intent: DeepReadonly<PresentationIntentV1>,
      context?: DeepReadonly<PresentationIntentRouteContextV1>,
    ): PresentationIntentRouteResultV1 {
      switch (intent.kind) {
        case "overlay.open":
          if (!knownOverlayIds.has(intent.overlayId)) return presentationIntentUnknownV1;
          {
            const outcome = options.overlay.open(intent.overlayId);
            if (outcome.kind === "rejected" || outcome.kind === "faulted") return outcome;
          }
          return presentationIntentExecutedV1;
        case "interaction.enter_surface":
          if (!knownSurfaceIds.has(intent.surfaceId)) return presentationIntentUnknownV1;
          options.session.open(intent.surfaceId, context?.returnFocusId ?? null);
          return presentationIntentExecutedV1;
        case "interaction.leave_surface":
          options.session.leave();
          return presentationIntentExecutedV1;
        case "presentation.play_cue":
          if (!knownCueIds.has(intent.cueId)) return presentationIntentUnknownV1;
          options.cue.play(intent.cueId);
          return presentationIntentExecutedV1;
      }
      return presentationIntentUnknownV1;
    },
  };
}
