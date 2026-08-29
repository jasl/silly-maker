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

import type { VnLastSoundCheckGameStateV1 } from "./state.ts";
import { vnLastSoundCheckNarrativeStateSchemaV1 } from "./state.ts";
import type { VnLastSoundCheckNarrativeStateV1 } from "../story/narrative.ts";

export type VnLastSoundCheckCommandV1 =
  | { readonly kind: "vn-last-sound-check.begin_story" }
  | {
    readonly kind: "vn-last-sound-check.narrative_resolve";
    readonly expectedOccurrenceId: string;
    readonly resolution: InteractionResolution;
  }
  | {
    /**
     * The product's carrier for the session-level time verb: one commit
     * settles every authoritative time consumer. A hold-fenced tick folds
     * the pending hold's remainder (stale fences reject the whole
     * command); an unfenced tick settles only session-global consumers —
     * none are registered yet, so it commits as an observable no-op.
     */
    readonly kind: "vn-last-sound-check.time_tick";
    readonly tick: TimeTick;
  }
  | {
    /** Package-internal ordinary command used only by an R2 successor. */
    readonly kind: "vn-last-sound-check.scene_reconcile";
    readonly mutations: readonly StageMutation[];
  };

/**
 * The product's domain-event union: the only internal authoritative update
 * channel. The command handler decides and emits; module reducers fold the
 * admitted events into their slices atomically; the committed sequence is
 * the read-side journal. `vn-last-sound-check.interaction_resolved` is journal-only
 * evidence — no module reduces it.
 */
export type VnLastSoundCheckEventV1 =
  | {
    readonly kind: "vn-last-sound-check.stage_changed";
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
    readonly kind: "vn-last-sound-check.narrative_advanced";
    readonly next: VnLastSoundCheckNarrativeStateV1;
  }
  | {
    readonly kind: "vn-last-sound-check.interaction_resolved";
    readonly definitionId: string;
    readonly occurrenceId: string;
  };

export type VnLastSoundCheckRejectionCodeV1 =
  | "vn-last-sound-check.narrative_busy"
  | "vn-last-sound-check.stage_rejected"
  | InteractionRejectionCode
  | TimeTickRejectionCode;

export interface VnLastSoundCheckRejectionV1 {
  readonly code: VnLastSoundCheckRejectionCodeV1;
}

export interface VnLastSoundCheckFaultV1 {
  readonly code: "vn-last-sound-check.executor_failed";
}

export interface VnLastSoundCheckDebugValidationErrorV1 {
  readonly code: "vn-last-sound-check.debug_command_unsupported";
}

export interface VnLastSoundCheckQueriesV1 {
  readonly stage: SemanticStageState;
  readonly narrative: VnLastSoundCheckNarrativeStateV1;
}

export interface VnLastSoundCheckChoiceOptionViewV1 {
  readonly choiceId: string;
  readonly textId: string;
  readonly enabled: boolean;
  readonly blockedBy: null;
}

/** The player-safe narrative channel published to UI and agents. */
export interface VnLastSoundCheckNarrativeViewV1 {
  readonly phase: VnLastSoundCheckNarrativeStateV1["phase"];
  readonly pending: PendingInteraction | null;
  readonly choiceOptions: readonly VnLastSoundCheckChoiceOptionViewV1[] | null;
  readonly signalChoice: VnLastSoundCheckNarrativeStateV1["signalChoice"];
  readonly history: NarrativeHistory;
}

export interface VnLastSoundCheckGameViewV1 {
  /** The semantic stage target: plain saveable data, observable headless. */
  readonly stage: SemanticStageState;
  /** Save-restorable continuous audio projected from Narrative and Stage. */
  readonly audio: AudioIntentV1;
}

export interface VnLastSoundCheckBootstrapInputV1 {
  readonly rngSeed: NonZeroUint32;
}

export interface VnLastSoundCheckSimulationTypesV1 extends
  GameSimulationTypeMapV1<
    VnLastSoundCheckBootstrapInputV1,
    VnLastSoundCheckGameStateV1,
    RngStateV1
  > {
  readonly snapshot: GameSnapshotEnvelopeV1<VnLastSoundCheckGameStateV1, RngStateV1>;
  readonly rngDrawTrace: RngDrawTraceV1;
  readonly command: VnLastSoundCheckCommandV1;
  readonly event: VnLastSoundCheckEventV1;
  readonly rejection: VnLastSoundCheckRejectionV1;
  readonly fault: VnLastSoundCheckFaultV1;
  readonly debugCommand: never;
  readonly debugValidationError: VnLastSoundCheckDebugValidationErrorV1;
  readonly executionContext: undefined;
  readonly queries: VnLastSoundCheckQueriesV1;
  readonly viewModel: VnLastSoundCheckGameViewV1;
}

