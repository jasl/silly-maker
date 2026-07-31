// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";

import { resolveLocalRecordsHostModeV1 } from "./resolve-local-records-host-mode.ts";

describe("local records Host mode", () => {
  it.each([
    ["", undefined, false, false],
    ["?records=local", undefined, false, true],
    ["?records=local", "other", false, true],
    ["", "local", true, true],
    ["?records=remote", "local", true, true],
  ] as const)(
    "separates search %j and marker %j",
    (search, recordsMarker, usesDesktopShell, wantsLocalRecords) => {
      const mode = resolveLocalRecordsHostModeV1(search, recordsMarker);

      expect(mode).toEqual({ usesDesktopShell, wantsLocalRecords });
      expect(Object.isFrozen(mode)).toBe(true);
    },
  );
});
