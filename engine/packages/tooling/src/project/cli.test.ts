// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";

import { createSyntheticCounterGamePackageV1 } from "@sillymaker/base/testkit";

import { runProjectCliV1 } from "./cli.js";
import type { ProjectModuleLoaderV1 } from "./commands.js";
import { defineSillymakerProjectV1 } from "./config.js";

const projectV1 = defineSillymakerProjectV1({
  projectId: "project-test",
  applications: [
    {
      applicationId: "synthetic",
      label: "Synthetic counter",
      storyEntry: { module: "test/synthetic-story.ts", exportName: "entryV1" },
      assetVerification: false,
      simulate: null,
      web: null,
      releaseArtifact: false,
    },
  ],
});

const loaderV1: ProjectModuleLoaderV1 = Object.freeze({
  loadModule: async (path: string) => {
    if (path !== "test/synthetic-story.ts") throw new Error(`no module at ${path}`);
    return { entryV1: createSyntheticCounterGamePackageV1() };
  },
});

async function runV1(argv: readonly string[]) {
  const out: string[] = [];
  const err: string[] = [];
  const code = await runProjectCliV1({
    project: projectV1,
    argv,
    loader: loaderV1,
    writeOut: (line) => out.push(line),
    writeErr: (line) => err.push(line),
  });
  return { code, out, err };
}

describe("runProjectCliV1", () => {
  it("prints inspect and check reports as JSON with exit code 0", async () => {
    const inspect = await runV1(["inspect", "synthetic"]);
    expect(inspect.code).toBe(0);
    expect(JSON.parse(inspect.out.join("\n"))).toMatchObject({ kind: "inspected" });

    const check = await runV1(["check", "--all"]);
    expect(check.code).toBe(0);
    expect(JSON.parse(check.out.join("\n"))).toEqual([
      { applicationId: "synthetic", ok: true, diagnostics: [] },
    ]);
  });

  it("prints structured diagnostics with exit code 1 for unknown applications", async () => {
    const result = await runV1(["check", "missing"]);
    expect(result.code).toBe(1);
    expect(JSON.parse(result.out.join("\n"))).toMatchObject({
      kind: "error",
      diagnostics: [{ code: "project.application_unknown" }],
    });
    expect(result.err).toEqual([]);
  });

  it("answers usage errors on stderr with exit code 2", async () => {
    const missing = await runV1(["inspect"]);
    expect(missing.code).toBe(2);
    expect(missing.err[0]).toContain("usage:");

    const unknown = await runV1(["frobnicate", "synthetic"]);
    expect(unknown.code).toBe(2);
  });
});
