// SPDX-License-Identifier: MIT
import type { RuleRngV1 } from "@sillymaker/base";

import {
  electronicPetActivityDefinitionsV1,
  findElectronicPetActivityDefinitionV1,
} from "../content/activities.ts";
import {
  electronicPetPreferenceForActivityV1,
  electronicPetPreferenceForInteractionV1,
} from "../content/cat.ts";
import {
  findElectronicPetInteractionRuleV1,
  isElectronicPetBoundInteractionV1,
  isElectronicPetInteractionReachableV1,
} from "../content/interactions.ts";
import {
  electronicPetGroomingRuleV1,
  isElectronicPetGroomingReachableV1,
} from "../content/grooming.ts";
import type { ElectronicPetCommandV1, ElectronicPetRejectionCodeV1 } from "./kernel.ts";
import type {
  ElectronicPetActivityIdV1,
  ElectronicPetActivityReasonV1,
  ElectronicPetEvidenceCounterV1,
  ElectronicPetInteractionOutcomeV1,
  ElectronicPetProgressionFactIdV1,
  ElectronicPetStateV1,
  ElectronicPetTrustStageV1,
} from "./state.ts";

const visitGapMsV1 = 15 * 60 * 1_000;
const maximumSettlementMinutesV1 = 24 * 60;
const minuteMsV1 = 60_000;
const bellyInteractionIdV1 = "interaction.pet.belly";
const bellyPreferenceIdV1 = "preference.contact.belly";
const trustStageRanksV1 = {
  newcomer: 0,
  familiar: 1,
  trusting: 2,
  bonded: 3,
} as const satisfies Record<ElectronicPetTrustStageV1, number>;

export type ElectronicPetCommandEvaluationV1 =
  | { readonly kind: "blocked"; readonly code: ElectronicPetRejectionCodeV1 }
  | { readonly kind: "allowed"; readonly outcome: ElectronicPetInteractionOutcomeV1 | null };

const clampV1 = (value: number): number => Math.max(0, Math.min(100, value));
const appendBoundedV1 = <T>(values: readonly T[], value: T, maximum: number): readonly T[] =>
  [...values, value].slice(-maximum);

function addFactV1(
  facts: readonly ElectronicPetProgressionFactIdV1[],
  fact: ElectronicPetProgressionFactIdV1,
): readonly ElectronicPetProgressionFactIdV1[] {
  return facts.includes(fact) ? facts : [...facts, fact].toSorted();
}

function creditEvidenceV1(
  evidence: ElectronicPetEvidenceCounterV1,
  visitOrdinal: number,
): ElectronicPetEvidenceCounterV1 {
  return evidence.lastVisit === visitOrdinal
    ? evidence
    : { count: evidence.count + 1, lastVisit: visitOrdinal };
}

export function electronicPetProgressionForV1(
  state: ElectronicPetStateV1,
): "arrival" | "approach" | "routine" | "trust" {
  if (state.relationship.trustStage === "trusting" || state.relationship.trustStage === "bonded") {
    return "trust";
  }
  if (state.relationship.facts.includes("relationship.routine_established")) return "routine";
  if (state.relationship.facts.includes("relationship.first_approach")) return "approach";
  return "arrival";
}

export function projectElectronicPetPlayerViewV1(state: ElectronicPetStateV1) {
  const lastInteraction = state.companion.recentMemory.findLast((memory) =>
    memory.kind === "contact" ||
    memory.kind === "belly" ||
    (memory.kind === "care" && memory.actionId === "care.groom.back")
  );
  const lastBelly = state.companion.recentMemory.findLast((memory) => memory.kind === "belly");
  const needBand = (value: number): "comfortable" | "watch" | "needs-care" =>
    value >= 70 ? "needs-care" : value >= 40 ? "watch" : "comfortable";
  return {
    progression: electronicPetProgressionForV1(state),
    trustStage: state.relationship.trustStage,
    mood: state.companion.mood.kind,
    activityId: state.companion.activity.activityId,
    activityReason: state.companion.activity.reason,
    poseId: state.companion.activity.poseId,
    activityOccurrence: state.companion.activity.occurrence,
    quietPresenceAvailable: homeReadyV1(state) &&
      state.companion.activity.activityId === "observe_player" &&
      !state.relationship.facts.includes("relationship.first_approach"),
    invitation: state.companion.invitation,
    home: {
      setup: state.home.setup,
      food: state.home.food,
      returnSummary: state.home.returnSummary,
    },
    needBands: {
      food: needBand(state.companion.needs.food),
      rest: needBand(state.companion.needs.rest),
      safety: needBand(state.companion.needs.safety),
      stimulation: needBand(state.companion.needs.stimulation),
    },
    lastOutcome: lastInteraction?.outcome ?? null,
    lastInteractionKind: lastInteraction === undefined
      ? null
      : lastInteraction.kind === "contact"
      ? "contact"
      : lastInteraction.kind === "belly"
      ? "belly"
      : "grooming",
    lastInteractionTargetId: lastInteraction === undefined
      ? null
      : lastInteraction.kind === "contact" || lastInteraction.kind === "belly"
      ? lastInteraction.targetInteractionId
      : electronicPetGroomingRuleV1.interactionId,
    lastBellyTerminal: lastBelly?.terminal ?? null,
  } as const;
}

