// SPDX-License-Identifier: MIT
import type { ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";

import { electronicPetGameApplicationV1 } from "../application/composition.tsx";
import { createElectronicPetApplicationInstanceV1 } from "../application/core-application.ts";
import { electronicPetInspectorSourceV1 } from "../application/inspector-source.ts";
import { electronicPetSemanticAdapterV1 } from "../application/semantic.ts";
import type { ElectronicPetCommandV1, ElectronicPetGameViewV1 } from "../game/kernel.ts";
import {
  applyElectronicPetCommandV1,
  evaluateElectronicPetCommandV1,
  projectElectronicPetInspectorV1,
  projectElectronicPetPlayerViewV1,
} from "../game/rules.ts";
import { createInitialElectronicPetStateV1, electronicPetStateSchemaV1 } from "../game/state.ts";
import type { ElectronicPetStateV1 } from "../game/state.ts";
import { electronicPetActivityDefinitionsV1 } from "../content/activities.ts";
import { electronicPetPreferenceForActivityV1 } from "../content/cat.ts";
import type { IsoUtcInstant } from "@sillymaker/base";
import { createTransactionalRngV1, parseNonZeroUint32 } from "@sillymaker/base";
import { createMemoryHostRecordStoreV1 } from "@sillymaker/base/testkit";
import type { ElectronicPetCareHudPropsV1 } from "../ui/pet-care-hud.tsx";

const neckStrokeV1 = (
  occurrence: number,
  direction: "with-fur" | "cross-fur" | "against-fur" = "with-fur",
) =>
  ({
    kind: "pet.contact_complete",
    expectedActivityOccurrence: occurrence,
    targetInteractionId: "interaction.pet.neck",
    gesture: "stroke",
    direction,
    speed: "slow",
    duration: "brief",
  }) as const satisfies ElectronicPetCommandV1;

const backGroomV1 = (
  occurrence: number,
  direction: "with-fur" | "cross-fur" | "against-fur" = "with-fur",
) =>
  ({
    kind: "pet.groom_complete",
    expectedActivityOccurrence: occurrence,
    targetInteractionId: "interaction.pet.groom.back",
    gesture: "stroke",
    direction,
    speed: "slow",
    duration: "brief",
  }) as const satisfies ElectronicPetCommandV1;

const bellyStrokeV1 = (input: {
  readonly occurrence?: number;
  readonly invitationOccurrence?: number;
  readonly direction?: "with-fur" | "cross-fur" | "against-fur";
  readonly speed?: "slow" | "steady" | "fast";
  readonly duration?: "brief" | "sustained";
} = {}) =>
  ({
    kind: "pet.belly_complete",
    expectedActivityOccurrence: input.occurrence ?? 4,
    ...(input.invitationOccurrence === undefined
      ? {}
      : { expectedInvitationOccurrence: input.invitationOccurrence }),
    targetInteractionId: "interaction.pet.belly",
    terminal: "completed_before_warning",
    gesture: "stroke",
    direction: input.direction ?? "with-fur",
    speed: input.speed ?? "slow",
    duration: input.duration ?? "brief",
  }) as const satisfies ElectronicPetCommandV1;

const bellyStopV1 = (
  terminal:
    | "stopped_before_warning"
    | "stopped_in_warning"
    | "continued_after_warning",
  input: { readonly occurrence?: number; readonly invitationOccurrence?: number } = {},
) =>
  ({
    kind: "pet.belly_complete",
    expectedActivityOccurrence: input.occurrence ?? 4,
    ...(input.invitationOccurrence === undefined
      ? {}
      : { expectedInvitationOccurrence: input.invitationOccurrence }),
    targetInteractionId: "interaction.pet.belly",
    terminal,
  }) as const satisfies ElectronicPetCommandV1;

function activeStateV1(input: {
  readonly activityId: ElectronicPetStateV1["companion"]["activity"]["activityId"];
  readonly poseId: ElectronicPetStateV1["companion"]["activity"]["poseId"];
  readonly worldMinute: number;
  readonly minimumUntilMinute: number;
  readonly needs: ElectronicPetStateV1["companion"]["needs"];
  readonly servings?: number;
}): ElectronicPetStateV1 {
  const initial = createInitialElectronicPetStateV1();
  return {
    ...initial,
    home: {
      ...initial.home,
      lastSettledWallTimeMs: 1_000_000,
      worldMinute: input.worldMinute,
      visitOrdinal: 1,
      setup: { waterReady: true, litterReady: true, hideawayReady: true },
      food: input.servings === undefined
        ? null
        : { foodId: "food.chicken", servings: input.servings },
    },
    relationship: {
      ...initial.relationship,
      trustStage: "familiar",
      facts: ["relationship.first_approach", "relationship.first_hand_sniff"],
    },
    companion: {
      ...initial.companion,
      needs: input.needs,
      activity: {
        activityId: input.activityId,
        poseId: input.poseId,
        occurrence: 4,
        startedAtMinute: input.worldMinute,
        minimumUntilMinute: input.minimumUntilMinute,
        reason: "food_need",
      },
      nextActivityOccurrence: 5,
      invitation: null,
      recentActivityIds: [input.activityId],
    },
  };
}

function bellyStateV1(input: {
  readonly visitOrdinal?: number;
  readonly trustStage?: ElectronicPetStateV1["relationship"]["trustStage"];
  readonly invitationOccurrence?: number;
  readonly boundaryRespect?: ElectronicPetStateV1["relationship"]["evidence"]["boundaryRespect"];
  readonly includeFirstGrooming?: boolean;
} = {}): ElectronicPetStateV1 {
  const state = activeStateV1({
    activityId: "belly_expose",
    poseId: "supine_relaxed",
    worldMinute: 30,
    minimumUntilMinute: 36,
    needs: { food: 20, rest: 20, safety: 20, stimulation: 20 },
  });
  return {
    ...state,
    home: { ...state.home, visitOrdinal: input.visitOrdinal ?? 1 },
    relationship: {
      ...state.relationship,
      trustStage: input.trustStage ?? "trusting",
      facts: input.includeFirstGrooming
        ? [...state.relationship.facts, "relationship.first_grooming" as const].toSorted()
        : state.relationship.facts,
      evidence: {
        ...state.relationship.evidence,
        boundaryRespect: input.boundaryRespect ?? state.relationship.evidence.boundaryRespect,
      },
    },
    companion: {
      ...state.companion,
      mood: { kind: "calm", cause: "care", sinceMinute: 30 },
      invitation: input.invitationOccurrence === undefined ? null : {
        kind: "belly_offer",
        occurrence: input.invitationOccurrence,
        activityOccurrence: state.companion.activity.occurrence,
        expiresAtMinute: 36,
      },
      nextInvitationOccurrence: input.invitationOccurrence === undefined
        ? state.companion.nextInvitationOccurrence
        : input.invitationOccurrence + 1,
    },
  };
}

describe("Electronic Pet authoritative domain", () => {
  it("keeps belly exposure separate from an exact current offer", () => {
    const exposed = bellyStateV1({ trustStage: "bonded" });
    expect(evaluateElectronicPetCommandV1(exposed, bellyStrokeV1())).toEqual({
      kind: "allowed",
      outcome: "warn",
    });

    const offered = bellyStateV1({ trustStage: "bonded", invitationOccurrence: 9 });
    expect(evaluateElectronicPetCommandV1(offered, bellyStrokeV1())).toEqual({
      kind: "blocked",
      code: "pet.invitation_stale",
    });
    expect(evaluateElectronicPetCommandV1(
      offered,
      bellyStrokeV1({ invitationOccurrence: 9 }),
    )).toEqual({ kind: "allowed", outcome: "accept" });
    expect(evaluateElectronicPetCommandV1(
      offered,
      bellyStrokeV1({ invitationOccurrence: 8 }),
    )).toEqual({ kind: "blocked", code: "pet.invitation_stale" });
    expect(evaluateElectronicPetCommandV1(
      offered,
      bellyStrokeV1({ occurrence: 3, invitationOccurrence: 9 }),
    )).toEqual({ kind: "blocked", code: "pet.activity_stale" });
    expect(evaluateElectronicPetCommandV1(
      offered,
      bellyStrokeV1({ invitationOccurrence: 9, speed: "fast" }),
    )).toEqual({ kind: "allowed", outcome: "warn" });
  });

  it("credits a pre-warning stop without an offer once per visit and reaches bonded", () => {
    const command = bellyStopV1("stopped_before_warning");
    const first = bellyStateV1({ includeFirstGrooming: true });
    expect(evaluateElectronicPetCommandV1(first, command)).toEqual({
      kind: "allowed",
      outcome: "accept",
    });
    const afterFirst = applyElectronicPetCommandV1(
      first,
      command,
      "accept",
      createTransactionalRngV1(parseNonZeroUint32(79)),
    );
    expect(afterFirst.relationship.evidence.boundaryRespect).toEqual({ count: 1, lastVisit: 1 });
    const sameVisit = applyElectronicPetCommandV1(
      afterFirst,
      command,
      "accept",
      createTransactionalRngV1(parseNonZeroUint32(81)),
    );
    expect(sameVisit.relationship.evidence.boundaryRespect).toEqual({ count: 1, lastVisit: 1 });

    const laterVisit = {
      ...sameVisit,
      home: { ...sameVisit.home, visitOrdinal: 2 },
    } satisfies ElectronicPetStateV1;
    const bonded = applyElectronicPetCommandV1(
      laterVisit,
      command,
      "accept",
      createTransactionalRngV1(parseNonZeroUint32(83)),
    );
    expect(bonded.relationship.evidence.boundaryRespect).toEqual({ count: 2, lastVisit: 2 });
    expect(bonded.relationship.trustStage).toBe("bonded");
    expect(bonded.relationship.facts).not.toContain("relationship.first_belly_contact");
  });

  it("does not bank belly-boundary evidence before the trusting stage", () => {
    for (const trustStage of ["newcomer", "familiar"] as const) {
      const state = bellyStateV1({ trustStage, includeFirstGrooming: true });
      const command = bellyStopV1("stopped_before_warning");
      expect(evaluateElectronicPetCommandV1(state, command)).toEqual({
        kind: "allowed",
        outcome: "warn",
      });

      const after = applyElectronicPetCommandV1(
        state,
        command,
        "warn",
        createTransactionalRngV1(parseNonZeroUint32(84)),
      );
      expect(after.relationship.evidence.boundaryRespect.count).toBe(0);
      expect(after.relationship.trustStage).toBe(trustStage);
      expect(after.companion.mood.kind).toBe("guarded");
    }
  });

  it("records an accepted belly offer and republishes its saved semantic result", () => {
    const state = bellyStateV1({ trustStage: "bonded", invitationOccurrence: 9 });
    const command = bellyStrokeV1({ invitationOccurrence: 9 });
    const after = applyElectronicPetCommandV1(
      state,
      command,
      evaluateElectronicPetCommandV1(state, command).kind === "allowed" ? "accept" : null,
      createTransactionalRngV1(parseNonZeroUint32(85)),
    );
    expect(after.relationship.evidence.invitationResponse).toEqual({ count: 1, lastVisit: 1 });
    expect(after.relationship.facts).toContain("relationship.first_belly_contact");
    expect(after.relationship.discoveredPreferenceIds).toContain("preference.contact.belly");
    expect(after.companion.invitation).toBeNull();
    expect(after.companion.recentMemory.at(-1)).toEqual({
      kind: "belly",
      targetInteractionId: "interaction.pet.belly",
      terminal: "completed_before_warning",
      outcome: "accept",
      atMinute: 30,
    });
    expect(electronicPetStateSchemaV1.parse(after)).toEqual(after);
    expect(projectElectronicPetPlayerViewV1(after)).toMatchObject({
      lastOutcome: "accept",
      lastInteractionKind: "belly",
      lastInteractionTargetId: "interaction.pet.belly",
      lastBellyTerminal: "completed_before_warning",
    });
  });

  it("treats stopping an offered belly interaction as boundary respect, not offer completion", () => {
    const state = bellyStateV1({ trustStage: "bonded", invitationOccurrence: 9 });
    const command = bellyStopV1("stopped_before_warning", { invitationOccurrence: 9 });
    expect(evaluateElectronicPetCommandV1(state, command)).toEqual({
      kind: "allowed",
      outcome: "accept",
    });

    const after = applyElectronicPetCommandV1(
      state,
      command,
      "accept",
      createTransactionalRngV1(parseNonZeroUint32(86)),
    );
    expect(after.relationship.evidence.boundaryRespect).toEqual({ count: 1, lastVisit: 1 });
    expect(after.relationship.evidence.invitationResponse.count).toBe(0);
    expect(after.relationship.facts).not.toContain("relationship.first_belly_contact");
    expect(after.relationship.discoveredPreferenceIds).not.toContain("preference.contact.belly");
  });

  it("separates warning recovery from continued boundary escalation", () => {
    const state = bellyStateV1({
      invitationOccurrence: 9,
      boundaryRespect: { count: 1, lastVisit: 1 },
    });
    const stopped = bellyStopV1("stopped_in_warning", { invitationOccurrence: 9 });
    expect(evaluateElectronicPetCommandV1(state, stopped)).toEqual({
      kind: "allowed",
      outcome: "warn",
    });
    const recovered = applyElectronicPetCommandV1(
      state,
      stopped,
      "warn",
      createTransactionalRngV1(parseNonZeroUint32(87)),
    );
    expect(recovered.companion.mood.kind).toBe("calm");
    expect(recovered.relationship.evidence.boundaryRespect).toEqual({ count: 1, lastVisit: 1 });
    expect(recovered.relationship.evidence.invitationResponse.count).toBe(0);

    const continued = bellyStopV1("continued_after_warning", { invitationOccurrence: 9 });
    expect(evaluateElectronicPetCommandV1(state, continued)).toEqual({
      kind: "allowed",
      outcome: "refuse",
    });
    const escalated = applyElectronicPetCommandV1(
      state,
      continued,
      "refuse",
      createTransactionalRngV1(parseNonZeroUint32(89)),
    );
    expect(escalated.companion.mood.kind).toBe("overstimulated");
    expect(escalated.companion.activity).toMatchObject({
      activityId: "observe_player",
      poseId: "watching",
      occurrence: 5,
      reason: "boundary",
    });
    expect(escalated.companion.nextActivityOccurrence).toBe(6);
    expect(escalated.relationship.evidence.boundaryRespect).toEqual({ count: 1, lastVisit: 1 });
  });
  it("starts with one guarded newcomer and exposes only coarse player needs", async () => {
    const application = await createElectronicPetApplicationInstanceV1();
    try {
      const snapshot = application.admin.inspectForTest().snapshot.state.simulation.pet;
      expect(snapshot.relationship.trustStage).toBe("newcomer");
      expect(snapshot.companion.activity).toMatchObject({
        activityId: "hide_in_den",
        poseId: "hidden",
        occurrence: 1,
      });
      expect(application.semantic.observe().game).toMatchObject({
        progression: "arrival",
        trustStage: "newcomer",
        activityId: "hide_in_den",
        needBands: { safety: "needs-care" },
      });
      expect(application.semantic.observe().game).not.toHaveProperty("needs");
    } finally {
      await application.dispose();
    }
  });

  it("commits home care atomically and credits it once per visit", async () => {
    const application = await createElectronicPetApplicationInstanceV1();
    try {
      await expect(application.semantic.dispatch({ kind: "pet.home_prepare", resource: "water" }))
        .resolves.toMatchObject({ kind: "committed" });
      const after = application.admin.inspectForTest().snapshot.state.simulation.pet;
      expect(after.home.setup.waterReady).toBe(true);
      expect(after.relationship.evidence.calmCare).toEqual({ count: 1, lastVisit: 0 });
      expect(after.companion.recentMemory.at(-1)).toMatchObject({
        kind: "care",
        actionId: "care.prepare.water",
      });
      expect(application.semantic.observe().game.lastOutcome).toBeNull();
      const digest = application.admin.stateDigest();
      await expect(application.semantic.dispatch({ kind: "pet.home_prepare", resource: "water" }))
        .resolves.toEqual({ kind: "rejected", codes: ["pet.action_unavailable"] });
      expect(application.admin.stateDigest()).toBe(digest);
    } finally {
      await application.dispose();
    }
  });

  it("uses the same pure contact evaluation for preview and execution", async () => {
    const application = await createElectronicPetApplicationInstanceV1();
    try {
      for (const resource of ["water", "litter", "hideaway"] as const) {
        await application.semantic.dispatch({ kind: "pet.home_prepare", resource });
      }
      await application.semantic.dispatch({ kind: "pet.food_place", foodId: "food.chicken" });
      await application.semantic.dispatch({
        kind: "pet.quiet_presence",
        expectedActivityOccurrence: application.semantic.observe().game.activityOccurrence,
      });
      const invitation = application.semantic.observe().game.invitation;
      if (invitation?.kind !== "sniff_hand") throw new TypeError("sniff invitation unavailable");
      await application.semantic.dispatch({
        kind: "pet.hand_offer",
        expectedActivityOccurrence: application.semantic.observe().game.activityOccurrence,
        expectedInvitationOccurrence: invitation.occurrence,
      });
      const occurrence = application.semantic.observe().game.activityOccurrence;
      const command = neckStrokeV1(occurrence);
      const preview = await application.semantic.preview(command);
      expect(preview.kind).toBe("allowed");
      const result = await application.semantic.dispatch(command);
      expect(result.kind).toBe("committed");
      const memory = application.admin.inspectForTest().snapshot.state.simulation.pet.companion
        .recentMemory.at(-1);
      expect(memory).toMatchObject({
        kind: "contact",
        targetInteractionId: "interaction.pet.neck",
        direction: "with-fur",
      });
      if (preview.kind === "allowed") expect(memory).toMatchObject({ outcome: preview.outcome });
      expect(application.semantic.observe().game.invitation).toBeNull();
    } finally {
      await application.dispose();
    }
  });

  it("lets quiet presence move a prepared arrival directly to a sniff invitation", async () => {
    const application = await createElectronicPetApplicationInstanceV1();
    try {
      for (const resource of ["water", "litter", "hideaway"] as const) {
        await application.semantic.dispatch({ kind: "pet.home_prepare", resource });
      }
      await application.semantic.dispatch({ kind: "pet.food_place", foodId: "food.chicken" });

      expect(application.semantic.observe().game).toMatchObject({
        progression: "arrival",
        activityId: "observe_player",
        activityReason: "arrival",
        invitation: null,
      });

      await application.semantic.dispatch({
        kind: "pet.quiet_presence",
        expectedActivityOccurrence: application.semantic.observe().game.activityOccurrence,
      });
      const approached = application.semantic.observe().game;
      expect(approached).toMatchObject({
        progression: "approach",
        activityId: "approach_player",
        activityReason: "social_interest",
        invitation: {
          kind: "sniff_hand",
          activityOccurrence: approached.activityOccurrence,
        },
      });

      await expect(application.semantic.dispatch({
        kind: "pet.hand_offer",
        expectedActivityOccurrence: approached.activityOccurrence,
        expectedInvitationOccurrence: approached.invitation!.occurrence,
      })).resolves.toMatchObject({
        kind: "committed",
        game: { trustStage: "familiar", invitation: null },
      });
    } finally {
      await application.dispose();
    }
  });

  it("keeps the one-minute arrival transition as a passive fallback", async () => {
    const application = await createElectronicPetApplicationInstanceV1();
    try {
      for (const resource of ["water", "litter", "hideaway"] as const) {
        await application.semantic.dispatch({ kind: "pet.home_prepare", resource });
      }
      await application.semantic.dispatch({ kind: "pet.food_place", foodId: "food.chicken" });
      await application.semantic.dispatch({
        kind: "pet.time_settle",
        mode: "active",
        observedAtMs: 60_000,
        elapsedMs: 60_000,
      });
      expect(application.semantic.observe().game).toMatchObject({
        activityId: "approach_player",
        invitation: { kind: "sniff_hand" },
      });
    } finally {
      await application.dispose();
    }
  });

  it("rejects hidden contact without changing mood, State, or RNG", async () => {
    const application = await createElectronicPetApplicationInstanceV1();
    try {
      const before = application.admin.inspectForTest().snapshot;
      const digest = application.admin.stateDigest();
      await expect(application.semantic.dispatch(neckStrokeV1(1))).resolves.toEqual({
        kind: "rejected",
        codes: ["pet.target_unavailable"],
      });
      const after = application.admin.inspectForTest().snapshot;
      expect(after.state.simulation.pet.companion.mood).toEqual(
        before.state.simulation.pet.companion.mood,
      );
      expect(application.admin.stateDigest()).toBe(digest);
      expect(after.rng).toEqual(before.rng);
    } finally {
      await application.dispose();
    }
  });

  it("rejects forged play while the newcomer is hidden without changing State or RNG", async () => {
    const application = await createElectronicPetApplicationInstanceV1();
    try {
      const before = application.admin.inspectForTest().snapshot;
      const digest = application.admin.stateDigest();
      await expect(application.semantic.dispatch({
        kind: "pet.play_complete",
        expectedActivityOccurrence: 1,
        toyId: "toy.wand",
        roundResult: "caught",
      })).resolves.toEqual({ kind: "rejected", codes: ["pet.action_unavailable"] });
      expect(application.admin.stateDigest()).toBe(digest);
      expect(application.admin.inspectForTest().snapshot.rng).toEqual(before.rng);
    } finally {
      await application.dispose();
    }
  });

  it("does not let sniff-hand or shared-play invitations authorize a stroke target", () => {
    const initial = createInitialElectronicPetStateV1();
    for (const invitationKind of ["sniff_hand", "shared_play"] as const) {
      const state = {
        ...initial,
        companion: {
          ...initial.companion,
          activity: {
            ...initial.companion.activity,
            activityId: "approach_player" as const,
            poseId: "near_player" as const,
          },
          invitation: {
            kind: invitationKind,
            occurrence: 7,
            activityOccurrence: initial.companion.activity.occurrence,
            expiresAtMinute: 3,
          },
        },
      };
      expect(
        evaluateElectronicPetCommandV1(state, {
          ...neckStrokeV1(state.companion.activity.occurrence),
          expectedInvitationOccurrence: 7,
        }),
      ).toEqual({ kind: "blocked", code: "pet.target_unavailable" });
    }
  });

  it("shows a newcomer refusal without treating premature contact as preference evidence", () => {
    const initial = createInitialElectronicPetStateV1();
    const state = {
      ...initial,
      companion: {
        ...initial.companion,
        activity: {
          ...initial.companion.activity,
          activityId: "approach_player" as const,
          poseId: "near_player" as const,
        },
      },
    };
    expect(evaluateElectronicPetCommandV1(state, neckStrokeV1(1))).toEqual({
      kind: "allowed",
      outcome: "refuse",
    });
    const after = applyElectronicPetCommandV1(
      state,
      neckStrokeV1(1),
      "refuse",
      createTransactionalRngV1(parseNonZeroUint32(61)),
    );
    expect(after.relationship.facts).not.toContain("relationship.first_contact");
    expect(after.relationship.discoveredPreferenceIds).toEqual([]);
    expect(after.companion.mood.kind).toBe("guarded");
    expect(after.companion.recentMemory.at(-1)).toMatchObject({
      kind: "contact",
      targetInteractionId: "interaction.pet.neck",
      outcome: "refuse",
    });
    expect(
      evaluateElectronicPetCommandV1(
        { ...state, relationship: { ...state.relationship, trustStage: "familiar" } },
        neckStrokeV1(1),
      ),
    ).toMatchObject({ kind: "allowed" });
  });

  it("limits a head-contact invitation to the face and neck", () => {
    const initial = createInitialElectronicPetStateV1();
    const state = {
      ...initial,
      companion: {
        ...initial.companion,
        mood: { kind: "social" as const, cause: "contact" as const, sinceMinute: 0 },
        activity: {
          ...initial.companion.activity,
          activityId: "approach_player" as const,
          poseId: "near_player" as const,
        },
        invitation: {
          kind: "head_contact" as const,
          occurrence: 9,
          activityOccurrence: initial.companion.activity.occurrence,
          expiresAtMinute: 3,
        },
      },
    };
    expect(
      evaluateElectronicPetCommandV1(state, {
        ...neckStrokeV1(state.companion.activity.occurrence),
        expectedInvitationOccurrence: 9,
      }),
    ).toMatchObject({ kind: "allowed" });
    expect(
      evaluateElectronicPetCommandV1(state, {
        ...neckStrokeV1(state.companion.activity.occurrence),
        targetInteractionId: "interaction.pet.back",
        expectedInvitationOccurrence: 9,
      }),
    ).toEqual({ kind: "blocked", code: "pet.target_unavailable" });
    expect(
      evaluateElectronicPetCommandV1({
        ...state,
        companion: {
          ...state.companion,
          invitation: { ...state.companion.invitation, activityOccurrence: 8 },
        },
      }, {
        ...neckStrokeV1(state.companion.activity.occurrence),
        expectedInvitationOccurrence: 9,
      }),
    ).toEqual({ kind: "blocked", code: "pet.invitation_stale" });
  });

  it("makes with-fur contact better than against-fur under identical state", () => {
    const initial = createInitialElectronicPetStateV1();
    const state = {
      ...initial,
      relationship: { ...initial.relationship, trustStage: "familiar" as const },
      companion: {
        ...initial.companion,
        mood: { kind: "social" as const, cause: "contact" as const, sinceMinute: 0 },
        activity: {
          ...initial.companion.activity,
          activityId: "approach_player" as const,
          poseId: "near_player" as const,
        },
      },
    };
    expect(evaluateElectronicPetCommandV1(state, neckStrokeV1(1, "with-fur"))).toEqual({
      kind: "allowed",
      outcome: "accept",
    });
    expect(evaluateElectronicPetCommandV1(state, neckStrokeV1(1, "against-fur"))).toEqual({
      kind: "allowed",
      outcome: "warn",
    });
  });

  it("gates grooming on current activity, authored target, and trusting", () => {
    const familiar = activeStateV1({
      activityId: "rest_nearby",
      poseId: "resting",
      worldMinute: 20,
      minimumUntilMinute: 32,
      needs: { food: 20, rest: 20, safety: 20, stimulation: 20 },
    });
    expect(evaluateElectronicPetCommandV1(familiar, backGroomV1(4))).toEqual({
      kind: "blocked",
      code: "pet.action_unavailable",
    });

    const trusting = {
      ...familiar,
      relationship: { ...familiar.relationship, trustStage: "trusting" as const },
      companion: {
        ...familiar.companion,
        mood: { kind: "social" as const, cause: "contact" as const, sinceMinute: 20 },
      },
    };
    expect(evaluateElectronicPetCommandV1(trusting, backGroomV1(3))).toEqual({
      kind: "blocked",
      code: "pet.activity_stale",
    });
    expect(evaluateElectronicPetCommandV1(trusting, {
      ...backGroomV1(4),
      targetInteractionId: "interaction.pet.back",
    })).toEqual({ kind: "blocked", code: "pet.target_unavailable" });
    expect(evaluateElectronicPetCommandV1({
      ...trusting,
      companion: {
        ...trusting.companion,
        activity: { ...trusting.companion.activity, poseId: "watching" as const },
      },
    }, backGroomV1(4))).toEqual({ kind: "blocked", code: "pet.target_unavailable" });
    expect(evaluateElectronicPetCommandV1(trusting, backGroomV1(4))).toEqual({
      kind: "allowed",
      outcome: "accept",
    });
  });

  it("records one accepted grooming result without turning refusals into progress", () => {
    const initial = activeStateV1({
      activityId: "rest_nearby",
      poseId: "resting",
      worldMinute: 20,
      minimumUntilMinute: 32,
      needs: { food: 20, rest: 20, safety: 20, stimulation: 20 },
    });
    const trusting = {
      ...initial,
      relationship: { ...initial.relationship, trustStage: "trusting" as const },
      companion: {
        ...initial.companion,
        mood: { kind: "social" as const, cause: "contact" as const, sinceMinute: 20 },
      },
    };
    const accepted = applyElectronicPetCommandV1(
      trusting,
      backGroomV1(4),
      "accept",
      createTransactionalRngV1(parseNonZeroUint32(63)),
    );
    expect(accepted.relationship.facts).toContain("relationship.first_grooming");
    expect(accepted.relationship.discoveredPreferenceIds).toContain(
      "preference.care.grooming",
    );
    expect(accepted.companion.recentMemory.at(-1)).toEqual({
      kind: "care",
      actionId: "care.groom.back",
      outcome: "accept",
      atMinute: 20,
    });
    expect(accepted.companion.mood).toMatchObject({ kind: "social", cause: "care" });
    expect(projectElectronicPetPlayerViewV1(accepted)).toMatchObject({
      lastOutcome: "accept",
      lastInteractionKind: "grooming",
    });

    const upset = {
      ...trusting,
      companion: {
        ...trusting.companion,
        mood: { kind: "overstimulated" as const, cause: "contact" as const, sinceMinute: 20 },
      },
    };
    const refusedCommand = {
      ...backGroomV1(4, "against-fur"),
      speed: "fast" as const,
      duration: "sustained" as const,
    };
    expect(evaluateElectronicPetCommandV1(upset, refusedCommand)).toEqual({
      kind: "allowed",
      outcome: "refuse",
    });
    const refused = applyElectronicPetCommandV1(
      upset,
      refusedCommand,
      "refuse",
      createTransactionalRngV1(parseNonZeroUint32(65)),
    );
    expect(refused.relationship.facts).not.toContain("relationship.first_grooming");
    expect(refused.relationship.discoveredPreferenceIds).not.toContain(
      "preference.care.grooming",
    );
    expect(refused.companion.mood).toMatchObject({ kind: "guarded", cause: "care" });
  });

  it("lets a recent refusal reduce acceptance for the same contact area", () => {
    const initial = createInitialElectronicPetStateV1();
    const state = {
      ...initial,
      relationship: { ...initial.relationship, trustStage: "familiar" as const },
      companion: {
        ...initial.companion,
        mood: { kind: "social" as const, cause: "contact" as const, sinceMinute: 0 },
        activity: {
          ...initial.companion.activity,
          activityId: "approach_player" as const,
          poseId: "near_player" as const,
        },
      },
    };
    const command = {
      ...neckStrokeV1(1),
      targetInteractionId: "interaction.pet.back",
    } as const;
    expect(evaluateElectronicPetCommandV1(state, command)).toEqual({
      kind: "allowed",
      outcome: "accept",
    });
    expect(evaluateElectronicPetCommandV1({
      ...state,
      companion: {
        ...state.companion,
        recentMemory: [{
          kind: "contact" as const,
          targetInteractionId: "interaction.pet.back",
          direction: "against-fur" as const,
          outcome: "refuse" as const,
          atMinute: 0,
        }],
      },
    }, command)).toEqual({ kind: "allowed", outcome: "tolerate" });
  });

  it("rejects stale activity and invitation fences without State or RNG changes", async () => {
    const application = await createElectronicPetApplicationInstanceV1();
    try {
      const before = application.admin.inspectForTest().snapshot;
      const digest = application.admin.stateDigest();
      await expect(application.semantic.dispatch(neckStrokeV1(99))).resolves.toEqual({
        kind: "rejected",
        codes: ["pet.activity_stale"],
      });
      await expect(
        application.semantic.dispatch({ ...neckStrokeV1(1), expectedInvitationOccurrence: 99 }),
      ).resolves.toEqual({ kind: "rejected", codes: ["pet.invitation_stale"] });
      expect(application.admin.stateDigest()).toBe(digest);
      expect(application.admin.inspectForTest().snapshot.rng).toEqual(before.rng);
    } finally {
      await application.dispose();
    }
  });

  it("samples wall time once, prevents reload visit farming, and settles a real return in O(1)", async () => {
    const application = await createElectronicPetApplicationInstanceV1();
    try {
      await application.semantic.dispatch({
        kind: "pet.time_settle",
        mode: "session_open",
        observedAtMs: 1_000_000,
        elapsedMs: 0,
      });
      expect(application.admin.inspectForTest().snapshot.state.simulation.pet.home.visitOrdinal)
        .toBe(1);
      await application.semantic.dispatch({
        kind: "pet.time_settle",
        mode: "session_open",
        observedAtMs: 1_300_000,
        elapsedMs: 0,
      });
      expect(application.admin.inspectForTest().snapshot.state.simulation.pet.home.visitOrdinal)
        .toBe(1);
      await application.semantic.dispatch({
        kind: "pet.time_settle",
        mode: "active",
        observedAtMs: 1_600_000,
        elapsedMs: 300_000,
      });
      await application.semantic.dispatch({
        kind: "pet.time_settle",
        mode: "session_open",
        observedAtMs: 2_500_000,
        elapsedMs: 0,
      });
      const home = application.admin.inspectForTest().snapshot.state.simulation.pet.home;
      expect(home.visitOrdinal).toBe(2);
      expect(home.lastSettledWallTimeMs).toBe(2_500_000);
      expect(home.returnSummary).toEqual({
        visitOrdinal: 2,
        elapsedMinutes: 15,
        eventIds: ["return.time_passed"],
      });
    } finally {
      await application.dispose();
    }
  });

  it("uses Host-reported visible elapsed time for active settlement", () => {
    const rng = createTransactionalRngV1(parseNonZeroUint32(59));
    let state = createInitialElectronicPetStateV1();
    state = applyElectronicPetCommandV1(
      state,
      {
        kind: "pet.time_settle",
        mode: "session_open",
        observedAtMs: 1_000_000,
        elapsedMs: 0,
      },
      null,
      rng,
    );
    state = applyElectronicPetCommandV1(
      state,
      {
        kind: "pet.time_settle",
        mode: "active",
        observedAtMs: 86_000_000,
        elapsedMs: 60_000,
      },
      null,
      rng,
    );
    expect(state.home.worldMinute).toBe(1);
    expect(state.home.visitOrdinal).toBe(1);
    expect(state.home.returnSummary).toBeNull();
    expect(state.home.lastSettledWallTimeMs).toBe(86_000_000);
  });

  it("settles need pressure at world-minute crossings independent of Host batching", () => {
    const initial = activeStateV1({
      activityId: "observe_player",
      poseId: "watching",
      worldMinute: 0,
      minimumUntilMinute: 10_000,
      needs: { food: 10, rest: 10, safety: 50, stimulation: 10 },
      servings: 2,
    });
    const batchedRng = createTransactionalRngV1(parseNonZeroUint32(61));
    const granularRng = createTransactionalRngV1(parseNonZeroUint32(61));
    const batched = applyElectronicPetCommandV1(
      initial,
      {
        kind: "pet.time_settle",
        mode: "active",
        observedAtMs: 19_000_000,
        elapsedMs: 300 * 60_000,
      },
      null,
      batchedRng,
    );
    let granular = initial;
    for (let minute = 1; minute <= 300; minute += 1) {
      granular = applyElectronicPetCommandV1(
        granular,
        {
          kind: "pet.time_settle",
          mode: "active",
          observedAtMs: 1_000_000 + minute * 60_000,
          elapsedMs: 60_000,
        },
        null,
        granularRng,
      );
    }

    expect(granular.companion.needs).toEqual(batched.companion.needs);
    expect(granular.companion.needs).toEqual({
      food: 25,
      rest: 20,
      safety: 30,
      stimulation: 22,
    });
    expect(granular.home.worldMinute).toBe(300);
    expect(granular.companion.activity).toEqual(initial.companion.activity);
    expect(granularRng.attemptedDraws()).toEqual([]);
    expect(batchedRng.attemptedDraws()).toEqual([]);

    const beforeFoodCrossing = activeStateV1({
      activityId: "observe_player",
      poseId: "watching",
      worldMinute: 19,
      minimumUntilMinute: 10_000,
      needs: { food: 10, rest: 10, safety: 10, stimulation: 10 },
      servings: 2,
    });
    const atFoodCrossing = applyElectronicPetCommandV1(
      beforeFoodCrossing,
      {
        kind: "pet.time_settle",
        mode: "active",
        observedAtMs: 1_060_000,
        elapsedMs: 60_000,
      },
      null,
      createTransactionalRngV1(parseNonZeroUint32(63)),
    );
    const afterFoodCrossing = applyElectronicPetCommandV1(
      atFoodCrossing,
      {
        kind: "pet.time_settle",
        mode: "active",
        observedAtMs: 1_120_000,
        elapsedMs: 60_000,
      },
      null,
      createTransactionalRngV1(parseNonZeroUint32(65)),
    );
    expect(atFoodCrossing.companion.needs.food).toBe(11);
    expect(afterFoodCrossing.companion.needs.food).toBe(11);
  });

  it("keeps the same urgent activity through its minimum stay, then settles it once", () => {
    const rng = createTransactionalRngV1(parseNonZeroUint32(67));
    const eating = activeStateV1({
      activityId: "eat_at_bowl",
      poseId: "eating",
      worldMinute: 720,
      minimumUntilMinute: 724,
      needs: { food: 71, rest: 20, safety: 20, stimulation: 20 },
      servings: 2,
    });
    const held = applyElectronicPetCommandV1(
      eating,
      {
        kind: "pet.time_settle",
        mode: "active",
        observedAtMs: 1_060_000,
        elapsedMs: 60_000,
      },
      null,
      rng,
    );
    expect(held.companion.activity).toEqual(eating.companion.activity);
    expect(held.home.food).toEqual({ foodId: "food.chicken", servings: 2 });
    expect(rng.attemptedDraws()).toEqual([]);

    const completed = applyElectronicPetCommandV1(
      held,
      {
        kind: "pet.time_settle",
        mode: "active",
        observedAtMs: 1_240_000,
        elapsedMs: 180_000,
      },
      null,
      rng,
    );
    expect(completed.home.food).toEqual({ foodId: "food.chicken", servings: 1 });
    expect(completed.companion.needs.food).toBe(26);
    expect(completed.companion.activity.activityId).not.toBe("eat_at_bowl");
    expect(completed.companion.activity.occurrence).toBe(5);
  });

  it("keeps an established home ready after the bowl's last serving is eaten", () => {
    const rng = createTransactionalRngV1(parseNonZeroUint32(69));
    const eating = activeStateV1({
      activityId: "eat_at_bowl",
      poseId: "eating",
      worldMinute: 0,
      minimumUntilMinute: 4,
      needs: { food: 35, rest: 15, safety: 20, stimulation: 25 },
      servings: 1,
    });
    const established = {
      ...eating,
      relationship: {
        ...eating.relationship,
        facts: [...eating.relationship.facts, "home.food_ready" as const].toSorted(),
      },
    } satisfies ElectronicPetStateV1;

    const completed = applyElectronicPetCommandV1(
      established,
      {
        kind: "pet.time_settle",
        mode: "active",
        observedAtMs: 1_240_000,
        elapsedMs: 4 * 60_000,
      },
      null,
      rng,
    );
    expect(completed.home.food).toBeNull();
    expect(completed.relationship.facts).toContain("home.food_ready");
    expect(completed.companion.needs.food).toBe(0);
    expect(completed.companion.activity.activityId).not.toBe("hide_in_den");
    expect(completed.companion.activity.reason).not.toBe("safety_need");
  });

  it("projects only currently reachable one-shot and contact actions", () => {
    const observing = activeStateV1({
      activityId: "observe_player",
      poseId: "watching",
      worldMinute: 20,
      minimumUntilMinute: 25,
      needs: { food: 20, rest: 20, safety: 20, stimulation: 20 },
      servings: 2,
    });
    const observingView = projectElectronicPetPlayerViewV1(observing);
    expect(observingView.quietPresenceAvailable).toBe(false);
    expect(evaluateElectronicPetCommandV1(observing, {
      kind: "pet.quiet_presence",
      expectedActivityOccurrence: observing.companion.activity.occurrence,
    })).toEqual({ kind: "blocked", code: "pet.action_unavailable" });
    const observingActions = electronicPetSemanticAdapterV1.actions({
      state: observing,
      player: observingView,
    });
    expect(observingActions.find((action) => action.actionId === "care.quiet_presence"))
      .toMatchObject({ enabled: false });
    expect(observingActions.filter((action) => action.actionId.startsWith("pet.stroke_")))
      .toEqual([
        { actionId: "pet.stroke_face", enabled: true },
        { actionId: "pet.stroke_neck", enabled: false },
        { actionId: "pet.stroke_back", enabled: false },
      ]);

    const hidden = {
      ...observing,
      companion: {
        ...observing.companion,
        activity: {
          ...observing.companion.activity,
          activityId: "hide_in_den" as const,
          poseId: "hidden" as const,
        },
      },
    };
    const hiddenActions = electronicPetSemanticAdapterV1.actions({
      state: hidden,
      player: projectElectronicPetPlayerViewV1(hidden),
    });
    expect(hiddenActions.filter((action) => action.actionId.startsWith("pet.stroke_")))
      .toEqual([
        { actionId: "pet.stroke_face", enabled: false },
        { actionId: "pet.stroke_neck", enabled: false },
        { actionId: "pet.stroke_back", enabled: false },
      ]);
  });

  it("lets a different urgent need interrupt without crediting unfinished activity", () => {
    const rng = createTransactionalRngV1(parseNonZeroUint32(71));
    const resting = activeStateV1({
      activityId: "rest_nearby",
      poseId: "resting",
      worldMinute: 10,
      minimumUntilMinute: 22,
      needs: { food: 70, rest: 80, safety: 20, stimulation: 20 },
      servings: 2,
    });
    const interrupted = applyElectronicPetCommandV1(
      resting,
      {
        kind: "pet.time_settle",
        mode: "active",
        observedAtMs: 1_060_000,
        elapsedMs: 60_000,
      },
      null,
      rng,
    );
    expect(interrupted.companion.activity.activityId).toBe("eat_at_bowl");
    expect(interrupted.companion.needs.rest).toBe(80);
    expect(interrupted.home.food).toEqual({ foodId: "food.chicken", servings: 2 });
  });

  it("settles only the current activity once across a bounded day-long return", () => {
    const rng = createTransactionalRngV1(parseNonZeroUint32(73));
    const eating = activeStateV1({
      activityId: "eat_at_bowl",
      poseId: "eating",
      worldMinute: 0,
      minimumUntilMinute: 4,
      needs: { food: 35, rest: 15, safety: 20, stimulation: 25 },
      servings: 2,
    });
    const returned = applyElectronicPetCommandV1(
      eating,
      {
        kind: "pet.time_settle",
        mode: "session_open",
        observedAtMs: 1_000_000 + 24 * 60 * 60 * 1_000,
        elapsedMs: 0,
      },
      null,
      rng,
    );
    expect(returned.home.worldMinute).toBe(24 * 60);
    expect(returned.home.food).toEqual({ foodId: "food.chicken", servings: 1 });
    expect(returned.companion.needs.food).toBe(55);
    expect(returned.companion.activity.occurrence).toBe(5);
  });

  it("re-anchors a session-open clock regression without offline progress", () => {
    const rng = createTransactionalRngV1(parseNonZeroUint32(79));
    const saved = activeStateV1({
      activityId: "rest_nearby",
      poseId: "resting",
      worldMinute: 10,
      minimumUntilMinute: 22,
      needs: { food: 20, rest: 20, safety: 20, stimulation: 20 },
    });
    expect(evaluateElectronicPetCommandV1(saved, {
      kind: "pet.time_settle",
      mode: "session_open",
      observedAtMs: 900_000,
      elapsedMs: 0,
    })).toEqual({ kind: "allowed", outcome: null });
    expect(evaluateElectronicPetCommandV1(saved, {
      kind: "pet.time_settle",
      mode: "active",
      observedAtMs: 900_000,
      elapsedMs: 60_000,
    })).toEqual({ kind: "blocked", code: "pet.clock_regressed" });

    const reopened = applyElectronicPetCommandV1(
      saved,
      {
        kind: "pet.time_settle",
        mode: "session_open",
        observedAtMs: 900_000,
        elapsedMs: 0,
      },
      null,
      rng,
    );
    expect(reopened.home.lastSettledWallTimeMs).toBe(900_000);
    expect(reopened.home.worldMinute).toBe(saved.home.worldMinute);
    expect(reopened.home.visitOrdinal).toBe(saved.home.visitOrdinal);
    expect(reopened.home.returnSummary).toBe(saved.home.returnSummary);
    expect(reopened.companion.activity).toEqual(saved.companion.activity);
  });

  it("lets reset clear a Save after startup settlement rejects", async () => {
    const order: string[] = [];
    const dispatch = vi.fn(async () => {
      order.push("settle");
      return order.filter((entry) => entry === "settle").length === 1
        ? { kind: "rejected" as const, codes: ["pet.clock_regressed" as const] }
        : { kind: "committed" as const, game: {} };
    });
    const clearAllSaves = vi.fn(async () => {
      order.push("clear");
    });
    const restart = vi.fn(async () => {
      order.push("restart");
      return { kind: "anchored" as const };
    });
    const createUi = electronicPetGameApplicationV1.ui as unknown as (input: {
      readonly instance: {
        readonly semantic: { dispatch: typeof dispatch };
        readonly lifecycle: { restart: typeof restart };
        readonly extensions: { sampleWallTimeMs(): number };
      };
      readonly clearAllSaves: typeof clearAllSaves;
    }) => {
      readonly slots?: {
        readonly hud?: (input: {
          readonly publication: { readonly view: ElectronicPetGameViewV1 };
        }) => ReactElement<ElectronicPetCareHudPropsV1>;
      };
    };
    const ui = createUi({
      instance: {
        semantic: { dispatch },
        lifecycle: { restart },
        extensions: { sampleWallTimeMs: () => 900_000 },
      },
      clearAllSaves,
    });
    const hud = ui.slots?.hud?.({
      publication: { view: {} as ElectronicPetGameViewV1 },
    });
    if (hud === undefined) throw new TypeError("electronic pet HUD unavailable");

    await hud.props.reset();

    expect(order).toEqual(["settle", "clear", "restart", "settle"]);
  });

  it("resumes the same Save and settles a bounded return through the Host clock", async () => {
    const records = createMemoryHostRecordStoreV1();
    let now = "2026-08-27T08:00:00.000Z" as IsoUtcInstant;
    const first = await createElectronicPetApplicationInstanceV1({ records, now: () => now });
    try {
      const observedAtMs = (first.extensions as { sampleWallTimeMs(): number }).sampleWallTimeMs();
      await first.semantic.dispatch({
        kind: "pet.time_settle",
        mode: "session_open",
        observedAtMs,
        elapsedMs: 0,
      });
      await first.semantic.dispatch({ kind: "pet.home_prepare", resource: "water" });
      await first.flushAutoSave();
    } finally {
      await first.dispose();
    }

    now = "2026-08-27T10:00:00.000Z" as IsoUtcInstant;
    const resumed = await createElectronicPetApplicationInstanceV1({ records, now: () => now });
    try {
      const beforeSettlement = resumed.admin.inspectForTest().snapshot.state.simulation.pet;
      expect(beforeSettlement.home.setup.waterReady).toBe(true);
      expect(beforeSettlement.home.visitOrdinal).toBe(1);

      await resumed.semantic.dispatch({
        kind: "pet.time_settle",
        mode: "session_open",
        observedAtMs: (resumed.extensions as { sampleWallTimeMs(): number }).sampleWallTimeMs(),
        elapsedMs: 0,
      });
      const afterSettlement = resumed.admin.inspectForTest().snapshot.state.simulation.pet;
      expect(afterSettlement.home.visitOrdinal).toBe(2);
      expect(afterSettlement.home.returnSummary).toEqual({
        visitOrdinal: 2,
        elapsedMinutes: 120,
        eventIds: ["return.time_passed"],
      });
      expect(afterSettlement.companion.needs.food).toBeLessThanOrEqual(100);
      expect(afterSettlement.companion.needs.rest).toBeLessThanOrEqual(100);
      expect(afterSettlement.companion.needs.safety).toBeGreaterThanOrEqual(0);
      expect(afterSettlement.companion.needs.stimulation).toBeLessThanOrEqual(100);
    } finally {
      await resumed.dispose();
    }
  });

  it("requires genuinely cross-visit evidence before establishing a routine", () => {
    const rng = createTransactionalRngV1(parseNonZeroUint32(53));
    let state = createInitialElectronicPetStateV1();
    state = applyElectronicPetCommandV1(
      state,
      {
        kind: "pet.time_settle",
        mode: "session_open",
        observedAtMs: 1_000_000,
        elapsedMs: 0,
      },
      null,
      rng,
    );
    for (const resource of ["water", "litter", "hideaway"] as const) {
      state = applyElectronicPetCommandV1(
        state,
        { kind: "pet.home_prepare", resource },
        "accept",
        rng,
      );
    }
    state = applyElectronicPetCommandV1(
      state,
      { kind: "pet.food_place", foodId: "food.chicken" },
      "accept",
      rng,
    );
    state = applyElectronicPetCommandV1(
      state,
      {
        kind: "pet.quiet_presence",
        expectedActivityOccurrence: state.companion.activity.occurrence,
      },
      "accept",
      rng,
    );
    state = applyElectronicPetCommandV1(
      state,
      {
        kind: "pet.hand_offer",
        expectedActivityOccurrence: state.companion.activity.occurrence,
        expectedInvitationOccurrence: state.companion.invitation!.occurrence,
      },
      "accept",
      rng,
    );
    state = applyElectronicPetCommandV1(
      state,
      {
        kind: "pet.play_complete",
        expectedActivityOccurrence: state.companion.activity.occurrence,
        toyId: "toy.wand",
        roundResult: "caught",
      },
      "accept",
      rng,
    );
    expect(state.relationship.facts).not.toContain("relationship.routine_established");

    state = applyElectronicPetCommandV1(
      state,
      {
        kind: "pet.time_settle",
        mode: "session_open",
        observedAtMs: 1_900_000,
        elapsedMs: 0,
      },
      null,
      rng,
    );
    state = applyElectronicPetCommandV1(
      state,
      { kind: "pet.food_place", foodId: "food.salmon" },
      "accept",
      rng,
    );
    expect(state.home.visitOrdinal).toBe(2);
    expect(state.relationship.evidence.calmCare.count).toBe(2);
    expect(state.relationship.facts).toContain("relationship.routine_established");
  });

  it("turns a later approach into a head-contact invitation only after routine", () => {
    const approachReadyStateV1 = (routineEstablished: boolean): ElectronicPetStateV1 => {
      const state = activeStateV1({
        activityId: "rest_nearby",
        poseId: "resting",
        worldMinute: 10,
        minimumUntilMinute: 10,
        needs: { food: 20, rest: 20, safety: 50, stimulation: 20 },
      });
      return {
        ...state,
        relationship: {
          ...state.relationship,
          facts: routineEstablished
            ? [
              "home.food_ready",
              "relationship.first_approach",
              "relationship.first_hand_sniff",
              "relationship.routine_established",
            ]
            : [
              "home.food_ready",
              "relationship.first_approach",
              "relationship.first_hand_sniff",
            ],
        },
        companion: {
          ...state.companion,
          recentActivityIds: ["hide_in_den", "observe_player"],
        },
      };
    };
    const settleV1 = (state: ElectronicPetStateV1): ElectronicPetStateV1 =>
      applyElectronicPetCommandV1(
        state,
        {
          kind: "pet.time_settle",
          mode: "active",
          observedAtMs: 1_060_000,
          elapsedMs: 60_000,
        },
        null,
        createTransactionalRngV1(parseNonZeroUint32(67)),
      );

    const beforeRoutine = settleV1(approachReadyStateV1(false));
    expect(beforeRoutine.companion.activity.activityId).toBe("approach_player");
    expect(beforeRoutine.companion.invitation).toMatchObject({
      kind: "sniff_hand",
      activityOccurrence: beforeRoutine.companion.activity.occurrence,
    });

    const afterRoutine = settleV1(approachReadyStateV1(true));
    expect(afterRoutine.companion.activity.activityId).toBe("approach_player");
    expect(afterRoutine.companion.invitation).toMatchObject({
      kind: "head_contact",
      activityOccurrence: afterRoutine.companion.activity.occurrence,
    });
  });

  it("credits only an accepted current head invitation and advances trusting across visits", () => {
    const headInvitationStateV1 = (visitOrdinal: number): ElectronicPetStateV1 => {
      const state = activeStateV1({
        activityId: "approach_player",
        poseId: "near_player",
        worldMinute: 20,
        minimumUntilMinute: 23,
        needs: { food: 20, rest: 20, safety: 20, stimulation: 20 },
      });
      return {
        ...state,
        home: { ...state.home, visitOrdinal },
        relationship: {
          ...state.relationship,
          facts: [
            "relationship.first_approach",
            "relationship.first_hand_sniff",
            "relationship.first_shared_play",
            "relationship.routine_established",
          ],
          evidence: {
            ...state.relationship.evidence,
            calmCare: { count: 2, lastVisit: visitOrdinal },
            invitationResponse: { count: 1, lastVisit: 1 },
            sharedPlay: { count: 1, lastVisit: 1 },
          },
        },
        companion: {
          ...state.companion,
          mood: { kind: "social", cause: "contact", sinceMinute: 20 },
          invitation: {
            kind: "head_contact",
            occurrence: 9,
            activityOccurrence: state.companion.activity.occurrence,
            expiresAtMinute: 23,
          },
        },
      };
    };
    const acceptedCommand = {
      ...neckStrokeV1(4),
      expectedInvitationOccurrence: 9,
    } as const;

    const sameVisit = headInvitationStateV1(1);
    expect(evaluateElectronicPetCommandV1(sameVisit, acceptedCommand)).toEqual({
      kind: "allowed",
      outcome: "accept",
    });
    const sameVisitAfter = applyElectronicPetCommandV1(
      sameVisit,
      acceptedCommand,
      "accept",
      createTransactionalRngV1(parseNonZeroUint32(71)),
    );
    expect(sameVisitAfter.relationship.evidence.invitationResponse).toEqual({
      count: 1,
      lastVisit: 1,
    });
    expect(sameVisitAfter.relationship.trustStage).toBe("familiar");

    const laterVisit = headInvitationStateV1(2);
    const laterVisitAfter = applyElectronicPetCommandV1(
      laterVisit,
      acceptedCommand,
      "accept",
      createTransactionalRngV1(parseNonZeroUint32(73)),
    );
    expect(laterVisitAfter.relationship.evidence.invitationResponse).toEqual({
      count: 2,
      lastVisit: 2,
    });
    expect(laterVisitAfter.relationship.discoveredPreferenceIds).toContain(
      "preference.contact.neck",
    );
    expect(laterVisitAfter.relationship.trustStage).toBe("trusting");

    const toleratedVisit = headInvitationStateV1(2);
    const toleratedCommand = {
      ...neckStrokeV1(4, "cross-fur"),
      speed: "fast",
      expectedInvitationOccurrence: 9,
    } as const;
    expect(evaluateElectronicPetCommandV1(toleratedVisit, toleratedCommand)).toEqual({
      kind: "allowed",
      outcome: "tolerate",
    });
    const toleratedAfter = applyElectronicPetCommandV1(
      toleratedVisit,
      toleratedCommand,
      "tolerate",
      createTransactionalRngV1(parseNonZeroUint32(75)),
    );
    expect(toleratedAfter.relationship.evidence.invitationResponse).toEqual({
      count: 1,
      lastVisit: 1,
    });
    expect(toleratedAfter.relationship.trustStage).toBe("familiar");
  });

  it.each(["trusting", "bonded"] as const)(
    "never demotes an existing %s relationship stage",
    (trustStage) => {
      const state = activeStateV1({
        activityId: "rest_nearby",
        poseId: "resting",
        worldMinute: 20,
        minimumUntilMinute: 32,
        needs: { food: 20, rest: 20, safety: 20, stimulation: 20 },
      });
      const after = applyElectronicPetCommandV1(
        {
          ...state,
          relationship: { ...state.relationship, trustStage },
        },
        { kind: "pet.food_place", foodId: "food.chicken" },
        "accept",
        createTransactionalRngV1(parseNonZeroUint32(77)),
      );
      expect(after.relationship.trustStage).toBe(trustStage);
    },
  );

  it("bounds recent memory and keeps all nine autonomous activities product-local", () => {
    expect(electronicPetActivityDefinitionsV1.map((entry) => entry.activityId)).toEqual([
      "hide_in_den",
      "observe_player",
      "explore_room",
      "approach_player",
      "eat_at_bowl",
      "rest_nearby",
      "self_groom",
      "solo_ball_play",
      "belly_expose",
    ]);
    let state = createInitialElectronicPetStateV1();
    const rng = createTransactionalRngV1(parseNonZeroUint32(47));
    for (let index = 0; index < 12; index += 1) {
      const command = {
        kind: "pet.food_place",
        foodId: index % 2 === 0 ? "food.chicken" : "food.salmon",
      } as const satisfies ElectronicPetCommandV1;
      state = applyElectronicPetCommandV1(state, command, "accept", rng);
    }
    expect(state.companion.recentMemory).toHaveLength(8);
    expect(state.companion.recentActivityIds.length).toBeLessThanOrEqual(4);
    expect(electronicPetPreferenceForActivityV1("solo_ball_play")).toBeGreaterThan(
      electronicPetPreferenceForActivityV1("hide_in_den"),
    );
  });

  it("keeps exact rules in the Inspector projection rather than the player view", () => {
    const state = createInitialElectronicPetStateV1();
    expect(projectElectronicPetInspectorV1(state)).toMatchObject({
      needs: state.companion.needs,
      facts: [],
    });
    expect(projectElectronicPetPlayerViewV1(state)).not.toHaveProperty("facts");
    expect(projectElectronicPetPlayerViewV1(state)).not.toHaveProperty("needs");
  });

  it("publishes one current read-only Inspector projection and fences predecessor cleanup", async () => {
    const first = await createElectronicPetApplicationInstanceV1();
    const second = await createElectronicPetApplicationInstanceV1();
    try {
      const initial = electronicPetInspectorSourceV1.getSnapshot();
      expect(initial).toMatchObject({
        kind: "current",
        value: { activity: { reason: "arrival" } },
      });
      const revision = initial.kind === "current" ? initial.revision : -1;

      await second.semantic.dispatch({ kind: "pet.home_prepare", resource: "water" });
      const afterCare = electronicPetInspectorSourceV1.getSnapshot();
      expect(afterCare).toMatchObject({
        kind: "current",
        value: { needs: { safety: 65 } },
      });
      expect(afterCare.kind === "current" ? afterCare.revision : -1).toBeGreaterThan(revision);

      await first.dispose();
      expect(electronicPetInspectorSourceV1.getSnapshot().kind).toBe("current");
    } finally {
      await first.dispose();
      await second.dispose();
    }
    expect(electronicPetInspectorSourceV1.getSnapshot()).toEqual({ kind: "detached" });
  });
});
