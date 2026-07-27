// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { resolveGamePackageV1 } from "@sillymaker/base";
import type {
  DeepReadonly,
  RuntimeSessionStatusV1,
  SemanticGamePortSourceV1,
  SemanticGamePortV1,
} from "@sillymaker/base";
import { createSemanticGamePortV1 } from "@sillymaker/base/runtime";
import type { CoreSemanticAdapterV1 } from "@sillymaker/base/runtime";
import type { GameSessionRuntimeControlV1, GameSessionV1 } from "@sillymaker/base/runtime";

import type {
  NarrativeProjectionV1,
  PocGameSimulationTypesV1,
  PocGameQueriesV1,
  PocGameViewV1,
} from "../gameplay/contracts/types.js";
import {
  commandForPocSemanticInvocationV1,
  createPocSemanticActionCatalogV1,
  parsePocSemanticInvocationV1,
  previewPocSemanticInvocationV1,
  projectPocSemanticActionResultV1,
} from "../presentation/semantic-actions.js";
import type {
  PocSemanticActionDescriptorV1,
  PocSemanticActionResultV1,
  PocSemanticInvocationV1,
  PocSemanticPreviewV1,
} from "../presentation/semantic-actions.js";
import type { PocGameSnapshotV1 } from "../gameplay/contracts/types.js";
import type { PocGameSimulationV1 } from "../gameplay/game-simulation.js";
import type { PocResolvedGameV1 } from "../story-definition.js";
import { pocStoryEntryV1 } from "../story-definition.js";

/**
 * The Tavern PoC semantic adapter for the core application composer:
 * queries, projections, the action catalog, previews, and the
 * invocation-to-command mapping. The composer owns the Session, semantic
 * port, persistence, and lifecycle — this module owns only Story meaning.
 *
 * Queries need the materialized simulation program, so the adapter keeps a
 * module-local resolved copy (the resolver guarantees determinism, and the
 * build identity below only feeds provenance this copy never exports).
 */

/** The player-safe semantic port shape every PoC UI renderer consumes. */
export type PocSemanticGamePortV1 = SemanticGamePortV1<
  PocGameViewV1,
  NarrativeProjectionV1 | null,
  PocSemanticActionDescriptorV1,
  PocSemanticInvocationV1,
  PocSemanticPreviewV1,
  PocSemanticActionResultV1,
  RuntimeSessionStatusV1
>;

const semanticIdentityRecordV1 = Object.freeze([]);
const semanticBuildIdentityV1: Parameters<typeof resolveGamePackageV1>[2] = Object.freeze({
  engineVersion: "semantic-adapter-local",
  engine: semanticIdentityRecordV1,
  storySimulation: semanticIdentityRecordV1,
  storyPresentation: semanticIdentityRecordV1,
  application: semanticIdentityRecordV1,
});

function resolveSemanticSimulationV1(): PocResolvedGameV1["gameSimulation"] {
  const result = resolveGamePackageV1(pocStoryEntryV1, [], semanticBuildIdentityV1);
  if (result.kind === "failed") {
    throw new TypeError(`poc.semantic_adapter_resolution_failed:${result.failure.code}`);
  }
  return (result.resolved as PocResolvedGameV1).gameSimulation;
}

const pocSimulationForSemanticV1 = resolveSemanticSimulationV1();

export const pocSemanticAdapterV1: CoreSemanticAdapterV1<
  PocGameSimulationTypesV1,
  PocGameQueriesV1,
  PocGameViewV1,
  NarrativeProjectionV1 | null,
  PocSemanticActionDescriptorV1,
  PocSemanticInvocationV1,
  PocSemanticPreviewV1,
  PocSemanticActionResultV1
> = {
  createQueries: (state) => pocSimulationForSemanticV1.createQueries(state as never),
  projectGameView: (queries) => pocSimulationForSemanticV1.projectGameView(queries),
  projectNarrativeView: (queries) => queries.getNarrativeProjection(),
  actions: (queries) => createPocSemanticActionCatalogV1(queries),
  preview: (queries, invocation) => previewPocSemanticInvocationV1(queries, invocation),
  parseInvocation: (value) => parsePocSemanticInvocationV1(value),
  commandForInvocation: (invocation) => commandForPocSemanticInvocationV1(invocation),
  projectDispatchResult: (result) => projectPocSemanticActionResultV1(result),
  invalidInvocationResult: () =>
    Object.freeze({ kind: "not_executed" as const, code: "validation_failed" as const }),
};

/**
 * Builds a live PoC semantic port over an existing session — the headless
 * harness and jsdom fixtures compose this directly; the browser application
 * receives the same projection through the core composer instead.
 */
export function createPocSemanticGamePortV1(input: {
  readonly session: GameSessionV1<PocGameSimulationTypesV1>;
  readonly runtimeControl: GameSessionRuntimeControlV1<PocGameSnapshotV1>;
  readonly gameSimulation: PocGameSimulationV1;
  reportSubscriberFailure(error: unknown): void;
}): PocSemanticGamePortV1 {
  const { gameSimulation, runtimeControl, session } = input;
  const source: SemanticGamePortSourceV1<
    PocGameSimulationTypesV1["state"],
    RuntimeSessionStatusV1
  > = Object.freeze({
    getCurrentState: () => session.getCurrentSnapshot().state,
    getAuthoritativeRevisionToken: () => session.getCurrentSnapshot(),
    getStatus: () => session.getStatus(),
    subscribe: (listener: () => void) => session.subscribe(listener),
    reportSubscriberFailure: (error: unknown) => input.reportSubscriberFailure(error),
    readStateAtQueueFront: <TResult>(
      reader: (state: DeepReadonly<PocGameSimulationTypesV1["state"]>) => TResult,
    ) => runtimeControl.readAtQueueFront((snapshot) => reader(snapshot.state)),
  });

  return createSemanticGamePortV1({
    source,
    createQueries: (state) => gameSimulation.createQueries(state),
    projectGameView: (queries) => gameSimulation.projectGameView(queries),
    projectNarrativeView: (queries) => queries.getNarrativeProjection(),
    actions: (queries) => createPocSemanticActionCatalogV1(queries),
    preview: (queries, invocation) => previewPocSemanticInvocationV1(queries, invocation),
    dispatch: async (invocationValue) => {
      let invocation: PocSemanticInvocationV1;
      try {
        invocation = parsePocSemanticInvocationV1(invocationValue);
      } catch {
        return Object.freeze({
          kind: "not_executed" as const,
          code: "validation_failed" as const,
        });
      }
      return projectPocSemanticActionResultV1(
        await session.dispatch(commandForPocSemanticInvocationV1(invocation)),
      );
    },
  });
}
