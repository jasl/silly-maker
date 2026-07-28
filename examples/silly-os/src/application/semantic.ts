// SPDX-License-Identifier: MIT
// 语义面：SillyOS 的动作目录为空（桌面交互全部是参数化 invocation），
// 每个 invocation 一一映射到命令；瞬态效果投影踩雷/胜利供 UI 演出。
import type { CoreSemanticAdapterV1 } from "@sillymaker/base/runtime";
import type { TransientEffectRequestV1 } from "@sillymaker/base";

import type {
  OsCommandV1,
  OsFactV1,
  OsGameViewV1,
  OsNarrativeViewV1,
  OsQueriesV1,
  OsRejectionV1,
  OsSimulationTypesV1,
} from "../simulation.ts";
import { createOsGameSimulationV1 } from "../simulation.ts";

export type OsActionDescriptorV1 = never;

export type OsInvocationV1 =
  | { readonly kind: "fs_write"; readonly name: string; readonly content: string }
  | { readonly kind: "fs_remove"; readonly name: string }
  | {
      readonly kind: "mine_new";
      readonly width: number;
      readonly height: number;
      readonly mines: number;
    }
  | { readonly kind: "mine_reveal"; readonly x: number; readonly y: number }
  | { readonly kind: "mine_flag"; readonly x: number; readonly y: number }
  | { readonly kind: "set_wallpaper"; readonly wallpaperId: string };

export type OsPreviewV1 =
  { readonly kind: "allowed" } | { readonly kind: "blocked"; readonly code: OsRejectionV1["code"] };

export type OsActionResultV1 =
  | { readonly kind: "committed" }
  | { readonly kind: "rejected"; readonly codes: readonly OsRejectionV1["code"][] }
  | { readonly kind: "faulted"; readonly code: string }
  | {
      readonly kind: "not_executed";
      readonly code:
        "session_unavailable" | "fault_paused" | "hmr_invalidated" | "validation_failed";
    };

const simulationForSemanticV1 = createOsGameSimulationV1();

function isCoordinate(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

export function parseOsInvocationV1(value: unknown): OsInvocationV1 {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError("invalid silly-os invocation");
  }
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record).toSorted().join("\u0000");
  switch (record.kind) {
    case "fs_write":
      if (
        keys !== "content\u0000kind\u0000name" ||
        typeof record.name !== "string" ||
        typeof record.content !== "string"
      ) {
        throw new TypeError("invalid silly-os fs_write invocation");
      }
      return Object.freeze({ kind: "fs_write", name: record.name, content: record.content });
    case "fs_remove":
      if (keys !== "kind\u0000name" || typeof record.name !== "string") {
        throw new TypeError("invalid silly-os fs_remove invocation");
      }
      return Object.freeze({ kind: "fs_remove", name: record.name });
    case "mine_new":
      if (
        keys !== "height\u0000kind\u0000mines\u0000width" ||
        !isCoordinate(record.width) ||
        !isCoordinate(record.height) ||
        !isCoordinate(record.mines)
      ) {
        throw new TypeError("invalid silly-os mine_new invocation");
      }
      return Object.freeze({
        kind: "mine_new",
        width: record.width,
        height: record.height,
        mines: record.mines,
      });
    case "mine_reveal":
    case "mine_flag":
      if (keys !== "kind\u0000x\u0000y" || !isCoordinate(record.x) || !isCoordinate(record.y)) {
        throw new TypeError("invalid silly-os mine invocation");
      }
      return Object.freeze({ kind: record.kind, x: record.x, y: record.y });
    case "set_wallpaper":
      if (keys !== "kind\u0000wallpaperId" || typeof record.wallpaperId !== "string") {
        throw new TypeError("invalid silly-os wallpaper invocation");
      }
      return Object.freeze({ kind: "set_wallpaper", wallpaperId: record.wallpaperId });
    default:
      throw new TypeError("invalid silly-os invocation");
  }
}

function commandForInvocationV1(invocation: OsInvocationV1): OsCommandV1 {
  switch (invocation.kind) {
    case "fs_write":
      return Object.freeze({
        kind: "os.fs.write",
        name: invocation.name,
        content: invocation.content,
      });
    case "fs_remove":
      return Object.freeze({ kind: "os.fs.remove", name: invocation.name });
    case "mine_new":
      return Object.freeze({
        kind: "os.mine.new",
        width: invocation.width,
        height: invocation.height,
        mines: invocation.mines,
      });
    case "mine_reveal":
      return Object.freeze({ kind: "os.mine.reveal", x: invocation.x, y: invocation.y });
    case "mine_flag":
      return Object.freeze({ kind: "os.mine.flag", x: invocation.x, y: invocation.y });
    case "set_wallpaper":
      return Object.freeze({
        kind: "os.desktop.set_wallpaper",
        wallpaperId: invocation.wallpaperId,
      });
    default: {
      const exhaustive: never = invocation;
      throw new TypeError(`unknown silly-os invocation ${String(exhaustive)}`);
    }
  }
}

export function projectOsTransientEffectsV1(
  facts: readonly OsFactV1[],
): readonly TransientEffectRequestV1[] {
  return facts.flatMap((fact): readonly TransientEffectRequestV1[] => {
    switch (fact.kind) {
      case "os.mine.exploded":
        return [
          Object.freeze({
            effectId: "effect.os.mine",
            payload: Object.freeze({ outcome: "exploded", x: fact.x, y: fact.y }),
          }),
        ];
      case "os.mine.won":
        return [
          Object.freeze({
            effectId: "effect.os.mine",
            payload: Object.freeze({ outcome: "won" }),
          }),
        ];
      case "os.fs.saved":
        return [
          Object.freeze({
            effectId: "effect.os.saved",
            payload: Object.freeze({ name: fact.name }),
          }),
        ];
      default:
        return [];
    }
  });
}

export const osSemanticAdapterV1: CoreSemanticAdapterV1<
  OsSimulationTypesV1,
  OsQueriesV1,
  OsGameViewV1,
  OsNarrativeViewV1,
  OsActionDescriptorV1,
  OsInvocationV1,
  OsPreviewV1,
  OsActionResultV1
> = {
  createQueries: (state) => simulationForSemanticV1.createQueries(state as never),
  projectGameView: (queries) => simulationForSemanticV1.projectGameView(queries),
  projectNarrativeView: () => Object.freeze({ pending: null }),
  actions: () => Object.freeze([]),
  preview: () => Object.freeze({ kind: "allowed" as const }),
  parseInvocation: parseOsInvocationV1,
  commandForInvocation: commandForInvocationV1,
  projectDispatchResult: (result) => {
    if (result.kind === "not_executed") {
      return Object.freeze({ kind: "not_executed" as const, code: result.code });
    }
    const execution = result.execution;
    if (execution.kind === "committed") return Object.freeze({ kind: "committed" as const });
    if (execution.kind === "rejected") {
      return Object.freeze({
        kind: "rejected" as const,
        codes: Object.freeze(execution.reasons.map((reason) => reason.code)),
      });
    }
    return Object.freeze({ kind: "faulted" as const, code: execution.fault.code });
  },
  invalidInvocationResult: () =>
    Object.freeze({ kind: "not_executed" as const, code: "validation_failed" as const }),
  projectTransientEffects: (facts) => projectOsTransientEffectsV1(facts as readonly OsFactV1[]),
};