export function projectElectronicPetInspectorV1(state: ElectronicPetStateV1) {
  return {
    progression: electronicPetProgressionForV1(state),
    trustStage: state.relationship.trustStage,
    facts: state.relationship.facts,
    evidence: state.relationship.evidence,
    discoveredPreferenceIds: state.relationship.discoveredPreferenceIds,
    mood: state.companion.mood,
    needs: state.companion.needs,
    activity: state.companion.activity,
    invitation: state.companion.invitation,
    recentMemory: state.companion.recentMemory,
  } as const;
}

function contactOutcomeV1(
  state: ElectronicPetStateV1,
  command: Extract<ElectronicPetCommandV1, { kind: "pet.contact_complete" }>,
): ElectronicPetInteractionOutcomeV1 {
  const rule = findElectronicPetInteractionRuleV1(command.targetInteractionId);
  if (rule === null) return "refuse";
  let score = rule.baseAcceptance +
    electronicPetPreferenceForInteractionV1(command.targetInteractionId);
  if (state.relationship.trustStage !== "newcomer") score += 1;
  score += ({ guarded: -2, calm: 0, social: 2, playful: -1, overstimulated: -4 } as const)[
    state.companion.mood.kind
  ];
  score += ({ "with-fur": 2, "cross-fur": -1, "against-fur": -4 } as const)[command.direction];
  score += ({ slow: 1, steady: 0, fast: -2 } as const)[command.speed];
  if (command.duration === "sustained") score -= 1;
  const recentContact = state.companion.recentMemory.findLast((memory) =>
    memory.kind === "contact" && memory.targetInteractionId === command.targetInteractionId
  );
  if (recentContact?.outcome === "tolerate") score -= 1;
  else if (recentContact?.outcome === "warn") score -= 2;
  else if (recentContact?.outcome === "refuse") score -= 3;
  if (command.direction === "against-fur") return score >= -1 ? "warn" : "refuse";
  return score >= 5 ? "accept" : score >= 2 ? "tolerate" : score >= -1 ? "warn" : "refuse";
}

function groomingOutcomeV1(
  state: ElectronicPetStateV1,
  command: Extract<ElectronicPetCommandV1, { kind: "pet.groom_complete" }>,
): ElectronicPetInteractionOutcomeV1 {
  let score = electronicPetGroomingRuleV1.baseAcceptance +
    electronicPetPreferenceForInteractionV1(command.targetInteractionId) +
    (state.relationship.trustStage === "bonded" ? 3 : 2);
  score += ({ guarded: -2, calm: 0, social: 2, playful: 0, overstimulated: -4 } as const)[
    state.companion.mood.kind
  ];
  score += ({ "with-fur": 2, "cross-fur": -1, "against-fur": -4 } as const)[command.direction];
  score += ({ slow: 1, steady: 0, fast: -2 } as const)[command.speed];
  if (command.duration === "sustained") score -= 1;
  const recentGrooming = state.companion.recentMemory.findLast((memory) =>
    memory.kind === "care" && memory.actionId === "care.groom.back"
  );
  if (recentGrooming?.outcome === "tolerate") score -= 1;
  else if (recentGrooming?.outcome === "warn") score -= 2;
  else if (recentGrooming?.outcome === "refuse") score -= 3;
  if (command.direction === "against-fur") return score >= 0 ? "warn" : "refuse";
  return score >= 5 ? "accept" : score >= 2 ? "tolerate" : score >= -1 ? "warn" : "refuse";
}

function invitationAllowsContactV1(
  invitation: NonNullable<ElectronicPetStateV1["companion"]["invitation"]>,
  region: "face" | "neck" | "back" | "belly",
): boolean {
  return invitation.kind === "head_contact" && (region === "face" || region === "neck");
}

function invitationKindForActivityV1(
  state: ElectronicPetStateV1,
  activityId: ElectronicPetActivityIdV1,
): NonNullable<ElectronicPetStateV1["companion"]["invitation"]>["kind"] | null {
  if (activityId === "approach_player") {
    return state.relationship.facts.includes("relationship.routine_established")
      ? "head_contact"
      : "sniff_hand";
  }
  if (activityId === "belly_expose") {
    const moodAllowsOffer = state.companion.mood.kind === "calm" ||
      state.companion.mood.kind === "social";
    return state.relationship.trustStage === "bonded" && moodAllowsOffer &&
        electronicPetPreferenceForInteractionV1(bellyInteractionIdV1) > 0
      ? "belly_offer"
      : null;
  }
  return activityId === "solo_ball_play" ? "shared_play" : null;
}

function hasExactBellyOfferV1(
  state: ElectronicPetStateV1,
  expectedInvitationOccurrence: number | undefined,
): boolean {
  return expectedInvitationOccurrence !== undefined &&
    state.companion.invitation?.kind === "belly_offer" &&
    state.companion.invitation.occurrence === expectedInvitationOccurrence &&
    state.companion.invitation.activityOccurrence === state.companion.activity.occurrence;
}