export type VnLastSoundCheckSnapshotV1 = VnLastSoundCheckSimulationTypesV1["snapshot"];
export type VnLastSoundCheckAttemptV1 = CommandExecutionAttemptEnvelopeV1<
  VnLastSoundCheckSnapshotV1,
  VnLastSoundCheckEventV1,
  VnLastSoundCheckRejectionV1,
  VnLastSoundCheckFaultV1,
  RngStateV1,
  RngDrawTraceV1
>;

export const commandSchemaV1: RuntimeSchemaV1<VnLastSoundCheckCommandV1> = {
  parse(value: unknown): VnLastSoundCheckCommandV1 {
    if (value === null || typeof value !== "object" || Array.isArray(value)) {
      throw new TypeError("invalid vn-last-sound-check command");
    }
    const kind = (value as { readonly kind?: unknown }).kind;
    if (kind === "vn-last-sound-check.narrative_resolve") {
      if (Object.keys(value).toSorted().join("\0") !== "expectedOccurrenceId\0kind\0resolution") {
        throw new TypeError("invalid vn-last-sound-check narrative resolve command");
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
    if (kind === "vn-last-sound-check.time_tick") {
      if (Object.keys(value).toSorted().join("\0") !== "kind\0tick") {
        throw new TypeError("invalid vn-last-sound-check time tick command");
      }
      return ({
        kind,
        tick: parseTimeTick((value as { readonly tick?: unknown }).tick, "/tick"),
      });
    }
    if (kind === "vn-last-sound-check.scene_reconcile") {
      if (Object.keys(value).toSorted().join("\0") !== "kind\0mutations") {
        throw new TypeError("invalid vn-last-sound-check scene reconcile command");
      }
      const mutations = (value as { readonly mutations?: unknown }).mutations;
      if (!Array.isArray(mutations) || mutations.length === 0) {
        throw new TypeError("invalid vn-last-sound-check scene reconcile mutations");
      }
      return ({
        kind,
        mutations: mutations.map((mutation, index) =>
          parseStageMutation(mutation, `/mutations/${String(index)}`)
        ),
      });
    }
    if (Object.keys(value).join("\0") !== "kind") {
      throw new TypeError("invalid vn-last-sound-check command");
    }
    if (kind !== "vn-last-sound-check.begin_story") {
      throw new TypeError("invalid vn-last-sound-check command kind");
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
export const vnLastSoundCheckEventSchemaV1: RuntimeSchemaV1<VnLastSoundCheckEventV1> = {
  parse(value: unknown): VnLastSoundCheckEventV1 {
    if (value === null || typeof value !== "object" || Array.isArray(value)) {
      throw new TypeError("invalid vn-last-sound-check event");
    }
    const kind = (value as { readonly kind?: unknown }).kind;
    if (kind === "vn-last-sound-check.stage_changed") {
      const hasDispatches = keysV1(value) === "dispatches\0kind\0mutations";
      if (!hasDispatches && keysV1(value) !== "kind\0mutations") {
        throw new TypeError("invalid vn-last-sound-check stage event");
      }
      const record = value as { readonly mutations?: unknown; readonly dispatches?: unknown };
      if (!Array.isArray(record.mutations) || record.mutations.length === 0) {
        throw new TypeError("invalid vn-last-sound-check stage event mutations");
      }
      return ({
        kind,
        mutations: record.mutations.map((mutation, index) =>
          parseStageMutation(mutation, `/mutations/${String(index)}`)
        ),
        ...(hasDispatches ? { dispatches: parseStageCueDispatches(record.dispatches) } : {}),
      });
    }
    if (kind === "vn-last-sound-check.narrative_advanced") {
      if (keysV1(value) !== "kind\0next") {
        throw new TypeError("invalid vn-last-sound-check narrative event");
      }
      return ({
        kind,
        next: vnLastSoundCheckNarrativeStateSchemaV1.parse(
          (value as { readonly next?: unknown }).next,
        ),
      });
    }
    if (kind === "vn-last-sound-check.interaction_resolved") {
      if (keysV1(value) !== "definitionId\0kind\0occurrenceId") {
        throw new TypeError("invalid vn-last-sound-check interaction event");
      }
      const record = value as { readonly definitionId?: unknown; readonly occurrenceId?: unknown };
      if (
        typeof record.definitionId !== "string" || record.definitionId.length === 0 ||
        typeof record.occurrenceId !== "string" || record.occurrenceId.length === 0
      ) {
        throw new TypeError("invalid vn-last-sound-check interaction event");
      }
      return ({
        kind,
        definitionId: record.definitionId,
        occurrenceId: record.occurrenceId,
      });
    }
    throw new TypeError("invalid vn-last-sound-check event kind");
  },
};

export const kit = createGameAuthoringKit<VnLastSoundCheckSimulationTypesV1>();
