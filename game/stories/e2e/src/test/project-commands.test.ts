// SPDX-License-Identifier: MIT
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { AuthoringDiagnosticErrorV1 } from "@sillymaker/base";
import {
  checkStoryApplicationV1,
  createImportProjectModuleLoaderV1,
  defineSillymakerProjectV1,
  inspectStoryApplicationV1,
  listStoryApplicationIdsV1,
  simulateStoryApplicationV1,
} from "@sillymaker/tooling";

import { projectTavernConfigV1 } from "../../../../project.config.js";

const repositoryRootV1 = fileURLToPath(new URL("../../../../..", import.meta.url));
const loaderV1 = createImportProjectModuleLoaderV1(repositoryRootV1);
const validatedProjectV1 = defineSillymakerProjectV1(projectTavernConfigV1);

describe("project commands against the real repository config", () => {
  it("resolves both maintained applications through one config mechanism", async () => {
    expect(listStoryApplicationIdsV1(validatedProjectV1)).toEqual(["poc-web", "e2e"]);

    for (const applicationId of listStoryApplicationIdsV1(validatedProjectV1)) {
      const report = await checkStoryApplicationV1(validatedProjectV1, applicationId, loaderV1);
      expect(report).toEqual({ applicationId, ok: true, diagnostics: [] });
    }
  });

  it("inspects the PoC application without importing it statically", async () => {
    const result = await inspectStoryApplicationV1(validatedProjectV1, "poc-web", loaderV1);
    expect(result.kind).toBe("inspected");
    if (result.kind !== "inspected") return;
    expect(result.report.story.id).toBe("week.poc_001");
    expect(result.report.assets.assets).toBeGreaterThan(0);
    expect(JSON.parse(JSON.stringify(result.report))).toEqual(result.report);
  });

  it("simulates the Engine Lab deterministically through the Agent port", async () => {
    const first = await simulateStoryApplicationV1(validatedProjectV1, "e2e", loaderV1);
    const second = await simulateStoryApplicationV1(validatedProjectV1, "e2e", loaderV1);

    expect(first.steps).toHaveLength(4);
    expect(first.steps.map((step) => (step.result as { kind: string }).kind)).toEqual([
      "committed",
      "committed",
      "committed",
      "committed",
    ]);
    expect(first.finalStateDigest).toMatch(/^sha256:/u);
    expect(second.finalStateDigest).toBe(first.finalStateDigest);
    expect(JSON.stringify(second.steps)).toBe(JSON.stringify(first.steps));
  });

  it("answers simulate for the PoC with a structured diagnostic until F3 migrates it", async () => {
    await expect(
      simulateStoryApplicationV1(validatedProjectV1, "poc-web", loaderV1),
    ).rejects.toSatisfy(
      (error: unknown) =>
        error instanceof AuthoringDiagnosticErrorV1 &&
        error.diagnostics[0]?.code === "project.simulation_unconfigured",
    );
  });
});
