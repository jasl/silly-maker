// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";

import { AuthoringDiagnosticErrorV1 } from "@sillymaker/base";

import type { SillymakerProjectConfigV1, StoryApplicationConfigV1 } from "./config-types.ts";
import {
  mergeLocalStoryApplicationsV1,
  readLocalStoryApplicationsV1,
  sillymakerLocalApplicationsExportV1,
} from "./local-overlay.ts";

function diagnosticsOf(run: () => unknown): readonly { code: string }[] {
  try {
    run();
  } catch (error) {
    if (error instanceof AuthoringDiagnosticErrorV1) return error.diagnostics;
    throw error;
  }
  throw new Error("expected a structured diagnostic error");
}

function applicationV1(applicationId: string): StoryApplicationConfigV1 {
  return Object.freeze({
    applicationId,
    label: `Application ${applicationId}`,
    storyEntry: Object.freeze({ module: `${applicationId}/src/story.ts`, exportName: "storyV1" }),
    assetVerification: false,
    simulate: null,
    web: null,
    releaseArtifact: false,
  });
}

const baseV1: SillymakerProjectConfigV1 = Object.freeze({
  projectId: "silly-maker",
  applications: Object.freeze([applicationV1("e2e"), applicationV1("template")]),
});

describe("mergeLocalStoryApplicationsV1", () => {
  it("returns the base config unchanged for an empty overlay", () => {
    expect(mergeLocalStoryApplicationsV1(baseV1, [])).toBe(baseV1);
  });

  it("appends local applications after the committed registry", () => {
    const merged = mergeLocalStoryApplicationsV1(baseV1, [applicationV1("local-study")]);
    expect(merged.projectId).toBe("silly-maker");
    expect(merged.applications.map((application) => application.applicationId)).toEqual([
      "e2e",
      "template",
      "local-study",
    ]);
    expect(Object.isFrozen(merged.applications)).toBe(true);
  });

  it("rejects a local application shadowing a committed ID with a structured diagnostic", () => {
    expect(
      diagnosticsOf(() => mergeLocalStoryApplicationsV1(baseV1, [applicationV1("template")])),
    ).toMatchObject([{ code: "project.local_application_conflict" }]);
  });
});

describe("readLocalStoryApplicationsV1", () => {
  it("reads the well-known export and tolerates its absence", () => {
    expect(readLocalStoryApplicationsV1({})).toEqual([]);
    const applications = [applicationV1("local-study")];
    expect(
      readLocalStoryApplicationsV1({ [sillymakerLocalApplicationsExportV1]: applications }),
    ).toEqual(applications);
  });

  it("rejects a non-array export with a structured diagnostic", () => {
    expect(
      diagnosticsOf(() =>
        readLocalStoryApplicationsV1({ [sillymakerLocalApplicationsExportV1]: "nope" }),
      ),
    ).toMatchObject([{ code: "project.local_config_invalid" }]);
  });
});
