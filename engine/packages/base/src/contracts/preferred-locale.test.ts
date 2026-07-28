// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";

import { resolvePreferredLocaleV1 } from "./preferred-locale.ts";

describe("resolvePreferredLocaleV1", () => {
  const available = ["zh-CN", "en"];

  it("matches exact tags case-insensitively", () => {
    expect(resolvePreferredLocaleV1({ available, requested: ["ZH-cn"], fallback: "en" })).toBe(
      "zh-CN",
    );
  });

  it("falls back from a full tag to the primary subtag family", () => {
    expect(
      resolvePreferredLocaleV1({ available, requested: ["zh-TW", "en-US"], fallback: "en" }),
    ).toBe("zh-CN");
    expect(resolvePreferredLocaleV1({ available, requested: ["en-GB"], fallback: "zh-CN" })).toBe(
      "en",
    );
  });

  it("walks the preference list in order", () => {
    expect(
      resolvePreferredLocaleV1({ available, requested: ["ja", "ko", "en-US"], fallback: "zh-CN" }),
    ).toBe("en");
  });

  it("returns the fallback when nothing matches", () => {
    expect(resolvePreferredLocaleV1({ available, requested: ["ja"], fallback: "en" })).toBe("en");
    expect(resolvePreferredLocaleV1({ available, requested: [], fallback: "en" })).toBe("en");
  });
});
