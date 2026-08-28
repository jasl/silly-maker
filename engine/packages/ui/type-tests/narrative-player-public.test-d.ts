// SPDX-License-Identifier: MIT
import {
  createDefaultVnPlayerV1,
  defaultVnPlayerLabelsV1,
  type DefaultVnPlayerLabelsV1,
} from "@sillymaker/ui/narrative-player";
import {
  createDefaultVnPlayerCoreV1,
  defaultVnPlayerCoreLabelsV1,
  type DefaultVnPlayerCoreLabelsV1,
} from "@sillymaker/ui/narrative-player/core";

type EqualV1<TLeft, TRight> = (<T>() => T extends TLeft ? 1 : 2) extends
  <T>() => T extends TRight ? 1 : 2 ? true : false;
type ExpectV1<TValue extends true> = TValue;

type FullRuntimeKeysV1 = ExpectV1<
  EqualV1<
    keyof typeof import("@sillymaker/ui/narrative-player"),
    "createDefaultVnPlayerV1" | "defaultVnPlayerLabelsV1"
  >
>;
type CoreRuntimeKeysV1 = ExpectV1<
  EqualV1<
    keyof typeof import("@sillymaker/ui/narrative-player/core"),
    "createDefaultVnPlayerCoreV1" | "defaultVnPlayerCoreLabelsV1"
  >
>;
type FullHistoryLabelKeysV1 = ExpectV1<
  EqualV1<
    Exclude<keyof DefaultVnPlayerLabelsV1, keyof DefaultVnPlayerCoreLabelsV1>,
    "history" | "historyTitle" | "historyEmpty" | "historyClose"
  >
>;

createDefaultVnPlayerV1;
defaultVnPlayerLabelsV1;
createDefaultVnPlayerCoreV1;
defaultVnPlayerCoreLabelsV1;

export type { CoreRuntimeKeysV1, FullHistoryLabelKeysV1, FullRuntimeKeysV1 };
