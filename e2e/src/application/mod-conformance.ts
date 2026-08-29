// SPDX-License-Identifier: MIT
import {
  createSillyModRuntimeV1,
  defineSillyModMetadataV1,
  type SillyModExtensionPointV1,
  type SillyModRuntimeV1,
  type SillyModSourceV1,
} from "@sillymaker/composition/mod";

export interface LabScoreRuleContributionV1 {
  readonly delta: number;
}

export interface LabScoreRulePlanV1 {
  readonly ruleIds: readonly string[];
  apply(score: number): number;
}

export type LabModConformanceRuntimeV1 = SillyModRuntimeV1<LabScoreRulePlanV1>;

const labScoreRulePointIdV1 = "lab.score-rules";
const labScoreRuleKindV1 = "lab.score-rule";
const labBaseProductRuleV1 = {
  ruleId: "product.base-score",
  delta: 1,
};

const labScoreRulePointV1: SillyModExtensionPointV1<
  LabScoreRuleContributionV1,
  LabScoreRulePlanV1
> = {
  pointId: labScoreRulePointIdV1,
  contributionKind: labScoreRuleKindV1,
  collisionPolicy: "reject",
  compile({ contributions }) {
    const rules = [
      labBaseProductRuleV1,
      ...contributions.map(({ contributionId, payload }) => ({
        ruleId: contributionId,
        delta: payload.delta,
      })),
    ];
    return {
      ruleIds: rules.map(({ ruleId }) => ruleId),
      apply: (score) => rules.reduce((result, { delta }) => result + delta, score),
    };
  },
};

export function createLabModConformanceRuntimeV1(input: {
  readonly applicationGeneration: string;
  readonly lifecycleEvents: string[];
  readonly failCodeSetup?: boolean;
}): Promise<LabModConformanceRuntimeV1> {
  const dataMetadata = defineSillyModMetadataV1({
    contractRevision: 1,
    modId: "mod.e2e.score-data",
    version: "1.0.0",
    engineApi: { composition: "^1.0.0" },
    dependencies: { requires: [], optional: [], conflicts: [] },
    facets: ["base"],
  });
  const codeMetadata = defineSillyModMetadataV1({
    contractRevision: 1,
    modId: "mod.e2e.score-code",
    version: "1.0.0",
    engineApi: { composition: "^1.0.0" },
    dependencies: {
      requires: [{ modId: dataMetadata.modId, version: "^1.0.0" }],
      optional: [],
      conflicts: [],
    },
    facets: ["base"],
  });
  const dataMod: SillyModSourceV1<LabScoreRuleContributionV1> = {
    kind: "data",
    metadata: dataMetadata,
    contributions: [{
      contributionId: "mod-rule.data-bonus",
      pointId: labScoreRulePointIdV1,
      contributionKind: labScoreRuleKindV1,
      payload: { delta: 2 },
    }],
  };
  const codeMod: SillyModSourceV1<LabScoreRuleContributionV1> = {
    kind: "code",
    metadata: codeMetadata,
    load() {
      input.lifecycleEvents.push("code:load");
      return {
        contributions: [{
          contributionId: "mod-rule.code-bonus",
          pointId: labScoreRulePointIdV1,
          contributionKind: labScoreRuleKindV1,
          payload: { delta: 3 },
        }],
        setup() {
          input.lifecycleEvents.push("code:install");
          if (input.failCodeSetup === true) throw new Error("candidate setup failed");
          return {
            dispose() {
              input.lifecycleEvents.push("code:cleanup");
            },
          };
        },
      };
    },
  };

  return createSillyModRuntimeV1({
    applicationGeneration: input.applicationGeneration,
    engineApi: { composition: "1.0.0" },
    catalog: [dataMod, codeMod],
    activeModIds: ["mod.e2e.score-code", "mod.e2e.score-data"],
    extensionPoints: [labScoreRulePointV1],
  });
}
