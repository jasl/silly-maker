// SPDX-License-Identifier: MIT
import type { BootstrapEntropyV1 } from "@sillymaker/base";
import { createTransactionalRngV1 } from "@sillymaker/base";
import type { GameSimulation } from "@sillymaker/base/story";
import { defineGameSimulation } from "@sillymaker/base/story";

import { projectCatcafeAudioIntentV1 } from "./features/audio/index.ts";
import { calendarCommandHandlersV1 } from "./features/calendar/handlers.ts";
import { contestCommandHandlersV1 } from "./features/contest/handlers.ts";
import type { CatcafeDebugCommandExecutorV1 } from "./features/dev/debug-executor.ts";
import {
  catcafeDebugCommandExecutorV1,
  catcafeDebugCommandSchemaV1,
} from "./features/dev/debug-executor.ts";
import { dialogueCommandHandlersV1 } from "./features/dialogue/handlers.ts";
import { endingsCommandHandlersV1 } from "./features/endings/handlers.ts";
import { pettingCommandHandlersV1 } from "./features/petting/handlers.ts";
import { shopCommandHandlersV1 } from "./features/shop/handlers.ts";
import type {
  CatcafeAttemptV1,
  CatcafeCommandV1,
  CatcafeDebugValidationErrorV1,
  CatcafeFactV1,
  CatcafeQueriesV1,
  CatcafeRejectionV1,
  CatcafeSimulationTypesV1,
  CatcafeSnapshotV1,
} from "./kernel.ts";
import { commandSchemaV1, passthroughSchemaV1 } from "./kernel.ts";
import type {
  CatcafeCommandHandlerMapV1,
  CatcafeHandlerInputV1,
  CatcafeModulesV1,
} from "./runtime.ts";
import { catcafeModuleCompositionV1 } from "./runtime.ts";
import { catcafeGameStateSchemaV1, createInitialCatcafeGameStateV1 } from "./state.ts";
import type { CatcafeGameStateV1 } from "./state.ts";
import { catcafeStageForWeekV1 } from "./content.ts";
import { catcafeEndingForV1 } from "./features/endings/rules.ts";

/**
 * The cat cafe's simulation aggregate: types and schemas in kernel, modules and rules
 * in the feature slices (features/<name>/module|rules|handlers); this file only
 * assembles the exhaustive kind→handler map into the command executor (a missed command kind fails to compile).
 */

// ---- Public contract re-exports: outsiders (semantic/composition/tests/CLI) face this facade only.
export type {
  CatcafeAttemptV1,
  CatcafeBootstrapInputV1,
  CatcafeChoiceOptionViewV1,
  CatcafeCommandV1,
  CatcafeDebugCommandV1,
  CatcafeDebugValidationErrorV1,
  CatcafeFactV1,
  CatcafeFaultV1,
  CatcafeGameViewV1,
  CatcafeNarrativeViewV1,
  CatcafeQueriesV1,
  CatcafeRejectionCodeV1,
  CatcafeRejectionV1,
  CatcafeSimulationTypesV1,
  CatcafeSnapshotV1,
} from "./kernel.ts";
export { catcafeDebugStatsV1 } from "./kernel.ts";
export type { CatcafeEndingV1 } from "./features/endings/rules.ts";
export { catcafeEndingForV1 } from "./features/endings/rules.ts";
export { catcafeContestTodayV1 } from "./features/contest/rules.ts";

type CatcafeCommandExecutorV1 = {
  executeAttempt(
    snapshot: CatcafeSnapshotV1,
    command: CatcafeCommandV1,
    context: undefined,
  ): CatcafeAttemptV1;
};

export type CatcafeGameSimulationV1 = GameSimulation<
  CatcafeSimulationTypesV1,
  CatcafeModulesV1,
  CatcafeCommandExecutorV1,
  CatcafeDebugCommandExecutorV1
>;

/** Full assembly of feature handlers: covers every command kind at the type level. */
const commandHandlersV1: CatcafeCommandHandlerMapV1 = Object.freeze({
  ...dialogueCommandHandlersV1,
  ...calendarCommandHandlersV1,
  ...endingsCommandHandlersV1,
  ...shopCommandHandlersV1,
  ...pettingCommandHandlersV1,
  ...contestCommandHandlersV1,
});

export function createCatcafeGameSimulationV1(): CatcafeGameSimulationV1 {
  const commandExecutor: CatcafeCommandExecutorV1 = Object.freeze({
    executeAttempt(snapshot, command) {
      const handler = commandHandlersV1[command.kind] as (
        input: CatcafeHandlerInputV1<CatcafeCommandV1>,
      ) => CatcafeAttemptV1;
      return handler({
        snapshot,
        rng: createTransactionalRngV1(snapshot.rng),
        state: snapshot.state.simulation,
        command,
      });
    },
  });

  return defineGameSimulation<CatcafeSimulationTypesV1>()({
    contractRevision: 1,
    modules: catcafeModuleCompositionV1.modules,
    stateSchema: catcafeGameStateSchemaV1,
    commandSchema: commandSchemaV1,
    factSchema: passthroughSchemaV1<CatcafeFactV1>(),
    rejectionSchema: passthroughSchemaV1<CatcafeRejectionV1>(),
    debugCommandSchema: catcafeDebugCommandSchemaV1,
    debugValidationErrorSchema: passthroughSchemaV1<CatcafeDebugValidationErrorV1>(),
    commandExecutor,
    debugCommandExecutor: catcafeDebugCommandExecutorV1,
    createBootstrapInput(entropy: BootstrapEntropyV1) {
      return Object.freeze({ rngSeed: entropy.nextNonZeroUint32() });
    },
    createInitialState() {
      return createInitialCatcafeGameStateV1();
    },
    createQueries(state: CatcafeGameStateV1) {
      return Object.freeze({
        calendar: state.simulation.calendar,
        cat: state.simulation.cat,
        shop: state.simulation.shop,
        contest: state.simulation.contest,
        stage: state.simulation.stage,
        narrative: state.simulation.narrative,
      });
    },
    projectGameView(queries: CatcafeQueriesV1) {
      const base = {
        calendar: queries.calendar,
        cat: queries.cat,
        shop: queries.shop,
        contest: queries.contest,
        catStage: catcafeStageForWeekV1(queries.calendar.week),
        ending: catcafeEndingForV1(queries),
        stage: queries.stage,
      };
      return Object.freeze({ ...base, audio: projectCatcafeAudioIntentV1(base) });
    },
  });
}