export function evaluateElectronicPetCommandV1(
  state: ElectronicPetStateV1,
  command: ElectronicPetCommandV1,
): ElectronicPetCommandEvaluationV1 {
  switch (command.kind) {
    case "pet.home_prepare": {
      const key = `${command.resource}Ready` as keyof ElectronicPetStateV1["home"]["setup"];
      return state.home.setup[key]
        ? { kind: "blocked", code: "pet.action_unavailable" }
        : { kind: "allowed", outcome: "accept" };
    }
    case "pet.food_place":
      return { kind: "allowed", outcome: "accept" };
    case "pet.quiet_presence":
      if (command.expectedActivityOccurrence !== state.companion.activity.occurrence) {
        return { kind: "blocked", code: "pet.activity_stale" };
      }
      return homeReadyV1(state) && state.companion.activity.activityId === "observe_player" &&
          !state.relationship.facts.includes("relationship.first_approach")
        ? { kind: "allowed", outcome: "accept" }
        : { kind: "blocked", code: "pet.action_unavailable" };
    case "pet.hand_offer": {
      if (command.expectedActivityOccurrence !== state.companion.activity.occurrence) {
        return { kind: "blocked", code: "pet.activity_stale" };
      }
      const invitation = state.companion.invitation;
      if (invitation?.occurrence !== command.expectedInvitationOccurrence) {
        return { kind: "blocked", code: "pet.invitation_stale" };
      }
      return invitation.kind === "sniff_hand" &&
          invitation.activityOccurrence === state.companion.activity.occurrence &&
          state.companion.activity.activityId === "approach_player"
        ? { kind: "allowed", outcome: "accept" }
        : { kind: "blocked", code: "pet.action_unavailable" };
    }
    case "pet.contact_complete": {
      if (command.expectedActivityOccurrence !== state.companion.activity.occurrence) {
        return { kind: "blocked", code: "pet.activity_stale" };
      }
      if (
        command.expectedInvitationOccurrence !== undefined &&
        (state.companion.invitation?.occurrence !== command.expectedInvitationOccurrence ||
          state.companion.invitation.activityOccurrence !==
            state.companion.activity.occurrence)
      ) return { kind: "blocked", code: "pet.invitation_stale" };
      const rule = findElectronicPetInteractionRuleV1(command.targetInteractionId);
      if (!isElectronicPetBoundInteractionV1(command.targetInteractionId) || rule === null) {
        return { kind: "blocked", code: "pet.target_unavailable" };
      }
      if (
        !isElectronicPetInteractionReachableV1(
          state.companion.activity.poseId,
          command.targetInteractionId,
        )
      ) {
        return { kind: "blocked", code: "pet.target_unavailable" };
      }
      if (
        command.expectedInvitationOccurrence !== undefined &&
        state.companion.invitation !== null &&
        !invitationAllowsContactV1(state.companion.invitation, rule.region)
      ) return { kind: "blocked", code: "pet.target_unavailable" };
      const invitedHeadContact = command.expectedInvitationOccurrence !== undefined &&
        state.companion.invitation?.kind === "head_contact" &&
        state.companion.invitation.occurrence === command.expectedInvitationOccurrence;
      if (state.relationship.trustStage === "newcomer" && !invitedHeadContact) {
        return { kind: "allowed", outcome: "refuse" };
      }
      return { kind: "allowed", outcome: contactOutcomeV1(state, command) };
    }
    case "pet.groom_complete": {
      if (command.expectedActivityOccurrence !== state.companion.activity.occurrence) {
        return { kind: "blocked", code: "pet.activity_stale" };
      }
      if (
        command.expectedInvitationOccurrence !== undefined &&
        (state.companion.invitation?.occurrence !== command.expectedInvitationOccurrence ||
          state.companion.invitation.activityOccurrence !== state.companion.activity.occurrence)
      ) return { kind: "blocked", code: "pet.invitation_stale" };
      if (command.targetInteractionId !== electronicPetGroomingRuleV1.interactionId) {
        return { kind: "blocked", code: "pet.target_unavailable" };
      }
      if (
        !isElectronicPetGroomingReachableV1(
          state.companion.activity.poseId,
          command.targetInteractionId,
        )
      ) {
        return { kind: "blocked", code: "pet.target_unavailable" };
      }
      if (
        state.relationship.trustStage !== "trusting" &&
        state.relationship.trustStage !== "bonded"
      ) {
        return { kind: "blocked", code: "pet.action_unavailable" };
      }
      return { kind: "allowed", outcome: groomingOutcomeV1(state, command) };
    }
    case "pet.belly_complete": {
      if (command.expectedActivityOccurrence !== state.companion.activity.occurrence) {
        return { kind: "blocked", code: "pet.activity_stale" };
      }
      const currentOfferOccurrence = state.companion.invitation?.kind === "belly_offer" &&
          state.companion.invitation.activityOccurrence === state.companion.activity.occurrence
        ? state.companion.invitation.occurrence
        : undefined;
      if (command.expectedInvitationOccurrence !== currentOfferOccurrence) {
        return { kind: "blocked", code: "pet.invitation_stale" };
      }
      const exactOffer = currentOfferOccurrence !== undefined;
      if (
        command.targetInteractionId !== bellyInteractionIdV1 ||
        state.companion.activity.activityId !== "belly_expose" ||
        state.companion.activity.poseId !== "supine_relaxed"
      ) return { kind: "blocked", code: "pet.target_unavailable" };
      switch (command.terminal) {
        case "stopped_before_warning":
          return {
            kind: "allowed",
            outcome: trustStageRanksV1[state.relationship.trustStage] >= trustStageRanksV1.trusting
              ? "accept"
              : "warn",
          };
        case "stopped_in_warning":
          return { kind: "allowed", outcome: "warn" };
        case "continued_after_warning":
          return { kind: "allowed", outcome: "refuse" };
        case "completed_before_warning":
          return {
            kind: "allowed",
            outcome: exactOffer && command.direction === "with-fur" && command.speed === "slow" &&
                command.duration === "brief"
              ? "accept"
              : "warn",
          };
      }
    }
    case "pet.play_complete": {
      if (command.expectedActivityOccurrence !== state.companion.activity.occurrence) {
        return { kind: "blocked", code: "pet.activity_stale" };
      }
      if (
        state.relationship.trustStage === "newcomer" ||
        state.companion.activity.poseId === "hidden"
      ) {
        return { kind: "blocked", code: "pet.action_unavailable" };
      }
      const outcome = command.roundResult === "caught"
        ? "accept"
        : command.roundResult === "missed"
        ? "tolerate"
        : "refuse";
      return { kind: "allowed", outcome };
    }
    case "pet.time_settle":
      return command.mode === "active" &&
          command.observedAtMs < state.home.lastSettledWallTimeMs
        ? { kind: "blocked", code: "pet.clock_regressed" }
        : { kind: "allowed", outcome: null };
    case "pet.return_summary_dismiss":
      return state.home.returnSummary?.visitOrdinal === command.expectedVisitOrdinal
        ? { kind: "allowed", outcome: null }
        : { kind: "blocked", code: "pet.return_summary_stale" };
  }
  const unreachable: never = command;
  return unreachable;
}

