// SPDX-License-Identifier: MIT

import { parseDesktopShellCapabilityInternalV1 } from "../host/desktop-shell-capability.ts";

export interface LocalRecordsHostModeV1 {
  readonly usesDesktopShell: boolean;
  readonly wantsLocalRecords: boolean;
  readonly desktopShellCapability: string | null;
}

/**
 * Keeps the browser-local record server and the Desktop shell channel
 * distinct. Both use HTTP records, but only the injected shell marker proves
 * that the shell download endpoint is available.
 */
export function resolveLocalRecordsHostModeV1(
  search: string,
  recordsMarker: unknown,
  capabilityMarker: unknown,
): LocalRecordsHostModeV1 {
  const usesDesktopShell = recordsMarker === "local";
  const desktopShellCapability = usesDesktopShell
    ? parseDesktopShellCapabilityInternalV1(capabilityMarker)
    : null;
  if (usesDesktopShell && desktopShellCapability === null) {
    throw new TypeError("web.desktop_shell_capability_invalid");
  }
  return Object.freeze({
    usesDesktopShell,
    wantsLocalRecords: usesDesktopShell || new URLSearchParams(search).get("records") === "local",
    desktopShellCapability,
  });
}
