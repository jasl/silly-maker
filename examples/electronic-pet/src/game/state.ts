// SPDX-License-Identifier: MIT
import type { RuntimeSchemaV1 } from "@sillymaker/base";
import { z } from "zod";

export const electronicPetTrustStagesV1 = ["newcomer", "familiar", "trusting", "bonded"] as const;
export type ElectronicPetTrustStageV1 = (typeof electronicPetTrustStagesV1)[number];
export const electronicPetMoodKindsV1 = [
  "guarded",
  "calm",
  "social",
  "playful",
  "overstimulated",
] as const;
export type ElectronicPetMoodKindV1 = (typeof electronicPetMoodKindsV1)[number];
export const electronicPetMoodCausesV1 = [
  "arrival",
  "time",
  "care",
  "contact",
  "play",
  "needs",
] as const;
export type ElectronicPetMoodCauseV1 = (typeof electronicPetMoodCausesV1)[number];
export const electronicPetActivityIdsV1 = [
  "hide_in_den",
  "observe_player",
  "explore_room",
  "approach_player",
  "eat_at_bowl",
  "rest_nearby",
  "self_groom",
  "solo_ball_play",
  "belly_expose",
] as const;
export type ElectronicPetActivityIdV1 = (typeof electronicPetActivityIdsV1)[number];
export const electronicPetPoseIdsV1 = [
  "hidden",
  "watching",
  "walking",
  "near_player",
  "eating",
  "resting",
  "grooming",
  "pouncing",
  "supine_relaxed",
] as const;
export type ElectronicPetPoseIdV1 = (typeof electronicPetPoseIdsV1)[number];
export const electronicPetActivityReasonsV1 = [
  "arrival",
  "minimum_stay",
  "safety_need",
  "food_need",
  "rest_need",
  "curiosity",
  "social_interest",
  "routine",
  "boundary",
] as const;
export type ElectronicPetActivityReasonV1 = (typeof electronicPetActivityReasonsV1)[number];
export const electronicPetProgressionFactsV1 = [
  "home.water_ready",
  "home.litter_ready",
  "home.hideaway_ready",
  "home.food_ready",
  "relationship.first_approach",
  "relationship.first_hand_sniff",
  "relationship.first_contact",
  "relationship.first_shared_play",
  "relationship.routine_established",
  "relationship.first_grooming",
  "relationship.first_belly_contact",
] as const;
export type ElectronicPetProgressionFactIdV1 = (typeof electronicPetProgressionFactsV1)[number];
export const electronicPetInteractionOutcomesV1 = ["accept", "tolerate", "warn", "refuse"] as const;
export type ElectronicPetInteractionOutcomeV1 = (typeof electronicPetInteractionOutcomesV1)[number];
export const electronicPetBellyTerminalsV1 = [
  "completed_before_warning",
  "stopped_before_warning",
  "stopped_in_warning",
  "continued_after_warning",
] as const;
export type ElectronicPetBellyTerminalV1 = (typeof electronicPetBellyTerminalsV1)[number];

export interface ElectronicPetEvidenceCounterV1 {
  readonly count: number;
  readonly lastVisit: number | null;
}
export interface ElectronicPetHomeStateV1 {
  readonly lastSettledWallTimeMs: number;
  readonly worldMinute: number;
  readonly visitOrdinal: number;
  readonly setup: {
    readonly waterReady: boolean;
    readonly litterReady: boolean;
    readonly hideawayReady: boolean;
  };
  readonly food: { readonly foodId: string; readonly servings: number } | null;
  readonly returnSummary: {
    readonly visitOrdinal: number;
    readonly elapsedMinutes: number;
    readonly eventIds: readonly string[];
  } | null;
}
export interface ElectronicPetRelationshipStateV1 {
  readonly trustStage: ElectronicPetTrustStageV1;
  readonly facts: readonly ElectronicPetProgressionFactIdV1[];
  readonly evidence: {
    readonly calmCare: ElectronicPetEvidenceCounterV1;
    readonly invitationResponse: ElectronicPetEvidenceCounterV1;
    readonly boundaryRespect: ElectronicPetEvidenceCounterV1;
    readonly sharedPlay: ElectronicPetEvidenceCounterV1;
  };
  readonly discoveredPreferenceIds: readonly string[];
}
export type ElectronicPetRecentMemoryV1 =
  | {
    readonly kind: "care";
    readonly actionId: string;
    readonly outcome: ElectronicPetInteractionOutcomeV1;
    readonly atMinute: number;
  }
  | {
    readonly kind: "contact";
    readonly targetInteractionId: string;
    readonly direction: "with-fur" | "cross-fur" | "against-fur";
    readonly outcome: ElectronicPetInteractionOutcomeV1;
    readonly atMinute: number;
  }
  | {
    readonly kind: "play";
    readonly toyId: string;
    readonly outcome: ElectronicPetInteractionOutcomeV1;
    readonly atMinute: number;
  }
  | {
    readonly kind: "belly";
    readonly targetInteractionId: string;
    readonly terminal: ElectronicPetBellyTerminalV1;
    readonly outcome: ElectronicPetInteractionOutcomeV1;
    readonly atMinute: number;
  };