function homeReadyV1(state: ElectronicPetStateV1): boolean {
  return state.home.setup.waterReady && state.home.setup.litterReady &&
    state.home.setup.hideawayReady &&
    (state.home.food !== null || state.relationship.facts.includes("home.food_ready"));
}

function minuteCrossingsV1(
  previousWorldMinute: number,
  worldMinute: number,
  intervalMinutes: number,
): number {
  return Math.floor(worldMinute / intervalMinutes) -
    Math.floor(previousWorldMinute / intervalMinutes);
}

function beginArrivalObservationV1(state: ElectronicPetStateV1): ElectronicPetStateV1 {
  if (
    !homeReadyV1(state) ||
    state.relationship.facts.includes("relationship.first_approach") ||
    state.companion.activity.activityId === "observe_player"
  ) return state;
  const definition = findElectronicPetActivityDefinitionV1("observe_player");
  if (definition === null) return state;
  const occurrence = state.companion.nextActivityOccurrence;
  return {
    ...state,
    companion: {
      ...state.companion,
      activity: {
        activityId: definition.activityId,
        poseId: definition.poseId,
        occurrence,
        startedAtMinute: state.home.worldMinute,
        minimumUntilMinute: state.home.worldMinute,
        reason: "arrival",
      },
      nextActivityOccurrence: occurrence + 1,
      invitation: null,
      recentActivityIds: appendBoundedV1(
        state.companion.recentActivityIds,
        definition.activityId,
        4,
      ),
    },
  };
}

function beginArrivalApproachV1(state: ElectronicPetStateV1): ElectronicPetStateV1 {
  if (
    !homeReadyV1(state) || state.companion.activity.activityId !== "observe_player" ||
    state.relationship.facts.includes("relationship.first_approach")
  ) return state;
  const definition = findElectronicPetActivityDefinitionV1("approach_player");
  if (definition === null) return state;
  const occurrence = state.companion.nextActivityOccurrence;
  const invitationOccurrence = state.companion.nextInvitationOccurrence;
  return {
    ...state,
    relationship: {
      ...state.relationship,
      facts: addFactV1(state.relationship.facts, "relationship.first_approach"),
    },
    companion: {
      ...state.companion,
      activity: {
        activityId: definition.activityId,
        poseId: definition.poseId,
        occurrence,
        startedAtMinute: state.home.worldMinute,
        minimumUntilMinute: state.home.worldMinute + definition.minimumMinutes,
        reason: "social_interest",
      },
      nextActivityOccurrence: occurrence + 1,
      invitation: {
        kind: "sniff_hand",
        occurrence: invitationOccurrence,
        activityOccurrence: occurrence,
        expiresAtMinute: state.home.worldMinute + definition.minimumMinutes,
      },
      nextInvitationOccurrence: invitationOccurrence + 1,
      recentActivityIds: appendBoundedV1(
        state.companion.recentActivityIds,
        definition.activityId,
        4,
      ),
    },
  };
}

function eligibleActivityV1(
  state: ElectronicPetStateV1,
  activityId: ElectronicPetActivityIdV1,
): boolean {
  switch (activityId) {
    case "hide_in_den":
      return state.companion.needs.safety >= 40;
    case "observe_player":
      return true;
    case "explore_room":
      return state.companion.needs.stimulation >= 30;
    case "approach_player":
      return homeReadyV1(state) && state.companion.needs.safety <= 55;
    case "eat_at_bowl":
      return state.home.food !== null && state.companion.needs.food >= 45;
    case "rest_nearby":
      return state.companion.needs.rest >= 35;
    case "self_groom":
      return state.companion.needs.safety <= 45;
    case "solo_ball_play":
      return state.companion.needs.stimulation >= 55 &&
        state.relationship.trustStage !== "newcomer";
    case "belly_expose":
      return state.companion.needs.safety <= 45 &&
        (state.companion.mood.kind === "calm" || state.companion.mood.kind === "social");
  }
  const unreachable: never = activityId;
  return unreachable;
}

