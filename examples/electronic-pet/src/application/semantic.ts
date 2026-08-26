// SPDX-License-Identifier: MIT
import type { CoreSemanticAdapterV1 } from "@sillymaker/base/runtime";

import { electronicPetInteractionBindingsV1 } from "../content/runtime-bindings.ts";
import { isElectronicPetInteractionReachableV1 } from "../content/interactions.ts";
import type {
  ElectronicPetCommandV1,
  ElectronicPetGameViewV1,
  ElectronicPetQueriesV1,
  ElectronicPetRejectionV1,
  ElectronicPetSimulationTypesV1,
} from "../game/kernel.ts";
import { electronicPetCommandSchemaV1 } from "../game/kernel.ts";
import { evaluateElectronicPetCommandV1 } from "../game/rules.ts";
import { createElectronicPetGameSimulationV1 } from "../game/simulation.ts";

export interface ElectronicPetActionDescriptorV1 {
  readonly actionId: string;
  readonly enabled: boolean;
}
export type ElectronicPetInvocationV1 = ElectronicPetCommandV1;
export type ElectronicPetPreviewV1 =
  | { readonly kind: "allowed"; readonly outcome: "accept" | "tolerate" | "warn" | "refuse" | null }
  | { readonly kind: "blocked"; readonly code: ElectronicPetRejectionV1["code"] };
export type ElectronicPetActionResultV1 =
  | { readonly kind: "committed"; readonly game: ElectronicPetGameViewV1 }
  | { readonly kind: "rejected"; readonly codes: readonly ElectronicPetRejectionV1["code"][] }
  | { readonly kind: "faulted"; readonly code: string }
  | {
    readonly kind: "not_executed";
    readonly code: "session_unavailable" | "fault_paused" | "hmr_invalidated" | "validation_failed";
  };

const simulationForSemanticV1 = createElectronicPetGameSimulationV1();

export const electronicPetSemanticAdapterV1: CoreSemanticAdapterV1<
  ElectronicPetSimulationTypesV1,
  ElectronicPetQueriesV1,
  ElectronicPetGameViewV1,
  null,
  ElectronicPetActionDescriptorV1,
  ElectronicPetInvocationV1,
  ElectronicPetPreviewV1,
  ElectronicPetActionResultV1
> = {
  createQueries: (state) => simulationForSemanticV1.createQueries(state as never),
  projectGameView: (queries) => queries.player,
  projectNarrativeView: () => null,
  actions: (queries) => [
    { actionId: "care.prepare.water", enabled: !queries.state.home.setup.waterReady },
    { actionId: "care.prepare.litter", enabled: !queries.state.home.setup.litterReady },
    { actionId: "care.prepare.hideaway", enabled: !queries.state.home.setup.hideawayReady },
    { actionId: "care.place_food", enabled: true },
    {
      actionId: "care.quiet_presence",
      enabled: queries.player.quietPresenceAvailable,
    },
    {
      actionId: "contact.offer_hand",
      enabled: queries.state.companion.invitation?.kind === "sniff_hand",
    },
    ...electronicPetInteractionBindingsV1.map((binding) => ({
      actionId: binding.actionId,
      enabled: isElectronicPetInteractionReachableV1(
        queries.player.poseId,
        binding.interactionId,
      ),
    })),
    {
      actionId: "play.wand",
      enabled: queries.state.relationship.trustStage !== "newcomer" &&
        queries.state.companion.activity.poseId !== "hidden",
    },
  ],
  preview: (queries, invocation) => {
    const evaluation = evaluateElectronicPetCommandV1(queries.state, invocation);
    return evaluation.kind === "blocked"
      ? { kind: "blocked", code: evaluation.code }
      : { kind: "allowed", outcome: evaluation.outcome };
  },
  parseInvocation: (value) => electronicPetCommandSchemaV1.parse(value),
  commandForInvocation: (invocation) => invocation,
  projectDispatchResult: (result) => {
    if (result.kind === "not_executed") return { kind: "not_executed", code: result.code };
    const execution = result.execution;
    if (execution.kind === "committed") {
      return {
        kind: "committed",
        game: simulationForSemanticV1.projectGameView(
          simulationForSemanticV1.createQueries(execution.snapshot.state),
        ),
      };
    }
    if (execution.kind === "rejected") {
      return {
        kind: "rejected",
        codes: execution.reasons.map((reason) => reason.code),
      };
    }
    return { kind: "faulted", code: execution.fault.code };
  },
  invalidInvocationResult: () => ({ kind: "not_executed", code: "validation_failed" }),
};
