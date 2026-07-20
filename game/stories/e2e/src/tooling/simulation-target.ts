// SPDX-License-Identifier: MIT
import { createGameHarnessV1 } from "@sillymaker/base/testkit";

import { labSemanticAdapterV1 } from "../application/semantic.js";
import { labStoryEntryV1 } from "../story.js";

const simulationSeedV1 = 20260720;

const defaultScriptV1 = Object.freeze([
  Object.freeze({ kind: "invoke" as const, actionId: "lab.collect_sample" as const }),
  Object.freeze({ kind: "invoke" as const, actionId: "lab.collect_sample" as const }),
  Object.freeze({ kind: "invoke" as const, actionId: "lab.begin_procedure" as const }),
  Object.freeze({ kind: "invoke" as const, actionId: "lab.run_experiment" as const }),
]);

/**
 * The Engine Lab simulation target for `pnpm story simulate e2e`: a fresh
 * fixed-seed harness whose player-safe Agent port drives the whole run, so
 * scripted simulation shares the exact surface real agents use.
 */
export async function createLabSimulationTargetV1() {
  const harness = await createGameHarnessV1({
    entry: labStoryEntryV1,
    semantic: labSemanticAdapterV1,
    seed: simulationSeedV1,
  });
  return Object.freeze({
    agent: harness.agent,
    stateDigest: () => harness.stateDigest(),
    dispose: () => harness.dispose(),
    defaultScript: defaultScriptV1,
  });
}
