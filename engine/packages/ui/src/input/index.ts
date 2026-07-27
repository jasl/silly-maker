// SPDX-License-Identifier: MIT
export {
  inputHandledV1,
  inputIgnoredV1,
  parseInputActionIdV1,
  playerInputActionIdsV1,
  systemInputActionIdsV1,
} from "./contracts.js";
export type {
  InputActionIdV1,
  InputContextIdV1,
  InputEventV1,
  InputHandlerResultV1,
  InputRouteResultV1,
  InputRouterV1,
  ViewportPointV1,
} from "./contracts.js";
export { InputContextProviderV1, useInputRouterV1 } from "./input-context.js";
export type { InputContextProviderPropsV1 } from "./input-context.js";
export { createInputRouterV1 } from "./input-router.js";
export { installKeyboardAdapterV1 } from "./keyboard-adapter.js";
export type { InstallKeyboardAdapterOptionsV1, KeyboardActionMapV1 } from "./keyboard-adapter.js";
export { installGamepadAdapterV1 } from "./gamepad-adapter.js";
export type {
  GamepadActionMapV1,
  GamepadLikeV1,
  InstallGamepadAdapterOptionsV1,
  InstalledGamepadAdapterV1,
} from "./gamepad-adapter.js";