function activityWeightV1(
  state: ElectronicPetStateV1,
  definition: (typeof electronicPetActivityDefinitionsV1)[number],
): number {
  let adjustment = electronicPetPreferenceForActivityV1(definition.activityId);
  switch (state.companion.mood.kind) {
    case "guarded":
      if (definition.activityId === "hide_in_den" || definition.activityId === "observe_player") {
        adjustment += 3;
      }
      if (
        definition.activityId === "approach_player" || definition.activityId === "solo_ball_play"
      ) {
        adjustment -= 2;
      }
      break;
    case "calm":
      if (definition.activityId === "rest_nearby" || definition.activityId === "self_groom") {
        adjustment += 2;
      }
      break;
    case "social":
      if (definition.activityId === "approach_player") adjustment += 4;
      break;
    case "playful":
      if (definition.activityId === "solo_ball_play") adjustment += 5;
      else if (definition.activityId === "explore_room") adjustment += 2;
      break;
    case "overstimulated":
      if (definition.activityId === "hide_in_den" || definition.activityId === "rest_nearby") {
        adjustment += 5;
      }
      if (
        definition.activityId === "approach_player" || definition.activityId === "solo_ball_play"
      ) {
        adjustment -= 4;
      }
      break;
  }
  if (
    state.relationship.trustStage !== "newcomer" &&
    (definition.activityId === "approach_player" || definition.activityId === "rest_nearby")
  ) {
    adjustment += 2;
  }
  return Math.max(1, definition.weight + adjustment);
}

function urgentActivityIdV1(state: ElectronicPetStateV1): ElectronicPetActivityIdV1 | null {
  if (!homeReadyV1(state)) return "hide_in_den";
  if (state.companion.needs.safety >= 70) return "hide_in_den";
  if (state.companion.needs.food >= 70 && state.home.food !== null) return "eat_at_bowl";
  if (state.companion.needs.rest >= 70) return "rest_nearby";
  return null;
}

function settleCompletedActivityV1(state: ElectronicPetStateV1): ElectronicPetStateV1 {
  switch (state.companion.activity.activityId) {
    case "eat_at_bowl": {
      const food = state.home.food;
      if (food === null) return state;
      return {
        ...state,
        home: {
          ...state.home,
          food: food.servings === 1 ? null : { ...food, servings: food.servings - 1 },
        },
        companion: {
          ...state.companion,
          needs: { ...state.companion.needs, food: clampV1(state.companion.needs.food - 45) },
        },
      };
    }
    case "rest_nearby":
      return {
        ...state,
        companion: {
          ...state.companion,
          needs: { ...state.companion.needs, rest: clampV1(state.companion.needs.rest - 45) },
        },
      };
    case "explore_room":
    case "solo_ball_play":
      return {
        ...state,
        companion: {
          ...state.companion,
          needs: {
            ...state.companion.needs,
            stimulation: clampV1(state.companion.needs.stimulation - 20),
          },
        },
      };
    case "hide_in_den":
    case "observe_player":
    case "approach_player":
    case "self_groom":
    case "belly_expose":
      return state;
  }
  return state;
}

function chooseActivityV1(
  state: ElectronicPetStateV1,
  rng: RuleRngV1,
): {
  readonly definition: (typeof electronicPetActivityDefinitionsV1)[number];
  readonly reason: ElectronicPetActivityReasonV1;
} {
  const forcedId = urgentActivityIdV1(state);
  const eligible = electronicPetActivityDefinitionsV1.filter((entry) =>
    eligibleActivityV1(state, entry.activityId)
  );
  const recentActivityIds = new Set(state.companion.recentActivityIds);
  const unrepeated = eligible.filter((entry) => !recentActivityIds.has(entry.activityId));
  const candidates = forcedId === null
    ? (unrepeated.length > 0 ? unrepeated : eligible)
    : electronicPetActivityDefinitionsV1.filter((entry) => entry.activityId === forcedId);
  const weightedCandidates = candidates.map((definition) => ({
    definition,
    weight: activityWeightV1(state, definition),
  }));
  const total = weightedCandidates.reduce((sum, entry) => sum + entry.weight, 0);
  let roll: number = rng.nextInt({
    exclusiveMax: total,
    purpose: "scheduler:electronic-pet.activity",
  });
  let selected = weightedCandidates[0]!.definition;
  for (const candidate of weightedCandidates) {
    if (roll < candidate.weight) {
      selected = candidate.definition;
      break;
    }
    roll -= candidate.weight;
  }
  const reason: ElectronicPetActivityReasonV1 = forcedId === "hide_in_den"
    ? "safety_need"
    : forcedId === "eat_at_bowl"
    ? "food_need"
    : forcedId === "rest_nearby"
    ? "rest_need"
    : selected.activityId === "approach_player"
    ? "social_interest"
    : selected.activityId === "explore_room" || selected.activityId === "solo_ball_play"
    ? "curiosity"
    : "routine";
  return { definition: selected, reason };
}

function updateProgressionV1(state: ElectronicPetStateV1): ElectronicPetStateV1 {
  let facts = state.relationship.facts;
  if (state.home.setup.waterReady) facts = addFactV1(facts, "home.water_ready");
  if (state.home.setup.litterReady) facts = addFactV1(facts, "home.litter_ready");
  if (state.home.setup.hideawayReady) facts = addFactV1(facts, "home.hideaway_ready");
  if (state.home.food !== null) facts = addFactV1(facts, "home.food_ready");
  const diverse = state.relationship.evidence.calmCare.count > 0 &&
    state.relationship.evidence.invitationResponse.count > 0 &&
    (state.relationship.evidence.sharedPlay.count > 0 ||
      facts.includes("relationship.first_contact"));
  const spansVisits = state.relationship.evidence.calmCare.count >= 2 ||
    state.relationship.evidence.invitationResponse.count >= 2 ||
    state.relationship.evidence.sharedPlay.count >= 2;
  if (diverse && spansVisits) {
    facts = addFactV1(facts, "relationship.routine_established");
  }
  const familiar = facts.includes("relationship.first_hand_sniff") &&
    state.relationship.evidence.calmCare.count > 0;
  const trusting = facts.includes("relationship.routine_established") &&
    state.relationship.evidence.invitationResponse.count >= 2 &&
    state.relationship.evidence.sharedPlay.count > 0 &&
    state.relationship.discoveredPreferenceIds.length > 0;
  const bonded = trustStageRanksV1[state.relationship.trustStage] >= trustStageRanksV1.trusting &&
    facts.includes("relationship.first_grooming") &&
    state.relationship.evidence.boundaryRespect.count >= 2;
  const candidateStage: ElectronicPetTrustStageV1 = bonded
    ? "bonded"
    : trusting
    ? "trusting"
    : familiar
    ? "familiar"
    : "newcomer";
  return {
    ...state,
    relationship: {
      ...state.relationship,
      facts,
      trustStage:
        trustStageRanksV1[candidateStage] > trustStageRanksV1[state.relationship.trustStage]
          ? candidateStage
          : state.relationship.trustStage,
    },
  };
}

