// SPDX-License-Identifier: MIT
/** Host-only composition seam. This subpath is not a Story authoring API. */
export {
  createHostedGameUiCompositionInternalV1,
  resolveGameUiManagedSurfaceCompositionInternalV1,
  sealHostedGameUiCompositionTerminalInternalV1,
} from "./composer/create-game-ui-composition.ts";
export type {
  GameUiPresentationAnchorEventInternalV1,
  GameUiPresentationAnchorEventSourceInternalV1,
  GameUiPresentationAnchorTokenInternalV1,
  GameUiPresentationSuccessorProducerInternalV1,
} from "./composer/create-game-ui-composition.ts";
