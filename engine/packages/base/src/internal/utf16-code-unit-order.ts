// SPDX-License-Identifier: MIT

/** @internal Host-locale-independent UTF-16 code-unit order. */
export function compareUtf16CodeUnitsInternalV1(left: string, right: string): number {
  if (left === right) return 0;
  return left < right ? -1 : 1;
}
