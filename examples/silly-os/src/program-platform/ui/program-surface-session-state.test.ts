// SPDX-License-Identifier: MIT

import { describe, expect, it } from "vitest";

import {
  createProgramSurfaceSessionStateOwnerV1,
  type ProgramSurfaceSessionStateOwnerV1,
} from "./program-surface-session-state.ts";

const packageA1V1 = {
  programId: "program.a",
  packageVersion: "1.0.0",
  contentDigest: "a".repeat(64),
} as const;
const packageA2V1 = {
  ...packageA1V1,
  packageVersion: "2.0.0",
  contentDigest: "b".repeat(64),
} as const;
const packageB1V1 = {
  programId: "program.b",
  packageVersion: "1.0.0",
  contentDigest: "c".repeat(64),
} as const;

describe("Program surface session state", () => {
  it("retains state for an exact package while isolating other packages and successors", () => {
    const owner: ProgramSurfaceSessionStateOwnerV1 = createProgramSurfaceSessionStateOwnerV1();
    owner.forPackage(packageA1V1).write("process.1", { draft: "hello" });

    expect(owner.forPackage(packageA1V1).read("process.1")).toEqual({ draft: "hello" });
    expect(owner.forPackage(packageA2V1).read("process.1")).toBeUndefined();
    expect(owner.forPackage(packageB1V1).read("process.1")).toBeUndefined();
  });

  it("clears all ephemeral presentation state without changing durable Process data", () => {
    const owner = createProgramSurfaceSessionStateOwnerV1();
    owner.forPackage(packageA1V1).write("process.1", "draft");
    owner.clear();

    expect(owner.forPackage(packageA1V1).read("process.1")).toBeUndefined();
  });
});