export interface ElectronicPetCompanionStateV1 {
  readonly mood: {
    readonly kind: ElectronicPetMoodKindV1;
    readonly cause: ElectronicPetMoodCauseV1;
    readonly sinceMinute: number;
  };
  /** All values are 0..100 need pressure: larger means more urgent. */
  readonly needs: {
    readonly food: number;
    readonly rest: number;
    readonly safety: number;
    readonly stimulation: number;
  };
  readonly activity: {
    readonly activityId: ElectronicPetActivityIdV1;
    readonly poseId: ElectronicPetPoseIdV1;
    readonly occurrence: number;
    readonly startedAtMinute: number;
    readonly minimumUntilMinute: number;
    readonly reason: ElectronicPetActivityReasonV1;
  };
  readonly nextActivityOccurrence: number;
  readonly invitation: {
    readonly kind: "sniff_hand" | "head_contact" | "shared_play" | "belly_offer";
    readonly occurrence: number;
    readonly activityOccurrence: number;
    readonly expiresAtMinute: number;
  } | null;
  readonly nextInvitationOccurrence: number;
  readonly recentActivityIds: readonly ElectronicPetActivityIdV1[];
  readonly recentMemory: readonly ElectronicPetRecentMemoryV1[];
}
export interface ElectronicPetStateV1 {
  readonly home: ElectronicPetHomeStateV1;
  readonly relationship: ElectronicPetRelationshipStateV1;
  readonly companion: ElectronicPetCompanionStateV1;
}
export interface ElectronicPetGameStateV1 {
  readonly simulation: { readonly pet: ElectronicPetStateV1 };
}

