// SPDX-License-Identifier: MIT
import type { BootstrapEntropyV1, RuntimeSchemaV1 } from "@sillymaker/base";
import { createTransactionalRngV1 } from "@sillymaker/base";
import type { GameSimulation } from "@sillymaker/base/story";
import { defineGameSimulation } from "@sillymaker/base/story";

import { desktopCommandHandlersV1 } from "./features/desktop/handlers.ts";
import { filesystemCommandHandlersV1 } from "./features/filesystem/handlers.ts";
import { minesweeperCommandHandlersV1 } from "./features/minesweeper/handlers.ts";
import { osAdjacentMinesV1, osFlagsUsedV1 } from "./features/minesweeper/rules.ts";
import type {
  OsAttemptV1,
  OsCellViewV1,
  OsCommandV1,
  OsDebugValidationErrorV1,
  OsFactV1,
  OsGameViewV1,
  OsMinesweeperViewV1,
  OsQueriesV1,
  OsRejectionV1,
  OsSimulationTypesV1,
  OsSnapshotV1,
} from "./kernel.ts";
import { commandSchemaV1, passthroughSchemaV1 } from "./kernel.ts";
import type { OsCommandHandlerMapV1, OsHandlerInputV1, OsModulesV1 } from "./runtime.ts";
import { osModuleCompositionV1 } from "./runtime.ts";
import { osCellFlaggedV1, osCellMineV1, osCellRevealedV1 } from "./state.ts";
import type { OsGameStateV1 } from "./state.ts";
import { createInitialOsGameStateV1, osGameStateSchemaV1 } from "./state.ts";

/**
 * SillyOS 的模拟聚合：桌面（壁纸）、文件系统（记事本文档）、扫雷。
 * 发布投影只暴露玩家可见信息——进行中的雷区不出现在语义面上，UI 与
 * 自动化都无法作弊。窗口布局是 UI 瞬态，不进入权威状态。
 */

// ---- 公共契约再导出：外部（semantic/composition/测试/CLI）只面向本门面。
export type {
  OsAttemptV1,
  OsBootstrapInputV1,
  OsCellViewV1,
  OsCommandV1,
  OsFactV1,
  OsFaultV1,
  OsGameViewV1,
  OsMinesweeperViewV1,
  OsNarrativeViewV1,
  OsQueriesV1,
  OsRejectionCodeV1,
  OsRejectionV1,
  OsSimulationTypesV1,
  OsSnapshotV1,
} from "./kernel.ts";
export { osMinePresetsV1 } from "./features/minesweeper/rules.ts";

type OsCommandExecutorV1 = {
  executeAttempt(snapshot: OsSnapshotV1, command: OsCommandV1, context: undefined): OsAttemptV1;
};

type OsDebugCommandExecutorV1 = {
  validate(
    snapshot: OsSnapshotV1,
    command: never,
    context: undefined,
  ):
    | { readonly kind: "allowed" }
    | { readonly kind: "validation_failed"; readonly errors: readonly OsDebugValidationErrorV1[] };
  executeAttempt(snapshot: OsSnapshotV1, command: never, context: undefined): OsAttemptV1;
};

export type OsGameSimulationV1 = GameSimulation<
  OsSimulationTypesV1,
  OsModulesV1,
  OsCommandExecutorV1,
  OsDebugCommandExecutorV1
>;

const debugCommandSchemaV1: RuntimeSchemaV1<never> = Object.freeze({
  parse(): never {
    throw new TypeError("silly-os defines no debug commands");
  },
});

/** 特性 handlers 的完整装配：类型上覆盖每一个命令 kind。 */
const commandHandlersV1: OsCommandHandlerMapV1 = Object.freeze({
  ...desktopCommandHandlersV1,
  ...filesystemCommandHandlersV1,
  ...minesweeperCommandHandlersV1,
});

export function projectOsMinesweeperViewV1(
  state: OsGameStateV1["simulation"]["minesweeper"],
): OsMinesweeperViewV1 | null {
  const board = state.board;
  if (board === null) return null;
  const finished = board.status !== "playing";
  const cells: OsCellViewV1[] = board.cells.map((cell, index) => {
    const revealed = (cell & osCellRevealedV1) !== 0;
    const flagged = (cell & osCellFlaggedV1) !== 0;
    return Object.freeze({
      state: revealed
        ? ("revealed" as const)
        : flagged
          ? ("flagged" as const)
          : ("hidden" as const),
      adjacent: revealed && (cell & osCellMineV1) === 0 ? osAdjacentMinesV1(board, index) : null,
      mine: finished ? (cell & osCellMineV1) !== 0 : revealed ? (cell & osCellMineV1) !== 0 : null,
    });
  });
  return Object.freeze({
    width: board.width,
    height: board.height,
    mineCount: board.mineCount,
    status: board.status,
    flagsLeft: board.mineCount - osFlagsUsedV1(board),
    cells: Object.freeze(cells),
  });
}

export function createOsGameSimulationV1(): OsGameSimulationV1 {
  const commandExecutor: OsCommandExecutorV1 = Object.freeze({
    executeAttempt(snapshot, command) {
      const handler = commandHandlersV1[command.kind] as (
        input: OsHandlerInputV1<OsCommandV1>,
      ) => OsAttemptV1;
      return handler({
        snapshot,
        rng: createTransactionalRngV1(snapshot.rng),
        state: snapshot.state.simulation,
        command,
      });
    },
  });

  const debugCommandExecutor: OsDebugCommandExecutorV1 = Object.freeze({
    validate: () =>
      Object.freeze({
        kind: "validation_failed" as const,
        errors: Object.freeze([Object.freeze({ code: "os.debug.unsupported" })]),
      }),
    executeAttempt(): never {
      throw new TypeError("silly-os defines no debug commands");
    },
  });

  return defineGameSimulation<OsSimulationTypesV1>()({
    contractRevision: 1,
    modules: osModuleCompositionV1.modules,
    stateSchema: osGameStateSchemaV1,
    commandSchema: commandSchemaV1,
    factSchema: passthroughSchemaV1<OsFactV1>(),
    rejectionSchema: passthroughSchemaV1<OsRejectionV1>(),
    debugCommandSchema: debugCommandSchemaV1,
    debugValidationErrorSchema: passthroughSchemaV1<OsDebugValidationErrorV1>(),
    commandExecutor,
    debugCommandExecutor,
    createBootstrapInput(entropy: BootstrapEntropyV1) {
      return Object.freeze({ rngSeed: entropy.nextNonZeroUint32() });
    },
    createInitialState() {
      return createInitialOsGameStateV1();
    },
    createQueries(state: OsGameStateV1) {
      return Object.freeze({
        desktop: state.simulation.desktop,
        filesystem: state.simulation.filesystem,
        minesweeper: state.simulation.minesweeper,
      });
    },
    projectGameView(queries: OsQueriesV1): OsGameViewV1 {
      return Object.freeze({
        wallpaperId: queries.desktop.wallpaperId,
        files: queries.filesystem.files,
        minesweeper: projectOsMinesweeperViewV1(queries.minesweeper),
      });
    },
  });
}
