// SPDX-License-Identifier: MIT
// Simulation runtime: module composition, the transaction runner, and the shared shape of feature command handlers.
import type { createTransactionalRngV1 } from "@sillymaker/base";

import type { OsGameStateV1 } from "./state.ts";
import type { OsAttemptV1, OsCommandV1, OsSnapshotV1 } from "./kernel.ts";
import { kit, osEventSchemaV1 } from "./kernel.ts";
import { desktopModuleV1 } from "./features/desktop/module.ts";
import { filesystemModuleV1 } from "./features/filesystem/module.ts";
import { minesweeperModuleV1 } from "./features/minesweeper/module.ts";

export const osModuleCompositionV1 = kit.composeModules([
  desktopModuleV1,
  filesystemModuleV1,
  minesweeperModuleV1,
]);

export type OsModulesV1 = typeof osModuleCompositionV1.modules;

export const transactionRunnerV1 = osModuleCompositionV1.createTransactionRunner({
  eventSchema: osEventSchemaV1,
  createFault: () => ({ code: "os.executor_failed" as const }),
});

export type OsTransactionalRngV1 = ReturnType<typeof createTransactionalRngV1>;

export interface OsHandlerInputV1<C extends OsCommandV1> {
  readonly snapshot: OsSnapshotV1;
  readonly rng: OsTransactionalRngV1;
  readonly state: OsGameStateV1["simulation"];
  readonly command: C;
}

export type OsCommandHandlerV1<C extends OsCommandV1> = (input: OsHandlerInputV1<C>) => OsAttemptV1;

/** The exhaustive kind→handler map: a missed command kind fails the type check. */
export type OsCommandHandlerMapV1 = {
  readonly [K in OsCommandV1["kind"]]: OsCommandHandlerV1<Extract<OsCommandV1, { kind: K }>>;
};
