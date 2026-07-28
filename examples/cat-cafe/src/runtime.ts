// SPDX-License-Identifier: MIT
// Simulation runtime: module composition, the transaction runner, and the shared shape of feature command handlers.
// Feature handlers (features/*/handlers.ts) take the runner from here; aggregation in simulation.ts.
import type { createTransactionalRngV1 } from "@sillymaker/base";

import { catcafeGameStateSchemaV1 } from "./state.ts";
import type { CatcafeGameStateV1 } from "./state.ts";
import type { CatcafeAttemptV1, CatcafeCommandV1, CatcafeSnapshotV1 } from "./kernel.ts";
import { kit } from "./kernel.ts";
import { calendarModuleV1 } from "./features/calendar/module.ts";
import { catModuleV1 } from "./features/cat/module.ts";
import { contestModuleV1 } from "./features/contest/module.ts";
import { narrativeModuleV1 } from "./features/dialogue/module.ts";
import { shopModuleV1 } from "./features/shop/module.ts";
import { stageModuleV1 } from "./features/stage/module.ts";

export const catcafeModuleCompositionV1 = kit.composeModules([
  calendarModuleV1,
  catModuleV1,
  contestModuleV1,
  narrativeModuleV1,
  shopModuleV1,
  stageModuleV1,
]);

export type CatcafeModulesV1 = typeof catcafeModuleCompositionV1.modules;

export const transactionRunnerV1 = catcafeModuleCompositionV1.createTransactionRunner({
  stateSchema: catcafeGameStateSchemaV1,
  createFault: () => Object.freeze({ code: "cc.executor_failed" as const }),
});

export type CatcafeTransactionalRngV1 = ReturnType<typeof createTransactionalRngV1>;

/** Feature command-handler input: snapshot, transaction RNG, convenient simulation state, and the narrowed command. */
export interface CatcafeHandlerInputV1<C extends CatcafeCommandV1> {
  readonly snapshot: CatcafeSnapshotV1;
  readonly rng: CatcafeTransactionalRngV1;
  readonly state: CatcafeGameStateV1["simulation"];
  readonly command: C;
}

export type CatcafeCommandHandlerV1<C extends CatcafeCommandV1> = (
  input: CatcafeHandlerInputV1<C>,
) => CatcafeAttemptV1;

/** The exhaustive kind→handler map: a missed command kind fails the type check. */
export type CatcafeCommandHandlerMapV1 = {
  readonly [K in CatcafeCommandV1["kind"]]: CatcafeCommandHandlerV1<
    Extract<CatcafeCommandV1, { kind: K }>
  >;
};
