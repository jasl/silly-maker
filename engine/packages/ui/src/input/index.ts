// SPDX-License-Identifier: MIT
export {
  inputHandledV1,
  inputIgnoredV1,
  parseInputActionIdV1,
  playerInputActionIdsV1,
  systemInputActionIdsV1,
} from "./contracts.ts";
export type {
  InputActionIdV1,
  InputContextIdV1,
  InputEventV1,
  InputHandlerResultV1,
  InputRouteResultV1,
  InputRouterV1,
  ViewportPointV1,
} from "./contracts.ts";
export { InputContextProviderV1, useInputRouterV1 } from "./input-context.tsx";
export type { InputContextProviderPropsV1 } from "./input-context.tsx";
export { createInputRouterV1 } from "./input-router.ts";
export { installKeyboardAdapterV1 } from "./keyboard-adapter.ts";
export { installPointerButtonAdapterV1 } from "./pointer-button-adapter.ts";
export type { InstallKeyboardAdapterOptionsV1, KeyboardActionMapV1 } from "./keyboard-adapter.ts";
export type {
  InstallPointerButtonAdapterOptionsV1,
  PointerActionMapV1,
} from "./pointer-button-adapter.ts";
export { installGamepadAdapterV1 } from "./gamepad-adapter.ts";
export type {
  GamepadActionMapV1,
  GamepadLikeV1,
  InstallGamepadAdapterOptionsV1,
  InstalledGamepadAdapterV1,
} from "./gamepad-adapter.ts";
