// SPDX-License-Identifier: MIT
// Compatibility module: lifecycle state is owned exclusively by the Managed
// Surface Coordinator-backed Workspace Overlay session.
export {
  defineWorkspaceOverlayV1,
  maximumOverlayDetailDepthV1,
} from "./workspace-overlay-session.ts";
export type {
  DefineWorkspaceOverlayInputV1,
  OverlayAdmissionRejectionV1,
  OverlayCloseTopResultV1,
  OverlayOpenResultV1,
  OverlayPushDetailResultV1,
  OverlaySessionStateV1,
  OverlaySessionStoreV1,
  WorkspaceOverlayDefinitionV1,
} from "./workspace-overlay-session.ts";
