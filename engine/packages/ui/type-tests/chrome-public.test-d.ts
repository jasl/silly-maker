// SPDX-License-Identifier: MIT
import { ChromeWidgetSurfaceV1 } from "@sillymaker/ui/chrome";
import type {
  ChromeHoldProgressViewV1,
  ChromeWidgetIntentPortV1,
  ChromeWidgetSurfacePropsV1,
} from "@sillymaker/ui/chrome";

type EqualV1<TLeft, TRight> = (<T>() => T extends TLeft ? 1 : 2) extends
  <T>() => T extends TRight ? 1 : 2 ? true : false;
type ExpectV1<TValue extends true> = TValue;

type RuntimeKeysV1 = ExpectV1<
  EqualV1<
    keyof typeof import("@sillymaker/ui/chrome"),
    "ChromeWidgetSurfaceV1"
  >
>;

type IntentPortKeysV1 = ExpectV1<
  EqualV1<keyof ChromeWidgetIntentPortV1, "stateOf" | "onActivate">
>;
type ProgressKeysV1 = ExpectV1<
  EqualV1<keyof ChromeHoldProgressViewV1, "remainingMs" | "totalMs">
>;

ChromeWidgetSurfaceV1;
declare const props: ChromeWidgetSurfacePropsV1;
props;

export type { IntentPortKeysV1, ProgressKeysV1, RuntimeKeysV1 };
