// SPDX-License-Identifier: MIT
import {
  createApplicationModRuntimeInternalV1,
  type ApplicationModExtensionPointInternalV1,
  type ApplicationModRuntimeInternalV1,
  type ApplicationModSourceInternalV1,
} from "@sillymaker/composition/internal/mod-runtime";
import { defineExtensionFactoryInternalV1 } from "@sillymaker/composition/internal/extension-runtime";

export interface LabScoreRuleContributionV1 {
  readonly delta: number;
}

export interface LabScoreRulePlanV1 {
  readonly ruleIds: readonly string[];
  apply(score: number): number;
}

export type LabModConformanceRuntimeV1 = ApplicationModRuntimeInternalV1<LabScoreRulePlanV1>;

const labScoreRulePointIdV1 = "lab.score-rules";
const labScoreRuleKindV1 = "lab.score-rule";
const labBaseProductRuleV1 = {
  ruleId: "product.base-score",
  delta: 1,
};

const labScoreRulePointV1: ApplicationModExtensionPointInternalV1<
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
  const dataMod: ApplicationModSourceInternalV1<LabScoreRuleContributionV1> = {
    kind: "data",
    definition: {
      modId: "mod.e2e.score-data",
      generation: "data.1",
      dependencies: [],
      contributions: [{
        contributionId: "mod-rule.data-bonus",
        pointId: labScoreRulePointIdV1,
        contributionKind: labScoreRuleKindV1,
        payload: { delta: 2 },
      }],
    },
  };
  const codeMod: ApplicationModSourceInternalV1<LabScoreRuleContributionV1> = {
    kind: "code",
    modId: "mod.e2e.score-code",
    generation: "code.1",
    load() {
      input.lifecycleEvents.push("code:load");
      return {
        modId: "mod.e2e.score-code",
        generation: "code.1",
        dependencies: ["mod.e2e.score-data"],
        contributions: [{
          contributionId: "mod-rule.code-bonus",
          pointId: labScoreRulePointIdV1,
          contributionKind: labScoreRuleKindV1,
          payload: { delta: 3 },
        }],
        lifecycle: defineExtensionFactoryInternalV1({
          id: "mod.e2e.score-code",
          generation: "code.1",
          async setup(scope) {
            await scope.effect(() => {
              input.lifecycleEvents.push("code:install");
              return () => {
                input.lifecycleEvents.push("code:cleanup");
              };
            });
            if (input.failCodeSetup === true) throw new Error("candidate setup failed");
            return undefined;
          },
        }),
      };
    },
  };

  return createApplicationModRuntimeInternalV1({
    applicationGeneration: input.applicationGeneration,
    catalog: [dataMod, codeMod],
    activeModIds: ["mod.e2e.score-code", "mod.e2e.score-data"],
    extensionPoints: [labScoreRulePointV1],
  });
}
