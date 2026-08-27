// SPDX-License-Identifier: MIT
// Simulation kernel: the shared command/event/rejection contract, command
// schema, and the authoring kit feature slices build on. Aggregation
// lives in simulation.ts; feature slices live under game/features/.
import type {
  AudioIntentV1,
  CommandExecutionAttemptEnvelopeV1,
  GameSimulationTypeMapV1,
  GameSnapshotEnvelopeV1,
  NonZeroUint32,
  RngDrawTraceV1,
  RngStateV1,
  RuntimeSchemaV1,
} from "@sillymaker/base";
import type {
  InteractionRejectionCode,
  InteractionResolution,
  NarrativeHistory,
  PendingInteraction,
  SemanticStageState,
  StageCueDispatch,
  StageMutation,
  TimeTick,
  TimeTickRejectionCode,
} from "@sillymaker/base/story";
import {
  createGameAuthoringKit,
  parseInteractionOccurrenceId,
  parseInteractionResolution,
  parseStageCueDispatches,
  parseStageMutation,
  parseTimeTick,
} from "@sillymaker/base/story";

import type { VnReferenceTourGameStateV1 } from "./state.ts";
import { vnReferenceTourNarrativeStateSchemaV1 } from "./state.ts";
import type { VnReferenceTourNarrativeStateV1 } from "../story/narrative.ts";

export type VnReferenceTourCommandV1 =
  | { readonly kind: "vn-reference-tour.begin_story" }
  | {
    readonly kind: "vn-reference-tour.narrative_resolve";
    readonly expectedOccurrenceId: string;
    readonly resolution: InteractionResolution;
  }
  | {
    /**
     * The starter's carrier for the session-level time verb: one commit
     * settles every authoritative time consumer. A hold-fenced tick folds
     * the pending hold's remainder (stale fences reject the whole
     * command); an unfenced tick settles only session-global consumers —
     * none are registered yet, so it commits as an observable no-op.
     */
    readonly kind: "vn-reference-tour.time_tick";
    readonly tick: TimeTick;
  }
  | {
    /** Package-internal ordinary command used only by an R2 successor. */
    readonly kind: "vn-reference-tour.scene_reconcile";
    readonly mutations: readonly StageMutation[];
  };

/**
 * The starter's domain-event union: the only internal authoritative update
 * channel. The command handler decides and emits; module reducers fold the
 * admitted events into their slices atomically; the committed sequence is
 * the read-side journal. `vn-reference-tour.interaction_resolved` is journal-only
 * evidence — no module reduces it.
 */
export type VnReferenceTourEventV1 =
  | {
    readonly kind: "vn-reference-tour.stage_changed";
    readonly mutations: readonly StageMutation[];
    /**
     * The scene dispatches (cue references / whole-scene opens) that
     * produced these mutations, when the narrative run performed any. The
     * semantic adapter projects them into presentation edge context; like
     * every event this is deterministic execution output, not command input.
     */
    readonly dispatches?: readonly StageCueDispatch[];
  }
  | {
    readonly kind: "vn-reference-tour.narrative_advanced";
    readonly next: VnReferenceTourNarrativeStateV1;
  }
  | {
    readonly kind: "vn-reference-tour.interaction_resolved";
    readonly definitionId: string;
    readonly occurrenceId: string;
  };

export type VnReferenceTourRejectionCodeV1 =
  | "vn-reference-tour.narrative_busy"
  | "vn-reference-tour.stage_rejected"
  | InteractionRejectionCode
  | TimeTickRejectionCode;

export interface VnReferenceTourRejectionV1 {
  readonly code: VnReferenceTourRejectionCodeV1;
}

export interface VnReferenceTourFaultV1 {
  readonly code: "vn-reference-tour.executor_failed";
}

export interface VnReferenceTourDebugValidationErrorV1 {
  readonly code: "vn-reference-tour.debug_command_unsupported";
}

export interface VnReferenceTourQueriesV1 {
  readonly stage: SemanticStageState;
  readonly narrative: VnReferenceTourNarrativeStateV1;
}

export interface VnReferenceTourChoiceOptionViewV1 {
  readonly choiceId: string;
  readonly textId: string;
  readonly enabled: boolean;
  readonly blockedBy: null;
}

/** The player-safe narrative channel published to UI and agents. */
export interface VnReferenceTourNarrativeViewV1 {
  readonly phase: VnReferenceTourNarrativeStateV1["phase"];
  readonly pending: PendingInteraction | null;
  readonly choiceOptions: readonly VnReferenceTourChoiceOptionViewV1[] | null;
  readonly signalChoice: VnReferenceTourNarrativeStateV1["signalChoice"];
  readonly history: NarrativeHistory;
}

export interface VnReferenceTourGameViewV1 {
  /** The semantic stage target: plain saveable data, observable headless. */
  readonly stage: SemanticStageState;
  /** Save-restorable continuous audio projected from Narrative and Stage. */
  readonly audio: AudioIntentV1;
}

export interface VnReferenceTourBootstrapInputV1 {
  readonly rngSeed: NonZeroUint32;
}

export interface VnReferenceTourSimulationTypesV1 extends
  GameSimulationTypeMapV1<
    VnReferenceTourBootstrapInputV1,
    VnReferenceTourGameStateV1,
    RngStateV1
  > {
  readonly snapshot: GameSnapshotEnvelopeV1<VnReferenceTourGameStateV1, RngStateV1>;
  readonly rngDrawTrace: RngDrawTraceV1;
  readonly command: VnReferenceTourCommandV1;
  readonly event: VnReferenceTourEventV1;
  readonly rejection: VnReferenceTourRejectionV1;
  readonly fault: VnReferenceTourFaultV1;
  readonly debugCommand: never;
  readonly debugValidationError: VnReferenceTourDebugValidationErrorV1;
  readonly executionContext: undefined;
  readonly queries: VnReferenceTourQueriesV1;
  readonly viewModel: VnReferenceTourGameViewV1;
}

