// SPDX-License-Identifier: MIT
import { createInProcessAgentGamePortV1 } from "@sillymaker/base/runtime";

import { createBookshopApplicationInstanceV1 } from "../application/core-application.ts";

function resolveStepV1(occurrence: number, resolution: unknown) {
  return Object.freeze({
    kind: "resolve" as const,
    expectedOccurrenceId: `interaction-occurrence.${String(occurrence)}`,
    resolution,
  });
}

/**
 * Named scenarios for `pnpm story simulate bookshop --scenario <name>`.
 * Occurrence numbers count interaction boundaries from the start of the
 * session; inserting a boundary shifts every later number.
 *
 * Shared prefix through the first choice (occurrence 5):
 *   1 opening narration · 2 老周 · 3 阿澄 · 4 老周 reply · 5 first choice
 * Then each route: two branch lines · yard line · second choice · aftermath · ending.
 */
const scenariosV1 = Object.freeze({
  /** Help find the book (sets flag), earn a coin, and buy it. */
  helped: Object.freeze([
    Object.freeze({ kind: "invoke" as const, actionId: "bookshop.begin_story" as const }),
    resolveStepV1(1, { kind: "advance" }),
    resolveStepV1(2, { kind: "advance" }),
    resolveStepV1(3, { kind: "advance" }),
    resolveStepV1(4, { kind: "advance" }),
    resolveStepV1(5, { kind: "choose", choiceId: "choice.bookshop.help" }),
    resolveStepV1(6, { kind: "advance" }),
    resolveStepV1(7, { kind: "advance" }),
    resolveStepV1(8, { kind: "advance" }),
    Object.freeze({ kind: "invoke" as const, actionId: "bookshop.earn_coin" as const }),
    resolveStepV1(9, { kind: "choose", choiceId: "choice.bookshop.buy" }),
    resolveStepV1(10, { kind: "advance" }),
    resolveStepV1(11, { kind: "advance" }),
  ]),
  /** Usher them out (no flag) and leave the book on the porch. */
  ushered: Object.freeze([
    Object.freeze({ kind: "invoke" as const, actionId: "bookshop.begin_story" as const }),
    resolveStepV1(1, { kind: "advance" }),
    resolveStepV1(2, { kind: "advance" }),
    resolveStepV1(3, { kind: "advance" }),
    resolveStepV1(4, { kind: "advance" }),
    resolveStepV1(5, { kind: "choose", choiceId: "choice.bookshop.usher" }),
    resolveStepV1(6, { kind: "advance" }),
    resolveStepV1(7, { kind: "advance" }),
    resolveStepV1(8, { kind: "advance" }),
    resolveStepV1(9, { kind: "choose", choiceId: "choice.bookshop.leave-book" }),
    resolveStepV1(10, { kind: "advance" }),
    resolveStepV1(11, { kind: "advance" }),
  ]),
});

/**
 * The simulation target for `pnpm story simulate bookshop`: a fresh
 * fixed-seed application instance whose player-safe Agent port drives the
 * run — the same surface real agents and the browser UI use.
 */
export async function createBookshopSimulationTargetV1(options: { readonly seed?: number } = {}) {
  const application = await createBookshopApplicationInstanceV1(
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
    defaultScript: scenariosV1.helped,
    scenarios: scenariosV1,
  });
}
