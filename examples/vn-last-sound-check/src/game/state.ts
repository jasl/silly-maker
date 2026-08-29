// SPDX-License-Identifier: MIT
import { z } from "zod";

import type { RuntimeSchemaV1 } from "@sillymaker/base";
import type { SemanticStageState } from "@sillymaker/base/story";
import {
  createSemanticStageState,
  parseNarrativeHistory,
  parsePendingInteraction,
  parseSemanticStageState,
} from "@sillymaker/base/story";
import { createRuntimeSchemaV1 } from "@sillymaker/base/authoring";

import type { VnLastSoundCheckNarrativeStateV1 } from "../story/narrative.ts";
import {
  createInitialVnLastSoundCheckNarrativeStateV1,
  vnLastSoundCheckNodeIdsV1,
} from "../story/narrative.ts";
import { vnLastSoundCheckControlRoomSceneRuntimePlanV1 } from "../scenes/control-room/index.ts";

export interface VnLastSoundCheckGameStateV1 {
  readonly simulation: {
    readonly narrative: VnLastSoundCheckNarrativeStateV1;
    readonly stage: SemanticStageState;
  };
}

export const vnLastSoundCheckStageStateSchemaV1: RuntimeSchemaV1<SemanticStageState> =
  createRuntimeSchemaV1(
    { parse: (value) => parseSemanticStageState(value) },
    { subject: { kind: "module", id: "vn-last-sound-check.stage" } },
  );

const narrativePhaseValuesV1 = new Set(["idle", "active", "completed"]);

export const vnLastSoundCheckNarrativeStateSchemaV1: RuntimeSchemaV1<
  VnLastSoundCheckNarrativeStateV1
> = createRuntimeSchemaV1(
  {
    parse(value: unknown): VnLastSoundCheckNarrativeStateV1 {
      const record = z
        .strictObject({
          phase: z.string(),
          cursor: z.string().nullable(),
          pending: z.unknown().nullable(),
          sequence: z.number().int().nonnegative(),
          signalChoice: z.enum(["archive", "present"]).nullable(),
          history: z.unknown(),
        })
        .parse(value);
      if (!narrativePhaseValuesV1.has(record.phase)) {
        throw new TypeError("invalid vn-last-sound-check narrative phase");
      }
      if (record.cursor !== null && !vnLastSoundCheckNodeIdsV1.includes(record.cursor)) {
        throw new TypeError("unknown vn-last-sound-check narrative cursor");
      }
      const pending = record.pending === null || record.pending === undefined
        ? null
        : parsePendingInteraction(record.pending);
      if ((record.phase === "active") !== (record.cursor !== null)) {
        throw new TypeError("vn-last-sound-check narrative cursor must match active phase");
      }
      if (pending !== null && record.phase !== "active") {
        throw new TypeError("vn-last-sound-check narrative pending requires active phase");
      }
      return ({
        phase: record.phase as VnLastSoundCheckNarrativeStateV1["phase"],
        cursor: record.cursor,
        pending,
        sequence: record.sequence,
        signalChoice: record.signalChoice,
        history: parseNarrativeHistory(record.history),
      });
    },
  },
  { subject: { kind: "module", id: "vn-last-sound-check.narrative" } },
);

export const vnLastSoundCheckGameStateSchemaV1: RuntimeSchemaV1<VnLastSoundCheckGameStateV1> =
  createRuntimeSchemaV1(
    {
      parse(value: unknown): VnLastSoundCheckGameStateV1 {
        const root = z.strictObject({ simulation: z.record(z.string(), z.unknown()) }).parse(value);
        const simulation = z
          .strictObject({ narrative: z.unknown(), stage: z.unknown() })
          .parse(root.simulation);
        return ({
          simulation: {
            narrative: vnLastSoundCheckNarrativeStateSchemaV1.parse(simulation.narrative),
            stage: vnLastSoundCheckStageStateSchemaV1.parse(simulation.stage),
          },
        });
      },
    },
    { subject: { kind: "story", id: "story.example.vn-last-sound-check" } },
  );

export function createInitialVnLastSoundCheckStageStateV1(): SemanticStageState {
  return createSemanticStageState({
    stageId: "stage.vn-last-sound-check.main",
    layerIds: vnLastSoundCheckControlRoomSceneRuntimePlanV1.orderedLayerIds,
  });
}

export function createInitialVnLastSoundCheckGameStateV1(): VnLastSoundCheckGameStateV1 {
  return ({
    simulation: {
      narrative: createInitialVnLastSoundCheckNarrativeStateV1(),
      stage: createInitialVnLastSoundCheckStageStateV1(),
    },
  });
}
