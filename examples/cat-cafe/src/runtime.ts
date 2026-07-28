// SPDX-License-Identifier: MIT
// 模拟运行时：模块合成、事务运行器与特性命令处理器的公共形状。
// 特性 handlers（features/*/handlers.ts）从这里取运行器；聚合见 simulation.ts。
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

/** 特性命令处理器输入：快照、事务 RNG、便捷的 simulation 状态与已收窄的命令。 */
export interface CatcafeHandlerInputV1<C extends CatcafeCommandV1> {
  readonly snapshot: CatcafeSnapshotV1;
  readonly rng: CatcafeTransactionalRngV1;
  readonly state: CatcafeGameStateV1["simulation"];
  readonly command: C;
}

export type CatcafeCommandHandlerV1<C extends CatcafeCommandV1> = (
  input: CatcafeHandlerInputV1<C>,
) => CatcafeAttemptV1;

/** kind→handler 的完整映射：漏一个命令种类无法通过类型检查。 */
export type CatcafeCommandHandlerMapV1 = {
  readonly [K in CatcafeCommandV1["kind"]]: CatcafeCommandHandlerV1<
    Extract<CatcafeCommandV1, { kind: K }>
  >;
};
