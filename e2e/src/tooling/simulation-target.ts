// SPDX-License-Identifier: MIT
import { createInProcessAgentGamePortV1 } from "@sillymaker/base/runtime";

import { createLabApplicationInstanceV1 } from "../application/core-application.ts";

const defaultScriptV1 = [
  { kind: "invoke" as const, actionId: "lab.collect_sample" as const },
  { kind: "invoke" as const, actionId: "lab.collect_sample" as const },
  { kind: "invoke" as const, actionId: "lab.begin_procedure" as const },
  { kind: "invoke" as const, actionId: "lab.run_experiment" as const },
];

/** Named scenarios selectable with `deno task app simulate e2e --scenario …`. */
const scenariosV1 = {
  /** The opening beat: gather samples and start the procedure. */
  opening: defaultScriptV1,
  /** The calibration narrative driven purely through occurrence fencing. */
  calibration: [
    { kind: "invoke" as const, actionId: "lab.begin_calibration" as const },
    resolveStepV1(1, { kind: "advance" }),
    resolveStepV1(2, { kind: "advance" }),
    resolveStepV1(3, { kind: "choose", choiceId: "choice.e2e.cal.basic" }),
    resolveStepV1(4, {
      kind: "barrier_completed",
      transitionId: "transition.e2e.bg-crossfade",
    }),
    {
      kind: "time" as const,
      tick: {
        elapsedMs: 400,
        expectedHoldOccurrenceId: "interaction-occurrence.5",
      },
    },
    resolveStepV1(6, { kind: "custom", payload: { value: 2 } }),
    resolveStepV1(7, { kind: "advance" }),
  ],
};

function resolveStepV1(occurrence: number, resolution: unknown) {
  return ({
    kind: "resolve" as const,
    expectedOccurrenceId: `interaction-occurrence.${String(occurrence)}`,
    resolution,
  });
}

/**
 * The Engine Lab simulation target for `deno task app simulate e2e`: a fresh
 * fixed-seed core application instance whose player-safe Agent port drives
 * the whole run, so scripted simulation shares the exact surface real agents
 * use. An explicit `--seed` overrides the deterministic default.
 */
export async function createLabSimulationTargetV1(options: { readonly seed?: number } = {}) {
  const application = await createLabApplicationInstanceV1(
    options.seed === undefined ? {} : { seeds: [options.seed] },
  );
  const agent = createInProcessAgentGamePortV1({
    identity: {
      storyId: application.storyId,
      storyRevision: application.storyRevision,
    },
    semantic: application.semantic,
  });
  return ({
    agent,
    stateDigest: () => application.admin.stateDigest(),
    dispose: () => application.dispose(),
    defaultScript: defaultScriptV1,
    scenarios: scenariosV1,
  });
}
