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

import type { VnReferenceTourNarrativeStateV1 } from "../story/narrative.ts";
import {
  createInitialVnReferenceTourNarrativeStateV1,
  vnReferenceTourNodeIdsV1,
} from "../story/narrative.ts";
import { vnReferenceTourControlRoomSceneRuntimePlanV1 } from "../scenes/control-room/index.ts";

export interface VnReferenceTourGameStateV1 {
  readonly simulation: {
    readonly narrative: VnReferenceTourNarrativeStateV1;
    readonly stage: SemanticStageState;
  };
}

export const vnReferenceTourStageStateSchemaV1: RuntimeSchemaV1<SemanticStageState> =
  createRuntimeSchemaV1(
    { parse: (value) => parseSemanticStageState(value) },
    { subject: { kind: "module", id: "vn-reference-tour.stage" } },
  );

const narrativePhaseValuesV1 = new Set(["idle", "active", "completed"]);

export const vnReferenceTourNarrativeStateSchemaV1: RuntimeSchemaV1<
  VnReferenceTourNarrativeStateV1
> = createRuntimeSchemaV1(
  {
    parse(value: unknown): VnReferenceTourNarrativeStateV1 {
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
        throw new TypeError("invalid vn-reference-tour narrative phase");
      }
      if (record.cursor !== null && !vnReferenceTourNodeIdsV1.includes(record.cursor)) {
        throw new TypeError("unknown vn-reference-tour narrative cursor");
      }
      const pending = record.pending === null || record.pending === undefined
        ? null
        : parsePendingInteraction(record.pending);
      if ((record.phase === "active") !== (record.cursor !== null)) {
        throw new TypeError("vn-reference-tour narrative cursor must match active phase");
      }
      if (pending !== null && record.phase !== "active") {
        throw new TypeError("vn-reference-tour narrative pending requires active phase");
      }
      return ({
        phase: record.phase as VnReferenceTourNarrativeStateV1["phase"],
        cursor: record.cursor,
        pending,
        sequence: record.sequence,
        signalChoice: record.signalChoice,
        history: parseNarrativeHistory(record.history),
      });
    },
  },
  { subject: { kind: "module", id: "vn-reference-tour.narrative" } },
);

export const vnReferenceTourGameStateSchemaV1: RuntimeSchemaV1<VnReferenceTourGameStateV1> =
  createRuntimeSchemaV1(
    {
      parse(value: unknown): VnReferenceTourGameStateV1 {
        const root = z.strictObject({ simulation: z.record(z.string(), z.unknown()) }).parse(value);
        const simulation = z
          .strictObject({ narrative: z.unknown(), stage: z.unknown() })
          .parse(root.simulation);
        return ({
          simulation: {
            narrative: vnReferenceTourNarrativeStateSchemaV1.parse(simulation.narrative),
            stage: vnReferenceTourStageStateSchemaV1.parse(simulation.stage),
          },
        });
      },
    },
    { subject: { kind: "story", id: "story.example.vn-reference-tour" } },
  );

export function createInitialVnReferenceTourStageStateV1(): SemanticStageState {
  return createSemanticStageState({
    stageId: "stage.vn-reference-tour.main",
    layerIds: vnReferenceTourControlRoomSceneRuntimePlanV1.orderedLayerIds,
  });
}

export function createInitialVnReferenceTourGameStateV1(): VnReferenceTourGameStateV1 {
  return ({
    simulation: {
      narrative: createInitialVnReferenceTourNarrativeStateV1(),
      stage: createInitialVnReferenceTourStageStateV1(),
    },
  });
}
