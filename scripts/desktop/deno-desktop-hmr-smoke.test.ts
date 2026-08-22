// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";

import {
  parseDesktopHmrLaunchOptionsV1,
  requireReportedCanaryRevisionV1,
} from "./deno-desktop-hmr-smoke.mts";

const shaV1 = "98dc759254a90b98f7bbb62ba5361e531d0db6a5";

describe("Desktop HMR manual launch preflight", () => {
  it("accepts an explicit binary and records a full selected upstream commit", () => {
    expect(parseDesktopHmrLaunchOptionsV1(
      ["--upstream-sha", shaV1, "--deno", "./canary-deno"],
      "/tmp/work",
    )).toEqual({
      denoBinary: "/tmp/work/canary-deno",
      selectedUpstreamCommit: shaV1,
    });
    expect(() =>
      parseDesktopHmrLaunchOptionsV1(
        ["--deno", "./canary-deno", "--upstream-sha", "98dc759"],
        "/tmp/work",
      )
    ).toThrow("desktop_hmr_smoke:options");
  });

  it("matches the canary revision exposed by the binary", () => {
    expect(requireReportedCanaryRevisionV1(
      `deno 2.9.6+98dc759 (canary, release, aarch64-apple-darwin)\n`,
      "98dc759",
    )).toBe("2.9.6+98dc759");
    expect(() =>
      requireReportedCanaryRevisionV1(
        "deno 2.9.6+98dc758 (canary, release, aarch64-apple-darwin)",
        "98dc759",
      )
    ).toThrow("desktop_hmr_smoke:binary_mismatch");
    expect(() => requireReportedCanaryRevisionV1("deno 2.9.5", "98dc759")).toThrow(
      "desktop_hmr_smoke:binary_mismatch",
    );
  });
});
