// SPDX-License-Identifier: MIT
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { parseGuiStartupOptionsV1 } from "./gui-startup.mts";

describe("GUI startup benchmark options", () => {
  it("defaults to three Engine Lab samples", () => {
    expect(parseGuiStartupOptionsV1([], "/work")).toEqual({
      applicationId: "e2e",
      samples: 3,
    });
  });

  it("accepts one application, sample count, and output path", () => {
    expect(parseGuiStartupOptionsV1(
      ["--application=template", "--samples", "1", "--output", "reports/gui.json"],
      "/work",
    )).toEqual({
      applicationId: "template",
      samples: 1,
      output: resolve("/work", "reports/gui.json"),
    });
  });

  it("rejects ambiguous or invalid options", () => {
    expect(() => parseGuiStartupOptionsV1(["--samples", "0"], "/work")).toThrow(
      "--samples must be a positive integer",
    );
    expect(() =>
      parseGuiStartupOptionsV1(
        ["--application", "e2e", "--application", "template"],
        "/work",
      )
    ).toThrow("may only be provided once");
    expect(() => parseGuiStartupOptionsV1(["--unknown", "value"], "/work")).toThrow(
      "unknown argument",
    );
  });
});
