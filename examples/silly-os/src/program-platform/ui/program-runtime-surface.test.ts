// SPDX-License-Identifier: MIT

import { describe, expect, it, vi } from "vitest";

import type { ProgramSurfaceProcessNetworkAccessV1 } from "./program-runtime-surface.ts";
import { selectProgramSurfaceProcessNetworkAccessV1 } from "./program-runtime-surface.ts";

function capabilityV1(): ProgramSurfaceProcessNetworkAccessV1 {
  return {
    load: vi.fn(async () => null),
    set: vi.fn(async () => ({ kind: "missing" as const })),
  };
}

describe("Program surface optional Process network capability", () => {
  it("selects the same fixed Host capability from any package that declares it", () => {
    const capability = capabilityV1();

    expect(
      selectProgramSurfaceProcessNetworkAccessV1(
        ["agent.text", "network.optional", "workspace.read"],
        capability,
      ),
    ).toBe(capability);
  });

  it("does not expose the capability to a package that did not declare it", () => {
    expect(selectProgramSurfaceProcessNetworkAccessV1(["agent.text"], capabilityV1())).toBeNull();
    expect(selectProgramSurfaceProcessNetworkAccessV1(["network.optional"], null)).toBeNull();
  });
});
