// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";

import { resolveLocalRecordsHostModeV1 } from "./resolve-local-records-host-mode.ts";

describe("local records Host mode", () => {
  const capabilityV1 = "a".repeat(43);

  it.each(
    [
      ["", undefined, undefined, false, false, null],
      ["?records=local", undefined, undefined, false, true, null],
      ["?records=local", "other", capabilityV1, false, true, null],
      ["", "local", capabilityV1, true, true, capabilityV1],
      ["?records=remote", "local", capabilityV1, true, true, capabilityV1],
    ] as const,
  )(
    "separates search %j, marker %j, and capability %j",
    (
      search,
      recordsMarker,
      capabilityMarker,
      usesDesktopShell,
      wantsLocalRecords,
      desktopShellCapability,
    ) => {
      const mode = resolveLocalRecordsHostModeV1(search, recordsMarker, capabilityMarker);

      expect(mode).toEqual({
        usesDesktopShell,
        wantsLocalRecords,
        desktopShellCapability,
      });
      expect(Object.isFrozen(mode)).toBe(true);
    },
  );

  it.each([undefined, null, "", "short", `${"a".repeat(42)}!`, 7])(
    "fails closed for a Desktop marker with malformed capability %j",
    (capabilityMarker) => {
      expect(() => resolveLocalRecordsHostModeV1("", "local", capabilityMarker)).toThrow(
        "web.desktop_shell_capability_invalid",
      );
    },
  );
});
