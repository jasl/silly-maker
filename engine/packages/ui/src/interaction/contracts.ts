// SPDX-License-Identifier: MIT
import type { InteractionSurfaceId, NonNegativeSafeInteger } from "@sillymaker/base";

export type PresentationIntentV1 =
  | { readonly kind: "overlay.open"; readonly overlayId: string }
  | { readonly kind: "presentation.play_cue"; readonly cueId: string }
  | { readonly kind: "interaction.enter_surface"; readonly surfaceId: InteractionSurfaceId }
  | { readonly kind: "interaction.leave_surface" };

export interface PresentationFaultV1 {
  readonly code:
    | "presentation.interaction.catalog_join"
    | "presentation.interaction.direct_default_count"
    | "presentation.interaction.choose_behavior_count"
    | "presentation.interaction.open_surface_missing"
    | "presentation.interaction.open_surface_behavior_count";
  readonly surfaceId: InteractionSurfaceId;
  readonly revision: NonNegativeSafeInteger;
}
