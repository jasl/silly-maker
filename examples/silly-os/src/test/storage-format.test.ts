// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";

import { formatStorageBytesV1 } from "../ui/storage-format.ts";

describe("SillyOS storage byte formatting", () => {
  it("keeps zero distinct from an unavailable estimate and scales binary units", () => {
    expect(formatStorageBytesV1(0, "en")).toBe("0 B");
    expect(formatStorageBytesV1(1_024, "en")).toBe("1 KiB");
    expect(formatStorageBytesV1(1_572_864, "en")).toBe("1.5 MiB");
    expect(formatStorageBytesV1(2_147_483_648, "zh-CN")).toBe("2 GiB");
  });
});
