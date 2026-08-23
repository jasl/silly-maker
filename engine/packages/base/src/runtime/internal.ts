// SPDX-License-Identifier: MIT

/**
 * Workspace package-internal runtime seams. This entry is not part of the
 * Story or ordinary engine API.
 */
export {
  bindCoreApplicationReadinessOptionsInternalV1,
  clearAllCoreApplicationSavesForMaintenanceInternalV1,
  createCoreGameApplicationInstanceForRebootstrapInternalV1,
  type CreateCoreGameApplicationInstanceForRebootstrapOptionsInternalV1,
  type CoreRebootstrapHandoffInternalV1,
  type CoreRebootstrapStartFailureInternalV1,
  type CorePresentationAnchorEventInternalV1,
  disposeCoreGameApplicationForRebootstrapInternalV1,
  invalidateCoreGameApplicationForHmrInternalV1,
  prepareCoreApplicationRestartInternalV1,
  type PreparedCoreApplicationRestartInternalV1,
  subscribeCoreApplicationPresentationAnchorEventsInternalV1,
} from "./application/core-game-application.ts";
export type { AuthoritativeReplacementPublicationContextInternalV1 } from "./session/game-session.ts";
export {
  type BoundedCanonicalJsonLimitsInternalV1,
  type BoundedCanonicalJsonProjectionResultInternalV1,
  type BoundedCanonicalJsonRejectionCodeInternalV1,
  projectBoundedCanonicalJsonInternalV1,
} from "../internal/bounded-canonical-projection.ts";