export function applyElectronicPetCommandV1(
  state: ElectronicPetStateV1,
  command: ElectronicPetCommandV1,
  outcome: ElectronicPetInteractionOutcomeV1 | null,
  rng: RuleRngV1,
): ElectronicPetStateV1 {
  let next = state;
  if (command.kind === "pet.home_prepare") {
    const key = `${command.resource}Ready` as keyof ElectronicPetStateV1["home"]["setup"];
    next = {
      ...state,
      home: { ...state.home, setup: { ...state.home.setup, [key]: true } },
      relationship: {
        ...state.relationship,
        evidence: {
          ...state.relationship.evidence,
          calmCare: creditEvidenceV1(state.relationship.evidence.calmCare, state.home.visitOrdinal),
        },
      },
      companion: {
        ...state.companion,
        mood: { kind: "calm", cause: "care", sinceMinute: state.home.worldMinute },
        needs: { ...state.companion.needs, safety: clampV1(state.companion.needs.safety - 15) },
        recentMemory: appendBoundedV1(state.companion.recentMemory, {
          kind: "care",
          actionId: `care.prepare.${command.resource}`,
          outcome: "accept",
          atMinute: state.home.worldMinute,
        }, 8),
      },
    };
  } else if (command.kind === "pet.food_place") {
    next = {
      ...state,
      home: { ...state.home, food: { foodId: command.foodId, servings: 2 } },
      relationship: {
        ...state.relationship,
        evidence: {
          ...state.relationship.evidence,
          calmCare: creditEvidenceV1(state.relationship.evidence.calmCare, state.home.visitOrdinal),
        },
      },
      companion: {
        ...state.companion,
        recentMemory: appendBoundedV1(state.companion.recentMemory, {
          kind: "care",
          actionId: "care.place_food",
          outcome: "accept",
          atMinute: state.home.worldMinute,
        }, 8),
      },
    };
  } else if (command.kind === "pet.quiet_presence" && outcome !== null) {
    next = beginArrivalApproachV1({
      ...state,
      companion: {
        ...state.companion,
        mood: { kind: "calm", cause: "care", sinceMinute: state.home.worldMinute },
        recentMemory: appendBoundedV1(state.companion.recentMemory, {
          kind: "care",
          actionId: "care.quiet_presence",
          outcome,
          atMinute: state.home.worldMinute,
        }, 8),
      },
    });
  } else if (command.kind === "pet.hand_offer" && outcome !== null) {
    const accepted = outcome === "accept";
    next = {
      ...state,
      relationship: {
        ...state.relationship,
        facts: accepted
          ? addFactV1(
            addFactV1(state.relationship.facts, "relationship.first_approach"),
            "relationship.first_hand_sniff",
          )
          : state.relationship.facts,
        evidence: accepted
          ? {
            ...state.relationship.evidence,
            invitationResponse: creditEvidenceV1(
              state.relationship.evidence.invitationResponse,
              state.home.visitOrdinal,
            ),
          }
          : state.relationship.evidence,
      },
      companion: {
        ...state.companion,
        mood: {
          kind: accepted ? "social" : "guarded",
          cause: "contact",
          sinceMinute: state.home.worldMinute,
        },
        invitation: command.expectedInvitationOccurrence === state.companion.invitation?.occurrence
          ? null
          : state.companion.invitation,
        recentMemory: appendBoundedV1(state.companion.recentMemory, {
          kind: "care",
          actionId: "contact.offer_hand",
          outcome,
          atMinute: state.home.worldMinute,
        }, 8),
      },
    };
  } else if (command.kind === "pet.contact_complete" && outcome !== null) {
    const rule = findElectronicPetInteractionRuleV1(command.targetInteractionId);
    const acceptedHeadContactInvitation = outcome === "accept" &&
      state.companion.invitation?.kind === "head_contact" &&
      state.companion.invitation.occurrence === command.expectedInvitationOccurrence &&
      state.companion.invitation.activityOccurrence === state.companion.activity.occurrence;
    const revealsPreference = state.relationship.trustStage !== "newcomer" ||
      command.expectedInvitationOccurrence !== undefined;
    const discovered = !revealsPreference || rule === null ||
        state.relationship.discoveredPreferenceIds.includes(rule.preferenceId)
      ? state.relationship.discoveredPreferenceIds
      : [...state.relationship.discoveredPreferenceIds, rule.preferenceId].toSorted();
    next = {
      ...state,
      relationship: {
        ...state.relationship,
        facts: outcome === "accept"
          ? addFactV1(state.relationship.facts, "relationship.first_contact")
          : state.relationship.facts,
        evidence: acceptedHeadContactInvitation
          ? {
            ...state.relationship.evidence,
            invitationResponse: creditEvidenceV1(
              state.relationship.evidence.invitationResponse,
              state.home.visitOrdinal,
            ),
          }
          : state.relationship.evidence,
        discoveredPreferenceIds: discovered,
      },
      companion: {
        ...state.companion,
        mood: {
          kind: outcome === "accept"
            ? "social"
            : outcome === "tolerate"
            ? "calm"
            : outcome === "warn"
            ? "overstimulated"
            : "guarded",
          cause: "contact",
          sinceMinute: state.home.worldMinute,
        },
        invitation: command.expectedInvitationOccurrence === state.companion.invitation?.occurrence
          ? null
          : state.companion.invitation,
        recentMemory: appendBoundedV1(state.companion.recentMemory, {
          kind: "contact",
          targetInteractionId: command.targetInteractionId,
          direction: command.direction,
          outcome,
          atMinute: state.home.worldMinute,
        }, 8),
      },
    };
  } else if (command.kind === "pet.groom_complete" && outcome !== null) {
    const accepted = outcome === "accept";
    const discovered = !accepted ||
        state.relationship.discoveredPreferenceIds.includes(
          electronicPetGroomingRuleV1.preferenceId,
        )
      ? state.relationship.discoveredPreferenceIds
      : [
        ...state.relationship.discoveredPreferenceIds,
        electronicPetGroomingRuleV1.preferenceId,
      ].toSorted();
    next = {
      ...state,
      relationship: {
        ...state.relationship,
        facts: accepted
          ? addFactV1(state.relationship.facts, "relationship.first_grooming")
          : state.relationship.facts,
        discoveredPreferenceIds: discovered,
      },
      companion: {
        ...state.companion,
        mood: {
          kind: accepted
            ? "social"
            : outcome === "tolerate"
            ? "calm"
            : outcome === "warn"
            ? "overstimulated"
            : "guarded",
          cause: "care",
          sinceMinute: state.home.worldMinute,
        },
        recentMemory: appendBoundedV1(state.companion.recentMemory, {
          kind: "care",
          actionId: "care.groom.back",
          outcome,
          atMinute: state.home.worldMinute,
        }, 8),
      },
    };
  } else if (command.kind === "pet.belly_complete" && outcome !== null) {
    const acceptedOffer = command.terminal === "completed_before_warning" && outcome === "accept" &&
      hasExactBellyOfferV1(state, command.expectedInvitationOccurrence);
    const respectedBoundary = command.terminal === "stopped_before_warning" &&
      outcome === "accept" && !acceptedOffer;
    const discovered = !acceptedOffer ||
        state.relationship.discoveredPreferenceIds.includes(bellyPreferenceIdV1)
      ? state.relationship.discoveredPreferenceIds
      : [...state.relationship.discoveredPreferenceIds, bellyPreferenceIdV1].toSorted();
    const continuedAfterWarning = command.terminal === "continued_after_warning";
    const nextActivityOccurrence = state.companion.nextActivityOccurrence;
    const nextActivity = continuedAfterWarning
      ? {
        activityId: "observe_player" as const,
        poseId: "watching" as const,
        occurrence: nextActivityOccurrence,
        startedAtMinute: state.home.worldMinute,
        minimumUntilMinute: state.home.worldMinute,
        reason: "boundary" as const,
      }
      : state.companion.activity;
    next = {
      ...state,
      relationship: {
        ...state.relationship,
        facts: acceptedOffer
          ? addFactV1(state.relationship.facts, "relationship.first_belly_contact")
          : state.relationship.facts,
        evidence: acceptedOffer
          ? {
            ...state.relationship.evidence,
            invitationResponse: creditEvidenceV1(
              state.relationship.evidence.invitationResponse,
              state.home.visitOrdinal,
            ),
          }
          : respectedBoundary
          ? {
            ...state.relationship.evidence,
            boundaryRespect: creditEvidenceV1(
              state.relationship.evidence.boundaryRespect,
              state.home.visitOrdinal,
            ),
          }
          : state.relationship.evidence,
        discoveredPreferenceIds: discovered,
      },
      companion: {
        ...state.companion,
        mood: {
          kind: continuedAfterWarning
            ? "overstimulated"
            : command.terminal === "stopped_in_warning"
            ? "calm"
            : outcome === "accept"
            ? "social"
            : "guarded",
          cause: "contact",
          sinceMinute: state.home.worldMinute,
        },
        activity: nextActivity,
        nextActivityOccurrence: continuedAfterWarning
          ? nextActivityOccurrence + 1
          : state.companion.nextActivityOccurrence,
        invitation: command.expectedInvitationOccurrence === state.companion.invitation?.occurrence
          ? null
          : state.companion.invitation,
        recentActivityIds: continuedAfterWarning
          ? appendBoundedV1(state.companion.recentActivityIds, "observe_player", 4)
          : state.companion.recentActivityIds,
        recentMemory: appendBoundedV1(state.companion.recentMemory, {
          kind: "belly",
          targetInteractionId: command.targetInteractionId,
          terminal: command.terminal,
          outcome,
          atMinute: state.home.worldMinute,
        }, 8),
      },
    };
  } else if (command.kind === "pet.play_complete" && outcome !== null) {
    const accepted = outcome === "accept";
    next = {
      ...state,
      relationship: {
        ...state.relationship,
        facts: accepted
          ? addFactV1(state.relationship.facts, "relationship.first_shared_play")
          : state.relationship.facts,
        evidence: accepted
          ? {
            ...state.relationship.evidence,
            sharedPlay: creditEvidenceV1(
              state.relationship.evidence.sharedPlay,
              state.home.visitOrdinal,
            ),
          }
          : state.relationship.evidence,
      },
      companion: {
        ...state.companion,
        mood: {
          kind: accepted ? "playful" : "calm",
          cause: "play",
          sinceMinute: state.home.worldMinute,
        },
        needs: {
          ...state.companion.needs,
          stimulation: clampV1(state.companion.needs.stimulation - (accepted ? 25 : 5)),
          rest: clampV1(state.companion.needs.rest + 8),
        },
        invitation: state.companion.invitation?.kind === "shared_play"
          ? null
          : state.companion.invitation,
        recentMemory: appendBoundedV1(state.companion.recentMemory, {
          kind: "play",
          toyId: command.toyId,
          outcome,
          atMinute: state.home.worldMinute,
        }, 8),
      },
    };
  } else if (command.kind === "pet.return_summary_dismiss") {
    next = { ...state, home: { ...state.home, returnSummary: null } };
  } else if (command.kind === "pet.time_settle") {
    const wallElapsedMs = state.home.lastSettledWallTimeMs === 0
      ? 0
      : Math.max(0, command.observedAtMs - state.home.lastSettledWallTimeMs);
    const elapsedMs = command.mode === "session_open" ? wallElapsedMs : command.elapsedMs;
    const elapsedMinutes = Math.min(maximumSettlementMinutesV1, Math.floor(elapsedMs / minuteMsV1));
    const isFreshOpen = command.mode === "session_open" &&
      state.home.lastSettledWallTimeMs === 0;
    const isReturn = command.mode === "session_open" && !isFreshOpen &&
      wallElapsedMs >= visitGapMsV1;
    const visitOrdinal = state.home.visitOrdinal + (isFreshOpen || isReturn ? 1 : 0);
    const worldMinute = state.home.worldMinute + elapsedMinutes;
    const foodCrossings = minuteCrossingsV1(state.home.worldMinute, worldMinute, 20);
    const restCrossings = minuteCrossingsV1(state.home.worldMinute, worldMinute, 30);
    const safetyCrossings = minuteCrossingsV1(state.home.worldMinute, worldMinute, 15);
    const stimulationCrossings = minuteCrossingsV1(state.home.worldMinute, worldMinute, 25);
    const eventIds = elapsedMinutes === 0 ? [] : ["return.time_passed"];
    const base = {
      ...state,
      home: {
        ...state.home,
        lastSettledWallTimeMs: command.observedAtMs,
        worldMinute,
        visitOrdinal,
        returnSummary: isReturn
          ? { visitOrdinal, elapsedMinutes, eventIds }
          : state.home.returnSummary,
      },
      companion: {
        ...state.companion,
        needs: {
          food: clampV1(state.companion.needs.food + foodCrossings),
          rest: clampV1(state.companion.needs.rest + restCrossings),
          safety: clampV1(
            state.companion.needs.safety -
              (homeReadyV1(state) ? safetyCrossings : 0),
          ),
          stimulation: clampV1(state.companion.needs.stimulation + stimulationCrossings),
        },
        invitation: state.companion.invitation !== null &&
            state.companion.invitation.expiresAtMinute <= worldMinute
          ? null
          : state.companion.invitation,
      },
    } satisfies ElectronicPetStateV1;
    const urgentActivityId = urgentActivityIdV1(base);
    const activityCompleted = worldMinute >= base.companion.activity.minimumUntilMinute;
    const interruptedByUrgentActivity = urgentActivityId !== null &&
      urgentActivityId !== base.companion.activity.activityId;
    const arrivalApproachDue = elapsedMinutes > 0 && homeReadyV1(base) &&
      !base.relationship.facts.includes("relationship.first_approach") &&
      base.companion.activity.activityId === "observe_player";
    if (arrivalApproachDue) {
      next = beginArrivalApproachV1(base);
    } else if (
      elapsedMinutes > 0 &&
      (activityCompleted || interruptedByUrgentActivity)
    ) {
      const settledBase = activityCompleted ? settleCompletedActivityV1(base) : base;
      const selected = chooseActivityV1(settledBase, rng);
      const occurrence = settledBase.companion.nextActivityOccurrence;
      const invitationKind = invitationKindForActivityV1(
        settledBase,
        selected.definition.activityId,
      );
      next = {
        ...settledBase,
        relationship: selected.definition.activityId === "approach_player"
          ? {
            ...settledBase.relationship,
            facts: addFactV1(settledBase.relationship.facts, "relationship.first_approach"),
          }
          : settledBase.relationship,
        companion: {
          ...settledBase.companion,
          activity: {
            activityId: selected.definition.activityId,
            poseId: selected.definition.poseId,
            occurrence,
            startedAtMinute: worldMinute,
            minimumUntilMinute: worldMinute + selected.definition.minimumMinutes,
            reason: selected.reason,
          },
          nextActivityOccurrence: occurrence + 1,
          invitation: invitationKind === null ? null : {
            kind: invitationKind,
            occurrence: settledBase.companion.nextInvitationOccurrence,
            activityOccurrence: occurrence,
            expiresAtMinute: worldMinute + selected.definition.minimumMinutes,
          },
          nextInvitationOccurrence: invitationKind === null
            ? settledBase.companion.nextInvitationOccurrence
            : settledBase.companion.nextInvitationOccurrence + 1,
          recentActivityIds: appendBoundedV1(
            settledBase.companion.recentActivityIds,
            selected.definition.activityId,
            4,
          ),
        },
      };
    } else next = base;
  }
  return updateProgressionV1(beginArrivalObservationV1(next));
}
