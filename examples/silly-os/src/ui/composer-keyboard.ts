// SPDX-License-Identifier: MIT

export function isComposerCompositionKeyV1(
  event: Pick<KeyboardEvent, "isComposing" | "keyCode">,
): boolean {
  return event.isComposing || event.keyCode === 229;
}
