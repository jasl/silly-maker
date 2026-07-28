// SPDX-License-Identifier: MIT
// 模拟运行时：模块合成、事务运行器与特性命令处理器的公共形状。
import type { createTransactionalRngV1 } from "@sillymaker/base";

import { osGameStateSchemaV1 } from "./state.ts";
import type { OsGameStateV1 } from "./state.ts";
import type { OsAttemptV1, OsCommandV1, OsSnapshotV1 } from "./kernel.ts";
import { kit } from "./kernel.ts";
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
  stateSchema: osGameStateSchemaV1,
  createFault: () => Object.freeze({ code: "os.executor_failed" as const }),
});

export type OsTransactionalRngV1 = ReturnType<typeof createTransactionalRngV1>;

export interface OsHandlerInputV1<C extends OsCommandV1> {
  readonly snapshot: OsSnapshotV1;
  readonly rng: OsTransactionalRngV1;
  readonly state: OsGameStateV1["simulation"];
  readonly command: C;
}

export type OsCommandHandlerV1<C extends OsCommandV1> = (input: OsHandlerInputV1<C>) => OsAttemptV1;

/** kind→handler 的完整映射：漏一个命令种类无法通过类型检查。 */
export type OsCommandHandlerMapV1 = {
  readonly [K in OsCommandV1["kind"]]: OsCommandHandlerV1<Extract<OsCommandV1, { kind: K }>>;
};
