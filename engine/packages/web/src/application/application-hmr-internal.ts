// SPDX-License-Identifier: MIT
export { installWebGameApplicationHmrV1 } from "./install-web-game-application-hmr.ts";
export type { InstallWebGameApplicationHmrInputV1 } from "./install-web-game-application-hmr.ts";
export { createResolvedGameHmrIdentityV1, installResolvedGameHmrV1 } from "./resolved-game-hmr.ts";
export type {
  InstalledResolvedGameHmrV1,
  ResolvedGameHmrEligibilityInputV1,
  ResolvedGameHmrHotAdapterV1,
  ResolvedGameHmrIdentityV1,
  ResolvedGameHmrReasonV1,
  ResolvedGameHmrRebootstrapInputV1,
  WebRuntimeRebootstrapLifecycleV1,
} from "./resolved-game-hmr.ts";
export {
  createWebGameApplicationRebootstrapStartOptionsInternalV1,
  createWebGameApplicationViteHotAdapterInternalV1,
  resolveWebGameApplicationHmrProvenanceInternalV1,
} from "./story-web-game-application-hmr.ts";
export type { WebGameApplicationViteHotRegistrationInternalV1 } from "./story-web-game-application-hmr.ts";
export { startWebGameApplicationForRebootstrapInternalV1 } from "./start-web-game-application.tsx";
export {
  disposeStartedWebGameApplicationForRebootstrapInternalV1,
  invalidateStartedWebGameApplicationForHmrInternalV1,
} from "./start-web-game-application.tsx";
export type { StartWebGameApplicationForRebootstrapOptionsInternalV1 } from "./start-web-game-application.tsx";
