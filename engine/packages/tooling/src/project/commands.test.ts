// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";

import { AuthoringDiagnosticErrorV1 } from "@sillymaker/base";
import { createSyntheticCounterGamePackageV1 } from "@sillymaker/base/testkit";

import type { ProjectModuleLoaderV1, StorySimulationTargetV1 } from "./commands.ts";
import {
  checkStoryApplicationV1,
  DESKTOP_TARGET_TRIPLES_V1,
  inspectStoryApplicationV1,
  simulateStoryApplicationV1,
} from "./commands.ts";
import type { SillymakerProjectConfigV1 } from "./config.ts";
import { defineSillymakerProjectV1 } from "./config.ts";

function mapLoaderV1(modules: Record<string, Record<string, unknown>>): ProjectModuleLoaderV1 {
  return Object.freeze({
    loadModule: async (path: string) => {
      const record = modules[path];
      if (record === undefined) throw new Error(`no module at ${path}`);
      return record;
    },
  });
}

function projectV1(): SillymakerProjectConfigV1 {
  return defineSillymakerProjectV1({
    projectId: "project-test",
    applications: [
      {
        applicationId: "synthetic",
        label: "Synthetic counter",
        storyEntry: { module: "test/synthetic-story.ts", exportName: "entryV1" },
        assetVerification: false,
        simulate: { module: "test/synthetic-target.ts", exportName: "createTargetV1" },
        studio: null,
        web: null,
      },
    ],
  });
}

async function diagnosticsOfAsync(
  run: () => Promise<unknown>,
): Promise<readonly { code: string }[]> {
  try {
    await run();
  } catch (error) {
    if (error instanceof AuthoringDiagnosticErrorV1) return error.diagnostics;
    throw error;
  }
  throw new Error("expected a structured diagnostic error");
}

