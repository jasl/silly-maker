// SPDX-License-Identifier: MIT
import { createInProcessAgentGamePortV1 } from "@sillymaker/base/runtime";

import { createTemplateApplicationInstanceV1 } from "../application/core-application.ts";

/**
 * Named scenarios for `deno task story simulate template --scenario <name>`.
 * Steps are occurrence-free intents: a `resolve` without an
 * `expectedOccurrenceId` targets whatever interaction is currently pending
 * (read from the live publication at dispatch time, exactly like a real
 * player or agent), so inserting a line into the script never renumbers a
 * scenario. Steps may still pin an explicit `expectedOccurrenceId` to
 * exercise the stale-resolution fence.
 */
function advanceV1() {
  return Object.freeze({
    kind: "resolve" as const,
    resolution: Object.freeze({ kind: "advance" as const }),
  });
}

function chooseV1(choiceId: string) {
  return Object.freeze({
    kind: "resolve" as const,
    resolution: Object.freeze({ kind: "choose" as const, choiceId }),
  });
}

const scenariosV1 = Object.freeze({
  /** Take the courtyard look and reach the warm ending. */
  opening: Object.freeze([
    Object.freeze({ kind: "invoke" as const, actionId: "template.begin_story" as const }),
    advanceV1(),
    chooseV1("choice.template.look"),
    advanceV1(),
    advanceV1(),
  ]),
  /** Go inside instead and reach the plain ending. */
  inside: Object.freeze([
    Object.freeze({ kind: "invoke" as const, actionId: "template.begin_story" as const }),
    advanceV1(),
    chooseV1("choice.template.inside"),
    advanceV1(),
    advanceV1(),
  ]),
});

/** Fills the current pending occurrence into occurrence-free resolve steps. */
function withCurrentOccurrenceV1<
  TAgent extends {
    observe(): unknown;
    dispatch(invocation: unknown): Promise<unknown>;
  },
>(agent: TAgent): TAgent {
  return Object.freeze({
    ...agent,
    dispatch(invocation: unknown): Promise<unknown> {
      if (
        invocation !== null && typeof invocation === "object" &&
        (invocation as { readonly kind?: unknown }).kind === "resolve" &&
        (invocation as { readonly expectedOccurrenceId?: unknown }).expectedOccurrenceId ===
          undefined
      ) {
        const publication = agent.observe() as {
          readonly narrative?: { readonly pending?: { readonly occurrenceId?: unknown } | null };
        };
        const occurrenceId = publication.narrative?.pending?.occurrenceId;
        if (typeof occurrenceId === "string") {
          return agent.dispatch({ ...invocation, expectedOccurrenceId: occurrenceId });
        }
      }
      return agent.dispatch(invocation);
    },
  });
}

/**
 * The simulation target for `deno task story simulate template`: a fresh
 * fixed-seed application instance whose player-safe Agent port drives the
 * run — the same surface real agents and the browser UI use.
 */
export async function createTemplateSimulationTargetV1(options: { readonly seed?: number } = {}) {
  const application = await createTemplateApplicationInstanceV1(
    options.seed === undefined ? {} : { seeds: [options.seed] },
  );
  const agent = withCurrentOccurrenceV1(createInProcessAgentGamePortV1({
    identity: Object.freeze({
      storyId: application.storyId,
      storyRevision: application.storyRevision,
    }),
    semantic: application.semantic,
  }));
  return Object.freeze({
    agent,
    stateDigest: () => application.admin.stateDigest(),
    dispose: () => application.dispose(),
    defaultScript: scenariosV1.opening,
    scenarios: scenariosV1,
  });
}
