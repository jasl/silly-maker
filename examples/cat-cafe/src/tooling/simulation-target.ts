// SPDX-License-Identifier: MIT
import { createInProcessAgentGamePortV1 } from "@sillymaker/base/runtime";

import { createCatcafeApplicationInstanceV1 } from "../application/core-application.ts";

function resolveStepV1(occurrence: number, resolution: unknown) {
  return Object.freeze({
    kind: "resolve" as const,
    expectedOccurrenceId: `interaction-occurrence.${String(occurrence)}`,
    resolution,
  });
}

const openingV1 = Object.freeze([
  Object.freeze({ kind: "invoke" as const, actionId: "cc.begin_story" as const }),
  resolveStepV1(1, { kind: "advance" }),
  resolveStepV1(2, { kind: "advance" }),
  resolveStepV1(3, { kind: "advance" }),
  resolveStepV1(4, { kind: "choose", choiceId: "choice.catcafe.name-xiaoyu" }),
  resolveStepV1(5, { kind: "advance" }),
  resolveStepV1(6, { kind: "advance" }),
]);

/**
 * `deno task story simulate example-cat-cafe --scenario <name>`：
 * opening = the opening narrative; first-day = opening + one full first-day schedule (activities/petting/slot advancement).
 */
const scenariosV1 = Object.freeze({
  opening: openingV1,
  "first-day": Object.freeze([
    ...openingV1,
    Object.freeze({ kind: "activity" as const, activityId: "activity.play" }),
    Object.freeze({ kind: "pet" as const, zone: "head" }),
    Object.freeze({ kind: "invoke" as const, actionId: "cc.advance_slot" as const }),
    Object.freeze({ kind: "activity" as const, activityId: "activity.business" }),
    Object.freeze({ kind: "invoke" as const, actionId: "cc.advance_slot" as const }),
    Object.freeze({ kind: "activity" as const, activityId: "activity.nap" }),
    Object.freeze({ kind: "invoke" as const, actionId: "cc.advance_slot" as const }),
    Object.freeze({ kind: "invoke" as const, actionId: "cc.advance_slot" as const }),
  ]),
});

export async function createCatcafeSimulationTargetV1(options: { readonly seed?: number } = {}) {
  const application = await createCatcafeApplicationInstanceV1(
    options.seed === undefined ? {} : { seeds: [options.seed] },
  );
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
    defaultScript: scenariosV1.opening,
    scenarios: scenariosV1,
  });
}
