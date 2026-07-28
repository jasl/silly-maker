// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";

import { AuthoringDiagnosticErrorV1 } from "@sillymaker/base";

import type { StoryApplicationConfigV1 } from "./config.ts";
import {
  defineSillymakerProjectV1,
  listStoryApplicationIdsV1,
  resolveStoryApplicationV1,
  resolveWebBuildTargetV1,
} from "./config.ts";

function webApplicationV1(applicationId: string): StoryApplicationConfigV1 {
  return {
    applicationId,
    label: `${applicationId} application`,
    storyEntry: { module: `examples/${applicationId}/src/story.ts`, exportName: "entryV1" },
    assetVerification: true,
    simulate: null,
    web: {
      storyRoot: `examples/${applicationId}`,
      applicationHtml: `examples/${applicationId}/index.html`,
      applicationEntry: `examples/${applicationId}/src/application/entry.tsx`,
      outDir: `dist/${applicationId}`,
      base: "./",
      sourcemap: false,
      identity: {
        module: "scripts/build-poc-identity.mjs",
        collectExport: "collectPocBuildIdentityV1",
        createPluginExport: "createPocBuildIdentityVirtualPluginV1",
      },
    },
    releaseArtifact: true,
  };
}

function headlessApplicationV1(applicationId: string): StoryApplicationConfigV1 {
  return {
    applicationId,
    label: `${applicationId} headless`,
    storyEntry: { module: `examples/${applicationId}/src/story.ts`, exportName: "entryV1" },
    assetVerification: false,
    simulate: { module: `examples/${applicationId}/src/target.ts`, exportName: "createV1" },
    web: null,
    releaseArtifact: false,
  };
}

function diagnosticsOf(run: () => unknown): readonly { code: string }[] {
  try {
    run();
  } catch (error) {
    if (error instanceof AuthoringDiagnosticErrorV1) return error.diagnostics;
    throw error;
  }
  throw new Error("expected a structured diagnostic error");
}

describe("defineSillymakerProjectV1", () => {
  it("freezes a valid project and resolves applications by ID", () => {
    const project = defineSillymakerProjectV1({
      projectId: "project-test",
      applications: [webApplicationV1("alpha-web"), headlessApplicationV1("beta")],
    });

    expect(Object.isFrozen(project)).toBe(true);
    expect(Object.isFrozen(project.applications[0])).toBe(true);
    expect(listStoryApplicationIdsV1(project)).toEqual(["alpha-web", "beta"]);
    expect(resolveStoryApplicationV1(project, "beta").simulate).toEqual({
      module: "examples/beta/src/target.ts",
      exportName: "createV1",
    });
    expect(resolveWebBuildTargetV1(project, "alpha-web").outDir).toBe("dist/alpha-web");
  });

  it("accepts a new temporary application declaration without any other change", () => {
    const base = [webApplicationV1("alpha-web"), headlessApplicationV1("beta")];
    const project = defineSillymakerProjectV1({
      projectId: "project-test",
      applications: [...base, webApplicationV1("temporary-web")],
    });

    expect(resolveWebBuildTargetV1(project, "temporary-web").storyRoot).toBe(
      "examples/temporary-web",
    );
    expect(resolveStoryApplicationV1(project, "temporary-web").storyEntry.exportName).toBe(
      "entryV1",
    );
  });

  it("rejects duplicate application IDs with a structured diagnostic", () => {
    expect(
      diagnosticsOf(() =>
        defineSillymakerProjectV1({
          projectId: "project-test",
          applications: [headlessApplicationV1("beta"), headlessApplicationV1("beta")],
        }),
      ),
    ).toMatchObject([{ code: "project.application_duplicate" }]);
  });

  it("rejects unsafe repository paths", () => {
    const application = {
      ...headlessApplicationV1("beta"),
      storyEntry: { module: "../outside/story.ts", exportName: "entryV1" },
    };
    expect(
      diagnosticsOf(() =>
        defineSillymakerProjectV1({ projectId: "project-test", applications: [application] }),
      ),
    ).toMatchObject([{ code: "project.config_invalid" }]);
  });

  it("answers unknown applications and missing web targets structurally", () => {
    const project = defineSillymakerProjectV1({
      projectId: "project-test",
      applications: [headlessApplicationV1("beta")],
    });

    const unknown = diagnosticsOf(() => resolveStoryApplicationV1(project, "missing"));
    expect(unknown).toMatchObject([{ code: "project.application_unknown" }]);
    expect(unknown[0]).toMatchObject({ message: expect.stringContaining("beta") });

    expect(diagnosticsOf(() => resolveWebBuildTargetV1(project, "beta"))).toMatchObject([
      { code: "project.web_target_missing" },
    ]);
  });
});
