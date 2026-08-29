// SPDX-License-Identifier: MIT
import {
  createSillyModRuntimeV1,
  createSillyModSelectionControllerV1,
  defineSillyModMetadataV1,
} from "@sillymaker/composition/mod";
import type { SillyModExtensionPointV1, SillyModSourceV1 } from "@sillymaker/composition/mod";

interface ConsumerContributionV1 {
  readonly increment: number;
}

const metadataV1 = defineSillyModMetadataV1({
  contractRevision: 1,
  modId: "consumer.score",
  version: "1.0.0",
  engineApi: { composition: "^1.0.0" },
  dependencies: { requires: [], optional: [], conflicts: [] },
  facets: ["base"],
});

const sourceV1: SillyModSourceV1<ConsumerContributionV1> = {
  kind: "code",
  metadata: metadataV1,
  load: () => ({
    contributions: [{
      contributionId: "score.increment",
      pointId: "score.rules",
      contributionKind: "score-rule",
      payload: { increment: 2 },
    }],
    setup: async () => ({ dispose: async () => undefined }),
  }),
};

const pointV1: SillyModExtensionPointV1<ConsumerContributionV1, number> = {
  pointId: "score.rules",
  contributionKind: "score-rule",
  collisionPolicy: "reject",
  compile: ({ contributions }) =>
    contributions.reduce((sum, contribution) => sum + contribution.payload.increment, 0),
};

export const runtimeV1 = createSillyModRuntimeV1({
  applicationGeneration: "consumer.1",
  engineApi: { composition: "1.0.0" },
  catalog: [sourceV1],
  activeModIds: [metadataV1.modId],
  extensionPoints: [pointV1],
});

export const controllerV1 = createSillyModSelectionControllerV1({
  applicationGeneration: "consumer.1",
  engineApi: { composition: "1.0.0" },
  extensionPoints: [pointV1],
});

const contextSetupSourceV1: SillyModSourceV1<ConsumerContributionV1> = {
  kind: "code",
  metadata: metadataV1,
  load: () => ({
    contributions: [],
    // @ts-expect-error Trusted Mod setup intentionally receives no Context or service locator.
    setup: (_context: unknown) => {},
  }),
};

const invalidSourceV1: SillyModSourceV1<ConsumerContributionV1> = {
  kind: "code",
  metadata: metadataV1,
  // @ts-expect-error A setup result is void or an explicit async-disposable resource handle.
  load: () => ({ contributions: [], setup: () => "cleanup" }),
};

export type InvalidSourceV1 = typeof invalidSourceV1;
export type ContextSetupSourceV1 = typeof contextSetupSourceV1;