export type VnReferenceTourSnapshotV1 = VnReferenceTourSimulationTypesV1["snapshot"];
export type VnReferenceTourAttemptV1 = CommandExecutionAttemptEnvelopeV1<
  VnReferenceTourSnapshotV1,
  VnReferenceTourEventV1,
  VnReferenceTourRejectionV1,
  VnReferenceTourFaultV1,
  RngStateV1,
  RngDrawTraceV1
>;

export const commandSchemaV1: RuntimeSchemaV1<VnReferenceTourCommandV1> = {
  parse(value: unknown): VnReferenceTourCommandV1 {
    if (value === null || typeof value !== "object" || Array.isArray(value)) {
      throw new TypeError("invalid vn-reference-tour command");
    }
    const kind = (value as { readonly kind?: unknown }).kind;
    if (kind === "vn-reference-tour.narrative_resolve") {
      if (Object.keys(value).toSorted().join("\0") !== "expectedOccurrenceId\0kind\0resolution") {
        throw new TypeError("invalid vn-reference-tour narrative resolve command");
      }
      const record = value as {
        readonly expectedOccurrenceId?: unknown;
        readonly resolution?: unknown;
      };
      return ({
        kind,
        expectedOccurrenceId: parseInteractionOccurrenceId(record.expectedOccurrenceId),
        resolution: parseInteractionResolution(record.resolution),
      });
    }
    if (kind === "vn-reference-tour.time_tick") {
      if (Object.keys(value).toSorted().join("\0") !== "kind\0tick") {
        throw new TypeError("invalid vn-reference-tour time tick command");
      }
      return ({
        kind,
        tick: parseTimeTick((value as { readonly tick?: unknown }).tick, "/tick"),
      });
    }
    if (kind === "vn-reference-tour.scene_reconcile") {
      if (Object.keys(value).toSorted().join("\0") !== "kind\0mutations") {
        throw new TypeError("invalid vn-reference-tour scene reconcile command");
      }
      const mutations = (value as { readonly mutations?: unknown }).mutations;
      if (!Array.isArray(mutations) || mutations.length === 0) {
        throw new TypeError("invalid vn-reference-tour scene reconcile mutations");
      }
      return ({
        kind,
        mutations: mutations.map((mutation, index) =>
          parseStageMutation(mutation, `/mutations/${String(index)}`)
        ),
      });
    }
    if (Object.keys(value).join("\0") !== "kind") {
      throw new TypeError("invalid vn-reference-tour command");
    }
    if (kind !== "vn-reference-tour.begin_story") {
      throw new TypeError("invalid vn-reference-tour command kind");
    }
    return ({ kind });
  },
};

function keysV1(value: object): string {
  return Object.keys(value).toSorted().join("\0");
}

/**
 * Domain-event admission: every emitted event is validated once here before
 * any reducer folds it, so reducers consume ordinary typed data.
 */
export const vnReferenceTourEventSchemaV1: RuntimeSchemaV1<VnReferenceTourEventV1> = {
  parse(value: unknown): VnReferenceTourEventV1 {
    if (value === null || typeof value !== "object" || Array.isArray(value)) {
      throw new TypeError("invalid vn-reference-tour event");
    }
    const kind = (value as { readonly kind?: unknown }).kind;
    if (kind === "vn-reference-tour.stage_changed") {
      const hasDispatches = keysV1(value) === "dispatches\0kind\0mutations";
      if (!hasDispatches && keysV1(value) !== "kind\0mutations") {
        throw new TypeError("invalid vn-reference-tour stage event");
      }
      const record = value as { readonly mutations?: unknown; readonly dispatches?: unknown };
      if (!Array.isArray(record.mutations) || record.mutations.length === 0) {
        throw new TypeError("invalid vn-reference-tour stage event mutations");
      }
      return ({
        kind,
        mutations: record.mutations.map((mutation, index) =>
          parseStageMutation(mutation, `/mutations/${String(index)}`)
        ),
        ...(hasDispatches ? { dispatches: parseStageCueDispatches(record.dispatches) } : {}),
      });
    }
    if (kind === "vn-reference-tour.narrative_advanced") {
      if (keysV1(value) !== "kind\0next") {
        throw new TypeError("invalid vn-reference-tour narrative event");
      }
      return ({
        kind,
        next: vnReferenceTourNarrativeStateSchemaV1.parse(
          (value as { readonly next?: unknown }).next,
        ),
      });
    }
    if (kind === "vn-reference-tour.interaction_resolved") {
      if (keysV1(value) !== "definitionId\0kind\0occurrenceId") {
        throw new TypeError("invalid vn-reference-tour interaction event");
      }
      const record = value as { readonly definitionId?: unknown; readonly occurrenceId?: unknown };
      if (
        typeof record.definitionId !== "string" || record.definitionId.length === 0 ||
        typeof record.occurrenceId !== "string" || record.occurrenceId.length === 0
      ) {
        throw new TypeError("invalid vn-reference-tour interaction event");
      }
      return ({
        kind,
        definitionId: record.definitionId,
        occurrenceId: record.occurrenceId,
      });
    }
    throw new TypeError("invalid vn-reference-tour event kind");
  },
};

export const kit = createGameAuthoringKit<VnReferenceTourSimulationTypesV1>();
