// SPDX-License-Identifier: MIT
// Simulation kernel: the shared command/event/rejection contract, command
// schema, and the authoring kit feature slices build on. Aggregation
// lives in simulation.ts; feature slices live under game/features/.
import type {
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

import type { TemplateGameStateV1 } from "./state.ts";
import { templateNarrativeStateSchemaV1 } from "./state.ts";
import type { TemplateNarrativeStateV1 } from "../story/narrative.ts";

export type TemplateCommandV1 =
  | { readonly kind: "template.begin_story" }
  | { readonly kind: "template.earn_coin" }
  | {
    readonly kind: "template.narrative_resolve";
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
    readonly kind: "template.time_tick";
    readonly tick: TimeTick;
  }
  | {
    /** Package-internal ordinary command used only by an R2 successor. */
    readonly kind: "template.scene_reconcile";
    readonly mutations: readonly StageMutation[];
  };

/**
 * The starter's domain-event union: the only internal authoritative update
 * channel. The command handler decides and emits; module reducers fold the
 * admitted events into their slices atomically; the committed sequence is
 * the read-side journal. `template.interaction_resolved` is journal-only
 * evidence — no module reduces it.
 */
export type TemplateEventV1 =
  | { readonly kind: "template.coins_changed"; readonly delta: number; readonly balance: number }
  | {
    readonly kind: "template.stage_changed";
    readonly mutations: readonly StageMutation[];
    /**
     * The scene dispatches (cue references / whole-scene opens) that
     * produced these mutations, when the narrative run performed any. The
     * semantic adapter projects them into presentation edge context; like
     * every event this is deterministic execution output, not command input.
     */
    readonly dispatches?: readonly StageCueDispatch[];
  }
  | { readonly kind: "template.narrative_advanced"; readonly next: TemplateNarrativeStateV1 }
  | {
    readonly kind: "template.interaction_resolved";
    readonly definitionId: string;
    readonly occurrenceId: string;
  };

export type TemplateRejectionCodeV1 =
  | "template.narrative_busy"
  | "template.insufficient_coins"
  | "template.stage_rejected"
  | InteractionRejectionCode
  | TimeTickRejectionCode;

export interface TemplateRejectionV1 {
  readonly code: TemplateRejectionCodeV1;
}

export interface TemplateFaultV1 {
  readonly code: "template.executor_failed";
}

export interface TemplateDebugValidationErrorV1 {
  readonly code: "template.debug_command_unsupported";
}

export interface TemplateQueriesV1 {
  readonly coins: number;
  readonly stage: SemanticStageState;
  readonly narrative: TemplateNarrativeStateV1;
}

export interface TemplateChoiceOptionViewV1 {
  readonly choiceId: string;
  readonly textId: string;
  readonly enabled: boolean;
  readonly blockedBy: "template.insufficient_coins" | null;
}

/** The player-safe narrative channel published to UI and agents. */
export interface TemplateNarrativeViewV1 {
  readonly phase: TemplateNarrativeStateV1["phase"];
  readonly pending: PendingInteraction | null;
  readonly choiceOptions: readonly TemplateChoiceOptionViewV1[] | null;
  readonly flags: readonly string[];
  readonly history: NarrativeHistory;
}

export interface TemplateGameViewV1 {
  readonly coins: number;
  /** The semantic stage target: plain saveable data, observable headless. */
  readonly stage: SemanticStageState;
}

export interface TemplateBootstrapInputV1 {
  readonly rngSeed: NonZeroUint32;
}

export interface TemplateSimulationTypesV1 extends
  GameSimulationTypeMapV1<
    TemplateBootstrapInputV1,
    TemplateGameStateV1,
    RngStateV1
  > {
  readonly snapshot: GameSnapshotEnvelopeV1<TemplateGameStateV1, RngStateV1>;
  readonly rngDrawTrace: RngDrawTraceV1;
  readonly command: TemplateCommandV1;
  readonly event: TemplateEventV1;
  readonly rejection: TemplateRejectionV1;
  readonly fault: TemplateFaultV1;
  readonly debugCommand: never;
  readonly debugValidationError: TemplateDebugValidationErrorV1;
  readonly executionContext: undefined;
  readonly queries: TemplateQueriesV1;
  readonly viewModel: TemplateGameViewV1;
}

export type TemplateSnapshotV1 = TemplateSimulationTypesV1["snapshot"];
export type TemplateAttemptV1 = CommandExecutionAttemptEnvelopeV1<
  TemplateSnapshotV1,
  TemplateEventV1,
  TemplateRejectionV1,
  TemplateFaultV1,
  RngStateV1,
  RngDrawTraceV1
>;

export const commandSchemaV1: RuntimeSchemaV1<TemplateCommandV1> = {
  parse(value: unknown): TemplateCommandV1 {
    if (value === null || typeof value !== "object" || Array.isArray(value)) {
      throw new TypeError("invalid template command");
    }
    const kind = (value as { readonly kind?: unknown }).kind;
    if (kind === "template.narrative_resolve") {
      if (Object.keys(value).toSorted().join("\0") !== "expectedOccurrenceId\0kind\0resolution") {
        throw new TypeError("invalid template narrative resolve command");
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
    if (kind === "template.time_tick") {
      if (Object.keys(value).toSorted().join("\0") !== "kind\0tick") {
        throw new TypeError("invalid template time tick command");
      }
      return ({
        kind,
        tick: parseTimeTick((value as { readonly tick?: unknown }).tick, "/tick"),
      });
    }
    if (kind === "template.scene_reconcile") {
      if (Object.keys(value).toSorted().join("\0") !== "kind\0mutations") {
        throw new TypeError("invalid template scene reconcile command");
      }
      const mutations = (value as { readonly mutations?: unknown }).mutations;
      if (!Array.isArray(mutations) || mutations.length === 0) {
        throw new TypeError("invalid template scene reconcile mutations");
      }
      return ({
        kind,
        mutations: mutations.map((mutation, index) =>
          parseStageMutation(mutation, `/mutations/${String(index)}`)
        ),
      });
    }
    if (Object.keys(value).join("\0") !== "kind") {
      throw new TypeError("invalid template command");
    }
    if (kind !== "template.begin_story" && kind !== "template.earn_coin") {
      throw new TypeError("invalid template command kind");
    }
    return ({ kind });
  },
};

function keysV1(value: object): string {
  return Object.keys(value).toSorted().join("\0");
}

function parseIntegerV1(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value)) {
    throw new TypeError(`invalid template event ${label}`);
  }
  return value;
}

/**
 * Domain-event admission: every emitted event is validated once here before
 * any reducer folds it, so reducers consume ordinary typed data.
 */
export const templateEventSchemaV1: RuntimeSchemaV1<TemplateEventV1> = {
  parse(value: unknown): TemplateEventV1 {
    if (value === null || typeof value !== "object" || Array.isArray(value)) {
      throw new TypeError("invalid template event");
    }
    const kind = (value as { readonly kind?: unknown }).kind;
    if (kind === "template.coins_changed") {
      if (keysV1(value) !== "balance\0delta\0kind") {
        throw new TypeError("invalid template coins event");
      }
      const record = value as { readonly delta?: unknown; readonly balance?: unknown };
      const delta = parseIntegerV1(record.delta, "delta");
      const balance = parseIntegerV1(record.balance, "balance");
      if (delta === 0 || balance < 0) throw new TypeError("invalid template coins event");
      return ({ kind, delta, balance });
    }
    if (kind === "template.stage_changed") {
      const hasDispatches = keysV1(value) === "dispatches\0kind\0mutations";
      if (!hasDispatches && keysV1(value) !== "kind\0mutations") {
        throw new TypeError("invalid template stage event");
      }
      const record = value as { readonly mutations?: unknown; readonly dispatches?: unknown };
      if (!Array.isArray(record.mutations) || record.mutations.length === 0) {
        throw new TypeError("invalid template stage event mutations");
      }
      return ({
        kind,
        mutations: record.mutations.map((mutation, index) =>
          parseStageMutation(mutation, `/mutations/${String(index)}`)
        ),
        ...(hasDispatches ? { dispatches: parseStageCueDispatches(record.dispatches) } : {}),
      });
    }
    if (kind === "template.narrative_advanced") {
      if (keysV1(value) !== "kind\0next") {
        throw new TypeError("invalid template narrative event");
      }
      return ({
        kind,
        next: templateNarrativeStateSchemaV1.parse((value as { readonly next?: unknown }).next),
      });
    }
    if (kind === "template.interaction_resolved") {
      if (keysV1(value) !== "definitionId\0kind\0occurrenceId") {
        throw new TypeError("invalid template interaction event");
      }
      const record = value as { readonly definitionId?: unknown; readonly occurrenceId?: unknown };
      if (
        typeof record.definitionId !== "string" || record.definitionId.length === 0 ||
        typeof record.occurrenceId !== "string" || record.occurrenceId.length === 0
      ) {
        throw new TypeError("invalid template interaction event");
      }
      return ({
        kind,
        definitionId: record.definitionId,
        occurrenceId: record.occurrenceId,
      });
    }
    throw new TypeError("invalid template event kind");
  },
};

export const kit = createGameAuthoringKit<TemplateSimulationTypesV1>();