const safeCounterV1 = z.number().int().min(0).max(Number.MAX_SAFE_INTEGER);
const pressureV1 = z.number().int().min(0).max(100);
const evidenceZodV1 = z.strictObject({ count: safeCounterV1, lastVisit: safeCounterV1.nullable() });
const memoryZodV1 = z.discriminatedUnion("kind", [
  z.strictObject({
    kind: z.literal("care"),
    actionId: z.string().min(1).max(128),
    outcome: z.enum(electronicPetInteractionOutcomesV1),
    atMinute: safeCounterV1,
  }),
  z.strictObject({
    kind: z.literal("contact"),
    targetInteractionId: z.string().min(1).max(128),
    direction: z.enum(["with-fur", "cross-fur", "against-fur"]),
    outcome: z.enum(electronicPetInteractionOutcomesV1),
    atMinute: safeCounterV1,
  }),
  z.strictObject({
    kind: z.literal("play"),
    toyId: z.string().min(1).max(128),
    outcome: z.enum(electronicPetInteractionOutcomesV1),
    atMinute: safeCounterV1,
  }),
  z.strictObject({
    kind: z.literal("belly"),
    targetInteractionId: z.string().min(1).max(128),
    terminal: z.enum(electronicPetBellyTerminalsV1),
    outcome: z.enum(electronicPetInteractionOutcomesV1),
    atMinute: safeCounterV1,
  }),
]);
const petStateZodV1 = z.strictObject({
  home: z.strictObject({
    lastSettledWallTimeMs: safeCounterV1,
    worldMinute: safeCounterV1,
    visitOrdinal: safeCounterV1,
    setup: z.strictObject({
      waterReady: z.boolean(),
      litterReady: z.boolean(),
      hideawayReady: z.boolean(),
    }),
    food: z.strictObject({
      foodId: z.string().min(1).max(128),
      servings: z.number().int().min(1).max(8),
    }).nullable(),
    returnSummary: z.strictObject({
      visitOrdinal: safeCounterV1,
      elapsedMinutes: safeCounterV1,
      eventIds: z.array(z.string().min(1).max(128)).max(6),
    }).nullable(),
  }),
  relationship: z.strictObject({
    trustStage: z.enum(electronicPetTrustStagesV1),
    facts: z.array(z.enum(electronicPetProgressionFactsV1)).max(
      electronicPetProgressionFactsV1.length,
    ),
    evidence: z.strictObject({
      calmCare: evidenceZodV1,
      invitationResponse: evidenceZodV1,
      boundaryRespect: evidenceZodV1,
      sharedPlay: evidenceZodV1,
    }),
    discoveredPreferenceIds: z.array(z.string().min(1).max(128)).max(16),
  }),
  companion: z.strictObject({
    mood: z.strictObject({
      kind: z.enum(electronicPetMoodKindsV1),
      cause: z.enum(electronicPetMoodCausesV1),
      sinceMinute: safeCounterV1,
    }),
    needs: z.strictObject({
      food: pressureV1,
      rest: pressureV1,
      safety: pressureV1,
      stimulation: pressureV1,
    }),
    activity: z.strictObject({
      activityId: z.enum(electronicPetActivityIdsV1),
      poseId: z.enum(electronicPetPoseIdsV1),
      occurrence: safeCounterV1,
      startedAtMinute: safeCounterV1,
      minimumUntilMinute: safeCounterV1,
      reason: z.enum(electronicPetActivityReasonsV1),
    }),
    nextActivityOccurrence: safeCounterV1,
    invitation: z.strictObject({
      kind: z.enum(["sniff_hand", "head_contact", "shared_play", "belly_offer"]),
      occurrence: safeCounterV1,
      activityOccurrence: safeCounterV1,
      expiresAtMinute: safeCounterV1,
    }).nullable(),
    nextInvitationOccurrence: safeCounterV1,
    recentActivityIds: z.array(z.enum(electronicPetActivityIdsV1)).max(4),
    recentMemory: z.array(memoryZodV1).max(8),
  }),
});
export const electronicPetStateSchemaV1: RuntimeSchemaV1<ElectronicPetStateV1> = {
  parse: (value) => petStateZodV1.parse(value),
};
const gameStateZodV1 = z.strictObject({ simulation: z.strictObject({ pet: petStateZodV1 }) });
export const electronicPetGameStateSchemaV1: RuntimeSchemaV1<ElectronicPetGameStateV1> = {
  parse: (value) => gameStateZodV1.parse(value),
};

const emptyEvidenceV1 = (): ElectronicPetEvidenceCounterV1 => ({ count: 0, lastVisit: null });
export function createInitialElectronicPetStateV1(): ElectronicPetStateV1 {
  return {
    home: {
      lastSettledWallTimeMs: 0,
      worldMinute: 0,
      visitOrdinal: 0,
      setup: { waterReady: false, litterReady: false, hideawayReady: false },
      food: null,
      returnSummary: null,
    },
    relationship: {
      trustStage: "newcomer",
      facts: [],
      evidence: {
        calmCare: emptyEvidenceV1(),
        invitationResponse: emptyEvidenceV1(),
        boundaryRespect: emptyEvidenceV1(),
        sharedPlay: emptyEvidenceV1(),
      },
      discoveredPreferenceIds: [],
    },
    companion: {
      mood: { kind: "guarded", cause: "arrival", sinceMinute: 0 },
      needs: { food: 35, rest: 15, safety: 80, stimulation: 25 },
      activity: {
        activityId: "hide_in_den",
        poseId: "hidden",
        occurrence: 1,
        startedAtMinute: 0,
        minimumUntilMinute: 12,
        reason: "arrival",
      },
      nextActivityOccurrence: 2,
      invitation: null,
      nextInvitationOccurrence: 1,
      recentActivityIds: ["hide_in_den"],
      recentMemory: [],
    },
  };
}
export function createInitialElectronicPetGameStateV1(): ElectronicPetGameStateV1 {
  return { simulation: { pet: createInitialElectronicPetStateV1() } };
}
