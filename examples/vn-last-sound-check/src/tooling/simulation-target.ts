// SPDX-License-Identifier: MIT
import { createInProcessAgentGamePortV1 } from "@sillymaker/base/runtime";

import { createVnLastSoundCheckApplicationInstanceV1 } from "../application/core-application.ts";

/**
 * Complete route scenarios for
 * `deno task app simulate example-vn-last-sound-check --scenario <name>`.
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

function timeTickV1(elapsedMs: number) {
  return ({
    kind: "time" as const,
    tick: { elapsedMs },
  });
}

function advancesV1(count: number) {
  return Array.from({ length: count }, () => advanceV1());
}

function routeScenarioV1(choiceId: string) {
  return [
    { kind: "invoke" as const, actionId: "vn-last-sound-check.begin_story" as const },
    // 51 shared Say pages lead to the single material choice.
    ...advancesV1(51),
    chooseV1(choiceId),
    // Eleven route-preparation pages lead to the authoritative carrier lock.
    ...advancesV1(11),
    timeTickV1(1_200),
    // Sixteen rooftop pages plus the route-specific ending complete the run.
    ...advancesV1(17),
  ];
}

const scenariosV1 = {
  "archive-voice": routeScenarioV1("choice.vn-last-sound-check.archive-voice"),
  "present-voice": routeScenarioV1("choice.vn-last-sound-check.present-voice"),
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
 * The simulation target for `deno task app simulate example-vn-last-sound-check`: a fresh
 * fixed-seed application instance whose player-safe Agent port drives the
 * run — the same surface real agents and the browser UI use.
 */
export async function createVnLastSoundCheckSimulationTargetV1(
  options: { readonly seed?: number } = {},
) {
  const application = await createVnLastSoundCheckApplicationInstanceV1(
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
    defaultScript: scenariosV1["archive-voice"],
    scenarios: scenariosV1,
  });
}
