// SPDX-License-Identifier: MIT
// 模拟内核：命令/事实/裁决契约、命令 schema、kit 与共享助手。
// 特性切片（features/*）从这里取共享形状；聚合见 simulation.ts。
import type {
  CommandExecutionAttemptEnvelopeV1,
  GameSimulationTypeMapV1,
  GameSnapshotEnvelopeV1,
  NonZeroUint32,
  RngDrawTraceV1,
  RngStateV1,
  RuntimeSchemaV1,
} from "@sillymaker/base";
import { createGameAuthoringKit } from "@sillymaker/base/story";

import type { OsFileV1, OsGameStateV1 } from "./state.ts";
import { osMaxFileContentV1 } from "./state.ts";

export type OsCommandV1 =
  | { readonly kind: "os.fs.write"; readonly name: string; readonly content: string }
  | { readonly kind: "os.fs.remove"; readonly name: string }
  | {
      readonly kind: "os.mine.new";
      readonly width: number;
      readonly height: number;
      readonly mines: number;
    }
  | { readonly kind: "os.mine.reveal"; readonly x: number; readonly y: number }
  | { readonly kind: "os.mine.flag"; readonly x: number; readonly y: number }
  | { readonly kind: "os.desktop.set_wallpaper"; readonly wallpaperId: string };

export type OsFactV1 =
  | { readonly kind: "os.fs.saved"; readonly name: string; readonly revision: number }
  | { readonly kind: "os.fs.removed"; readonly name: string }
  | { readonly kind: "os.mine.started"; readonly width: number; readonly height: number }
  | { readonly kind: "os.mine.exploded"; readonly x: number; readonly y: number }
  | { readonly kind: "os.mine.won" }
  | { readonly kind: "os.desktop.wallpaper_changed"; readonly wallpaperId: string };

export type OsRejectionCodeV1 =
  | "os.fs.name_invalid"
  | "os.fs.not_found"
  | "os.fs.disk_full"
  | "os.fs.content_too_long"
  | "os.mine.invalid_config"
  | "os.mine.no_board"
  | "os.mine.out_of_bounds"
  | "os.mine.finished"
  | "os.mine.cell_revealed"
  | "os.desktop.unknown_wallpaper";

export interface OsRejectionV1 {
  readonly code: OsRejectionCodeV1;
}

export interface OsFaultV1 {
  readonly code: "os.executor_failed";
}

export interface OsDebugValidationErrorV1 {
  readonly code: string;
}

export interface OsQueriesV1 {
  readonly desktop: OsGameStateV1["simulation"]["desktop"];
  readonly filesystem: OsGameStateV1["simulation"]["filesystem"];
  readonly minesweeper: OsGameStateV1["simulation"]["minesweeper"];
}

/** 发布投影的扫雷格：进行中不暴露雷位（发布面即语义面，无法作弊）。 */
export interface OsCellViewV1 {
  readonly state: "hidden" | "flagged" | "revealed";
  /** 仅 revealed 非 null。 */
  readonly adjacent: number | null;
  /** 仅盘面结束（won/lost）后非 null。 */
  readonly mine: boolean | null;
}

export interface OsMinesweeperViewV1 {
  readonly width: number;
  readonly height: number;
  readonly mineCount: number;
  readonly status: "playing" | "won" | "lost";
  readonly flagsLeft: number;
  readonly cells: readonly OsCellViewV1[];
}

export interface OsGameViewV1 {
  readonly wallpaperId: string;
  readonly files: readonly OsFileV1[];
  readonly minesweeper: OsMinesweeperViewV1 | null;
}

/** 无叙事：哑形状占位（引擎泛型要求一个叙事视图类型）。 */
export interface OsNarrativeViewV1 {
  readonly pending: null;
}

export interface OsBootstrapInputV1 {
  readonly rngSeed: NonZeroUint32;
}

