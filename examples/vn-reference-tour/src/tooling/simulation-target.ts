// SPDX-License-Identifier: MIT
import { createInProcessAgentGamePortV1 } from "@sillymaker/base/runtime";

import { createVnReferenceTourApplicationInstanceV1 } from "../application/core-application.ts";

/**
 * M0 scaffold scenario for
 * `deno task app simulate example-vn-reference-tour --scenario scaffold`.
 * Steps are occurrence-free intents: a `resolve` without an
 * `expectedOccurrenceId` targets whatever interaction is currently pending
 * (read from the live publication at dispatch time, exactly like a real
 * player or agent), so inserting a line into the script never renumbers a
 * scenario. Steps may still pin an explicit `expectedOccurrenceId` to
 * exercise the stale-resolution fence.
 */
function advanceV1() {
  return ({
    kind: "resolve" as const,
    resolution: { kind: "advance" as const },
  });
}

function chooseV1(choiceId: string) {
  return ({
    kind: "resolve" as const,
    resolution: { kind: "choose" as const, choiceId },
  });
}

const scenariosV1 = {
  /** Temporary structural smoke; M1 replaces it with both complete routes. */
  scaffold: [
    { kind: "invoke" as const, actionId: "vn-reference-tour.begin_story" as const },
    advanceV1(),
    chooseV1("choice.vn-reference-tour.inside"),
    advanceV1(),
    advanceV1(),
  ],
};

/**
 * Fills the current pending occurrence into occurrence-free resolve steps
 * and hold-fence-free time steps, exactly like a live Host reads the
 * publication before dispatching.
 */
function withCurrentOccurrenceV1<
  TAgent extends {
    observe(): unknown;
    dispatch(invocation: unknown): Promise<unknown>;
  },
>(agent: TAgent): TAgent {
  const currentOccurrenceId = (): string | undefined => {
    const publication = agent.observe() as {
      readonly narrative?: { readonly pending?: { readonly occurrenceId?: unknown } | null };
    };
    const occurrenceId = publication.narrative?.pending?.occurrenceId;
    return typeof occurrenceId === "string" ? occurrenceId : undefined;
  };
  return ({
    ...agent,
    dispatch(invocation: unknown): Promise<unknown> {
      if (
        invocation !== null && typeof invocation === "object" &&
        (invocation as { readonly kind?: unknown }).kind === "resolve" &&
        (invocation as { readonly expectedOccurrenceId?: unknown }).expectedOccurrenceId ===
          undefined
      ) {
        const occurrenceId = currentOccurrenceId();
        if (occurrenceId !== undefined) {
          return agent.dispatch({ ...invocation, expectedOccurrenceId: occurrenceId });
        }
      }
      if (
        invocation !== null && typeof invocation === "object" &&
        (invocation as { readonly kind?: unknown }).kind === "time"
      ) {
        const tick = (invocation as { readonly tick?: unknown }).tick;
        if (
          tick !== null && typeof tick === "object" &&
          (tick as { readonly expectedHoldOccurrenceId?: unknown }).expectedHoldOccurrenceId ===
            undefined
        ) {
          const occurrenceId = currentOccurrenceId();
          if (occurrenceId !== undefined) {
            return agent.dispatch({
              ...invocation,
              tick: { ...tick, expectedHoldOccurrenceId: occurrenceId },
            });
          }
        }
      }
      return agent.dispatch(invocation);
    },
  });
}

/**
 * The simulation target for `deno task app simulate example-vn-reference-tour`: a fresh
 * fixed-seed application instance whose player-safe Agent port drives the
 * run — the same surface real agents and the browser UI use.
 */
export async function createVnReferenceTourSimulationTargetV1(
  options: { readonly seed?: number } = {},
) {
  const application = await createVnReferenceTourApplicationInstanceV1(
    options.seed === undefined ? {} : { seeds: [options.seed] },
  );
  const agent = withCurrentOccurrenceV1(createInProcessAgentGamePortV1({
    identity: {
      storyId: application.storyId,
      storyRevision: application.storyRevision,
    },
    semantic: application.semantic,
  }));
  return ({
    agent,
    stateDigest: () => application.admin.stateDigest(),
    dispose: () => application.dispose(),
    defaultScript: scenariosV1.scaffold,
    scenarios: scenariosV1,
  });
}
