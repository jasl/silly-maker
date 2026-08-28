// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";

import { parseCapabilityRequestV1 } from "@sillymaker/web";

import { developmentCapabilitySearchV1 } from "./development-application.tsx";

describe("VN development composition", () => {
  it("adds its session capabilities only to an accepted request", () => {
    expect(parseCapabilityRequestV1(developmentCapabilitySearchV1(""))).toEqual({
      kind: "accepted",
      requested: ["debug_tools", "cheats"],
    });
    expect(
      parseCapabilityRequestV1(
        developmentCapabilitySearchV1("?capability=automation_bridge"),
      ),
    ).toEqual({
      kind: "accepted",
      requested: ["automation_bridge", "debug_tools", "cheats"],
    });
  });

  it("does not mask a rejected external request", () => {
    const rejected = "?capability=automation_bridge&other=unexpected";
    expect(developmentCapabilitySearchV1(rejected)).toBe(rejected);
    expect(parseCapabilityRequestV1(developmentCapabilitySearchV1(rejected))).toMatchObject({
      kind: "rejected",
    });
  });
});
