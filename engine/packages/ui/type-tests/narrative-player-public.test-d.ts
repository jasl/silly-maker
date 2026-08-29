// SPDX-License-Identifier: MIT
import {
  createDefaultVnPlayerCoreV1,
  defaultVnPlayerCoreLabelsV1,
} from "@sillymaker/ui/narrative-player/core";
import {
  createDefaultVnPlayerHistoryV1,
  defaultVnPlayerHistoryLabelsV1,
} from "@sillymaker/ui/narrative-player/history";

type EqualV1<TLeft, TRight> = (<T>() => T extends TLeft ? 1 : 2) extends
  <T>() => T extends TRight ? 1 : 2 ? true : false;
type ExpectV1<TValue extends true> = TValue;

type CoreRuntimeKeysV1 = ExpectV1<
  EqualV1<
    keyof typeof import("@sillymaker/ui/narrative-player/core"),
    "createDefaultVnPlayerCoreV1" | "defaultVnPlayerCoreLabelsV1"
  >
>;
type HistoryRuntimeKeysV1 = ExpectV1<
  EqualV1<
    keyof typeof import("@sillymaker/ui/narrative-player/history"),
    "createDefaultVnPlayerHistoryV1" | "defaultVnPlayerHistoryLabelsV1"
  >
>;

createDefaultVnPlayerCoreV1;
defaultVnPlayerCoreLabelsV1;
createDefaultVnPlayerHistoryV1;
defaultVnPlayerHistoryLabelsV1;

// @ts-expect-error the complete VN preset is owned by @sillymaker/vn/preset
export { createDefaultVnPlayerV1 as ForbiddenFullPresetV1 } from "@sillymaker/ui/narrative-player";

export type { CoreRuntimeKeysV1, HistoryRuntimeKeysV1 };