describe("project commands", () => {
  it("keeps the explicit SillyMaker desktop target allowlist stable", () => {
    expect(DESKTOP_TARGET_TRIPLES_V1).toEqual([
      "x86_64-apple-darwin",
      "aarch64-apple-darwin",
      "x86_64-pc-windows-msvc",
      "x86_64-unknown-linux-gnu",
      "aarch64-unknown-linux-gnu",
    ]);
  });

  it("inspects a resolvable application into a JSON-safe report", async () => {
    const loader = mapLoaderV1({
      "test/synthetic-story.ts": { entryV1: createSyntheticCounterGamePackageV1() },
    });

    const result = await inspectStoryApplicationV1(projectV1(), "synthetic", loader);
    expect(result.kind).toBe("inspected");
    if (result.kind !== "inspected") return;
    expect(result.report.applicationId).toBe("synthetic");
    expect(result.report.story.id.length).toBeGreaterThan(0);
    expect(result.report.story.digest).toMatch(/^sha256:/u);
    expect(result.report.simulationDigest).toMatch(/^sha256:/u);
    expect(result.report.assets.assets).toBe(result.report.assets.assetIds.length);
    expect(JSON.parse(JSON.stringify(result.report))).toEqual(result.report);
  });

  it("checks a valid application and reports broken entries as diagnostics", async () => {
    const valid = await checkStoryApplicationV1(
      projectV1(),
      "synthetic",
      mapLoaderV1({
        "test/synthetic-story.ts": { entryV1: createSyntheticCounterGamePackageV1() },
      }),
    );
    expect(valid).toMatchObject({ applicationId: "synthetic", ok: true, diagnostics: [] });

    const brokenEntry = Object.freeze({
      ...createSyntheticCounterGamePackageV1(),
      define: () => {
        throw new TypeError("synthetic definition exploded");
      },
    });
    const broken = await checkStoryApplicationV1(
      projectV1(),
      "synthetic",
      mapLoaderV1({ "test/synthetic-story.ts": { entryV1: brokenEntry } }),
    );
    expect(broken.ok).toBe(false);
    expect(broken.diagnostics.length).toBeGreaterThan(0);
    expect(JSON.parse(JSON.stringify(broken.diagnostics))).toEqual(broken.diagnostics);
  });

  it("reports unloadable modules and missing exports structurally", async () => {
    await expect(
      diagnosticsOfAsync(() =>
        inspectStoryApplicationV1(projectV1(), "synthetic", mapLoaderV1({}))
      ),
    ).resolves.toMatchObject([{ code: "project.module_unloadable" }]);

    await expect(
      diagnosticsOfAsync(() =>
        checkStoryApplicationV1(
          projectV1(),
          "synthetic",
          mapLoaderV1({ "test/synthetic-story.ts": { other: 1 } }),
        )
      ),
    ).resolves.toMatchObject([{ code: "project.export_missing" }]);
  });

  it("simulates through the Agent port only and always disposes the target", async () => {
    const operations: string[] = [];
    const target: StorySimulationTargetV1 = {
      agent: {
        identity: () => ({ storyId: "story.synthetic", storyRevision: 1 }),
        observe: () => {
          operations.push("observe");
          return { revision: operations.length };
        },
        describeActions: () => [],
        preview: async () => ({ kind: "allowed" }),
        dispatch: async (invocation) => {
          operations.push(`dispatch:${JSON.stringify(invocation)}`);
          return { kind: "committed" };
        },
        waitForIdle: async () => ({ kind: "idle" }),
      },
      stateDigest: () => "sha256:synthetic",
      dispose: async () => {
        operations.push("dispose");
        return { kind: "disposed" };
      },
      defaultScript: [{ actionId: "synthetic.increment" }],
    };
    const loader = mapLoaderV1({
      "test/synthetic-target.ts": { createTargetV1: async () => target },
    });

    const report = await simulateStoryApplicationV1(projectV1(), "synthetic", loader);
    expect(report.storyIdentity).toEqual({ storyId: "story.synthetic", storyRevision: 1 });
    expect(report.steps).toEqual([
      {
        ordinal: 1,
        invocation: { actionId: "synthetic.increment" },
        result: { kind: "committed" },
      },
    ]);
    expect(report.finalStateDigest).toBe("sha256:synthetic");
    expect(operations).toEqual([
      "observe",
      'dispatch:{"actionId":"synthetic.increment"}',
      "observe",
      "dispose",
    ]);

    const explicit = await simulateStoryApplicationV1(projectV1(), "synthetic", loader, {
      script: [{ actionId: "synthetic.reject" }, { actionId: "synthetic.increment" }],
    });
    expect(explicit.steps.map((step) => step.ordinal)).toEqual([1, 2]);
  });

  it("samples trace paths after every step, missing paths as null", async () => {
    let counter = 0;
    const target: StorySimulationTargetV1 = {
      agent: {
        identity: () => ({ storyId: "story.synthetic", storyRevision: 1 }),
        observe: () => ({ game: { counter, nested: { value: counter * 2 } } }),
        describeActions: () => [],
        preview: async () => ({ kind: "allowed" }),
        dispatch: async () => {
          counter += 1;
          return { kind: "committed" };
        },
        waitForIdle: async () => ({ kind: "idle" }),
      },
      dispose: async () => ({ kind: "disposed" }),
      defaultScript: [{ actionId: "a" }, { actionId: "b" }],
    };
    const loader = mapLoaderV1({
      "test/synthetic-target.ts": { createTargetV1: async () => target },
    });

    const report = await simulateStoryApplicationV1(projectV1(), "synthetic", loader, {
      trace: ["game.counter", "game.nested.value", "game.missing.path"],
    });
    expect(report.trace).toEqual([
      { step: 0, "game.counter": 0, "game.nested.value": 0, "game.missing.path": null },
      { step: 1, "game.counter": 1, "game.nested.value": 2, "game.missing.path": null },
      { step: 2, "game.counter": 2, "game.nested.value": 4, "game.missing.path": null },
    ]);

    const untraced = await simulateStoryApplicationV1(projectV1(), "synthetic", loader);
    expect(untraced.trace).toBeNull();
  });

  it("rejects applications without a simulation target", async () => {
    const project = defineSillymakerProjectV1({
      projectId: "project-test",
      applications: [
        {
          applicationId: "static",
          label: "No simulation",
          storyEntry: { module: "test/story.ts", exportName: "entryV1" },
          assetVerification: false,
          simulate: null,
          studio: null,
          web: null,
        },
      ],
    });
    await expect(
      diagnosticsOfAsync(() => simulateStoryApplicationV1(project, "static", mapLoaderV1({}))),
    ).resolves.toMatchObject([{ code: "project.simulation_unconfigured" }]);
  });
});