export interface OsSimulationTypesV1 extends GameSimulationTypeMapV1<
  OsBootstrapInputV1,
  OsGameStateV1,
  RngStateV1
> {
  readonly snapshot: GameSnapshotEnvelopeV1<OsGameStateV1, RngStateV1>;
  readonly rngDrawTrace: RngDrawTraceV1;
  readonly command: OsCommandV1;
  readonly fact: OsFactV1;
  readonly rejection: OsRejectionV1;
  readonly fault: OsFaultV1;
  readonly debugCommand: never;
  readonly debugValidationError: OsDebugValidationErrorV1;
  readonly executionContext: undefined;
  readonly queries: OsQueriesV1;
  readonly viewModel: OsGameViewV1;
}

export type OsSnapshotV1 = OsSimulationTypesV1["snapshot"];
export type OsAttemptV1 = CommandExecutionAttemptEnvelopeV1<
  OsSnapshotV1,
  OsFactV1,
  OsRejectionV1,
  OsFaultV1,
  RngStateV1,
  RngDrawTraceV1
>;

export const kit = createGameAuthoringKit<OsSimulationTypesV1>();

export function operationSchemaV1<T>(label: string): RuntimeSchemaV1<T> {
  return Object.freeze({
    parse(value: unknown): T {
      if (value === null || typeof value !== "object") {
        throw new TypeError(`invalid silly-os ${label} operation`);
      }
      return value as T;
    },
  });
}

export function passthroughSchemaV1<T>(): RuntimeSchemaV1<T> {
  return Object.freeze({ parse: (value: unknown) => value as T });
}

function isSafeName(value: unknown): value is string {
  return typeof value === "string" && value.length >= 1 && value.length <= 64;
}

function isCoordinate(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

export const commandSchemaV1: RuntimeSchemaV1<OsCommandV1> = Object.freeze({
  parse(value: unknown): OsCommandV1 {
    if (value === null || typeof value !== "object" || Array.isArray(value)) {
      throw new TypeError("invalid silly-os command");
    }
    const record = value as Record<string, unknown>;
    const keys = Object.keys(record).toSorted().join("\u0000");
    switch (record.kind) {
      case "os.fs.write":
        if (
          keys !== "content\u0000kind\u0000name" ||
          !isSafeName(record.name) ||
          typeof record.content !== "string" ||
          record.content.length > osMaxFileContentV1
        ) {
          throw new TypeError("invalid silly-os fs.write command");
        }
        return Object.freeze({ kind: record.kind, name: record.name, content: record.content });
      case "os.fs.remove":
        if (keys !== "kind\u0000name" || !isSafeName(record.name)) {
          throw new TypeError("invalid silly-os fs.remove command");
        }
        return Object.freeze({ kind: record.kind, name: record.name });
      case "os.mine.new":
        if (
          keys !== "height\u0000kind\u0000mines\u0000width" ||
          !isCoordinate(record.width) ||
          !isCoordinate(record.height) ||
          !isCoordinate(record.mines)
        ) {
          throw new TypeError("invalid silly-os mine.new command");
        }
        return Object.freeze({
          kind: record.kind,
          width: record.width,
          height: record.height,
          mines: record.mines,
        });
      case "os.mine.reveal":
      case "os.mine.flag":
        if (keys !== "kind\u0000x\u0000y" || !isCoordinate(record.x) || !isCoordinate(record.y)) {
          throw new TypeError("invalid silly-os mine command");
        }
        return Object.freeze({ kind: record.kind, x: record.x, y: record.y });
      case "os.desktop.set_wallpaper":
        if (keys !== "kind\u0000wallpaperId" || typeof record.wallpaperId !== "string") {
          throw new TypeError("invalid silly-os wallpaper command");
        }
        return Object.freeze({ kind: record.kind, wallpaperId: record.wallpaperId });
      default:
        throw new TypeError("invalid silly-os command kind");
    }
  },
});
