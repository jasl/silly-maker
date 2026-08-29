// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";

import { digestBytes, resolveGamePackageV1 } from "@sillymaker/base";
import { SillyModErrorV1 } from "@sillymaker/composition/mod";

import type {
  LabModConformanceRuntimeV1,
  LabScoreRulePlanV1,
} from "../application/mod-conformance.ts";
import { createLabModConformanceRuntimeV1 } from "../application/mod-conformance.ts";
import { labStoryEntryV1 } from "../story.ts";

function requireScorePlanV1(runtime: LabModConformanceRuntimeV1): LabScoreRulePlanV1 {
  const point = runtime.compiledPoints.find(({ pointId }) => pointId === "lab.score-rules");
  if (point === undefined) throw new TypeError("Lab score plan unavailable");
  return point.value;
}

function resolveLabSimulationDigestV1(
  activeIdentity: LabModConformanceRuntimeV1["activeIdentity"],
) {
  const sourceDigest = digestBytes(new TextEncoder().encode("Engine Lab Mod conformance source"));
  const activeModDigest = digestBytes(
    new TextEncoder().encode(JSON.stringify(activeIdentity)),
  );
  const activeModRecord = {
    path: "e2e/generated/active-mod-identity.json",
    sha256: activeModDigest,
    facet: "story_simulation" as const,
  };
  const result = resolveGamePackageV1(labStoryEntryV1, [], {
    engineVersion: "SillyMaker Engine Lab Mod conformance",
    engine: [{
      path: "engine/packages/base/src/index.ts",
      sha256: sourceDigest,
      facet: "engine" as const,
    }],
    storySimulation: [{
      path: "e2e/src/simulation-definition.ts",
      sha256: sourceDigest,
      facet: "story_simulation" as const,
    }, activeModRecord],
    storyPresentation: [{
      path: "e2e/src/presentation.ts",
      sha256: sourceDigest,
      facet: "story_presentation" as const,
    }],
    application: [],
  });
  if (result.kind !== "resolved") {
    throw new TypeError(`Engine Lab resolution failed: ${result.failure.code}`);
  }
  return {
    activeModRecord,
    simulationDigest: result.resolved.provenance.resolved.simulationDigest,
  };
}

describe("Engine Lab application-local Mod conformance", () => {
  it("cold-compiles base, data, and code rules and projects active identity into BuildIdentity", async () => {
    const lifecycleEvents: string[] = [];
    const runtime = await createLabModConformanceRuntimeV1({
      applicationGeneration: "application.1",
      lifecycleEvents,
    });
    const plan = requireScorePlanV1(runtime);

    expect(runtime.activeIdentity).toEqual([
      { modId: "mod.e2e.score-data", version: "1.0.0" },
      { modId: "mod.e2e.score-code", version: "1.0.0" },
    ]);
    expect(plan.ruleIds).toEqual([
      "product.base-score",
      "mod-rule.data-bonus",
      "mod-rule.code-bonus",
    ]);
    expect(plan.apply(10)).toBe(16);
    expect(lifecycleEvents).toEqual(["code:load", "code:install"]);

    const activeBuild = resolveLabSimulationDigestV1(runtime.activeIdentity);
    const baseBuild = resolveLabSimulationDigestV1([]);
    expect(activeBuild.activeModRecord.facet).toBe("story_simulation");
    expect(activeBuild.simulationDigest).not.toBe(baseBuild.simulationDigest);

    expect(runtime).not.toHaveProperty("activate");
    expect(runtime).not.toHaveProperty("install");
    expect(runtime).not.toHaveProperty("restart");
    await runtime.dispose();
    expect(lifecycleEvents).toEqual(["code:load", "code:install", "code:cleanup"]);
  });

  it("leaves the predecessor usable when a successor candidate rolls back", async () => {
    const predecessorEvents: string[] = [];
    const predecessor = await createLabModConformanceRuntimeV1({
      applicationGeneration: "application.1",
      lifecycleEvents: predecessorEvents,
    });
    const predecessorPlan = requireScorePlanV1(predecessor);
    const candidateEvents: string[] = [];

    const error = await createLabModConformanceRuntimeV1({
      applicationGeneration: "application.2",
      lifecycleEvents: candidateEvents,
      failCodeSetup: true,
    }).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(SillyModErrorV1);
    expect((error as SillyModErrorV1).code).toBe("silly_mod.setup_failed");
    expect(candidateEvents).toEqual(["code:load", "code:install"]);
    expect(predecessorPlan.apply(20)).toBe(26);
    expect(predecessorEvents).toEqual(["code:load", "code:install"]);

    await predecessor.dispose();
    expect(predecessorEvents).toEqual(["code:load", "code:install", "code:cleanup"]);
  });
});
