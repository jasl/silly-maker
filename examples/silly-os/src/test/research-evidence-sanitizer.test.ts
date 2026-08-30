// SPDX-License-Identifier: MIT

import { describe, expect, it } from "vitest";

import {
  sanitizeResearchErrorV1,
  sanitizeResearchProviderMessageV1,
} from "../../tools/research-evidence-sanitizer.ts";

describe("SillyOS Translation research evidence diagnostics", () => {
  it("redacts the exact credential from thrown and Provider diagnostics", () => {
    const secret = "research-key-never-persist";

    expect(sanitizeResearchErrorV1(
      new Error(`request for ${secret} failed`),
      secret,
    )).toBe("Error:request for [redacted] failed");
    expect(sanitizeResearchProviderMessageV1(
      `Provider rejected ${secret}; retrying ${secret} is unsafe`,
      secret,
    )).toBe("Provider rejected [redacted]; retrying [redacted] is unsafe");
  });
});
