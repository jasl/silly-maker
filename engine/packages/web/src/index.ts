// SPDX-License-Identifier: MIT
export { mountGameApplicationV1 } from "./application/mount-game-application.tsx";
export type { MountedGameApplicationV1 } from "./application/mount-game-application.tsx";
export {
  createRuntimeCapabilitySessionOverlayV1,
  parseCapabilityRequestV1,
} from "./capabilities/index.ts";
export type {
  CapabilityRequestParseResultV1,
  CapabilityRequestRejectionCodeV1,
  RuntimeCapabilitySessionOverlayV1,
} from "./capabilities/index.ts";
export { installBrowserAutomationBridgeV1 } from "./automation/index.ts";
export type {
  BrowserAutomationBridgeV1,
  BrowserAutomationOperationResultV1,
  InstalledBrowserAutomationBridgeV1,
} from "./automation/index.ts";
export {
  createPlayerSaveUiPortV1,
  createPlayerUiPortsV1,
} from "./application/create-player-ui-ports.ts";
export { createWebAudioHostV1 } from "./audio/create-web-audio-host.ts";
export type {
  CreateWebAudioHostOptionsV1,
  WebAudioContextLikeV1,
} from "./audio/create-web-audio-host.ts";
export {
  defaultWebAutosavePolicyV1,
  startWebGameApplicationV1,
} from "./application/start-web-game-application.tsx";
export type {
  StartWebGameApplicationOptionsV1,
  StartedWebGameApplicationV1,
  WebGameApplicationV1,
  WebGameUiDefinitionV1,
} from "./application/start-web-game-application.tsx";
export { createWebInstanceLeaseCoordinatorV1 } from "./application/instance-lease.ts";
export type {
  CreateWebInstanceLeaseCoordinatorInputV1,
  WebInstanceLeasePortV1,
  WebInstanceLeaseRoleV1,
  WebInstanceLeaseStateV1,
  WebInstancePolicyV1,
} from "./application/instance-lease.ts";
export type {
  PlayerUiDiagnosticsSourceV1,
  PlayerUiPersistenceSourceV1,
  PlayerUiPortsV1,
} from "./application/create-player-ui-ports.ts";
export { createWebHostV1 } from "./host/create-web-host.ts";
export { createHttpHostRecordStoreV1 } from "./host/http-record-store.ts";
export type { CreateHttpHostRecordStoreOptionsV1 } from "./host/http-record-store.ts";
export type { CreateWebHostOptionsV1 } from "./host/create-web-host.ts";
export { createBrowserFilePortV1 } from "./host/browser-file-port.ts";
export { createShellFilePortV1 } from "./host/shell-file-port.ts";
export type { BrowserFilePortEnvironmentV1 } from "./host/browser-file-port.ts";
export { installPointerAdapterV1 } from "./input/index.ts";
export type { InstalledPointerAdapterV1, PointerAdapterInputV1 } from "./input/index.ts";
export { createBrowserImageLoaderV1 } from "./assets/index.ts";
export type { BrowserImageLoaderEnvironmentV1 } from "./assets/index.ts";
export { createWebContentPreferencePortV1 } from "./preferences/index.ts";
export { createHashRouterV1 } from "./routing/index.ts";
export type {
  CanonicalHashV1,
  CreateHashRouterOptionsV1,
  HashRouteV1,
  HashRouterEventTargetV1,
  HashRouterLocationV1,
  HashRouterPublicationV1,
  HashRouterV1,
} from "./routing/index.ts";
