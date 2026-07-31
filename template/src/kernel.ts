// SPDX-License-Identifier: MIT
// Simulation kernel: the shared command/fact/rejection contract, command
// schema, and the authoring kit feature slices build on. Aggregation
// lives in simulation.ts; feature slices live under features/.
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
} from "@sillymaker/base/story";
import {
  createGameAuthoringKit,
  parseInteractionOccurrenceId,
  parseInteractionResolution,
} from "@sillymaker/base/story";

import type { TemplateGameStateV1 } from "./state.ts";
import type { TemplateNarrativeStateV1 } from "./narrative.ts";

export type TemplateCommandV1 =
  | { readonly kind: "template.begin_story" }
  | { readonly kind: "template.earn_coin" }
  | {
    readonly kind: "template.narrative_resolve";
    readonly expectedOccurrenceId: string;
    readonly resolution: InteractionResolution;
  };

export type TemplateFactV1 =
  | { readonly kind: "template.coins_changed"; readonly delta: number; readonly balance: number }
  | { readonly kind: "template.stage_changed"; readonly mutations: number }
  | {
    readonly kind: "template.interaction_resolved";
    readonly definitionId: string;
    readonly occurrenceId: string;
  };

export type TemplateRejectionCodeV1 =
  | "template.narrative_busy"
  | "template.insufficient_coins"
  | "template.stage_rejected"
  | InteractionRejectionCode;

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
  readonly fact: TemplateFactV1;
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
  TemplateFactV1,
  TemplateRejectionV1,
  TemplateFaultV1,
  RngStateV1,
  RngDrawTraceV1
>;

export const commandSchemaV1: RuntimeSchemaV1<TemplateCommandV1> = Object.freeze({
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
      return Object.freeze({
        kind,
        expectedOccurrenceId: parseInteractionOccurrenceId(record.expectedOccurrenceId),
        resolution: parseInteractionResolution(record.resolution),
      });
    }
    if (Object.keys(value).join("\0") !== "kind") {
      throw new TypeError("invalid template command");
    }
    if (kind !== "template.begin_story" && kind !== "template.earn_coin") {
      throw new TypeError("invalid template command kind");
    }
    return Object.freeze({ kind });
  },
});

export const kit = createGameAuthoringKit<TemplateSimulationTypesV1>();
