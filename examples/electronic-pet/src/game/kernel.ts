// SPDX-License-Identifier: MIT
import type {
  CommandExecutionAttemptEnvelopeV1,
  GameSimulationTypeMapV1,
  GameSnapshotEnvelopeV1,
  NonZeroUint32,
  RngDrawTraceV1,
  RngStateV1,
  RuntimeSchemaV1,
} from "@sillymaker/base";
import { createGameAuthoringKit } from "@sillymaker/base/story";
import { z } from "zod";

import { electronicPetFoodIdsV1, electronicPetToyIdsV1 } from "../content/items.ts";
import type {
  ElectronicPetGameStateV1,
  ElectronicPetInteractionOutcomeV1,
  ElectronicPetStateV1,
} from "./state.ts";
import { electronicPetStateSchemaV1 } from "./state.ts";

export const electronicPetGestureDirectionsV1 = ["with-fur", "cross-fur", "against-fur"] as const;
export const electronicPetGestureSpeedsV1 = ["slow", "steady", "fast"] as const;
export const electronicPetGestureDurationsV1 = ["brief", "sustained"] as const;

export interface ElectronicPetContactResultV1 {
  readonly targetInteractionId: string;
  readonly gesture: "stroke";
  readonly direction: (typeof electronicPetGestureDirectionsV1)[number];
  readonly speed: (typeof electronicPetGestureSpeedsV1)[number];
  readonly duration: (typeof electronicPetGestureDurationsV1)[number];
}

export type ElectronicPetGroomResultV1 = ElectronicPetContactResultV1;

export type ElectronicPetSceneGestureResultV1 =
  | ElectronicPetContactResultV1 & { readonly interactionKind: "contact" }
  | ElectronicPetGroomResultV1 & { readonly interactionKind: "grooming" };

export type ElectronicPetCommandV1 =
  | { readonly kind: "pet.home_prepare"; readonly resource: "water" | "litter" | "hideaway" }
  | { readonly kind: "pet.food_place"; readonly foodId: (typeof electronicPetFoodIdsV1)[number] }
  | { readonly kind: "pet.quiet_presence"; readonly expectedActivityOccurrence: number }
  | {
    readonly kind: "pet.hand_offer";
    readonly expectedActivityOccurrence: number;
    readonly expectedInvitationOccurrence: number;
  }
  | ElectronicPetContactResultV1 & {
    readonly kind: "pet.contact_complete";
    readonly expectedActivityOccurrence: number;
    readonly expectedInvitationOccurrence?: number | undefined;
  }
  | ElectronicPetGroomResultV1 & {
    readonly kind: "pet.groom_complete";
    readonly expectedActivityOccurrence: number;
  }
  | {
    readonly kind: "pet.play_complete";
    readonly expectedActivityOccurrence: number;
    readonly toyId: (typeof electronicPetToyIdsV1)[number];
    readonly roundResult: "caught" | "missed" | "ended_early";
  }
  | {
    readonly kind: "pet.time_settle";
    readonly mode: "active" | "session_open";
    readonly observedAtMs: number;
    /** Host-reported visible presentation time; ignored for session_open. */
    readonly elapsedMs: number;
  }
  | { readonly kind: "pet.return_summary_dismiss"; readonly expectedVisitOrdinal: number };

export type ElectronicPetEventV1 =
  | { readonly kind: "pet.state_set"; readonly next: ElectronicPetStateV1 }
  | {
    readonly kind: "pet.reaction_presented";
    readonly actionId: string;
    readonly outcome: ElectronicPetInteractionOutcomeV1;
    readonly reactionId: string;
  }
  | {
    readonly kind: "pet.activity_selected";
    readonly activityId: string;
    readonly poseId: string;
    readonly reason: string;
  }
  | {
    readonly kind: "pet.offline_settled";
    readonly visitOrdinal: number;
    readonly elapsedMinutes: number;
    readonly eventIds: readonly string[];
  };

export type ElectronicPetRejectionCodeV1 =
  | "pet.activity_stale"
  | "pet.invitation_stale"
  | "pet.target_unavailable"
  | "pet.action_unavailable"
  | "pet.clock_regressed"
  | "pet.return_summary_stale";
export interface ElectronicPetRejectionV1 {
  readonly code: ElectronicPetRejectionCodeV1;
}
export interface ElectronicPetFaultV1 {
  readonly code: "pet.executor_failed";
}
export interface ElectronicPetDebugValidationErrorV1 {
  readonly code: "pet.debug_command_unsupported";
}

export interface ElectronicPetPlayerViewV1 {
  readonly progression: "arrival" | "approach" | "routine" | "trust";
  readonly trustStage: ElectronicPetStateV1["relationship"]["trustStage"];
  readonly mood: ElectronicPetStateV1["companion"]["mood"]["kind"];
  readonly activityId: ElectronicPetStateV1["companion"]["activity"]["activityId"];
  readonly activityReason: ElectronicPetStateV1["companion"]["activity"]["reason"];
  readonly poseId: ElectronicPetStateV1["companion"]["activity"]["poseId"];
  readonly activityOccurrence: number;
  readonly quietPresenceAvailable: boolean;
  readonly invitation: ElectronicPetStateV1["companion"]["invitation"];
  readonly home: Pick<ElectronicPetStateV1["home"], "setup" | "food" | "returnSummary">;
  readonly needBands: {
    readonly food: "comfortable" | "watch" | "needs-care";
    readonly rest: "comfortable" | "watch" | "needs-care";
    readonly safety: "comfortable" | "watch" | "needs-care";
    readonly stimulation: "comfortable" | "watch" | "needs-care";
  };
  readonly lastOutcome: ElectronicPetInteractionOutcomeV1 | null;
  readonly lastInteractionKind: "contact" | "grooming" | null;
}
export interface ElectronicPetQueriesV1 {
  readonly state: ElectronicPetStateV1;
  readonly player: ElectronicPetPlayerViewV1;
}
export type ElectronicPetGameViewV1 = ElectronicPetPlayerViewV1;

