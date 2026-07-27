// SPDX-License-Identifier: MIT
import { createInProcessAgentGamePortV1 } from "@sillymaker/base/runtime";

import { createTemplateApplicationInstanceV1 } from "../application/core-application.ts";

function resolveStepV1(occurrence: number, resolution: unknown) {
  return Object.freeze({
    kind: "resolve" as const,
    expectedOccurrenceId: `interaction-occurrence.${String(occurrence)}`,
    resolution,
  });
}

/**
 * Named scenarios for `pnpm story simulate template --scenario <name>`.
 * Occurrence numbers count interaction boundaries from the start of the
 * session; inserting a boundary shifts every later number.
 */
const scenariosV1 = Object.freeze({
  /** Take the courtyard look and reach the warm ending. */
  opening: Object.freeze([
    Object.freeze({ kind: "invoke" as const, actionId: "template.begin_story" as const }),
    resolveStepV1(1, { kind: "advance" }),
    resolveStepV1(2, { kind: "choose", choiceId: "choice.template.look" }),
    resolveStepV1(3, { kind: "advance" }),
    resolveStepV1(4, { kind: "advance" }),
  ]),
  /** Go inside instead and reach the plain ending. */
  inside: Object.freeze([
    Object.freeze({ kind: "invoke" as const, actionId: "template.begin_story" as const }),
    resolveStepV1(1, { kind: "advance" }),
    resolveStepV1(2, { kind: "choose", choiceId: "choice.template.inside" }),
    resolveStepV1(3, { kind: "advance" }),
    resolveStepV1(4, { kind: "advance" }),
  ]),
});

/**
 * The simulation target for `pnpm story simulate template`: a fresh
 * fixed-seed application instance whose player-safe Agent port drives the
 * run — the same surface real agents and the browser UI use.
 */
export async function createTemplateSimulationTargetV1(options: { readonly seed?: number } = {}) {
  const application = await createTemplateApplicationInstanceV1(
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
