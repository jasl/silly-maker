// SPDX-License-Identifier: MIT
import {
  compileVnInteractionDocumentV1,
  createVnInteractionRuntimeV1,
  projectVnNarrativeGraphV1,
} from "@sillymaker/vn/interaction";
import {
  createDefaultVnPlayerHistoryV1,
  defaultVnPlayerHistoryLabelsV1,
} from "@sillymaker/vn/history";
import { createDefaultVnPlayerV1, defaultVnPlayerLabelsV1 } from "@sillymaker/vn/preset";
import {
  createDefaultVnPlayerCoreV1,
  createVnHistoryPresentationBridgeV1,
} from "@sillymaker/vn/ui";

type EqualV1<TLeft, TRight> = (<T>() => T extends TLeft ? 1 : 2) extends
  <T>() => T extends TRight ? 1 : 2 ? true : false;
type ExpectV1<TValue extends true> = TValue;

type BaseRuntimeKeysV1 = ExpectV1<
  EqualV1<
    keyof typeof import("@sillymaker/vn/interaction"),
    | "compileVnInteractionDocumentV1"
    | "createVnInteractionRuntimeV1"
    | "projectVnNarrativeGraphV1"
  >
>;
type HistoryRuntimeKeysV1 = ExpectV1<
  EqualV1<
    keyof typeof import("@sillymaker/vn/history"),
    "createDefaultVnPlayerHistoryV1" | "defaultVnPlayerHistoryLabelsV1"
  >
>;
type PresetRuntimeKeysV1 = ExpectV1<
  EqualV1<
    keyof typeof import("@sillymaker/vn/preset"),
    "createDefaultVnPlayerV1" | "defaultVnPlayerLabelsV1"
  >
>;
type UiRuntimeKeysV1 = ExpectV1<
  EqualV1<
    keyof typeof import("@sillymaker/vn/ui"),
    | "createDefaultVnPlayerCoreV1"
    | "createVnHistoryPresentationBridgeV1"
    | "defaultVnPlayerCoreLabelsV1"
  >
>;
type UiCoreRuntimeKeysV1 = ExpectV1<
  EqualV1<
    keyof typeof import("@sillymaker/vn/ui/core"),
    "createDefaultVnPlayerCoreV1" | "defaultVnPlayerCoreLabelsV1"
  >
>;

compileVnInteractionDocumentV1;
createVnInteractionRuntimeV1;
projectVnNarrativeGraphV1;
createDefaultVnPlayerHistoryV1;
defaultVnPlayerHistoryLabelsV1;
createDefaultVnPlayerV1;
defaultVnPlayerLabelsV1;
createDefaultVnPlayerCoreV1;
createVnHistoryPresentationBridgeV1;

export type {
  BaseRuntimeKeysV1,
  HistoryRuntimeKeysV1,
  PresetRuntimeKeysV1,
  UiCoreRuntimeKeysV1,
  UiRuntimeKeysV1,
};
