// SPDX-License-Identifier: MIT

export interface LocalRecordsHostModeV1 {
  readonly usesDesktopShell: boolean;
  readonly wantsLocalRecords: boolean;
}

/**
 * Keeps the browser-local record server and the Desktop shell channel
 * distinct. Both use HTTP records, but only the injected shell marker proves
 * that the shell download endpoint is available.
 */
export function resolveLocalRecordsHostModeV1(
  search: string,
  recordsMarker: unknown,
): LocalRecordsHostModeV1 {
  const usesDesktopShell = recordsMarker === "local";
  return Object.freeze({
    usesDesktopShell,
    wantsLocalRecords: usesDesktopShell || new URLSearchParams(search).get("records") === "local",
  });
}
