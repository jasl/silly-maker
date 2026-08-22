// SPDX-License-Identifier: MIT

/**
 * A sibling Host surface may deliberately own focus outside the Game
 * Domain's active managed surface. DevDock keeps its historical marker;
 * embeddable application domains use the neutral application-owner marker.
 */
export function isIndependentApplicationFocusOwnerTargetInternalV1(
  target: EventTarget | null,
): boolean {
  return (
    typeof Element !== "undefined" &&
    target instanceof Element &&
    target.closest(
        '[data-devdock-escape-owner="true"], [data-application-focus-owner]',
      ) !== null
  );
}