export interface ElectronicPetBootstrapInputV1 {
  readonly rngSeed: NonZeroUint32;
}
export interface ElectronicPetSimulationTypesV1
  extends
    GameSimulationTypeMapV1<ElectronicPetBootstrapInputV1, ElectronicPetGameStateV1, RngStateV1> {
  readonly snapshot: GameSnapshotEnvelopeV1<ElectronicPetGameStateV1, RngStateV1>;
  readonly rngDrawTrace: RngDrawTraceV1;
  readonly command: ElectronicPetCommandV1;
  readonly event: ElectronicPetEventV1;
  readonly rejection: ElectronicPetRejectionV1;
  readonly fault: ElectronicPetFaultV1;
  readonly debugCommand: never;
  readonly debugValidationError: ElectronicPetDebugValidationErrorV1;
  readonly executionContext: undefined;
  readonly queries: ElectronicPetQueriesV1;
  readonly viewModel: ElectronicPetGameViewV1;
}
export type ElectronicPetSnapshotV1 = ElectronicPetSimulationTypesV1["snapshot"];
export type ElectronicPetAttemptV1 = CommandExecutionAttemptEnvelopeV1<
  ElectronicPetSnapshotV1,
  ElectronicPetEventV1,
  ElectronicPetRejectionV1,
  ElectronicPetFaultV1,
  RngStateV1,
  RngDrawTraceV1
>;

const occurrenceV1 = z.number().int().min(0).max(Number.MAX_SAFE_INTEGER);
const commandZodV1 = z.discriminatedUnion("kind", [
  z.strictObject({
    kind: z.literal("pet.home_prepare"),
    resource: z.enum(["water", "litter", "hideaway"]),
  }),
  z.strictObject({ kind: z.literal("pet.food_place"), foodId: z.enum(electronicPetFoodIdsV1) }),
  z.strictObject({
    kind: z.literal("pet.quiet_presence"),
    expectedActivityOccurrence: occurrenceV1,
  }),
  z.strictObject({
    kind: z.literal("pet.hand_offer"),
    expectedActivityOccurrence: occurrenceV1,
    expectedInvitationOccurrence: occurrenceV1,
  }),
  z.strictObject({
    kind: z.literal("pet.contact_complete"),
    expectedActivityOccurrence: occurrenceV1,
    expectedInvitationOccurrence: occurrenceV1.optional(),
    targetInteractionId: z.string().min(1).max(128),
    gesture: z.literal("stroke"),
    direction: z.enum(electronicPetGestureDirectionsV1),
    speed: z.enum(electronicPetGestureSpeedsV1),
    duration: z.enum(electronicPetGestureDurationsV1),
  }),
  z.strictObject({
    kind: z.literal("pet.groom_complete"),
    expectedActivityOccurrence: occurrenceV1,
    targetInteractionId: z.string().min(1).max(128),
    gesture: z.literal("stroke"),
    direction: z.enum(electronicPetGestureDirectionsV1),
    speed: z.enum(electronicPetGestureSpeedsV1),
    duration: z.enum(electronicPetGestureDurationsV1),
  }),
  z.strictObject({
    kind: z.literal("pet.play_complete"),
    expectedActivityOccurrence: occurrenceV1,
    toyId: z.enum(electronicPetToyIdsV1),
    roundResult: z.enum(["caught", "missed", "ended_early"]),
  }),
  z.strictObject({
    kind: z.literal("pet.time_settle"),
    mode: z.enum(["active", "session_open"]),
    observedAtMs: occurrenceV1,
    elapsedMs: occurrenceV1.max(24 * 60 * 60 * 1_000),
  }),
  z.strictObject({
    kind: z.literal("pet.return_summary_dismiss"),
    expectedVisitOrdinal: occurrenceV1,
  }),
]);
export const electronicPetCommandSchemaV1: RuntimeSchemaV1<ElectronicPetCommandV1> = {
  parse: (value) => commandZodV1.parse(value),
};

const eventZodV1 = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("pet.state_set"), next: z.unknown() }).transform((event) => ({
    kind: event.kind,
    next: electronicPetStateSchemaV1.parse(event.next),
  })),
  z.strictObject({
    kind: z.literal("pet.reaction_presented"),
    actionId: z.string().min(1).max(128),
    outcome: z.enum(["accept", "tolerate", "warn", "refuse"]),
    reactionId: z.string().min(1).max(128),
  }),
  z.strictObject({
    kind: z.literal("pet.activity_selected"),
    activityId: z.string().min(1).max(128),
    poseId: z.string().min(1).max(128),
    reason: z.string().min(1).max(128),
  }),
  z.strictObject({
    kind: z.literal("pet.offline_settled"),
    visitOrdinal: occurrenceV1,
    elapsedMinutes: occurrenceV1,
    eventIds: z.array(z.string().min(1).max(128)).max(6),
  }),
]);
export const electronicPetEventSchemaV1: RuntimeSchemaV1<ElectronicPetEventV1> = {
  parse: (value) => eventZodV1.parse(value) as ElectronicPetEventV1,
};
export const electronicPetKitV1 = createGameAuthoringKit<ElectronicPetSimulationTypesV1>();
