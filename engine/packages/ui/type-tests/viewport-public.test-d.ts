// SPDX-License-Identifier: MIT
import type {
  GameViewportContentOrientationV1,
  GameViewportGeometryV1,
  GameViewportPropsV1,
} from "@sillymaker/ui/viewport";

type EqualV1<TLeft, TRight> = (<T>() => T extends TLeft ? 1 : 2) extends
  <T>() => T extends TRight ? 1 : 2 ? true : false;
type ExpectV1<TValue extends true> = TValue;

type PublicContentOrientationV1 = ExpectV1<
  EqualV1<GameViewportContentOrientationV1, "responsive" | "landscape-only">
>;
type PublicRotationV1 = ExpectV1<
  EqualV1<GameViewportGeometryV1["clockwiseRotationDegrees"], 0 | 90>
>;

declare const viewportV1: GameViewportPropsV1;
viewportV1.contentOrientation satisfies GameViewportContentOrientationV1 | undefined;

export type { PublicContentOrientationV1, PublicRotationV1 };
