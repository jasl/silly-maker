// SPDX-License-Identifier: MIT
import { createInProcessAgentGamePortV1 } from "@sillymaker/base/runtime";

import { createLabApplicationInstanceV1 } from "../application/core-application.js";

const defaultScriptV1 = Object.freeze([
  Object.freeze({ kind: "invoke" as const, actionId: "lab.collect_sample" as const }),
  Object.freeze({ kind: "invoke" as const, actionId: "lab.collect_sample" as const }),
  Object.freeze({ kind: "invoke" as const, actionId: "lab.begin_procedure" as const }),
  Object.freeze({ kind: "invoke" as const, actionId: "lab.run_experiment" as const }),
]);

/**
 * The Engine Lab simulation target for `pnpm story simulate e2e`: a fresh
 * fixed-seed core application instance whose player-safe Agent port drives
 * the whole run, so scripted simulation shares the exact surface real agents
 * use.
 */
export async function createLabSimulationTargetV1() {
  const application = await createLabApplicationInstanceV1();
  const agent = createInProcessAgentGamePortV1({
    identity: Object.freeze({
      storyId: application.storyId,
      storyRevision: application.storyRevision,
    }),
    semantic: application.semantic,
  });
  return Object.freeze({
    agent,
    stateDigest: () => application.admin.stateDigest(),
    dispose: () => application.dispose(),
    defaultScript: defaultScriptV1,
  });
}
