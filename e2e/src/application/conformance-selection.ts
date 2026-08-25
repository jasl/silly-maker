// SPDX-License-Identifier: MIT

export const labCodeSurfaceCompositionIdV1 = "gui.e2e.code-surface-conformance";
export const labCodeSurfaceRuntimePathV1 =
  "assets/gui/code-surface-conformance.gui-composition.json";
export const labCodeSurfaceSourceV1 = "assets/gui/code-surface-conformance.gui-composition.json";

export function isLabCodeSurfaceConformanceSelectedV1(
  search = globalThis.location?.search ?? "",
): boolean {
  return new URLSearchParams(search).get("code_surface_conformance") === "1";
}
